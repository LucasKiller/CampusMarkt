import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFeedRouteHandler } from "../../../apps/web/src/app/api/marketplace/feed/route.ts";
import type { MarketplaceFeedService } from "../../../apps/web/src/modules/listings/server/index.ts";
import type { PublicFeedItem, PublicFeedResponse } from "@campusmarkt/types";

describe("GET /api/marketplace/feed route integration", () => {
  const sampleFeedItem: PublicFeedItem = {
    id: "00000000-0000-4000-8000-000000000001",
    listingType: "SELL",
    title: "Vintage Oak Desk",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T12:00:00.000Z",
    coverImage: "media/listings/cover1.webp",
    seller: {
      publicId: "11111111-1111-4111-8111-111111111111",
      displayName: "TU Student",
      avatarUrl: "/media/avatars/11111111-1111-4111-8111-111111111111/1",
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
  };

  const sampleFeedResponse: PublicFeedResponse = {
    items: [sampleFeedItem],
    nextCursor:
      "eyJjcmVhdGVkQXQiOiIyMDI2LTA5LTIzVDEyOjAwOjAwLjAwMFoiLCJpZCI6IjAwMDAwMDAwLTAwMDAtNDAwMC04MDAwLTAwMDAwMDAwMDAwMSJ9",
  };

  it("returns HTTP 200 with PublicFeedResponse and public cache-control headers", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getPublicFeed: vi.fn(async () => ({
        status: "success" as const,
        data: sampleFeedResponse,
      })),
    };

    const handler = createFeedRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request("https://markt.example.test/api/marketplace/feed", {
      method: "GET",
    });

    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual(sampleFeedResponse);
    expect(mockService.getPublicFeed).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        correlationId: expect.any(String),
        clientIp: expect.any(String),
      }),
    );
  });

  it("extracts and passes query parameters to feed application service", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getPublicFeed: vi.fn(async () => ({
        status: "success" as const,
        data: { items: [], nextCursor: null },
      })),
    };

    const handler = createFeedRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      "https://markt.example.test/api/marketplace/feed?cursor=abc123cursor&category=electronics&pickupArea=ringgebiet&listingType=WANTED&limit=15",
      {
        method: "GET",
        headers: {
          "x-forwarded-for": "203.0.113.195",
        },
      },
    );

    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(mockService.getPublicFeed).toHaveBeenCalledWith(
      {
        cursor: "abc123cursor",
        category: "electronics",
        pickupArea: "ringgebiet",
        listingType: "WANTED",
        limit: "15",
      },
      expect.objectContaining({
        clientIp: "203.0.113.195",
      }),
    );
  });

  it("returns HTTP 400 when cursor is invalid or malformed", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getPublicFeed: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: { cursor: ["Malformed cursor string."] },
      })),
    };

    const handler = createFeedRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request(
      "https://markt.example.test/api/marketplace/feed?cursor=not-a-cursor",
      {
        method: "GET",
      },
    );

    const res = await handler(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors.cursor).toBeDefined();
  });

  it("returns HTTP 429 when rate limited with Retry-After header", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getPublicFeed: vi.fn(async () => ({
        status: "rate_limited" as const,
        retryAfterSeconds: 60,
      })),
    };

    const handler = createFeedRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request("https://markt.example.test/api/marketplace/feed", {
      method: "GET",
    });

    const res = await handler(req);

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("RATE_LIMITED");
  });

  it("returns HTTP 503 on service unavailability", async () => {
    const mockService: Partial<MarketplaceFeedService> = {
      getPublicFeed: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
    };

    const handler = createFeedRouteHandler(
      mockService as MarketplaceFeedService,
    );
    const req = new Request("https://markt.example.test/api/marketplace/feed", {
      method: "GET",
    });

    const res = await handler(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });
});
