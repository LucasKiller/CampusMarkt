import { describe, expect, it, vi } from "vitest";

import {
  createMarketplaceSearchService,
  type SearchRepositoryPort,
  type SearchSecurityAudit,
  type SearchTelemetryEvent,
} from "./search";
import type { PublicFeedItem } from "@campusmarkt/types";

describe("MarketplaceSearchService application service", () => {
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

  const createMockRepo = (
    items: PublicFeedItem[] = [sampleFeedItem],
  ): SearchRepositoryPort => ({
    searchListings: vi.fn(async () => ({ ok: true as const, value: items })),
  });

  it("successfully searches with default newest sort when no query provided", async () => {
    const repository = createMockRepo();
    const service = createMarketplaceSearchService({ repository });

    const result = await service.search({});

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.items).toEqual([sampleFeedItem]);
      expect(result.data.appliedFilters.sort).toBe("newest");
      expect(result.data.nextCursor).toBeNull();
    }
  });

  it("defaults to relevance sort when search query is present", async () => {
    const repository = createMockRepo();
    const service = createMarketplaceSearchService({ repository });

    const result = await service.search({ q: "fahrrad" });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.appliedFilters.query).toBe("fahrrad");
      expect(result.data.appliedFilters.sort).toBe("relevance");
    }
    expect(repository.searchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "fahrrad",
        sort: "relevance",
      }),
    );
  });

  it("generates nextCursor when results match limit", async () => {
    const repository = createMockRepo([sampleFeedItem]);
    const service = createMarketplaceSearchService({ repository });

    const result = await service.search({ limit: 1 });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.data.nextCursor).toBeDefined();
      const decoded = JSON.parse(
        Buffer.from(result.data.nextCursor!, "base64url").toString("utf-8"),
      );
      expect(decoded.id).toBe(sampleFeedItem.id);
      expect(decoded.createdAt).toBe(sampleFeedItem.createdAt);
    }
  });

  it("decodes and passes cursor coordinates to repository", async () => {
    const repository = createMockRepo();
    const service = createMarketplaceSearchService({ repository });

    const cursorStr = Buffer.from(
      JSON.stringify({
        createdAt: "2026-09-23T10:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000099",
        rank: 0.75,
        priceCents: 3000,
      }),
      "utf-8",
    ).toString("base64url");

    const result = await service.search({ cursor: cursorStr });

    expect(result.status).toBe("success");
    expect(repository.searchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        cursorCreatedAt: "2026-09-23T10:00:00.000Z",
        cursorId: "00000000-0000-4000-8000-000000000099",
        cursorRank: 0.75,
        cursorPriceCents: 3000,
      }),
    );
  });

  it("enforces rate limiting and emits telemetry", async () => {
    const repository = createMockRepo();
    const recordedEvents: SearchTelemetryEvent[] = [];
    const security: SearchSecurityAudit = {
      checkRateLimit: vi.fn(async () => ({
        allowed: false,
        retryAfterSeconds: 45,
      })),
      recordTelemetry: vi.fn(async (event) => {
        recordedEvents.push(event);
      }),
    };

    const service = createMarketplaceSearchService({ repository, security });
    const result = await service.search(
      { q: "desk" },
      { correlationId: "test-corr-id", clientIp: "10.0.0.1" },
    );

    expect(result).toEqual({
      status: "rate_limited",
      retryAfterSeconds: 45,
    });
    expect(recordedEvents).toHaveLength(1);
    expect(recordedEvents[0].eventType).toBe("search.queried");
    expect(recordedEvents[0].metadata?.outcome).toBe("rate_limited");
    expect(repository.searchListings).not.toHaveBeenCalled();
  });

  it("rejects inverted price range with invalid status and emits telemetry", async () => {
    const repository = createMockRepo();
    const recordedEvents: SearchTelemetryEvent[] = [];
    const security: SearchSecurityAudit = {
      checkRateLimit: vi.fn(async () => ({ allowed: true })),
      recordTelemetry: vi.fn(async (event) => {
        recordedEvents.push(event);
      }),
    };

    const service = createMarketplaceSearchService({ repository, security });
    const result = await service.search({ minPrice: "5000", maxPrice: "1000" });

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.fieldErrors?.priceRange).toBeDefined();
    }
    expect(recordedEvents[0].metadata?.outcome).toBe("invalid_input");
    expect(repository.searchListings).not.toHaveBeenCalled();
  });

  it("handles repository failure gracefully with unavailable status", async () => {
    const repository: SearchRepositoryPort = {
      searchListings: vi.fn(async () => ({
        ok: false as const,
        code: "DEPENDENCY_UNAVAILABLE" as const,
      })),
    };

    const service = createMarketplaceSearchService({ repository });
    const result = await service.search({ q: "error" });

    expect(result).toEqual({ status: "unavailable" });
  });
});
