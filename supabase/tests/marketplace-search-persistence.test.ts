import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace search database persistence and search RPC integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const vectorMigration = resolve(
    migrationsDir,
    "20260923200000_marketplace_search_vector.sql",
  );
  const rpcMigration = resolve(
    migrationsDir,
    "20260923201000_marketplace_search_listings_rpc.sql",
  );
  const sortingMigration = resolve(
    migrationsDir,
    "20260923202000_marketplace_search_sorting.sql",
  );

  it("includes all three search database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260923200000_marketplace_search_vector.sql");
    expect(files).toContain(
      "20260923201000_marketplace_search_listings_rpc.sql",
    );
    expect(files).toContain("20260923202000_marketplace_search_sorting.sql");
  });

  describe("T5: search vector and indexes", () => {
    it("defines stored generated search_vector with German dictionary and weighted title/description", () => {
      const sql = readFileSync(vectorMigration, "utf8");

      expect(sql).toMatch(/search_vector\s+tsvector\s+generated always as/i);
      expect(sql).toMatch(
        /setweight\(to_tsvector\('german',\s*coalesce\(title,\s*''\)\),\s*'A'\)/i,
      );
      expect(sql).toMatch(
        /setweight\(to_tsvector\('german',\s*coalesce\(description,\s*''\)\),\s*'B'\)/i,
      );
      expect(sql).toMatch(/\)\s*stored;/i);
    });

    it("defines partial GIN index and facet B-tree indexes for active/reserved listings", () => {
      const sql = readFileSync(vectorMigration, "utf8");

      expect(sql).toMatch(
        /create index if not exists listings_search_vector_gin_idx\s+on marketplace\.listings using gin\s*\(search_vector\)\s+where status in \('active', 'reserved'\);/i,
      );
      expect(sql).toMatch(
        /create index if not exists listings_price_cents_idx\s+on marketplace\.listings\s*\(price_cents\)\s+where status in \('active', 'reserved'\);/i,
      );
      expect(sql).toMatch(
        /create index if not exists listings_condition_idx\s+on marketplace\.listings\s*\(condition\)\s+where status in \('active', 'reserved'\);/i,
      );
    });
  });

  describe("T6 & T7: search_listings RPC configuration and security", () => {
    it("configures search_listings with SECURITY DEFINER, empty search_path, and proper grants", () => {
      const initialSql = readFileSync(rpcMigration, "utf8");
      expect(initialSql).toMatch(
        /create or replace function marketplace_api\.search_listings/i,
      );

      const sql = readFileSync(sortingMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.search_listings/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.search_listings/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.search_listings[\s\S]*?to anon, authenticated, service_role;/i,
      );
    });

    it("safely uses websearch_to_tsquery and ts_rank_cd for relevance ranking", () => {
      const sql = readFileSync(sortingMigration, "utf8");

      expect(sql).toMatch(
        /websearch_to_tsquery\('german'::regconfig,\s*v_query\)/i,
      );
      expect(sql).toMatch(/ts_rank_cd\(l\.search_vector,\s*v_tsquery\)/i);
    });

    it("excludes sold and archived listings and strictly prevents private PII exposure", () => {
      const sql = readFileSync(sortingMigration, "utf8");

      expect(sql).toMatch(/l\.status in \('active', 'reserved'\)/i);
      expect(sql).toMatch(/m\.position = 0/i);
      expect(sql).toMatch(
        /'displayName',\s*coalesce\(p\.display_name,\s*'CampusMarkt User'\)/i,
      );
      expect(sql).toMatch(/'badgeLabel',\s*'TU Braunschweig'/i);

      expect(sql).not.toMatch(/email_key/i);
      expect(sql).not.toMatch(/institutional_email/i);
      expect(sql).not.toMatch(/identity_hash/i);
    });

    it("implements multi-sort ordering with giveaway/wanted priced last", () => {
      const sql = readFileSync(sortingMigration, "utf8");

      expect(sql).toMatch(
        /case when v_sort = 'price_asc' then \(case when l\.listing_type = 'SELL' and l\.price_cents is not null then 0 else 1 end\) end asc/i,
      );
      expect(sql).toMatch(
        /case when v_sort = 'price_desc' then \(case when l\.listing_type = 'SELL' and l\.price_cents is not null then 0 else 1 end\) end asc/i,
      );
    });
  });

  describe("search simulation: keyword matching, ranking, facets, and keyset determinism", () => {
    interface SimulatedListing {
      id: string;
      title: string;
      description: string;
      category: string;
      pickupArea: string;
      listingType: "SELL" | "GIVE_AWAY" | "WANTED";
      condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
      priceCents: number | null;
      status: "active" | "reserved" | "sold" | "archived";
      createdAt: string;
      isVerifiedSeller: boolean;
    }

    function computeRelevanceRank(
      listing: SimulatedListing,
      query: string,
    ): number {
      const q = query.toLowerCase().trim();
      if (!q) return 0;

      let score = 0;
      const titleLower = listing.title.toLowerCase();
      const descLower = listing.description.toLowerCase();

      // Check exact phrase
      if (q.startsWith('"') && q.endsWith('"') && q.length > 2) {
        const phrase = q.slice(1, -1);
        if (titleLower.includes(phrase)) score += 1.0;
        if (descLower.includes(phrase)) score += 0.3;
        return score;
      }

      // Individual terms
      const terms = q.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        if (titleLower.includes(term)) {
          score += 1.0; // Title weight A
        }
        if (descLower.includes(term)) {
          score += 0.2; // Description weight B
        }
      }

      return score;
    }

    function searchSimulatedListings(
      listings: SimulatedListing[],
      options: {
        query?: string;
        categories?: string[];
        pickupAreas?: string[];
        listingTypes?: string[];
        conditions?: string[];
        minPriceCents?: number;
        maxPriceCents?: number;
        verifiedOnly?: boolean;
        sort?: "relevance" | "newest" | "price_asc" | "price_desc";
        cursor?: {
          rank?: number;
          priceCents?: number | null;
          createdAt: string;
          id: string;
        };
        limit?: number;
      },
    ): SimulatedListing[] {
      const query = options.query?.trim();
      const sort = options.sort ?? (query ? "relevance" : "newest");
      const limit = options.limit ?? 20;

      const filtered = listings
        .filter((l) => l.status === "active" || l.status === "reserved")
        .filter((l) => {
          if (!query) return true;
          return computeRelevanceRank(l, query) > 0;
        })
        .filter((l) => {
          if (options.categories && options.categories.length > 0) {
            return options.categories.includes(l.category);
          }
          return true;
        })
        .filter((l) => {
          if (options.pickupAreas && options.pickupAreas.length > 0) {
            return options.pickupAreas.includes(l.pickupArea);
          }
          return true;
        })
        .filter((l) => {
          if (options.listingTypes && options.listingTypes.length > 0) {
            return options.listingTypes.includes(l.listingType);
          }
          return true;
        })
        .filter((l) => {
          if (options.conditions && options.conditions.length > 0) {
            return options.conditions.includes(l.condition);
          }
          return true;
        })
        .filter((l) => {
          if (options.minPriceCents !== undefined) {
            return (
              l.listingType === "SELL" &&
              l.priceCents !== null &&
              l.priceCents >= options.minPriceCents
            );
          }
          return true;
        })
        .filter((l) => {
          if (options.maxPriceCents !== undefined) {
            return (
              l.listingType === "SELL" &&
              l.priceCents !== null &&
              l.priceCents <= options.maxPriceCents
            );
          }
          return true;
        })
        .filter((l) => {
          if (options.verifiedOnly) {
            return l.isVerifiedSeller;
          }
          return true;
        });

      // Sort
      filtered.sort((a, b) => {
        if (sort === "relevance" && query) {
          const rankA = computeRelevanceRank(a, query);
          const rankB = computeRelevanceRank(b, query);
          if (rankA !== rankB) return rankB - rankA;
        } else if (sort === "price_asc") {
          const aPriced = a.listingType === "SELL" && a.priceCents !== null;
          const bPriced = b.listingType === "SELL" && b.priceCents !== null;
          if (aPriced !== bPriced) return aPriced ? -1 : 1;
          if (aPriced && bPriced && a.priceCents !== b.priceCents) {
            return (a.priceCents ?? 0) - (b.priceCents ?? 0);
          }
        } else if (sort === "price_desc") {
          const aPriced = a.listingType === "SELL" && a.priceCents !== null;
          const bPriced = b.listingType === "SELL" && b.priceCents !== null;
          if (aPriced !== bPriced) return aPriced ? -1 : 1;
          if (aPriced && bPriced && a.priceCents !== b.priceCents) {
            return (b.priceCents ?? 0) - (a.priceCents ?? 0);
          }
        }

        if (a.createdAt !== b.createdAt) {
          return b.createdAt.localeCompare(a.createdAt);
        }
        return b.id.localeCompare(a.id);
      });

      // Keyset cursor pagination
      let page = filtered;
      if (options.cursor) {
        const cursor = options.cursor;
        page = filtered.filter((l) => {
          if (sort === "relevance" && query && cursor.rank !== undefined) {
            const rank = computeRelevanceRank(l, query);
            if (rank < cursor.rank) return true;
            if (rank === cursor.rank) {
              if (l.createdAt < cursor.createdAt) return true;
              if (l.createdAt === cursor.createdAt && l.id < cursor.id)
                return true;
            }
            return false;
          }

          if (l.createdAt < cursor.createdAt) return true;
          if (l.createdAt === cursor.createdAt && l.id < cursor.id) return true;
          return false;
        });
      }

      return page.slice(0, limit);
    }

    const testInventory: SimulatedListing[] = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "Rennrad Peugeot Vintage",
        description: "Altes Rennrad in gutem Zustand, neue Bremsen.",
        category: "bicycles_mobility",
        pickupArea: "innenstadt",
        listingType: "SELL",
        condition: "GOOD",
        priceCents: 15000,
        status: "active",
        createdAt: "2026-09-23T10:00:00.000Z",
        isVerifiedSeller: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        title: "Fahrradschloss Abus",
        description: "Massives Schloss, passend für jedes Rennrad.",
        category: "bicycles_mobility",
        pickupArea: "campus_tu_altgebaeude",
        listingType: "SELL",
        condition: "LIKE_NEW",
        priceCents: 2500,
        status: "active",
        createdAt: "2026-09-23T11:00:00.000Z",
        isVerifiedSeller: false,
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        title: "Verkaufte Lampe",
        description: "Schöne Lampe, leider schon weg.",
        category: "furniture",
        pickupArea: "innenstadt",
        listingType: "SELL",
        condition: "GOOD",
        priceCents: 1000,
        status: "sold",
        createdAt: "2026-09-23T12:00:00.000Z",
        isVerifiedSeller: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        title: "TU Braunschweig Skript Mathe 1",
        description:
          "Gedrucktes Skript für Erstsemester an der TU Braunschweig.",
        category: "books_studies",
        pickupArea: "campus_tu_altgebaeude",
        listingType: "GIVE_AWAY",
        condition: "FAIR",
        priceCents: null,
        status: "active",
        createdAt: "2026-09-23T13:00:00.000Z",
        isVerifiedSeller: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        title: "Suche Rennrad",
        description: "Suche altes Rennrad für den Campus.",
        category: "bicycles_mobility",
        pickupArea: "oestliches_ringgebiet",
        listingType: "WANTED",
        condition: "GOOD",
        priceCents: 10000,
        status: "active",
        createdAt: "2026-09-23T14:00:00.000Z",
        isVerifiedSeller: false,
      },
    ];

    it("verifies title weight > description weight in ranking", () => {
      const results = searchSimulatedListings(testInventory, {
        query: "Rennrad",
      });

      // Item 1 has Rennrad in title & description (score 1.2)
      // Item 5 has Rennrad in title & description (score 1.2, but later createdAt)
      // Item 2 has Rennrad ONLY in description (score 0.2)
      expect(results.length).toBe(3);
      expect(results[0].title).toBe("Suche Rennrad");
      expect(results[1].title).toBe("Rennrad Peugeot Vintage");
      expect(results[2].title).toBe("Fahrradschloss Abus"); // Description only match ranked last
    });

    it("verifies multi-facet intersections (category + area + price)", () => {
      const results = searchSimulatedListings(testInventory, {
        query: "Rennrad",
        categories: ["bicycles_mobility"],
        pickupAreas: ["innenstadt"],
        minPriceCents: 5000,
        maxPriceCents: 20000,
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("00000000-0000-4000-8000-000000000001");
      expect(results[0].title).toBe("Rennrad Peugeot Vintage");
    });

    it("verifies university verified seller filter", () => {
      const results = searchSimulatedListings(testInventory, {
        query: "Rennrad",
        verifiedOnly: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe("Rennrad Peugeot Vintage");
      expect(results[0].isVerifiedSeller).toBe(true);
    });

    it("verifies exact phrase matching", () => {
      const results = searchSimulatedListings(testInventory, {
        query: '"tu braunschweig"',
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe("TU Braunschweig Skript Mathe 1");
    });

    it("excludes sold and archived listings", () => {
      const results = searchSimulatedListings(testInventory, {
        query: "Lampe",
      });

      expect(results.length).toBe(0);
    });

    it("proves zero duplicate or skipped listings in keyset pagination", () => {
      const page1 = searchSimulatedListings(testInventory, {
        limit: 2,
      });
      expect(page1.length).toBe(2);

      const last1 = page1[page1.length - 1];
      const page2 = searchSimulatedListings(testInventory, {
        cursor: { createdAt: last1.createdAt, id: last1.id },
        limit: 2,
      });
      expect(page2.length).toBe(2);

      const allIds = new Set([
        ...page1.map((i) => i.id),
        ...page2.map((i) => i.id),
      ]);
      expect(allIds.size).toBe(4); // 4 active listings, zero duplicates
    });
  });
});
