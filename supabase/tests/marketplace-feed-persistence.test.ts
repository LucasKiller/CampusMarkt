import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace feed database persistence and keyset RPC integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const indexesMigration = resolve(
    migrationsDir,
    "20260923100000_marketplace_feed_indexes.sql",
  );
  const feedRpcMigration = resolve(
    migrationsDir,
    "20260923101000_marketplace_get_public_feed_rpc.sql",
  );
  const detailsRpcMigration = resolve(
    migrationsDir,
    "20260923102000_marketplace_get_listing_details_rpc.sql",
  );

  it("includes all three feed database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260923100000_marketplace_feed_indexes.sql");
    expect(files).toContain(
      "20260923101000_marketplace_get_public_feed_rpc.sql",
    );
    expect(files).toContain(
      "20260923102000_marketplace_get_listing_details_rpc.sql",
    );
  });

  describe("T5: composite partial indexes", () => {
    it("defines composite keyset and filter indexes for active and reserved listings", () => {
      const sql = readFileSync(indexesMigration, "utf8");

      expect(sql).toMatch(
        /create index if not exists listings_feed_keyset_idx\s+on marketplace\.listings\s*\(created_at desc, id desc\)\s+where status in \('active', 'reserved'\);/i,
      );
      expect(sql).toMatch(
        /create index if not exists listings_feed_category_idx\s+on marketplace\.listings\s*\(category, created_at desc, id desc\)\s+where status in \('active', 'reserved'\);/i,
      );
      expect(sql).toMatch(
        /create index if not exists listings_feed_area_idx\s+on marketplace\.listings\s*\(pickup_area, created_at desc, id desc\)\s+where status in \('active', 'reserved'\);/i,
      );
      expect(sql).toMatch(
        /create index if not exists listings_feed_type_idx\s+on marketplace\.listings\s*\(listing_type, created_at desc, id desc\)\s+where status in \('active', 'reserved'\);/i,
      );
    });
  });

  describe("T6: get_public_feed keyset RPC", () => {
    it("configures get_public_feed with SECURITY DEFINER, empty search_path, and proper grants", () => {
      const sql = readFileSync(feedRpcMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.get_public_feed/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.get_public_feed/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_public_feed[\s\S]*?to anon, authenticated, service_role;/i,
      );
    });

    it("enforces keyset condition and status filter on active/reserved listings", () => {
      const sql = readFileSync(feedRpcMigration, "utf8");

      expect(sql).toMatch(/l\.status in \('active', 'reserved'\)/i);
      expect(sql).toMatch(
        /\(l\.created_at, l\.id\) < \(p_cursor_created_at, p_cursor_id\)/i,
      );
      expect(sql).toMatch(/order by l\.created_at desc, l\.id desc/i);
    });

    it("projects primary cover image, seller profile, and trust badge without PII", () => {
      const sql = readFileSync(feedRpcMigration, "utf8");

      expect(sql).toMatch(/m\.position = 0/i);
      expect(sql).toMatch(
        /'displayName', coalesce\(p\.display_name, 'CampusMarkt User'\)/i,
      );
      expect(sql).toMatch(/'badgeLabel', 'TU Braunschweig'/i);
      expect(sql).not.toMatch(/email_key/i);
      expect(sql).not.toMatch(/institutional_email/i);
    });
  });

  describe("T7: get_public_listing_details RPC", () => {
    it("configures get_public_listing_details with SECURITY DEFINER and public grants", () => {
      const sql = readFileSync(detailsRpcMigration, "utf8");

      expect(sql).toMatch(
        /function marketplace_api\.get_public_listing_details/i,
      );
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.get_public_listing_details/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_public_listing_details[\s\S]*?to anon, authenticated, service_role;/i,
      );
    });

    it("aggregates all ordered media up to 8 images and projects complete details", () => {
      const sql = readFileSync(detailsRpcMigration, "utf8");

      expect(sql).toMatch(/order by m\.position asc/i);
      expect(sql).toMatch(/'images', coalesce/i);
      expect(sql).toMatch(/'description', l\.description/i);
      expect(sql).toMatch(/'condition', l\.condition/i);
      expect(sql).toMatch(/'pickupArea', l\.pickup_area/i);
    });
  });

  describe("keyset determinism and zero-duplicate simulation", () => {
    interface SimulatedListing {
      id: string;
      createdAt: string;
      status: "active" | "reserved" | "sold" | "archived";
      category: string;
      pickupArea: string;
      listingType: "SELL" | "GIVE_AWAY" | "WANTED";
    }

    function createMockListings(count: number): SimulatedListing[] {
      const items: SimulatedListing[] = [];
      const baseTime = new Date("2026-09-23T12:00:00.000Z").getTime();

      for (let i = 0; i < count; i++) {
        const timeOffset = (count - i) * 60_000;
        const createdAt = new Date(baseTime + timeOffset).toISOString();
        const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

        items.push({
          id,
          createdAt,
          status: i % 10 === 0 ? "sold" : i % 7 === 0 ? "reserved" : "active",
          category: i % 2 === 0 ? "furniture" : "electronics",
          pickupArea: i % 3 === 0 ? "innenstadt" : "campus_tu_altgebaeude",
          listingType: i % 4 === 0 ? "GIVE_AWAY" : "SELL",
        });
      }

      return items;
    }

    function queryKeysetFeed(
      allListings: SimulatedListing[],
      cursor: { createdAt: string; id: string } | null,
      filters: {
        category?: string;
        pickupArea?: string;
        listingType?: string;
      } = {},
      limit: number = 20,
    ): SimulatedListing[] {
      return allListings
        .filter((l) => l.status === "active" || l.status === "reserved")
        .filter((l) =>
          filters.category ? l.category === filters.category : true,
        )
        .filter((l) =>
          filters.pickupArea ? l.pickupArea === filters.pickupArea : true,
        )
        .filter((l) =>
          filters.listingType ? l.listingType === filters.listingType : true,
        )
        .filter((l) => {
          if (!cursor) return true;
          // (created_at, id) < (cursor.createdAt, cursor.id)
          if (l.createdAt < cursor.createdAt) return true;
          if (l.createdAt === cursor.createdAt && l.id < cursor.id) return true;
          return false;
        })
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) {
            return b.createdAt.localeCompare(a.createdAt);
          }
          return b.id.localeCompare(a.id);
        })
        .slice(0, limit);
    }

    it("proves zero duplicate or skipped listings across full keyset traversal", () => {
      const mockListings = createMockListings(65);
      const activeOrReserved = mockListings.filter(
        (l) => l.status === "active" || l.status === "reserved",
      );

      const collectedIds = new Set<string>();
      let cursor: { createdAt: string; id: string } | null = null;
      let pageCount = 0;

      while (true) {
        const page = queryKeysetFeed(mockListings, cursor, {}, 20);
        if (page.length === 0) break;

        for (const item of page) {
          expect(collectedIds.has(item.id)).toBe(false);
          collectedIds.add(item.id);
        }

        const lastItem = page[page.length - 1];
        cursor = { createdAt: lastItem.createdAt, id: lastItem.id };
        pageCount++;
      }

      expect(pageCount).toBe(Math.ceil(activeOrReserved.length / 20));
      expect(collectedIds.size).toBe(activeOrReserved.length);
    });

    it("maintains deterministic pagination with concurrent inserts", () => {
      const mockListings = createMockListings(40);
      const page1 = queryKeysetFeed(mockListings, null, {}, 10);
      expect(page1.length).toBe(10);

      const lastOfPage1 = page1[page1.length - 1];
      const cursor = { createdAt: lastOfPage1.createdAt, id: lastOfPage1.id };

      // Simulate 5 newly inserted items with latest timestamps
      const latestTime = new Date("2026-09-23T20:00:00.000Z").getTime();
      for (let i = 0; i < 5; i++) {
        mockListings.push({
          id: `99999999-0000-4000-8000-${String(i).padStart(12, "0")}`,
          createdAt: new Date(latestTime + i * 1000).toISOString(),
          status: "active",
          category: "furniture",
          pickupArea: "innenstadt",
          listingType: "SELL",
        });
      }

      // Query page 2 with cursor
      const page2 = queryKeysetFeed(mockListings, cursor, {}, 10);

      const page1Ids = new Set(page1.map((p) => p.id));
      for (const item of page2) {
        expect(page1Ids.has(item.id)).toBe(false);
      }
    });

    it("verifies accurate filtering by category, pickup area, and listing type", () => {
      const mockListings = createMockListings(50);

      const furnitureOnly = queryKeysetFeed(
        mockListings,
        null,
        { category: "furniture" },
        50,
      );
      expect(furnitureOnly.every((i) => i.category === "furniture")).toBe(true);

      const innenstadtOnly = queryKeysetFeed(
        mockListings,
        null,
        { pickupArea: "innenstadt" },
        50,
      );
      expect(innenstadtOnly.every((i) => i.pickupArea === "innenstadt")).toBe(
        true,
      );

      const giveawayOnly = queryKeysetFeed(
        mockListings,
        null,
        { listingType: "GIVE_AWAY" },
        50,
      );
      expect(giveawayOnly.every((i) => i.listingType === "GIVE_AWAY")).toBe(
        true,
      );
    });
  });
});
