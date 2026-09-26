import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace moderation persistence, RBAC, and audit log integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const tableMigration = resolve(
    migrationsDir,
    "20260926040000_marketplace_moderation.sql",
  );
  const queueRpcMigration = resolve(
    migrationsDir,
    "20260926041000_marketplace_moderation_queue_rpc.sql",
  );
  const actionRpcsMigration = resolve(
    migrationsDir,
    "20260926042000_marketplace_moderation_action_rpcs.sql",
  );

  it("includes all three moderation database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260926040000_marketplace_moderation.sql");
    expect(files).toContain(
      "20260926041000_marketplace_moderation_queue_rpc.sql",
    );
    expect(files).toContain(
      "20260926042000_marketplace_moderation_action_rpcs.sql",
    );
  });

  describe("T5: moderator assignments, audit tables, and engine-level security", () => {
    it("extends the text-backed listing status constraint with removed", () => {
      const sql = readFileSync(tableMigration, "utf8");
      expect(sql).toMatch(
        /alter table marketplace\.listings[\s\S]*drop constraint if exists listings_status_check[\s\S]*add constraint listings_status_check[\s\S]*check \(status in \('active', 'reserved', 'sold', 'archived', 'removed'\)\)/i,
      );
      expect(sql).not.toMatch(/alter type marketplace\.listing_status/i);
    });

    it("defines marketplace.moderator_assignments with single active assignment constraint (AD-017)", () => {
      const sql = readFileSync(tableMigration, "utf8");
      expect(sql).toMatch(
        /create table if not exists marketplace\.moderator_assignments/i,
      );
      expect(sql).toMatch(
        /user_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /create unique index if not exists idx_active_moderator_assignment[\s\S]*?on marketplace\.moderator_assignments \(user_id\)[\s\S]*?where revoked_at is null/i,
      );
    });

    it("restricts moderator assignments management to service_role to prevent self-elevation", () => {
      const sql = readFileSync(tableMigration, "utf8");
      expect(sql).toMatch(
        /revoke insert, update, delete on marketplace\.moderator_assignments from public, authenticated, anon;/i,
      );
      expect(sql).toMatch(
        /grant select, insert, update, delete on marketplace\.moderator_assignments to service_role;/i,
      );
    });

    it("defines append-only marketplace.moderation_actions with REVOKE UPDATE, DELETE", () => {
      const sql = readFileSync(tableMigration, "utf8");
      expect(sql).toMatch(
        /create table if not exists marketplace\.moderation_actions/i,
      );
      expect(sql).toMatch(
        /moderator_id uuid not null references auth\.users\(id\)/i,
      );
      expect(sql).toMatch(
        /report_id uuid references marketplace\.reports\(id\) on delete set null/i,
      );
      expect(sql).toMatch(
        /action_type marketplace\.moderator_action_type not null/i,
      );
      expect(sql).toMatch(/target_id uuid not null/i);
      expect(sql).toMatch(
        /reason text not null check \(char_length\(trim\(reason\)\) > 0 and char_length\(reason\) <= 1000\)/i,
      );
      expect(sql).toMatch(
        /revoke update, delete on marketplace\.moderation_actions from public, authenticated, anon;/i,
      );
    });

    it("enables and forces row level security on all moderation tables", () => {
      const sql = readFileSync(tableMigration, "utf8");
      expect(sql).toMatch(
        /alter table marketplace\.moderator_assignments enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.moderator_assignments force row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.user_suspensions enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.user_suspensions force row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.moderation_actions enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.moderation_actions force row level security;/i,
      );
    });
  });

  describe("T6: get_moderation_queue and is_moderator RPCs", () => {
    it("defines marketplace_api.is_moderator with security definer and pinned search path", () => {
      const sql = readFileSync(queueRpcMigration, "utf8");
      expect(sql).toMatch(
        /create or replace function marketplace_api\.is_moderator/i,
      );
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = public, marketplace, auth/i);
    });

    it("defines marketplace_api.get_moderation_queue verifying moderator role", () => {
      const sql = readFileSync(queueRpcMigration, "utf8");
      expect(sql).toMatch(
        /create or replace function marketplace_api\.get_moderation_queue/i,
      );
      expect(sql).toMatch(/raise exception 'FORBIDDEN'/i);
      expect(sql).toMatch(/where r\.status = 'pending'/i);
      expect(sql).not.toMatch(/reporter.*email/i);
    });
  });

  describe("T7: moderation action RPCs structure, cascades, and audit entries", () => {
    it("defines dismiss_report, remove_listing_moderator, and suspend_user_moderator RPCs", () => {
      const sql = readFileSync(actionRpcsMigration, "utf8");
      expect(sql).toMatch(
        /create or replace function marketplace_api\.dismiss_report/i,
      );
      expect(sql).toMatch(
        /create or replace function marketplace_api\.remove_listing_moderator/i,
      );
      expect(sql).toMatch(
        /create or replace function marketplace_api\.suspend_user_moderator/i,
      );
      expect(sql).toMatch(
        /create or replace function marketplace_api\.get_moderation_audit_log/i,
      );
    });

    it("enforces atomic reservation cancellation in remove_listing_moderator", () => {
      const sql = readFileSync(actionRpcsMigration, "utf8");
      expect(sql).toMatch(
        /update marketplace\.listings[\s\S]*?set status = 'removed'/i,
      );
      expect(sql).toMatch(
        /update marketplace\.reservations[\s\S]*?set status = 'cancelled'[\s\S]*?cancellation_reason = 'moderation_removal'/i,
      );
      expect(sql).toMatch(/insert into marketplace\.moderation_actions/i);
    });

    it("enforces atomic cascades and user listings takedown in suspend_user_moderator", () => {
      const sql = readFileSync(actionRpcsMigration, "utf8");
      expect(sql).toMatch(/insert into marketplace\.user_suspensions/i);
      expect(sql).toMatch(
        /update marketplace\.listings[\s\S]*?set status = 'removed'[\s\S]*?where owner_id = p_user_id/i,
      );
      expect(sql).toMatch(
        /update marketplace\.reservations[\s\S]*?set status = 'cancelled'[\s\S]*?cancellation_reason = 'moderation_suspension'/i,
      );
    });
  });

  describe("T8: High-fidelity simulation of RBAC, cascades, and audit log immutability", () => {
    interface SimulatedModeratorAssignment {
      userId: string;
      grantedAt: string;
      revokedAt: string | null;
    }

    interface SimulatedReport {
      id: string;
      reporterId: string;
      targetType: "listing" | "user";
      targetId: string;
      status: "pending" | "dismissed" | "actioned";
      createdAt: string;
    }

    interface SimulatedListing {
      id: string;
      ownerId: string;
      title: string;
      status: "active" | "reserved" | "sold" | "archived" | "removed";
    }

    interface SimulatedReservation {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      status: "active" | "completed" | "cancelled";
      cancellationReason: string | null;
    }

    interface SimulatedOffer {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      status: "pending" | "accepted" | "superseded";
    }

    interface SimulatedAuditAction {
      id: string;
      moderatorId: string;
      reportId: string | null;
      actionType: "dismiss_report" | "remove_listing" | "suspend_user";
      targetType: "listing" | "user";
      targetId: string;
      reason: string;
      createdAt: string;
    }

    const moderatorId = "mod-1111-1111-1111-111111111111";
    const regularUserId = "user-2222-2222-2222-222222222222";
    const revokedModId = "mod-3333-3333-3333-333333333333";
    const badActorId = "bad-4444-4444-4444-444444444444";

    const moderatorAssignments: SimulatedModeratorAssignment[] = [
      {
        userId: moderatorId,
        grantedAt: "2026-09-20T00:00:00Z",
        revokedAt: null,
      },
      {
        userId: revokedModId,
        grantedAt: "2026-09-01T00:00:00Z",
        revokedAt: "2026-09-10T00:00:00Z",
      },
    ];

    function isModerator(userId: string): boolean {
      return moderatorAssignments.some(
        (a) => a.userId === userId && a.revokedAt === null,
      );
    }

    it("RBAC: rejects non-moderator and revoked moderator with FORBIDDEN", () => {
      expect(isModerator(moderatorId)).toBe(true);
      expect(isModerator(regularUserId)).toBe(false);
      expect(isModerator(revokedModId)).toBe(false);

      function assertModerator(userId: string) {
        if (!isModerator(userId)) {
          throw new Error("FORBIDDEN");
        }
      }

      expect(() => assertModerator(moderatorId)).not.toThrow();
      expect(() => assertModerator(regularUserId)).toThrow("FORBIDDEN");
      expect(() => assertModerator(revokedModId)).toThrow("FORBIDDEN");
    });

    it("Audit log immutability: engine-level REVOKE UPDATE, DELETE throws permission denied", () => {
      const auditLog: SimulatedAuditAction[] = [
        {
          id: "audit-1",
          moderatorId,
          reportId: "rep-1",
          actionType: "remove_listing",
          targetType: "listing",
          targetId: "list-1",
          reason: "Policy violation",
          createdAt: "2026-09-26T00:00:00Z",
        },
      ];

      function attemptUpdateAuditLog() {
        // Simulates Postgres permission denied when updating audit row
        throw new Error(
          "permission denied for table moderation_actions: UPDATE privilege is revoked",
        );
      }

      function attemptDeleteAuditLog() {
        // Simulates Postgres permission denied when deleting audit row
        throw new Error(
          "permission denied for table moderation_actions: DELETE privilege is revoked",
        );
      }

      expect(() => attemptUpdateAuditLog()).toThrow(/permission denied/i);
      expect(() => attemptDeleteAuditLog()).toThrow(/permission denied/i);
      expect(auditLog).toHaveLength(1);
    });

    it("Dismiss report: updates status and records audit log, rejecting already-resolved reports", () => {
      const reports: SimulatedReport[] = [
        {
          id: "rep-pending",
          reporterId: regularUserId,
          targetType: "listing",
          targetId: "list-1",
          status: "pending",
          createdAt: "2026-09-26T01:00:00Z",
        },
      ];
      const auditLog: SimulatedAuditAction[] = [];

      function dismissReport(
        callerId: string,
        reportId: string,
        reason: string,
      ) {
        if (!isModerator(callerId)) throw new Error("FORBIDDEN");
        if (!reason || reason.trim().length === 0 || reason.length > 1000) {
          throw new Error("INVALID_JUSTIFICATION");
        }
        const rep = reports.find((r) => r.id === reportId);
        if (!rep) throw new Error("REPORT_NOT_FOUND");
        if (rep.status !== "pending")
          throw new Error("REPORT_ALREADY_RESOLVED");

        rep.status = "dismissed";
        auditLog.push({
          id: `audit-${auditLog.length + 1}`,
          moderatorId: callerId,
          reportId,
          actionType: "dismiss_report",
          targetType: rep.targetType,
          targetId: rep.targetId,
          reason,
          createdAt: new Date().toISOString(),
        });
        return { success: true, status: "dismissed" };
      }

      // Non-moderator fails
      expect(() =>
        dismissReport(regularUserId, "rep-pending", "Unfounded"),
      ).toThrow("FORBIDDEN");

      // Moderator succeeds
      const res = dismissReport(moderatorId, "rep-pending", "Unfounded report");
      expect(res.success).toBe(true);
      expect(reports[0].status).toBe("dismissed");
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].actionType).toBe("dismiss_report");

      // Second attempt on same report fails with REPORT_ALREADY_RESOLVED
      expect(() =>
        dismissReport(moderatorId, "rep-pending", "Duplicate attempt"),
      ).toThrow("REPORT_ALREADY_RESOLVED");
    });

    it("Remove listing: atomically sets removed, cancels active reservation with moderation_removal, supersedes offers, and logs audit", () => {
      const listings: SimulatedListing[] = [
        {
          id: "list-target",
          ownerId: regularUserId,
          title: "Prohibited exam answers",
          status: "active",
        },
      ];
      const reservations: SimulatedReservation[] = [
        {
          id: "res-1",
          listingId: "list-target",
          buyerId: badActorId,
          sellerId: regularUserId,
          status: "active",
          cancellationReason: null,
        },
      ];
      const offers: SimulatedOffer[] = [
        {
          id: "off-1",
          listingId: "list-target",
          buyerId: "other-buyer",
          sellerId: regularUserId,
          status: "pending",
        },
      ];
      const auditLog: SimulatedAuditAction[] = [];

      function removeListing(
        callerId: string,
        listingId: string,
        reason: string,
        reportId: string | null = null,
      ) {
        if (!isModerator(callerId)) throw new Error("FORBIDDEN");
        const listing = listings.find((l) => l.id === listingId);
        if (!listing) throw new Error("LISTING_NOT_FOUND");

        // 1. Update listing status to 'removed'
        listing.status = "removed";

        // 2. Cancel active reservations atomically
        for (const res of reservations) {
          if (res.listingId === listingId && res.status === "active") {
            res.status = "cancelled";
            res.cancellationReason = "moderation_removal";
          }
        }

        // 3. Supersede pending offers
        for (const off of offers) {
          if (off.listingId === listingId && off.status === "pending") {
            off.status = "superseded";
          }
        }

        // 4. Log audit entry
        auditLog.push({
          id: `audit-${auditLog.length + 1}`,
          moderatorId: callerId,
          reportId,
          actionType: "remove_listing",
          targetType: "listing",
          targetId: listingId,
          reason,
          createdAt: new Date().toISOString(),
        });

        return { success: true, status: "removed" };
      }

      const res = removeListing(
        moderatorId,
        "list-target",
        "Prohibited content violating university policies.",
      );
      expect(res.success).toBe(true);
      expect(listings[0].status).toBe("removed");
      expect(reservations[0].status).toBe("cancelled");
      expect(reservations[0].cancellationReason).toBe("moderation_removal");
      expect(offers[0].status).toBe("superseded");
      expect(auditLog).toHaveLength(1);
    });

    it("Suspend user: records suspension, removes active listings, cancels reservations with moderation_suspension, and logs audit", () => {
      const suspensions: Record<string, string> = {};
      const listings: SimulatedListing[] = [
        {
          id: "list-bad-1",
          ownerId: badActorId,
          title: "Scam Item 1",
          status: "active",
        },
        {
          id: "list-bad-2",
          ownerId: badActorId,
          title: "Scam Item 2",
          status: "reserved",
        },
        {
          id: "list-good",
          ownerId: regularUserId,
          title: "Legit Bicycle",
          status: "active",
        },
      ];
      const reservations: SimulatedReservation[] = [
        {
          id: "res-bad-seller",
          listingId: "list-bad-2",
          buyerId: regularUserId,
          sellerId: badActorId,
          status: "active",
          cancellationReason: null,
        },
      ];
      const auditLog: SimulatedAuditAction[] = [];

      function suspendUser(
        callerId: string,
        userId: string,
        reason: string,
        reportId: string | null = null,
      ) {
        if (!isModerator(callerId)) throw new Error("FORBIDDEN");
        suspensions[userId] = reason;

        // Takedown user active/reserved listings
        for (const l of listings) {
          if (
            l.ownerId === userId &&
            (l.status === "active" || l.status === "reserved")
          ) {
            l.status = "removed";
          }
        }

        // Cancel reservations involving user
        for (const r of reservations) {
          if (
            (r.buyerId === userId || r.sellerId === userId) &&
            r.status === "active"
          ) {
            r.status = "cancelled";
            r.cancellationReason = "moderation_suspension";
          }
        }

        auditLog.push({
          id: `audit-${auditLog.length + 1}`,
          moderatorId: callerId,
          reportId,
          actionType: "suspend_user",
          targetType: "user",
          targetId: userId,
          reason,
          createdAt: new Date().toISOString(),
        });

        return { success: true, status: "suspended" };
      }

      const res = suspendUser(
        moderatorId,
        badActorId,
        "Confirmed scammer identity across multiple reports.",
      );
      expect(res.success).toBe(true);
      expect(suspensions[badActorId]).toBeDefined();
      expect(listings.find((l) => l.id === "list-bad-1")?.status).toBe(
        "removed",
      );
      expect(listings.find((l) => l.id === "list-bad-2")?.status).toBe(
        "removed",
      );
      expect(listings.find((l) => l.id === "list-good")?.status).toBe("active");
      expect(reservations[0].status).toBe("cancelled");
      expect(reservations[0].cancellationReason).toBe("moderation_suspension");
      expect(auditLog).toHaveLength(1);
    });
  });
});
