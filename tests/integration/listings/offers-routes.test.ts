import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCreateOfferHandler } from "../../../apps/web/src/app/api/marketplace/offers/route.ts";
import { createCounterOfferHandler } from "../../../apps/web/src/app/api/marketplace/offers/[id]/counter/route.ts";
import { createAcceptOfferHandler } from "../../../apps/web/src/app/api/marketplace/offers/[id]/accept/route.ts";
import { createCancelReservationHandler } from "../../../apps/web/src/app/api/marketplace/reservations/[id]/cancel/route.ts";
import { createGetReservationsHandler } from "../../../apps/web/src/app/api/marketplace/reservations/route.ts";
import type { MarketplaceNegotiationService } from "../../../apps/web/src/modules/listings/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const buyerId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const offerId = "44444444-4444-4444-8444-444444444444";
const reservationId = "55555555-5555-4555-8555-555555555555";

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
}

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId: buyerId },
) {
  return () =>
    ({
      async requireActiveIdentity() {
        if (!activeIdentity) {
          throw new Error("UNAUTHENTICATED");
        }
        return activeIdentity;
      },
    }) as never;
}

describe("marketplace offers routes integration (T11 & T12)", () => {
  describe("POST /api/marketplace/offers", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers`,
        {
          listingId,
          amountCents: 2000,
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("UNAUTHENTICATED");
      expect(mockService.createOffer).not.toHaveBeenCalled();
    });

    it("returns 403 when CSRF origin check fails", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = new Request(`${canonicalOrigin}/api/marketplace/offers`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://malicious.evil.com",
        },
        body: JSON.stringify({ listingId, amountCents: 2000 }),
      });
      const res = await handler(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("FORBIDDEN");
      expect(mockService.createOffer).not.toHaveBeenCalled();
    });

    it("returns 400 when request body is not valid JSON", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = new Request(`${canonicalOrigin}/api/marketplace/offers`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
        },
        body: "not-json",
      });
      const res = await handler(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INVALID_INPUT");
    });

    it("returns 400 when service rejects invalid input", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(async () => ({
          status: "invalid" as const,
          fieldErrors: { amountCents: ["Amount must be greater than 0"] },
        })),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers`,
        {
          listingId,
          amountCents: -10,
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INVALID_INPUT");
      expect(body.fieldErrors?.amountCents).toBeDefined();
    });

    it("returns 403 when user attempts self-negotiation", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(async () => ({
          status: "cannot_negotiate_own_listing" as const,
          message:
            "Users cannot negotiate or make offers on their own listings.",
        })),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal({ authUserId: sellerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers`,
        {
          listingId,
          amountCents: 2000,
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 429 when rate limit is exceeded", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(async () => ({
          status: "rate_limited" as const,
          retryAfterSeconds: 30,
        })),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers`,
        {
          listingId,
          amountCents: 2000,
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("RATE_LIMITED");
      expect(body.retryAfterSeconds).toBe(30);
    });

    it("returns 201 on successful offer creation", async () => {
      const createdOffer = {
        offerId,
        listingId,
        amountCents: 2000,
        status: "pending" as const,
      };

      const mockService: Partial<MarketplaceNegotiationService> = {
        createOffer: vi.fn(async () => ({
          status: "success" as const,
          data: createdOffer,
        })),
      };

      const handler = createCreateOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers`,
        {
          listingId,
          amountCents: 2000,
          message: "Interested in this item",
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(createdOffer);
    });
  });

  describe("POST /api/marketplace/offers/[id]/counter", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        counterOffer: vi.fn(),
      };

      const handler = createCounterOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers/${offerId}/counter`,
        {
          amountCents: 2500,
        },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: offerId }),
      });

      expect(res.status).toBe(401);
      expect(mockService.counterOffer).not.toHaveBeenCalled();
    });

    it("returns 201 on successful counteroffer", async () => {
      const counterProposal = {
        offerId: "66666666-6666-4666-8666-666666666666",
        parentOfferId: offerId,
        listingId,
        amountCents: 2500,
        status: "pending" as const,
      };

      const mockService: Partial<MarketplaceNegotiationService> = {
        counterOffer: vi.fn(async () => ({
          status: "success" as const,
          data: counterProposal,
        })),
      };

      const handler = createCounterOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal({ authUserId: sellerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers/${offerId}/counter`,
        {
          amountCents: 2500,
          message: "Can do 25?",
        },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: offerId }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(counterProposal);
    });
  });

  describe("POST /api/marketplace/offers/[id]/accept (T12)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        acceptOffer: vi.fn(),
      };

      const handler = createAcceptOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers/${offerId}/accept`,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: offerId }),
      });

      expect(res.status).toBe(401);
      expect(mockService.acceptOffer).not.toHaveBeenCalled();
    });

    it("returns 409 conflict when listing is already reserved", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        acceptOffer: vi.fn(async () => ({
          status: "listing_already_reserved" as const,
          message: "Listing is already reserved by another accepted offer.",
        })),
      };

      const handler = createAcceptOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal({ authUserId: sellerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers/${offerId}/accept`,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: offerId }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("CONFLICT");
    });

    it("returns 200 on successful acceptance", async () => {
      const reservationData = {
        reservationId,
        listingId,
        agreedPriceCents: 2000,
        status: "active" as const,
      };

      const mockService: Partial<MarketplaceNegotiationService> = {
        acceptOffer: vi.fn(async () => ({
          status: "success" as const,
          data: reservationData,
        })),
      };

      const handler = createAcceptOfferHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal({ authUserId: sellerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/offers/${offerId}/accept`,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: offerId }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(reservationData);
    });
  });

  describe("POST /api/marketplace/reservations/[id]/cancel (T12)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        cancelReservation: vi.fn(),
      };

      const handler = createCancelReservationHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/cancel`,
        { reason: "changed_mind" },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: reservationId }),
      });

      expect(res.status).toBe(401);
      expect(mockService.cancelReservation).not.toHaveBeenCalled();
    });

    it("returns 400 on invalid cancellation reason", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        cancelReservation: vi.fn(async () => ({
          status: "invalid" as const,
          fieldErrors: { reason: ["Invalid reason"] },
        })),
      };

      const handler = createCancelReservationHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/cancel`,
        { reason: "bad_reason" },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: reservationId }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INVALID_INPUT");
    });

    it("returns 200 on successful cancellation", async () => {
      const cancelData = {
        reservationId,
        listingId,
        status: "cancelled" as const,
      };

      const mockService: Partial<MarketplaceNegotiationService> = {
        cancelReservation: vi.fn(async () => ({
          status: "success" as const,
          data: cancelData,
        })),
      };

      const handler = createCancelReservationHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/cancel`,
        { reason: "scheduling_conflict" },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: reservationId }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(cancelData);
    });
  });

  describe("GET /api/marketplace/reservations (T12)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceNegotiationService> = {
        getUserReservations: vi.fn(),
      };

      const handler = createGetReservationsHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/reservations`,
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
    });

    it("returns 200 with user reservations on success", async () => {
      const sampleReservations = [
        {
          id: reservationId,
          listingId,
          buyerId,
          sellerId,
          offerId,
          agreedPriceCents: 2000,
          status: "active" as const,
          createdAt: "2026-09-23T18:00:00.000Z",
        },
      ];

      const mockService: Partial<MarketplaceNegotiationService> = {
        getUserReservations: vi.fn(async () => ({
          status: "success" as const,
          data: sampleReservations,
        })),
      };

      const handler = createGetReservationsHandler(
        mockService as MarketplaceNegotiationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/reservations`,
      );
      const res = await handler(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.items).toEqual(sampleReservations);
    });
  });
});
