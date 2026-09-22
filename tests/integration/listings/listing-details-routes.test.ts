import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createListingDetailsRouteHandler } from "../../../apps/web/src/app/api/marketplace/listings/[id]/route.ts";
import type { MarketplaceFeedService } from "../../../apps/web/src/modules/listings/server/index.ts";
import type { PublicListingDetails } from "@campusmarkt/types";

describe("GET /api/marketplace/listings/[id] route integration", () => {
  const listingId = "00000000-0000-4000-8000-000000000001";

  const sampleListingDetails: PublicListingDetails = {
    id: listingId,
    listingType: "SELL",
    title: "Vintage Oak Desk",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T12:00:00.000Z",
    coverImage: "media/listings/cover1.webp",
    description: "Solid oak study desk in good condition.",
    seller: {
      publicId: "11111111-1111-4111-8111-111111111111",
      displayName: "TU Student",
      avatarUrl: "/media/avatars/11111111-1111-4111-8111-111111111111/1",
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
    images: [
      {
        storagePath: "media/listings/cover1.webp",
        position: 0,
      },
      {
        storagePath: "media/listings/photo2.webp",
        position: 1,
      },
    ],
  };

  it("returns HTTP 200 with PublicListingDetails and caching headers for valid active listing", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getListingDetails: vi.fn(async () => ({
        status: "success" as const,
        data: sampleListingDetails,
      })),
    };

    const handler = createListingDetailsRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      `https://markt.example.test/api/marketplace/listings/${listingId}`,
      { method: "GET" },
    );

    const res = await handler(req, {
      params: Promise.resolve({ id: listingId }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual(sampleListingDetails);
    expect(mockService.getListingDetails).toHaveBeenCalledWith(
      listingId,
      expect.objectContaining({ correlationId: expect.any(String) }),
    );
  });

  it("returns HTTP 200 with inactive status for sold or archived listing", async () => {
    const soldListingDetails: PublicListingDetails = {
      ...sampleListingDetails,
      status: "sold",
    };

    const mockService: Partial<MarketplaceFeedService> = {
      getListingDetails: vi.fn(async () => ({
        status: "success" as const,
        data: soldListingDetails,
      })),
    };

    const handler = createListingDetailsRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      `https://markt.example.test/api/marketplace/listings/${listingId}`,
      { method: "GET" },
    );

    const res = await handler(req, {
      params: Promise.resolve({ id: listingId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("sold");
  });

  it("returns HTTP 404 when listing does not exist", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getListingDetails: vi.fn(async () => ({
        status: "not_found" as const,
      })),
    };

    const handler = createListingDetailsRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      `https://markt.example.test/api/marketplace/listings/${listingId}`,
      { method: "GET" },
    );

    const res = await handler(req, {
      params: Promise.resolve({ id: listingId }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns HTTP 400 when listing ID is not a valid UUID", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getListingDetails: vi.fn(async () => ({
        status: "invalid" as const,
        message: "Invalid listing ID format",
      })),
    };

    const handler = createListingDetailsRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      "https://markt.example.test/api/marketplace/listings/not-a-uuid",
      { method: "GET" },
    );

    const res = await handler(req, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("returns HTTP 503 on service dependency failure", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getListingDetails: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
    };

    const handler = createListingDetailsRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      `https://markt.example.test/api/marketplace/listings/${listingId}`,
      { method: "GET" },
    );

    const res = await handler(req, {
      params: Promise.resolve({ id: listingId }),
    });

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });
});
