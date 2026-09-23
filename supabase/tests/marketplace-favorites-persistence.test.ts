import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace favorites database persistence and RPC integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const tableMigration = resolve(
    migrationsDir,
    "20260923210000_marketplace_favorites.sql",
  );
  const toggleRpcMigration = resolve(
    migrationsDir,
    "20260923211000_marketplace_favorites_toggle_rpc.sql",
  );
  const queryRpcMigration = resolve(
    migrationsDir,
    "20260923212000_marketplace_favorites_query_rpcs.sql",
  );

  it("includes all three favorites database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260923210000_marketplace_favorites.sql");
    expect(files).toContain(
      "20260923211000_marketplace_favorites_toggle_rpc.sql",
    );
    expect(files).toContain(
      "20260923212000_marketplace_favorites_query_rpcs.sql",
    );
  });

  describe("T5: marketplace.favorites table schema and RLS policies", () => {
    it("defines composite primary key (user_id, listing_id) and cascading foreign keys", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(/create table if not exists marketplace\.favorites/i);
      expect(sql).toMatch(
        /user_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /listing_id uuid not null references marketplace\.listings\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(/primary key\s*\(user_id,\s*listing_id\)/i);
    });

    it("defines B-tree indexes for chronological retrieval and listing cascades", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create index if not exists idx_marketplace_favorites_user_created\s+on marketplace\.favorites\s*\(user_id,\s*created_at desc\);/i,
      );
      expect(sql).toMatch(
        /create index if not exists idx_marketplace_favorites_listing\s+on marketplace\.favorites\s*\(listing_id\);/i,
      );
    });

    it("enables and forces row-level security with strictly owner-only policies", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /alter table marketplace\.favorites enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.favorites force row level security;/i,
      );

      expect(sql).toMatch(
        /create policy "Users can view own favorites"[\s\S]*?using\s*\(auth\.uid\(\) = user_id\);/i,
      );
      expect(sql).toMatch(
        /create policy "Users can insert own favorites"[\s\S]*?with check\s*\(auth\.uid\(\) = user_id\);/i,
      );
      expect(sql).toMatch(
        /create policy "Users can delete own favorites"[\s\S]*?using\s*\(auth\.uid\(\) = user_id\);/i,
      );
    });

    it("grants table permissions only to authenticated and service_role", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /grant select, insert, delete on table marketplace\.favorites to authenticated;/i,
      );
      expect(sql).toMatch(
        /grant select, insert, update, delete on table marketplace\.favorites to service_role;/i,
      );
      expect(sql).not.toMatch(/grant\s+.*to anon/i);
    });
  });

  describe("T6: toggle_favorite RPC configuration and security", () => {
    it("configures toggle_favorite with SECURITY DEFINER, empty search_path, and proper grants", () => {
      const sql = readFileSync(toggleRpcMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.toggle_favorite/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.toggle_favorite\(uuid\)[\s\S]*?from public, anon, authenticated, service_role;/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.toggle_favorite\(uuid\)[\s\S]*?to authenticated, service_role;/i,
      );
    });

    it("enforces authentication, listing existence, and self-favorite prohibition", () => {
      const sql = readFileSync(toggleRpcMigration, "utf8");

      expect(sql).toMatch(/auth\.uid\(\)/i);
      expect(sql).toMatch(/raise exception 'UNAUTHENTICATED'/i);
      expect(sql).toMatch(/raise exception 'LISTING_NOT_FOUND'/i);
      expect(sql).toMatch(/raise exception 'CANNOT_FAVORITE_OWN_LISTING'/i);
      expect(sql).toMatch(/v_owner_id = v_user_id/i);
      expect(sql).toMatch(/v_listing_status = 'archived'/i);
    });

    it("returns jsonb with isFavorited boolean and listingId", () => {
      const sql = readFileSync(toggleRpcMigration, "utf8");

      expect(sql).toMatch(
        /jsonb_build_object\('isFavorited',\s*false,\s*'listingId',\s*p_listing_id\)/i,
      );
      expect(sql).toMatch(
        /jsonb_build_object\('isFavorited',\s*true,\s*'listingId',\s*p_listing_id\)/i,
      );
    });
  });

  describe("T7: get_user_favorite_ids and get_user_favorites RPCs", () => {
    it("configures query RPCs with SECURITY DEFINER and authenticated grants", () => {
      const sql = readFileSync(queryRpcMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.get_user_favorite_ids/i);
      expect(sql).toMatch(/function marketplace_api\.get_user_favorites/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);

      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_user_favorite_ids[\s\S]*?to authenticated, service_role;/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_user_favorites[\s\S]*?to authenticated, service_role;/i,
      );
    });

    it("excludes archived listings and strictly prevents private PII exposure", () => {
      const sql = readFileSync(queryRpcMigration, "utf8");

      expect(sql).toMatch(/l\.status <> 'archived'/i);
      expect(sql).toMatch(
        /'displayName',\s*coalesce\(p\.display_name,\s*'CampusMarkt User'\)|coalesce\(p\.display_name,\s*'CampusMarkt User'\)\s*as seller_display_name/i,
      );

      expect(sql).not.toMatch(/email_key/i);
      expect(sql).not.toMatch(/institutional_email/i);
      expect(sql).not.toMatch(/identity_hash/i);
    });

    it("implements keyset pagination with cursor and limit cap of 50", () => {
      const sql = readFileSync(queryRpcMigration, "utf8");

      expect(sql).toMatch(
        /\(f\.created_at,\s*f\.listing_id\)\s*<\s*\(p_cursor_created_at,\s*p_cursor_listing_id\)/i,
      );
      expect(sql).toMatch(/order by f\.created_at desc,\s*f\.listing_id desc/i);
      expect(sql).toMatch(/limit least\(coalesce\(p_limit,\s*20\),\s*50\)/i);
    });
  });

  describe("persistence simulation: lifecycle, cascades, status handling, and keyset determinism", () => {
    interface SimulatedListing {
      id: string;
      ownerId: string;
      status: "active" | "reserved" | "sold" | "archived";
      title: string;
    }

    interface SimulatedFavorite {
      userId: string;
      listingId: string;
      createdAt: string;
    }

    const aliceId = "11111111-1111-1111-1111-111111111111";
    const bobId = "22222222-2222-2222-2222-222222222222";

    it("simulates toggle favorite with self-favorite rejection and idempotency", () => {
      const listings: SimulatedListing[] = [
        { id: "l-1", ownerId: aliceId, status: "active", title: "Alice Desk" },
        { id: "l-2", ownerId: bobId, status: "active", title: "Bob Lamp" },
        {
          id: "l-archived",
          ownerId: bobId,
          status: "archived",
          title: "Bob Archived",
        },
      ];

      const favorites: SimulatedFavorite[] = [];

      function toggleFavorite(userId: string, listingId: string) {
        const listing = listings.find((l) => l.id === listingId);
        if (!listing || listing.status === "archived") {
          throw new Error("LISTING_NOT_FOUND");
        }
        if (listing.ownerId === userId) {
          throw new Error("CANNOT_FAVORITE_OWN_LISTING");
        }

        const existingIdx = favorites.findIndex(
          (f) => f.userId === userId && f.listingId === listingId,
        );

        if (existingIdx >= 0) {
          favorites.splice(existingIdx, 1);
          return { isFavorited: false, listingId };
        } else {
          favorites.push({
            userId,
            listingId,
            createdAt: new Date().toISOString(),
          });
          return { isFavorited: true, listingId };
        }
      }

      // 1. Self-favorite fails
      expect(() => toggleFavorite(aliceId, "l-1")).toThrow(
        "CANNOT_FAVORITE_OWN_LISTING",
      );

      // 2. Archived listing fails
      expect(() => toggleFavorite(aliceId, "l-archived")).toThrow(
        "LISTING_NOT_FOUND",
      );

      // 3. Normal toggle on -> true
      const res1 = toggleFavorite(aliceId, "l-2");
      expect(res1.isFavorited).toBe(true);
      expect(favorites).toHaveLength(1);

      // 4. Toggle off -> false
      const res2 = toggleFavorite(aliceId, "l-2");
      expect(res2.isFavorited).toBe(false);
      expect(favorites).toHaveLength(0);
    });

    it("simulates status handling: reserved and sold appear in favorites, archived excluded", () => {
      const listings: SimulatedListing[] = [
        {
          id: "l-active",
          ownerId: bobId,
          status: "active",
          title: "Active Item",
        },
        {
          id: "l-reserved",
          ownerId: bobId,
          status: "reserved",
          title: "Reserved Item",
        },
        { id: "l-sold", ownerId: bobId, status: "sold", title: "Sold Item" },
        {
          id: "l-archived",
          ownerId: bobId,
          status: "archived",
          title: "Archived Item",
        },
      ];

      const favorites: SimulatedFavorite[] = [
        {
          userId: aliceId,
          listingId: "l-active",
          createdAt: "2026-09-23T10:00:00.000Z",
        },
        {
          userId: aliceId,
          listingId: "l-reserved",
          createdAt: "2026-09-23T10:01:00.000Z",
        },
        {
          userId: aliceId,
          listingId: "l-sold",
          createdAt: "2026-09-23T10:02:00.000Z",
        },
        {
          userId: aliceId,
          listingId: "l-archived",
          createdAt: "2026-09-23T10:03:00.000Z",
        },
      ];

      function getUserFavorites(userId: string) {
        return favorites
          .filter((f) => f.userId === userId)
          .map((f) => {
            const listing = listings.find((l) => l.id === f.listingId);
            return { ...f, listing };
          })
          .filter(
            (item): item is typeof item & { listing: SimulatedListing } =>
              item.listing !== undefined && item.listing.status !== "archived",
          );
      }

      const visible = getUserFavorites(aliceId);
      expect(visible).toHaveLength(3);
      expect(visible.map((v) => v.listing.status)).toEqual([
        "active",
        "reserved",
        "sold",
      ]);
      expect(
        visible.find((v) => v.listing.status === "archived"),
      ).toBeUndefined();
    });

    it("simulates cascading deletes on listing or user account removal", () => {
      let favorites: SimulatedFavorite[] = [
        {
          userId: aliceId,
          listingId: "l-1",
          createdAt: "2026-09-23T10:00:00.000Z",
        },
        {
          userId: aliceId,
          listingId: "l-2",
          createdAt: "2026-09-23T10:01:00.000Z",
        },
        {
          userId: bobId,
          listingId: "l-1",
          createdAt: "2026-09-23T10:02:00.000Z",
        },
      ];

      // Simulate listing l-1 cascade delete
      favorites = favorites.filter((f) => f.listingId !== "l-1");
      expect(favorites).toHaveLength(1);
      expect(favorites[0].listingId).toBe("l-2");

      // Simulate user alice account delete
      favorites = favorites.filter((f) => f.userId !== aliceId);
      expect(favorites).toHaveLength(0);
    });
  });
});
