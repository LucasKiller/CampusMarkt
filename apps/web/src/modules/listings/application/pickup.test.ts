import { describe, expect, it, vi } from "vitest";

import {
  CAMPUS_PICKUP_SPOTS,
  SAFE_PICKUP_RULES,
  createMarketplacePickupService,
  type PickupRepositoryPort,
  type PickupSecurityAudit,
} from "./pickup";
import type { CompletePickupResult } from "../server/pickup-repository";
import type { TransactionReceiptDTO } from "@campusmarkt/types";

describe("MarketplacePickupService", () => {
  const userId = "44444444-4444-4444-8444-444444444444";
  const reservationId = "33333333-3333-4333-8333-333333333333";
  const listingId = "11111111-1111-4111-8111-111111111111";

  const successResult: CompletePickupResult = {
    reservationId,
    listingId,
    status: "completed",
    agreedPriceCents: 5000,
    completedAt: "2026-09-25T12:00:00.000Z",
  };

  function createMockRepo(
    overrides?: Partial<PickupRepositoryPort>,
  ): PickupRepositoryPort {
    return {
      completePickup: vi.fn().mockResolvedValue({
        ok: true,
        value: successResult,
      }),
      getCompletedTransactions: vi.fn().mockResolvedValue({
        ok: true,
        value: [],
      }),
      ...overrides,
    };
  }

  describe("getSafePickupGuidance", () => {
    it("returns campus spots and safety rules", () => {
      const repo = createMockRepo();
      const service = createMarketplacePickupService({ repository: repo });

      const guidance = service.getSafePickupGuidance();
      expect(guidance.rules).toEqual(SAFE_PICKUP_RULES);
      expect(guidance.spots).toEqual(CAMPUS_PICKUP_SPOTS);
    });
  });

  describe("completePickup", () => {
    it("successfully completes pickup and records telemetry", async () => {
      const repo = createMockRepo();
      const recordTelemetry = vi.fn().mockResolvedValue(undefined);
      const checkRateLimit = vi.fn().mockResolvedValue({ allowed: true });
      const security: PickupSecurityAudit = { recordTelemetry, checkRateLimit };

      const service = createMarketplacePickupService({
        repository: repo,
        security,
      });

      const res = await service.completePickup(
        userId,
        reservationId,
        { completionNote: "Smooth handover" },
        { correlationId: "test-corr-id" },
      );

      expect(res).toEqual({
        status: "success",
        data: successResult,
      });
      expect(repo.completePickup).toHaveBeenCalledWith(
        reservationId,
        "Smooth handover",
      );
      expect(checkRateLimit).toHaveBeenCalledWith(userId, "complete_pickup");
      expect(recordTelemetry).toHaveBeenCalledWith({
        eventType: "marketplace.pickup.completed",
        correlationId: "test-corr-id",
        metadata: {
          userId,
          reservationId,
          listingId,
          agreedPriceCents: 5000,
          outcome: "succeeded",
        },
        timestamp: expect.any(String),
      });
    });

    it("rejects unauthenticated caller", async () => {
      const repo = createMockRepo();
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup("", reservationId);
      expect(res).toEqual({ status: "unauthenticated" });
      expect(repo.completePickup).not.toHaveBeenCalled();
    });

    it("rejects invalid reservation ID", async () => {
      const repo = createMockRepo();
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, "not-a-uuid");
      expect(res.status).toBe("invalid");
      expect(repo.completePickup).not.toHaveBeenCalled();
    });

    it("rejects invalid completion note payload", async () => {
      const repo = createMockRepo();
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, reservationId, {
        completionNote: "a".repeat(501),
      });
      expect(res.status).toBe("invalid");
      expect(repo.completePickup).not.toHaveBeenCalled();
    });

    it("returns rate_limited when rate limit is exceeded", async () => {
      const repo = createMockRepo();
      const security: PickupSecurityAudit = {
        checkRateLimit: vi.fn().mockResolvedValue({
          allowed: false,
          retryAfterSeconds: 45,
        }),
      };
      const service = createMarketplacePickupService({
        repository: repo,
        security,
      });

      const res = await service.completePickup(userId, reservationId);
      expect(res).toEqual({
        status: "rate_limited",
        retryAfterSeconds: 45,
      });
      expect(repo.completePickup).not.toHaveBeenCalled();
    });

    it("maps FORBIDDEN error from repository", async () => {
      const repo = createMockRepo({
        completePickup: vi.fn().mockResolvedValue({
          ok: false,
          code: "FORBIDDEN",
          message: "Only the seller can mark the handover as completed.",
        }),
      });
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, reservationId);
      expect(res).toEqual({
        status: "forbidden",
        message: "Only the seller can mark the handover as completed.",
      });
    });

    it("maps NOT_FOUND error from repository", async () => {
      const repo = createMockRepo({
        completePickup: vi.fn().mockResolvedValue({
          ok: false,
          code: "NOT_FOUND",
          message: "RESERVATION_NOT_FOUND",
        }),
      });
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, reservationId);
      expect(res).toEqual({
        status: "not_found",
        message: "RESERVATION_NOT_FOUND",
      });
    });

    it("maps RESERVATION_NOT_ACTIVE error to conflict", async () => {
      const repo = createMockRepo({
        completePickup: vi.fn().mockResolvedValue({
          ok: false,
          code: "RESERVATION_NOT_ACTIVE",
          message: "RESERVATION_NOT_ACTIVE",
        }),
      });
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, reservationId);
      expect(res).toEqual({
        status: "conflict",
        message: "RESERVATION_NOT_ACTIVE",
      });
    });

    it("maps RESERVATION_ALREADY_COMPLETED error to conflict", async () => {
      const repo = createMockRepo({
        completePickup: vi.fn().mockResolvedValue({
          ok: false,
          code: "RESERVATION_ALREADY_COMPLETED",
          message: "RESERVATION_ALREADY_COMPLETED",
        }),
      });
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, reservationId);
      expect(res).toEqual({
        status: "conflict",
        message: "RESERVATION_ALREADY_COMPLETED",
      });
    });

    it("maps unexpected repository failure to unavailable", async () => {
      const repo = createMockRepo({
        completePickup: vi.fn().mockResolvedValue({
          ok: false,
          code: "DEPENDENCY_UNAVAILABLE",
        }),
      });
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.completePickup(userId, reservationId);
      expect(res).toEqual({ status: "unavailable" });
    });
  });

  describe("getCompletedTransactions", () => {
    it("successfully retrieves user transaction history", async () => {
      const mockHistory: TransactionReceiptDTO[] = [
        {
          reservationId,
          listingId,
          listingTitle: "Laptop Stand",
          listingType: "SELL",
          agreedPriceCents: 1500,
          status: "completed",
          pickupArea: "campus_nord_bienrode",
          completedAt: "2026-09-25T13:00:00.000Z",
          role: "seller",
          partner: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Bob",
          },
        },
      ];

      const repo = createMockRepo({
        getCompletedTransactions: vi.fn().mockResolvedValue({
          ok: true,
          value: mockHistory,
        }),
      });
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.getCompletedTransactions(userId, { limit: 10 });
      expect(res).toEqual({
        status: "success",
        data: mockHistory,
      });
      expect(repo.getCompletedTransactions).toHaveBeenCalledWith(10);
    });

    it("rejects unauthenticated caller", async () => {
      const repo = createMockRepo();
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.getCompletedTransactions("");
      expect(res).toEqual({ status: "unauthenticated" });
      expect(repo.getCompletedTransactions).not.toHaveBeenCalled();
    });

    it("rejects invalid query parameters", async () => {
      const repo = createMockRepo();
      const service = createMarketplacePickupService({ repository: repo });

      const res = await service.getCompletedTransactions(userId, {
        limit: 200,
      });
      expect(res.status).toBe("invalid");
      expect(repo.getCompletedTransactions).not.toHaveBeenCalled();
    });
  });
});
