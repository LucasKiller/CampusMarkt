import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace listings migrations structure and schema integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const listingMigrationFile = resolve(
    migrationsDir,
    "20260922100000_marketplace_listings.sql",
  );

  it("includes the marketplace listings migration file", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260922100000_marketplace_listings.sql");
  });

  it("declares marketplace and marketplace_api schemas with strict permission revocations", () => {
    const sql = readFileSync(listingMigrationFile, "utf8");

    expect(sql).toMatch(/create schema if not exists marketplace;/i);
    expect(sql).toMatch(/create schema if not exists marketplace_api;/i);
    expect(sql).toMatch(
      /revoke all on schema marketplace from public, anon, authenticated;/i,
    );
    expect(sql).toMatch(
      /revoke all on schema marketplace_api from public, anon, authenticated, service_role;/i,
    );
    expect(sql).toMatch(
      /grant usage on schema marketplace_api to anon, authenticated, service_role;/i,
    );
  });

  it("configures marketplace.listings with required constraints, types, and cascade deletion", () => {
    const sql = readFileSync(listingMigrationFile, "utf8");

    // Primary key & FK cascade
    expect(sql).toMatch(/id uuid primary key default gen_random_uuid\(\)/i);
    expect(sql).toMatch(
      /owner_id uuid not null\s+references identity\.accounts\(auth_user_id\) on delete cascade/i,
    );

    // Checks for listing_type
    expect(sql).toMatch(
      /listing_type text not null\s+check \(listing_type in \('SELL', 'GIVE_AWAY', 'WANTED'\)\)/i,
    );

    // Title & description length checks
    expect(sql).toMatch(
      /title text not null\s+check \(char_length\(title\) between 5 and 100\)/i,
    );
    expect(sql).toMatch(
      /description text not null\s+check \(char_length\(description\) between 10 and 2000\)/i,
    );

    // Enums checks for category, pickup_area, condition, status
    expect(sql).toMatch(/'furniture'/i);
    expect(sql).toMatch(/'electronics'/i);
    expect(sql).toMatch(/'books_studies'/i);
    expect(sql).toMatch(/'bicycles_mobility'/i);
    expect(sql).toMatch(/'clothing'/i);
    expect(sql).toMatch(/'home_kitchen'/i);
    expect(sql).toMatch(/'other'/i);

    expect(sql).toMatch(/'innenstadt'/i);
    expect(sql).toMatch(/'campus_tu_altgebaeude'/i);
    expect(sql).toMatch(/'campus_nord_bienrode'/i);

    expect(sql).toMatch(
      /check \(condition in \('NEW', 'LIKE_NEW', 'GOOD', 'FAIR'\)\)/i,
    );
    expect(sql).toMatch(
      /check \(status in \('active', 'reserved', 'sold', 'archived'\)\)/i,
    );

    // Price rules constraint
    expect(sql).toMatch(
      /listing_type = 'SELL' and price_cents is not null and price_cents between 50 and 1000000/i,
    );
    expect(sql).toMatch(
      /listing_type = 'GIVE_AWAY' and \(price_cents is null or price_cents = 0\)/i,
    );
    expect(sql).toMatch(
      /listing_type = 'WANTED' and \(price_cents is null or price_cents between 50 and 1000000\)/i,
    );
  });

  it("configures marketplace.listing_media with foreign key cascade, position bounds, and uniqueness", () => {
    const sql = readFileSync(listingMigrationFile, "utf8");

    expect(sql).toMatch(
      /listing_id uuid not null\s+references marketplace\.listings\(id\) on delete cascade/i,
    );
    expect(sql).toMatch(
      /position smallint not null\s+check \(position between 0 and 7\)/i,
    );
    expect(sql).toMatch(/unique \(listing_id, position\)/i);
    expect(sql).toMatch(/unique \(listing_id, storage_path\)/i);
  });

  it("enables and forces row level security on listings and listing_media tables", () => {
    const sql = readFileSync(listingMigrationFile, "utf8");

    expect(sql).toMatch(
      /alter table marketplace\.listings enable row level security;/i,
    );
    expect(sql).toMatch(
      /alter table marketplace\.listings force row level security;/i,
    );
    expect(sql).toMatch(
      /alter table marketplace\.listing_media enable row level security;/i,
    );
    expect(sql).toMatch(
      /alter table marketplace\.listing_media force row level security;/i,
    );
  });

  it("revokes all permissions from public/anon/authenticated and grants table access only to service_role", () => {
    const sql = readFileSync(listingMigrationFile, "utf8");

    expect(sql).toMatch(
      /revoke all on all tables in schema marketplace from public, anon, authenticated;/i,
    );
    expect(sql).toMatch(
      /grant select, insert, update, delete on table marketplace\.listings to service_role;/i,
    );
    expect(sql).toMatch(
      /grant select, insert, update, delete on table marketplace\.listing_media to service_role;/i,
    );
  });

  describe("create_listing RPC migration", () => {
    const rpcMigrationFile = resolve(
      migrationsDir,
      "20260922101000_marketplace_create_listing_rpc.sql",
    );

    it("includes create_listing RPC migration file", () => {
      const files = readdirSync(migrationsDir);
      expect(files).toContain(
        "20260922101000_marketplace_create_listing_rpc.sql",
      );
    });

    it("verifies account state is active_confirmed and not deletion-pending", () => {
      const sql = readFileSync(rpcMigrationFile, "utf8");

      expect(sql).toMatch(
        /select state, deletion_requested_at into v_account/i,
      );
      expect(sql).toMatch(
        /if v_account\.state <> 'active_confirmed' or v_account\.deletion_requested_at is not null then/i,
      );
    });

    it("atomically creates listing and inserts up to 8 media records", () => {
      const sql = readFileSync(rpcMigrationFile, "utf8");

      expect(sql).toMatch(/insert into marketplace\.listings/i);
      expect(sql).toMatch(/insert into marketplace\.listing_media/i);
      expect(sql).toMatch(/v_media_count < 1 or v_media_count > 8/i);
    });

    it("secures RPC with SECURITY DEFINER, empty search_path, and explicit grants", () => {
      const sql = readFileSync(rpcMigrationFile, "utf8");

      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.create_listing/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.create_listing.*to authenticated, service_role;/i,
      );
    });
  });

  describe("update_listing and transition_listing_status RPC migrations", () => {
    const manageRpcFile = resolve(
      migrationsDir,
      "20260922102000_marketplace_manage_listing_rpc.sql",
    );

    it("includes manage listing RPC migration file", () => {
      const files = readdirSync(migrationsDir);
      expect(files).toContain(
        "20260922102000_marketplace_manage_listing_rpc.sql",
      );
    });

    it("enforces owner equality and locks listing_type from mutation in update_listing", () => {
      const sql = readFileSync(manageRpcFile, "utf8");

      expect(sql).toMatch(/if v_listing\.owner_id <> p_caller_id then/i);
      expect(sql).toMatch(/listing intent cannot be changed/i);
    });

    it("enforces state machine guards and owner equality in transition_listing_status", () => {
      const sql = readFileSync(manageRpcFile, "utf8");

      expect(sql).toMatch(/if v_listing\.owner_id <> p_caller_id then/i);
      expect(sql).toMatch(
        /v_listing\.status = 'active' and p_target_status in \('reserved', 'sold', 'archived'\)/i,
      );
      expect(sql).toMatch(
        /v_listing\.status = 'reserved' and p_target_status in \('active', 'sold', 'archived'\)/i,
      );
      expect(sql).toMatch(
        /v_listing\.status = 'sold' and p_target_status = 'archived'/i,
      );
      expect(sql).toMatch(/invalid status transition from/i);
    });

    it("exposes owner management queries and restricts execution permissions", () => {
      const sql = readFileSync(manageRpcFile, "utf8");

      expect(sql).toMatch(
        /create function marketplace_api\.get_owner_listing/i,
      );
      expect(sql).toMatch(
        /create function marketplace_api\.list_owner_listings/i,
      );
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.update_listing/i,
      );
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.transition_listing_status/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.update_listing.*to authenticated, service_role;/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.transition_listing_status.*to authenticated, service_role;/i,
      );
    });
  });
});
