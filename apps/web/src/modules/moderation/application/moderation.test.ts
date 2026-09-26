import { describe, expect, it, vi } from "vitest";

import type {
  ExecuteModerationActionResponse,
  ModerationActionDTO,
  ModerationQueueItemDTO,
} from "@campusmarkt/types";
import type {
  MarketplaceModerationRepository,
  MarketplaceModerationResult,
} from "../server/moderation-repository";
import {
  createMarketplaceModerationService,
  type ModerationTelemetryEvent,
} from "./moderation";

describe("MarketplaceModerationService", () => {
  const moderatorId = "11111111-1111-4111-8111-111111111111";
  const regularUserId = "22222222-2222-4222-8222-222222222222";
  const reportId = "33333333-3333-4333-8333-333333333333";
  const listingId = "44444444-4444-4444-8444-444444444444";
  const targetUserId = "55555555-5555-4555-8555-555555555555";

  function createMockRepo(
    overrides: Partial<MarketplaceModerationRepository> = {},
  ): MarketplaceModerationRepository {
    return {
      isModerator: vi.fn(
        async (
          userId?: string,
        ): Promise<MarketplaceModerationResult<boolean>> => ({
          ok: true,
          value: userId === moderatorId,
        }),
      ),
      getModerationQueue: vi.fn(
        async (): Promise<
          MarketplaceModerationResult<ModerationQueueItemDTO[]>
        > => ({
          ok: true,
          value: [],
        }),
      ),
      dismissReport: vi.fn(
        async (): Promise<
          MarketplaceModerationResult<ExecuteModerationActionResponse>
        > => ({
          ok: true,
          value: { success: true, status: "dismissed" },
        }),
      ),
      removeListing: vi.fn(
        async (): Promise<
          MarketplaceModerationResult<ExecuteModerationActionResponse>
        > => ({
          ok: true,
          value: { success: true, status: "removed" },
        }),
      ),
      suspendUser: vi.fn(
        async (): Promise<
          MarketplaceModerationResult<ExecuteModerationActionResponse>
        > => ({
          ok: true,
          value: { success: true, status: "suspended" },
        }),
      ),
      getAuditLog: vi.fn(
        async (): Promise<
          MarketplaceModerationResult<ModerationActionDTO[]>
        > => ({
          ok: true,
          value: [],
        }),
      ),
      ...overrides,
    };
  }

  describe("checkModeratorStatus", () => {
    it("returns isModerator: true for valid moderator", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.checkModeratorStatus(moderatorId);
      expect(res.isModerator).toBe(true);
    });

    it("returns isModerator: false for non-moderator or missing id", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({ repository: repo });

      const res1 = await service.checkModeratorStatus(regularUserId);
      expect(res1.isModerator).toBe(false);

      const res2 = await service.checkModeratorStatus("");
      expect(res2.isModerator).toBe(false);
    });
  });

  describe("getModerationQueue", () => {
    it("returns forbidden for non-moderators", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.getModerationQueue(regularUserId);
      expect(res.status).toBe("forbidden");
    });

    it("returns queue items for authorized moderator", async () => {
      const queueItem: ModerationQueueItemDTO = {
        id: reportId,
        targetType: "listing",
        targetId: listingId,
        reason: "prohibited_content",
        status: "pending",
        createdAt: "2026-09-26T01:00:00.000Z",
      };
      const repo = createMockRepo({
        getModerationQueue: vi.fn(async () => ({
          ok: true as const,
          value: [queueItem],
        })),
      });
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.getModerationQueue(moderatorId);
      expect(res.status).toBe("success");
      if (res.status === "success") {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].id).toBe(reportId);
      }
    });
  });

  describe("executeModerationAction", () => {
    it("rejects non-moderators with forbidden", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.executeModerationAction(regularUserId, {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Unfounded",
      });
      expect(res.status).toBe("forbidden");
    });

    it("validates input and returns invalid for missing reason", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.executeModerationAction(moderatorId, {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "   ",
      });
      expect(res.status).toBe("invalid");
    });

    it("coordinates dismiss_report and emits telemetry", async () => {
      const telemetryEvents: ModerationTelemetryEvent[] = [];
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({
        repository: repo,
        security: {
          recordTelemetry: async (evt) => {
            telemetryEvents.push(evt);
          },
        },
      });

      const res = await service.executeModerationAction(
        moderatorId,
        {
          actionType: "dismiss_report",
          targetType: "listing",
          targetId: listingId,
          reportId,
          reason: "Report is unfounded",
        },
        { correlationId: "test-corr-1" },
      );

      expect(res.status).toBe("success");
      expect(repo.dismissReport).toHaveBeenCalledWith(
        reportId,
        "Report is unfounded",
      );
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].eventType).toBe(
        "marketplace.moderation.dismissed",
      );
      expect(telemetryEvents[0].correlationId).toBe("test-corr-1");
    });

    it("coordinates remove_listing and emits telemetry", async () => {
      const telemetryEvents: ModerationTelemetryEvent[] = [];
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({
        repository: repo,
        security: {
          recordTelemetry: async (evt) => {
            telemetryEvents.push(evt);
          },
        },
      });

      const res = await service.executeModerationAction(
        moderatorId,
        {
          actionType: "remove_listing",
          targetType: "listing",
          targetId: listingId,
          reportId,
          reason: "Prohibited item listed",
        },
        { correlationId: "test-corr-2" },
      );

      expect(res.status).toBe("success");
      expect(repo.removeListing).toHaveBeenCalledWith(
        listingId,
        "Prohibited item listed",
        reportId,
      );
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].eventType).toBe(
        "marketplace.moderation.listing_removed",
      );
    });

    it("coordinates suspend_user and emits telemetry", async () => {
      const telemetryEvents: ModerationTelemetryEvent[] = [];
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({
        repository: repo,
        security: {
          recordTelemetry: async (evt) => {
            telemetryEvents.push(evt);
          },
        },
      });

      const res = await service.executeModerationAction(
        moderatorId,
        {
          actionType: "suspend_user",
          targetType: "user",
          targetId: targetUserId,
          reportId,
          reason: "Confirmed fraudulent behavior",
        },
        { correlationId: "test-corr-3" },
      );

      expect(res.status).toBe("success");
      expect(repo.suspendUser).toHaveBeenCalledWith(
        targetUserId,
        "Confirmed fraudulent behavior",
        reportId,
      );
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].eventType).toBe(
        "marketplace.moderation.user_suspended",
      );
    });

    it("maps repository conflict error when report is already resolved", async () => {
      const repo = createMockRepo({
        dismissReport: vi.fn(async () => ({
          ok: false as const,
          code: "CONFLICT" as const,
          message: "REPORT_ALREADY_RESOLVED",
        })),
      });
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.executeModerationAction(moderatorId, {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Duplicate resolution attempt",
      });

      expect(res.status).toBe("conflict");
    });
  });

  describe("getAuditLog", () => {
    it("returns audit log items for authorized moderator", async () => {
      const auditItem: ModerationActionDTO = {
        id: "audit-1",
        moderatorId,
        reportId,
        actionType: "remove_listing",
        targetType: "listing",
        targetId: listingId,
        reason: "Violates terms",
        createdAt: "2026-09-26T02:00:00.000Z",
      };
      const repo = createMockRepo({
        getAuditLog: vi.fn(async () => ({
          ok: true as const,
          value: [auditItem],
        })),
      });
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.getAuditLog(moderatorId, {
        limit: 10,
        offset: 0,
      });
      expect(res.status).toBe("success");
      if (res.status === "success") {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].id).toBe("audit-1");
      }
      expect(repo.getAuditLog).toHaveBeenCalledWith(10, 0);
    });

    it("rejects non-moderator with forbidden", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceModerationService({ repository: repo });

      const res = await service.getAuditLog(regularUserId);
      expect(res.status).toBe("forbidden");
    });
  });
});
