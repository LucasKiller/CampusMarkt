import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCompletePickupHandler } from "../../../apps/web/src/app/api/marketplace/reservations/[id]/complete/route.ts";
import { createGetCompletedHistoryHandler } from "../../../apps/web/src/app/api/marketplace/reservations/history/route.ts";
import type { MarketplacePickupService } from "../../../apps/web/src/modules/listings/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const sellerId = "11111111-1111-4111-8111-111111111111";
const buyerId = "22222222-2222-4222-8222-222222222222";
const reservationId = "33333333-3333-4333-8333-333333333333";
const listingId = "44444444-4444-4444-8444-444444444444";

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
  activeIdentity: { authUserId: string } | null = { authUserId: sellerId },
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

describe("POST /api/marketplace/reservations/[id]/complete (T11)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn(),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      { completionNote: "Done" },
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(mockService.completePickup).not.toHaveBeenCalled();
  });

  it("returns 403 when CSRF origin check fails", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn(),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = new Request(
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.attacker.com",
        },
        body: JSON.stringify({ completionNote: "Done" }),
      },
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
    expect(mockService.completePickup).not.toHaveBeenCalled();
  });

  it("returns 200 on success with completed receipt", async () => {
    const mockReceipt = {
      reservationId,
      listingId,
      status: "completed" as const,
      agreedPriceCents: 4500,
      completedAt: "2026-09-25T14:00:00.000Z",
    };

    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn().mockResolvedValue({
        status: "success",
        data: mockReceipt,
      }),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      { completionNote: "Handover verified" },
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual(mockReceipt);
    expect(mockService.completePickup).toHaveBeenCalledWith(
      sellerId,
      reservationId,
      { completionNote: "Handover verified" },
      expect.objectContaining({ correlationId: expect.any(String) }),
    );
  });

  it("returns 403 on non-seller access", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn().mockResolvedValue({
        status: "forbidden",
        message: "Only the seller can mark the handover as completed.",
      }),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal({ authUserId: buyerId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      {},
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 409 on conflict (e.g. reservation not active or already completed)", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn().mockResolvedValue({
        status: "conflict",
        message: "Reservation is not active and cannot be completed.",
      }),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      {},
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("CONFLICT");
  });

  it("returns 404 when reservation not found", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn().mockResolvedValue({
        status: "not_found",
        message: "Reservation not found.",
      }),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      {},
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("returns 429 when rate limited", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      completePickup: vi.fn().mockResolvedValue({
        status: "rate_limited",
        retryAfterSeconds: 60,
      }),
    };

    const handler = createCompletePickupHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      `${canonicalOrigin}/api/marketplace/reservations/${reservationId}/complete`,
      {},
    );
    const res = await handler(req, { params: { id: reservationId } });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/marketplace/reservations/history (T12)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      getCompletedTransactions: vi.fn(),
    };

    const handler = createGetCompletedHistoryHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = new Request(
      `${canonicalOrigin}/api/marketplace/reservations/history`,
      {
        method: "GET",
      },
    );
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(mockService.getCompletedTransactions).not.toHaveBeenCalled();
  });

  it("returns 200 with list of completed transactions excluding private emails", async () => {
    const mockItems = [
      {
        reservationId,
        listingId,
        listingTitle: "Vintage Lamp",
        listingType: "SELL" as const,
        agreedPriceCents: 2500,
        status: "completed" as const,
        pickupArea: "campus_nord_bienrode" as const,
        completedAt: "2026-09-25T15:00:00.000Z",
        role: "seller" as const,
        partner: {
          id: buyerId,
          displayName: "Clara",
          avatarUrl: null,
          universityBadge: {
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          },
        },
      },
    ];

    const mockService: Partial<MarketplacePickupService> = {
      getCompletedTransactions: vi.fn().mockResolvedValue({
        status: "success",
        data: mockItems,
      }),
    };

    const handler = createGetCompletedHistoryHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = new Request(
      `${canonicalOrigin}/api/marketplace/reservations/history?limit=10`,
      {
        method: "GET",
      },
    );
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toEqual(mockItems);
    expect(mockService.getCompletedTransactions).toHaveBeenCalledWith(
      sellerId,
      { limit: "10" },
    );

    // Verify privacy: no emails in response
    const rawJson = JSON.stringify(body);
    expect(rawJson).not.toContain("@");
    expect(rawJson).not.toContain("email");
  });

  it("returns 400 when query validation fails", async () => {
    const mockService: Partial<MarketplacePickupService> = {
      getCompletedTransactions: vi.fn().mockResolvedValue({
        status: "invalid",
        fieldErrors: { limit: ["Limit must be an integer between 1 and 100."] },
      }),
    };

    const handler = createGetCompletedHistoryHandler(
      mockService as MarketplacePickupService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = new Request(
      `${canonicalOrigin}/api/marketplace/reservations/history?limit=999`,
      {
        method: "GET",
      },
    );
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_INPUT");
  });
});
