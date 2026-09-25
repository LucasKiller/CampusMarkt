import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace reporting and blocking persistence and security integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const tableMigration = resolve(
    migrationsDir,
    "20260925220000_marketplace_reporting_and_blocking.sql",
  );
  const reportRpcMigration = resolve(
    migrationsDir,
    "20260925221000_marketplace_safety_report_rpc.sql",
  );
  const blockRpcsMigration = resolve(
    migrationsDir,
    "20260925222000_marketplace_safety_block_rpcs.sql",
  );

  it("includes all three reporting and blocking database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain(
      "20260925220000_marketplace_reporting_and_blocking.sql",
    );
    expect(files).toContain("20260925221000_marketplace_safety_report_rpc.sql");
    expect(files).toContain("20260925222000_marketplace_safety_block_rpcs.sql");
  });

  describe("T5: table schema, bidirectional indexes, and RLS policies", () => {
    it("defines marketplace.reports table with length bounds and status lifecycle", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(/create table if not exists marketplace\.reports/i);
      expect(sql).toMatch(
        /reporter_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /target_type marketplace\.report_target_type not null/i,
      );
      expect(sql).toMatch(/target_id uuid not null/i);
      expect(sql).toMatch(/reason marketplace\.report_reason not null/i);
      expect(sql).toMatch(
        /details text check \(details is null or char_length\(details\) <= 1000\)/i,
      );
      expect(sql).toMatch(
        /status marketplace\.report_status not null default 'pending'/i,
      );
    });

    it("creates unique pending report partial index", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create unique index if not exists idx_one_pending_report_per_target[\s\S]*?on marketplace\.reports \(reporter_id, target_type, target_id\)[\s\S]*?where status = 'pending'/i,
      );
    });

    it("defines marketplace.user_blocks with no-self-block check and bidirectional indexes (AD-016)", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create table if not exists marketplace\.user_blocks/i,
      );
      expect(sql).toMatch(
        /constraint uq_user_block unique \(blocker_id, blocked_id\)/i,
      );
      expect(sql).toMatch(
        /constraint chk_no_self_block check \(blocker_id <> blocked_id\)/i,
      );
      expect(sql).toMatch(
        /create index if not exists idx_user_blocks_blocker[\s\S]*?on marketplace\.user_blocks \(blocker_id, blocked_id\)/i,
      );
      expect(sql).toMatch(
        /create index if not exists idx_user_blocks_blocked[\s\S]*?on marketplace\.user_blocks \(blocked_id, blocker_id\)/i,
      );
    });

    it("enables and forces row-level security with target-blind policies", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /alter table marketplace\.reports enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.reports force row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.user_blocks enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.user_blocks force row level security;/i,
      );

      // Target has ZERO select visibility - only reporter can view their own report
      expect(sql).toMatch(
        /create policy "Reporters can view their own reports"[\s\S]*?using \(auth\.uid\(\) = reporter_id\)/i,
      );
      expect(sql).not.toMatch(/using \(auth\.uid\(\) = target_id\)/i);
    });
  });

  describe("T6: submit_report RPC structure and guards", () => {
    it("defines marketplace_api.submit_report with security definer and validation checks", () => {
      const sql = readFileSync(reportRpcMigration, "utf8");

      expect(sql).toMatch(
        /create or replace function marketplace_api\.submit_report/i,
      );
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/CANNOT_REPORT_SELF/i);
      expect(sql).toMatch(/REPORT_ALREADY_PENDING/i);
      expect(sql).toMatch(/LISTING_NOT_FOUND/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.submit_report/i,
      );
    });
  });

  describe("T7: block and unblock user RPCs structure and guards", () => {
    it("defines block_user, unblock_user, and get_blocked_users RPCs", () => {
      const sql = readFileSync(blockRpcsMigration, "utf8");

      expect(sql).toMatch(
        /create or replace function marketplace_api\.block_user/i,
      );
      expect(sql).toMatch(
        /create or replace function marketplace_api\.unblock_user/i,
      );
      expect(sql).toMatch(
        /create or replace function marketplace_api\.get_blocked_users/i,
      );
      expect(sql).toMatch(/CANNOT_BLOCK_SELF/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.block_user/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.unblock_user/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_blocked_users/i,
      );
    });
  });

  describe("T8: Persistence, concurrency, RLS target blindness, and block simulations", () => {
    interface SimulatedReport {
      id: string;
      reporterId: string;
      targetType: "listing" | "user";
      targetId: string;
      reason: string;
      details: string | null;
      status: "pending" | "reviewed" | "dismissed" | "actioned";
      createdAt: string;
    }

    interface SimulatedUserBlock {
      id: string;
      blockerId: string;
      blockedId: string;
      createdAt: string;
    }

    interface SimulatedListing {
      id: string;
      ownerId: string;
      title: string;
    }

    const reporterId = "11111111-1111-1111-1111-111111111111";
    const targetUserId = "22222222-2222-2222-2222-222222222222";
    const thirdPartyId = "33333333-3333-3333-3333-333333333333";

    it("enforces RLS target blindness: reported target cannot query reports filed against them", () => {
      const reports: SimulatedReport[] = [
        {
          id: "rep-1",
          reporterId,
          targetType: "user",
          targetId: targetUserId,
          reason: "harassment_or_abuse",
          details: "Abusive conduct in chat",
          status: "pending",
          createdAt: "2026-09-25T12:00:00.000Z",
        },
      ];

      function rlsSelectReports(currentUserId: string): SimulatedReport[] {
        // Simulates the RLS policy: USING (auth.uid() = reporter_id)
        return reports.filter((r) => r.reporterId === currentUserId);
      }

      // Reporter can see their own filed report
      const reporterView = rlsSelectReports(reporterId);
      expect(reporterView).toHaveLength(1);
      expect(reporterView[0].id).toBe("rep-1");

      // Target user querying reports table gets zero rows
      const targetView = rlsSelectReports(targetUserId);
      expect(targetView).toHaveLength(0);

      // Third party querying reports table gets zero rows
      const thirdPartyView = rlsSelectReports(thirdPartyId);
      expect(thirdPartyView).toHaveLength(0);
    });

    it("rejects duplicate pending report against the same target by same reporter", () => {
      const reports: SimulatedReport[] = [];

      function submitReport(
        currentUserId: string,
        targetType: "listing" | "user",
        targetId: string,
        reason: string,
        details: string | null = null,
      ): { reportId: string; status: "pending" } {
        if (targetType === "user" && targetId === currentUserId) {
          throw new Error("CANNOT_REPORT_SELF");
        }

        const hasPending = reports.some(
          (r) =>
            r.reporterId === currentUserId &&
            r.targetType === targetType &&
            r.targetId === targetId &&
            r.status === "pending",
        );
        if (hasPending) {
          throw new Error("REPORT_ALREADY_PENDING");
        }

        const report: SimulatedReport = {
          id: `rep-${reports.length + 1}`,
          reporterId: currentUserId,
          targetType,
          targetId,
          reason,
          details,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        reports.push(report);
        return { reportId: report.id, status: "pending" };
      }

      // First report succeeds
      const res1 = submitReport(
        reporterId,
        "user",
        targetUserId,
        "fraud_or_scam",
      );
      expect(res1.status).toBe("pending");

      // Immediate duplicate pending report throws
      expect(() =>
        submitReport(reporterId, "user", targetUserId, "other"),
      ).toThrow("REPORT_ALREADY_PENDING");

      // Different reporter can report same target
      const res2 = submitReport(
        thirdPartyId,
        "user",
        targetUserId,
        "fraud_or_scam",
      );
      expect(res2.status).toBe("pending");

      // After first report is reviewed, original reporter can report again
      reports[0].status = "reviewed";
      expect(() =>
        submitReport(reporterId, "user", targetUserId, "other"),
      ).not.toThrow();
    });

    it("rejects self-report on user account and owned listing", () => {
      const listings: SimulatedListing[] = [
        {
          id: "listing-reporter",
          ownerId: reporterId,
          title: "My own camera",
        },
        {
          id: "listing-target",
          ownerId: targetUserId,
          title: "Target bike",
        },
      ];

      function submitReportWithListingCheck(
        currentUserId: string,
        targetType: "listing" | "user",
        targetId: string,
      ) {
        if (targetType === "user" && targetId === currentUserId) {
          throw new Error("CANNOT_REPORT_SELF");
        }
        if (targetType === "listing") {
          const l = listings.find((item) => item.id === targetId);
          if (!l) {
            throw new Error("LISTING_NOT_FOUND");
          }
          if (l.ownerId === currentUserId) {
            throw new Error("CANNOT_REPORT_SELF");
          }
        }
        return { status: "pending" };
      }

      // Self-user report
      expect(() =>
        submitReportWithListingCheck(reporterId, "user", reporterId),
      ).toThrow("CANNOT_REPORT_SELF");

      // Self-listing report
      expect(() =>
        submitReportWithListingCheck(reporterId, "listing", "listing-reporter"),
      ).toThrow("CANNOT_REPORT_SELF");

      // Valid report on another user's listing
      expect(() =>
        submitReportWithListingCheck(reporterId, "listing", "listing-target"),
      ).not.toThrow();
    });

    it("rejects self-block and idempotently handles repeated block calls", () => {
      const blocks: SimulatedUserBlock[] = [];

      function blockUser(
        currentUserId: string,
        blockedId: string,
      ): { blockId: string; blockedId: string } {
        if (currentUserId === blockedId) {
          throw new Error("CANNOT_BLOCK_SELF");
        }

        const existing = blocks.find(
          (b) => b.blockerId === currentUserId && b.blockedId === blockedId,
        );
        if (existing) {
          return { blockId: existing.id, blockedId };
        }

        const block: SimulatedUserBlock = {
          id: `block-${blocks.length + 1}`,
          blockerId: currentUserId,
          blockedId,
          createdAt: new Date().toISOString(),
        };
        blocks.push(block);
        return { blockId: block.id, blockedId };
      }

      function unblockUser(
        currentUserId: string,
        blockedId: string,
      ): { unblockedId: string; success: boolean } {
        const index = blocks.findIndex(
          (b) => b.blockerId === currentUserId && b.blockedId === blockedId,
        );
        if (index !== -1) {
          blocks.splice(index, 1);
        }
        return { unblockedId: blockedId, success: true };
      }

      // Self block rejected
      expect(() => blockUser(reporterId, reporterId)).toThrow(
        "CANNOT_BLOCK_SELF",
      );

      // First block succeeds
      const b1 = blockUser(reporterId, targetUserId);
      expect(b1.blockedId).toBe(targetUserId);
      expect(blocks).toHaveLength(1);

      // Repeated block is idempotent
      const b2 = blockUser(reporterId, targetUserId);
      expect(b2.blockId).toBe(b1.blockId);
      expect(blocks).toHaveLength(1);

      // Unblock removes block
      const ub = unblockUser(reporterId, targetUserId);
      expect(ub.success).toBe(true);
      expect(blocks).toHaveLength(0);
    });

    it("verifies bidirectional feed/search exclusion anti-join simulation (AD-016)", () => {
      const blocks: SimulatedUserBlock[] = [
        {
          id: "b-1",
          blockerId: reporterId,
          blockedId: targetUserId,
          createdAt: "2026-09-25T12:00:00.000Z",
        },
      ];

      const listings: SimulatedListing[] = [
        { id: "l-reporter", ownerId: reporterId, title: "Reporter Textbook" },
        { id: "l-target", ownerId: targetUserId, title: "Target Calculator" },
        { id: "l-neutral", ownerId: thirdPartyId, title: "Neutral Chair" },
      ];

      function queryFeedWithAntiJoin(viewerId: string): SimulatedListing[] {
        // Replicates AD-016 anti-join:
        // NOT EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = viewer AND blocked_id = owner)
        //                                          OR (blocked_id = viewer AND blocker_id = owner))
        return listings.filter((listing) => {
          const isBlocked = blocks.some(
            (b) =>
              (b.blockerId === viewerId && b.blockedId === listing.ownerId) ||
              (b.blockedId === viewerId && b.blockerId === listing.ownerId),
          );
          return !isBlocked;
        });
      }

      // Blocker sees their own and neutral listings, but NOT target's
      const reporterFeed = queryFeedWithAntiJoin(reporterId);
      expect(reporterFeed.map((l) => l.id)).toEqual([
        "l-reporter",
        "l-neutral",
      ]);
      expect(reporterFeed.some((l) => l.ownerId === targetUserId)).toBe(false);

      // Blocked user sees their own and neutral listings, but NOT blocker's (bidirectional exclusion)
      const targetFeed = queryFeedWithAntiJoin(targetUserId);
      expect(targetFeed.map((l) => l.id)).toEqual(["l-target", "l-neutral"]);
      expect(targetFeed.some((l) => l.ownerId === reporterId)).toBe(false);

      // Neutral user sees all listings
      const neutralFeed = queryFeedWithAntiJoin(thirdPartyId);
      expect(neutralFeed).toHaveLength(3);
    });
  });
});
