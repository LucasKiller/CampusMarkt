import { describe, expect, it } from "vitest";
import {
  REQUIRED_TABLES,
  calculateChecksum,
  executeBackupVerification,
  verifyDumpContent,
} from "./backup-verify.ts";

describe("backup verification and restore check script", () => {
  const validMockDump = `
-- PostgreSQL database dump
CREATE SCHEMA IF NOT EXISTS "marketplace";

CREATE TABLE "marketplace"."listings" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    title text NOT NULL,
    price_cents integer
);

CREATE TABLE "marketplace"."profiles" (
    id uuid NOT NULL,
    display_name text NOT NULL
);

CREATE TABLE "marketplace"."moderation_actions" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_id uuid NOT NULL,
    action_type text NOT NULL
);

COPY "marketplace"."listings" (id, seller_id, title, price_cents) FROM stdin;
00000000-0000-4000-8000-000000000001\t11111111-1111-4111-8111-111111111111\tVintage Desk\t4500
00000000-0000-4000-8000-000000000002\t11111111-1111-4111-8111-111111111111\tChair\t1500
\\.

COPY "marketplace"."profiles" (id, display_name) FROM stdin;
11111111-1111-4111-8111-111111111111\tTU Student
\\.

INSERT INTO "marketplace"."moderation_actions" (id, target_id, action_type) VALUES ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'dismiss');
`;

  it("calculates deterministic SHA-256 checksums", () => {
    const hash1 = calculateChecksum("test-backup-payload");
    const hash2 = calculateChecksum("test-backup-payload");
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it("rejects empty or whitespace database dumps", () => {
    const emptyResult = verifyDumpContent("");
    expect(emptyResult.ok).toBe(false);
    expect(emptyResult.error).toBe("EMPTY_DUMP");

    const whitespaceResult = verifyDumpContent("   \n\t  ");
    expect(whitespaceResult.ok).toBe(false);
    expect(whitespaceResult.error).toBe("EMPTY_DUMP");
  });

  it("identifies missing required tables in dump", () => {
    const partialDump = `
CREATE TABLE "marketplace"."listings" (
    id uuid NOT NULL
);
`;
    const result = verifyDumpContent(partialDump);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("MISSING_TABLES");
    expect(result.message).toContain("marketplace.profiles");
    expect(result.message).toContain("marketplace.moderation_actions");
  });

  it("verifies dump containing all required tables and accurately counts rows", () => {
    const result = verifyDumpContent(validMockDump);

    expect(result.ok).toBe(true);
    expect(result.checksum).toBeDefined();
    expect(result.tables).toBeDefined();
    expect(result.tables?.length).toBe(REQUIRED_TABLES.length);

    const listingsTable = result.tables?.find(
      (t) => t.tableName === "marketplace.listings",
    );
    expect(listingsTable?.schemaPresent).toBe(true);
    expect(listingsTable?.rowCount).toBe(2);

    const profilesTable = result.tables?.find(
      (t) => t.tableName === "marketplace.profiles",
    );
    expect(profilesTable?.schemaPresent).toBe(true);
    expect(profilesTable?.rowCount).toBe(1);

    const moderationTable = result.tables?.find(
      (t) => t.tableName === "marketplace.moderation_actions",
    );
    expect(moderationTable?.schemaPresent).toBe(true);
    expect(moderationTable?.rowCount).toBe(1);
  });

  it("handles missing environment variables gracefully", () => {
    const originalUrl = process.env.DATABASE_URL;
    const originalSupabase = process.env.SUPABASE_DB_URL;
    try {
      delete process.env.DATABASE_URL;
      delete process.env.SUPABASE_DB_URL;

      const result = executeBackupVerification({});
      expect(result.ok).toBe(false);
      expect(result.error).toBe("MISSING_ENV");
    } finally {
      if (originalUrl) process.env.DATABASE_URL = originalUrl;
      if (originalSupabase) process.env.SUPABASE_DB_URL = originalSupabase;
    }
  });

  it("handles execution failures and custom dump providers gracefully", () => {
    const failingProvider = () => {
      throw new Error("Connection timed out to host");
    };

    const result = executeBackupVerification({
      dbUrl: "postgresql://postgres:secret@localhost:5432/campusmarkt",
      dumpProvider: failingProvider,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("DUMP_EXECUTION_FAILED");
    expect(result.message).toContain("Connection timed out");
  });

  it("successfully verifies when custom dump provider supplies valid content", () => {
    const successfulProvider = () => validMockDump;

    const result = executeBackupVerification({
      dbUrl: "postgresql://postgres:secret@localhost:5432/campusmarkt",
      dumpProvider: successfulProvider,
    });

    expect(result.ok).toBe(true);
    expect(result.tables?.length).toBe(3);
  });
});
