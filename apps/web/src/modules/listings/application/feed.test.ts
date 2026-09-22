import { describe, expect, it } from "vitest";

import {
  createMarketplaceFeedService,
  type FeedRepositoryPort,
  type FeedSecurityAudit,
  type FeedTelemetryEvent,
} from "./feed.ts";
import type { PublicFeedItem, PublicListingDetails } from "@campusmarkt/types";
import { encodeCursor } from "@campusmarkt/validation";

describe("MarketplaceFeedService", () => {
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

  const sampleListingDetails: PublicListingDetails = {
    ...sampleFeedItem,
    description: "Solid oak study desk in good condition.",
    images: [
      {
        storagePath: "media/listings/cover1.webp",
        position: 0,
      },
    ],
  };

  function createMockRepo(
    feedItems: PublicFeedItem[] = [sampleFeedItem],
    detailsItem: PublicListingDetails | null = sampleListingDetails,
  ): FeedRepositoryPort & { calls: unknown[] } {
    const calls: unknown[] = [];
    return {
      calls,
      async getPublicFeed(params) {
        calls.push({ method: "getPublicFeed", params });
        return { ok: true, value: feedItems };
      },
      async getPublicListingDetails(id) {
        calls.push({ method: "getPublicListingDetails", id });
        return { ok: true, value: detailsItem };
      },
    };
  }

  function createMockSecurity(): FeedSecurityAudit & {
    events: FeedTelemetryEvent[];
    allowedRate: boolean;
  } {
    const events: FeedTelemetryEvent[] = [];
    return {
      events,
      allowedRate: true,
      async recordTelemetry(event) {
        events.push(event);
      },
      async checkRateLimit() {
        return { allowed: this.allowedRate, retryAfterSeconds: 60 };
      },
    };
  }

  describe("getPublicFeed", () => {
    it("successfully retrieves public feed and generates nextCursor when items reach limit", async () => {
      // 2 items with limit = 2
      const item2: PublicFeedItem = {
        ...sampleFeedItem,
        id: "00000000-0000-4000-8000-000000000002",
        createdAt: "2026-09-23T11:00:00.000Z",
      };
      const repo = createMockRepo([sampleFeedItem, item2]);
      const security = createMockSecurity();
      const service = createMarketplaceFeedService({
        repository: repo,
        security,
      });

      const result = await service.getPublicFeed(
        { limit: 2 },
        { correlationId: "corr-1", clientIp: "192.168.1.1" },
      );

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.items).toEqual([sampleFeedItem, item2]);
        const expectedNext = encodeCursor({
          createdAt: item2.createdAt,
          id: item2.id,
        });
        expect(result.data.nextCursor).toBe(expectedNext);
      }

      expect(security.events).toHaveLength(1);
      expect(security.events[0]).toMatchObject({
        eventType: "feed.queried",
        correlationId: "corr-1",
        metadata: {
          resultCount: 2,
          hasCursor: false,
          outcome: "success",
        },
      });
    });

    it("returns nextCursor as null when items count is below limit", async () => {
      const repo = createMockRepo([sampleFeedItem]);
      const service = createMarketplaceFeedService({ repository: repo });

      const result = await service.getPublicFeed({ limit: 20 });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.items).toEqual([sampleFeedItem]);
        expect(result.data.nextCursor).toBeNull();
      }
    });

    it("decodes valid cursor and passes coordinates to repository", async () => {
      const repo = createMockRepo([]);
      const service = createMarketplaceFeedService({ repository: repo });

      const cursor = encodeCursor({
        createdAt: "2026-09-23T10:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000099",
      });

      const result = await service.getPublicFeed({
        cursor,
        category: "furniture",
        pickupArea: "innenstadt",
        listingType: "SELL",
        limit: 10,
      });

      expect(result.status).toBe("success");
      expect(repo.calls[0]).toEqual({
        method: "getPublicFeed",
        params: {
          cursorCreatedAt: "2026-09-23T10:00:00.000Z",
          cursorId: "00000000-0000-4000-8000-000000000099",
          category: "furniture",
          pickupArea: "innenstadt",
          listingType: "SELL",
          limit: 10,
        },
      });
    });

    it("rejects malformed cursor with invalid status and logs telemetry", async () => {
      const repo = createMockRepo();
      const security = createMockSecurity();
      const service = createMarketplaceFeedService({
        repository: repo,
        security,
      });

      const result = await service.getPublicFeed({
        cursor: "invalid-base64-not-json",
      });

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.fieldErrors?.cursor).toBeDefined();
      }

      expect(security.events[0]).toMatchObject({
        eventType: "feed.queried",
        metadata: { outcome: "invalid_input" },
      });
    });

    it("enforces rate limit and returns rate_limited status", async () => {
      const repo = createMockRepo();
      const security = createMockSecurity();
      security.allowedRate = false;
      const service = createMarketplaceFeedService({
        repository: repo,
        security,
      });

      const result = await service.getPublicFeed(
        {},
        { clientIp: "10.0.0.1", correlationId: "rl-1" },
      );

      expect(result.status).toBe("rate_limited");
      if (result.status === "rate_limited") {
        expect(result.retryAfterSeconds).toBe(60);
      }

      expect(security.events[0]).toMatchObject({
        eventType: "feed.queried",
        correlationId: "rl-1",
        metadata: { outcome: "rate_limited" },
      });
    });

    it("maps repository failure to unavailable status", async () => {
      const repo: FeedRepositoryPort = {
        async getPublicFeed() {
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        },
        async getPublicListingDetails() {
          return { ok: true, value: null };
        },
      };
      const service = createMarketplaceFeedService({ repository: repo });

      const result = await service.getPublicFeed({});

      expect(result.status).toBe("unavailable");
    });
  });

  describe("getListingDetails", () => {
    it("returns public listing details for valid existing ID and records telemetry", async () => {
      const repo = createMockRepo([], sampleListingDetails);
      const security = createMockSecurity();
      const service = createMarketplaceFeedService({
        repository: repo,
        security,
      });

      const result = await service.getListingDetails(sampleListingDetails.id, {
        correlationId: "detail-corr",
      });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data).toEqual(sampleListingDetails);
      }

      expect(security.events).toHaveLength(1);
      expect(security.events[0]).toMatchObject({
        eventType: "listing.viewed",
        correlationId: "detail-corr",
        metadata: {
          listingId: sampleListingDetails.id,
          status: "active",
          outcome: "success",
        },
      });
    });

    it("rejects invalid UUID format", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFeedService({ repository: repo });

      const result = await service.getListingDetails("not-a-uuid");

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.message).toContain("Invalid listing ID format");
      }
    });

    it("returns not_found status when repository returns null", async () => {
      const repo = createMockRepo([], null);
      const service = createMarketplaceFeedService({ repository: repo });

      const result = await service.getListingDetails(
        "00000000-0000-4000-8000-000000000404",
      );

      expect(result.status).toBe("not_found");
    });
  });
});
