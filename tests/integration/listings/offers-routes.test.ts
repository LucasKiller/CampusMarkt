import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCreateOfferHandler } from "../../../apps/web/src/app/api/marketplace/offers/route.ts";
import { createCounterOfferHandler } from "../../../apps/web/src/app/api/marketplace/offers/[id]/counter/route.ts";
import type { MarketplaceNegotiationService } from "../../../apps/web/src/modules/listings/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const buyerId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const offerId = "44444444-4444-4444-8444-444444444444";

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

describe("marketplace offers routes integration (T11)", () => {
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
});
