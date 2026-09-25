import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  BlockUserResponse,
  CreateReportRequest,
  ReportConfirmationDTO,
  UnblockUserResponse,
  UserBlockDTO,
} from "@campusmarkt/types";
import {
  createMarketplaceSafetyService,
  SafetyRateLimiter,
  type SafetySecurityAudit,
} from "./safety";
import type { MarketplaceSafetyRepository } from "../server/safety-repository";

describe("MarketplaceSafetyService", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const otherUserId = "22222222-2222-4222-8222-222222222222";
  const listingId = "33333333-3333-4333-8333-333333333333";

  let mockRepo: MarketplaceSafetyRepository;
  let mockSecurity: SafetySecurityAudit;

  beforeEach(() => {
    mockRepo = {
      submitReport: vi.fn(),
      blockUser: vi.fn(),
      unblockUser: vi.fn(),
      getBlockedUsers: vi.fn(),
    };
    mockSecurity = {
      recordTelemetry: vi.fn(),
      checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    };
  });

  describe("submitReport", () => {
    const validReportInput: CreateReportRequest = {
      targetType: "listing",
      targetId: listingId,
      reason: "prohibited_content",
      details: "Inappropriate content.",
    };

    it("rejects unauthenticated user", async () => {
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.submitReport("", validReportInput);

      expect(res.status).toBe("unauthenticated");
      expect(mockRepo.submitReport).not.toHaveBeenCalled();
    });

    it("rejects invalid input", async () => {
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.submitReport(userId, {
        targetType: "invalid_type",
      });

      expect(res.status).toBe("invalid");
      expect(mockRepo.submitReport).not.toHaveBeenCalled();
    });

    it("rejects self-reporting on user target before hitting repo", async () => {
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.submitReport(userId, {
        targetType: "user",
        targetId: userId,
        reason: "harassment_or_abuse",
      });

      expect(res.status).toBe("cannot_report_self");
      expect(mockRepo.submitReport).not.toHaveBeenCalled();
    });

    it("submits report successfully and records telemetry", async () => {
      const reportReceipt: ReportConfirmationDTO = {
        reportId: "44444444-4444-4444-8444-444444444444",
        status: "pending",
        createdAt: "2026-09-25T12:00:00.000Z",
      };

      (mockRepo.submitReport as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: reportReceipt,
      });

      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.submitReport(userId, validReportInput, {
        correlationId: "corr-1",
      });

      expect(res.status).toBe("success");
      if (res.status === "success") {
        expect(res.data.reportId).toBe(reportReceipt.reportId);
      }
      expect(mockSecurity.recordTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "marketplace.report.submitted",
          correlationId: "corr-1",
          metadata: expect.objectContaining({
            userId,
            targetType: "listing",
            outcome: "success",
          }),
        }),
      );
    });

    it("handles duplicate pending report error as conflict", async () => {
      (mockRepo.submitReport as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        code: "REPORT_ALREADY_PENDING",
        message: "A pending report already exists for this target.",
      });

      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.submitReport(userId, validReportInput);

      expect(res.status).toBe("conflict");
    });
  });

  describe("blockUser", () => {
    it("rejects unauthenticated user", async () => {
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.blockUser("", { blockedId: otherUserId });

      expect(res.status).toBe("unauthenticated");
      expect(mockRepo.blockUser).not.toHaveBeenCalled();
    });

    it("rejects self-blocking before repository call", async () => {
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.blockUser(userId, { blockedId: userId });

      expect(res.status).toBe("cannot_block_self");
      expect(mockRepo.blockUser).not.toHaveBeenCalled();
    });

    it("blocks user successfully and emits telemetry", async () => {
      const blockRes: BlockUserResponse = {
        blockId: "55555555-5555-4555-8555-555555555555",
        blockedId: otherUserId,
        createdAt: "2026-09-25T12:00:00.000Z",
      };

      (mockRepo.blockUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: blockRes,
      });

      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.blockUser(
        userId,
        { blockedId: otherUserId },
        { correlationId: "corr-block" },
      );

      expect(res.status).toBe("success");
      if (res.status === "success") {
        expect(res.data.blockId).toBe(blockRes.blockId);
      }
      expect(mockSecurity.recordTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "marketplace.user.blocked",
          correlationId: "corr-block",
        }),
      );
    });
  });

  describe("unblockUser", () => {
    it("rejects invalid UUID format", async () => {
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.unblockUser(userId, "not-a-uuid");

      expect(res.status).toBe("invalid");
      expect(mockRepo.unblockUser).not.toHaveBeenCalled();
    });

    it("unblocks user successfully", async () => {
      const unblockRes: UnblockUserResponse = {
        unblockedId: otherUserId,
        success: true,
      };

      (mockRepo.unblockUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: unblockRes,
      });

      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.unblockUser(userId, otherUserId);

      expect(res.status).toBe("success");
      if (res.status === "success") {
        expect(res.data.unblockedId).toBe(otherUserId);
      }
      expect(mockSecurity.recordTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "marketplace.user.unblocked",
        }),
      );
    });
  });

  describe("getBlockedUsers", () => {
    it("returns list of blocked users", async () => {
      const mockList: UserBlockDTO[] = [
        {
          id: "66666666-6666-4666-8666-666666666666",
          blockedId: otherUserId,
          blockedName: "Troublemaker",
          avatarUrl: null,
          createdAt: "2026-09-25T12:00:00.000Z",
        },
      ];

      (mockRepo.getBlockedUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: mockList,
      });

      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        security: mockSecurity,
      });

      const res = await service.getBlockedUsers(userId);

      expect(res.status).toBe("success");
      if (res.status === "success") {
        expect(res.data.items).toHaveLength(1);
        expect(res.data.items[0].blockedName).toBe("Troublemaker");
      }
    });
  });

  describe("Rate limiting (10 actions/min)", () => {
    it("enforces 10 actions per minute per user via rate limiter", async () => {
      (mockRepo.blockUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: {
          blockId: "id",
          blockedId: otherUserId,
          createdAt: new Date().toISOString(),
        },
      });

      const limiter = new SafetyRateLimiter();
      const service = createMarketplaceSafetyService({
        repository: mockRepo,
        rateLimiter: limiter,
      });

      // Execute 10 actions
      for (let i = 0; i < 10; i++) {
        const res = await service.blockUser(userId, { blockedId: otherUserId });
        expect(res.status).toBe("success");
      }

      // 11th action should be rate limited
      const rateLimitedRes = await service.blockUser(userId, {
        blockedId: otherUserId,
      });
      expect(rateLimitedRes.status).toBe("rate_limited");
      if (rateLimitedRes.status === "rate_limited") {
        expect(rateLimitedRes.retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });
});
