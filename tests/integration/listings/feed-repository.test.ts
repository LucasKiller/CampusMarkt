import { describe, expect, it } from "vitest";

import { vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  createMarketplaceFeedRepository,
  type GetPublicFeedParams,
} from "../../../apps/web/src/modules/listings/server/feed-repository.ts";
import type { MarketplaceRpcClient } from "../../../apps/web/src/modules/listings/server/repository.ts";
import type { PublicFeedItem, PublicListingDetails } from "@campusmarkt/types";

function mockRpcClient(data: unknown = null, error: unknown = null) {
  const calls: Array<{
    functionName: string;
    arguments_?: Record<string, unknown>;
  }> = [];
  const rpc: MarketplaceRpcClient["rpc"] = async (functionName, arguments_) => {
    calls.push({ functionName, arguments_ });
    return { data, error };
  };
  return { calls, rpc };
}

describe("MarketplaceFeedRepository integration", () => {
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
      {
        storagePath: "media/listings/photo2.webp",
        position: 1,
      },
    ],
  };

  describe("getPublicFeed", () => {
    it("calls get_public_feed RPC with provided filters and returns items", async () => {
      const client = mockRpcClient([sampleFeedItem]);
      const repo = createMarketplaceFeedRepository({ service: client });

      const params: GetPublicFeedParams = {
        cursorCreatedAt: "2026-09-23T15:00:00.000Z",
        cursorId: "00000000-0000-4000-8000-000000000099",
        category: "furniture",
        pickupArea: "innenstadt",
        listingType: "SELL",
        limit: 15,
      };

      const result = await repo.getPublicFeed(params);

      expect(result).toEqual({ ok: true, value: [sampleFeedItem] });
      expect(client.calls).toEqual([
        {
          functionName: "get_public_feed",
          arguments_: {
            p_cursor_created_at: "2026-09-23T15:00:00.000Z",
            p_cursor_id: "00000000-0000-4000-8000-000000000099",
            p_category: "furniture",
            p_pickup_area: "innenstadt",
            p_listing_type: "SELL",
            p_limit: 15,
          },
        },
      ]);
    });

    it("defaults parameters when none are supplied", async () => {
      const client = mockRpcClient([]);
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicFeed();

      expect(result).toEqual({ ok: true, value: [] });
      expect(client.calls).toEqual([
        {
          functionName: "get_public_feed",
          arguments_: {
            p_cursor_created_at: null,
            p_cursor_id: null,
            p_category: null,
            p_pickup_area: null,
            p_listing_type: null,
            p_limit: 20,
          },
        },
      ]);
    });

    it("returns INVALID_PROVIDER_RESPONSE if returned items fail schema check", async () => {
      const client = mockRpcClient([{ invalid: "item" }]);
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicFeed();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });

    it("maps database 22023 constraint violation to INVALID_INPUT", async () => {
      const client = mockRpcClient(null, {
        code: "22023",
        message: "invalid cursor parameters",
      });
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicFeed();

      expect(result).toEqual({
        ok: false,
        code: "INVALID_INPUT",
        message: "invalid cursor parameters",
      });
    });

    it("maps unexpected database error to DEPENDENCY_UNAVAILABLE", async () => {
      const client = mockRpcClient(null, {
        code: "08006",
        message: "connection failure",
      });
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicFeed();

      expect(result).toEqual({
        ok: false,
        code: "DEPENDENCY_UNAVAILABLE",
        message: "connection failure",
      });
    });
  });

  describe("getPublicListingDetails", () => {
    it("calls get_public_listing_details RPC and returns details entity", async () => {
      const client = mockRpcClient(sampleListingDetails);
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicListingDetails(
        sampleListingDetails.id,
      );

      expect(result).toEqual({ ok: true, value: sampleListingDetails });
      expect(client.calls).toEqual([
        {
          functionName: "get_public_listing_details",
          arguments_: {
            p_listing_id: sampleListingDetails.id,
          },
        },
      ]);
    });

    it("returns null value when listing is not found", async () => {
      const client = mockRpcClient(null);
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicListingDetails(
        "00000000-0000-4000-8000-000000000404",
      );

      expect(result).toEqual({ ok: true, value: null });
    });

    it("returns INVALID_PROVIDER_RESPONSE if details payload is malformed", async () => {
      const client = mockRpcClient({ id: "invalid", description: 123 });
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicListingDetails(
        "00000000-0000-4000-8000-000000000001",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });

    it("maps database P0002 not found error to NOT_FOUND", async () => {
      const client = mockRpcClient(null, {
        code: "P0002",
        message: "listing not found",
      });
      const repo = createMarketplaceFeedRepository({ service: client });

      const result = await repo.getPublicListingDetails(
        "00000000-0000-4000-8000-000000000001",
      );

      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "listing not found",
      });
    });
  });
});
