import { describe, expect, it, vi } from "vitest";

import {
  createMarketplaceNegotiationService,
  type NegotiationRepositoryPort,
  type NegotiationSecurityAudit,
  type NegotiationTelemetryEvent,
} from "./negotiation";
import type { OfferDTO, ReservationDTO } from "@campusmarkt/types";

describe("MarketplaceNegotiationService", () => {
  const validBuyerId = "11111111-1111-4111-8111-111111111111";
  const validSellerId = "22222222-2222-4222-8222-222222222222";
  const validListingId = "33333333-3333-4333-8333-333333333333";
  const validOfferId = "44444444-4444-4444-8444-444444444444";
  const validReservationId = "55555555-5555-4555-8555-555555555555";

  function createMockRepo(
    overrides: Partial<NegotiationRepositoryPort> = {},
  ): NegotiationRepositoryPort {
    return {
      createOffer: vi.fn(async (listingId, amountCents) => ({
        ok: true as const,
        value: {
          offerId: validOfferId,
          listingId,
          amountCents,
          status: "pending" as const,
        },
      })),
      counterOffer: vi.fn(async (parentOfferId, amountCents) => ({
        ok: true as const,
        value: {
          offerId: "66666666-6666-4666-8666-666666666666",
          parentOfferId,
          listingId: validListingId,
          amountCents,
          status: "pending" as const,
        },
      })),
      acceptOffer: vi.fn(async () => ({
        ok: true as const,
        value: {
          reservationId: validReservationId,
          listingId: validListingId,
          agreedPriceCents: 2000,
          status: "active" as const,
        },
      })),
      cancelReservation: vi.fn(async (reservationId) => ({
        ok: true as const,
        value: {
          reservationId,
          listingId: validListingId,
          status: "cancelled" as const,
        },
      })),
      declineOffer: vi.fn(async (offerId) => ({
        ok: true as const,
        value: { offerId, status: "declined" as const },
      })),
      withdrawOffer: vi.fn(async (offerId) => ({
        ok: true as const,
        value: { offerId, status: "withdrawn" as const },
      })),
      getOffersForListing: vi.fn(async () => ({
        ok: true as const,
        value: [] as OfferDTO[],
      })),
      getActiveReservationForListing: vi.fn(async () => ({
        ok: true as const,
        value: null as ReservationDTO | null,
      })),
      getUserReservations: vi.fn(async () => ({
        ok: true as const,
        value: [] as ReservationDTO[],
      })),
      ...overrides,
    };
  }

  describe("createOffer", () => {
    it("rejects unauthenticated user", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.createOffer("", {
        listingId: validListingId,
        amountCents: 2000,
      });

      expect(result).toEqual({ status: "unauthenticated" });
      expect(repo.createOffer).not.toHaveBeenCalled();
    });

    it("rejects invalid input", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.createOffer(validBuyerId, {
        listingId: "not-a-uuid",
        amountCents: -50,
      });

      expect(result.status).toBe("invalid");
      expect(repo.createOffer).not.toHaveBeenCalled();
    });

    it("rejects self-negotiation when sellerId matches userId", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.createOffer(
        validBuyerId,
        {
          listingId: validListingId,
          amountCents: 2000,
        },
        { sellerId: validBuyerId },
      );

      expect(result).toEqual({
        status: "cannot_negotiate_own_listing",
        message: "Users cannot negotiate or make offers on their own listings.",
      });
      expect(repo.createOffer).not.toHaveBeenCalled();
    });

    it("enforces rate limit (15 actions/minute)", async () => {
      const repo = createMockRepo();
      const telemetryEvents: NegotiationTelemetryEvent[] = [];
      const security: NegotiationSecurityAudit = {
        checkRateLimit: vi.fn(async () => ({
          allowed: false,
          retryAfterSeconds: 45,
        })),
        recordTelemetry: vi.fn(async (event) => {
          telemetryEvents.push(event);
        }),
      };
      const service = createMarketplaceNegotiationService({
        repository: repo,
        security,
      });

      const result = await service.createOffer(validBuyerId, {
        listingId: validListingId,
        amountCents: 2000,
      });

      expect(result).toEqual({
        status: "rate_limited",
        retryAfterSeconds: 45,
      });
      expect(repo.createOffer).not.toHaveBeenCalled();
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].metadata?.outcome).toBe("rate_limited");
    });

    it("successfully creates offer and records telemetry", async () => {
      const repo = createMockRepo();
      const telemetryEvents: NegotiationTelemetryEvent[] = [];
      const security: NegotiationSecurityAudit = {
        checkRateLimit: vi.fn(async () => ({ allowed: true })),
        recordTelemetry: vi.fn(async (event) => {
          telemetryEvents.push(event);
        }),
      };
      const service = createMarketplaceNegotiationService({
        repository: repo,
        security,
      });

      const result = await service.createOffer(validBuyerId, {
        listingId: validListingId,
        amountCents: 2000,
        message: "Can pick up today",
      });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.offerId).toBe(validOfferId);
      }
      expect(repo.createOffer).toHaveBeenCalledWith(
        validListingId,
        2000,
        "Can pick up today",
      );
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].eventType).toBe("offer.created");
      expect(telemetryEvents[0].metadata?.outcome).toBe("success");
    });

    it("maps repository CANNOT_NEGOTIATE_OWN_LISTING error", async () => {
      const repo = createMockRepo({
        createOffer: vi.fn(async () => ({
          ok: false as const,
          code: "CANNOT_NEGOTIATE_OWN_LISTING" as const,
          message:
            "Users cannot negotiate or make offers on their own listings.",
        })),
      });
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.createOffer(validBuyerId, {
        listingId: validListingId,
        amountCents: 2000,
      });

      expect(result).toEqual({
        status: "cannot_negotiate_own_listing",
        message: "Users cannot negotiate or make offers on their own listings.",
      });
    });

    it("maps repository LISTING_ALREADY_RESERVED error", async () => {
      const repo = createMockRepo({
        createOffer: vi.fn(async () => ({
          ok: false as const,
          code: "LISTING_ALREADY_RESERVED" as const,
          message: "Listing is already reserved by another accepted offer.",
        })),
      });
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.createOffer(validBuyerId, {
        listingId: validListingId,
        amountCents: 2000,
      });

      expect(result).toEqual({
        status: "listing_already_reserved",
        message: "Listing is already reserved by another accepted offer.",
      });
    });
  });

  describe("counterOffer", () => {
    it("validates parentOfferId and creates counteroffer", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.counterOffer(validSellerId, validOfferId, {
        amountCents: 2500,
        message: "Would you consider 25?",
      });

      expect(result.status).toBe("success");
      expect(repo.counterOffer).toHaveBeenCalledWith(
        validOfferId,
        2500,
        "Would you consider 25?",
      );
    });

    it("rejects invalid parentOfferId", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.counterOffer(validSellerId, "not-valid", {
        amountCents: 2500,
      });

      expect(result.status).toBe("invalid");
      expect(repo.counterOffer).not.toHaveBeenCalled();
    });
  });

  describe("acceptOffer", () => {
    it("accepts offer and returns active reservation", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.acceptOffer(validSellerId, validOfferId);

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.reservationId).toBe(validReservationId);
        expect(result.data.status).toBe("active");
      }
      expect(repo.acceptOffer).toHaveBeenCalledWith(validOfferId);
    });

    it("maps LISTING_ALREADY_RESERVED conflict", async () => {
      const repo = createMockRepo({
        acceptOffer: vi.fn(async () => ({
          ok: false as const,
          code: "LISTING_ALREADY_RESERVED" as const,
          message: "Listing already reserved",
        })),
      });
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.acceptOffer(validSellerId, validOfferId);
      expect(result.status).toBe("listing_already_reserved");
    });
  });

  describe("cancelReservation", () => {
    it("cancels active reservation with valid reason", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.cancelReservation(
        validBuyerId,
        validReservationId,
        {
          reason: "scheduling_conflict",
        },
      );

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.status).toBe("cancelled");
      }
      expect(repo.cancelReservation).toHaveBeenCalledWith(
        validReservationId,
        "scheduling_conflict",
      );
    });

    it("rejects invalid cancellation reason", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.cancelReservation(
        validBuyerId,
        validReservationId,
        {
          reason: "unsupported_reason",
        },
      );

      expect(result.status).toBe("invalid");
      expect(repo.cancelReservation).not.toHaveBeenCalled();
    });
  });

  describe("declineOffer and withdrawOffer", () => {
    it("declines offer", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.declineOffer(validSellerId, validOfferId);
      expect(result.status).toBe("success");
    });

    it("withdraws offer", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceNegotiationService({ repository: repo });

      const result = await service.withdrawOffer(validBuyerId, validOfferId);
      expect(result.status).toBe("success");
    });
  });
});
