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
});
