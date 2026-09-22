import { describe, expect, it } from "vitest";

import { vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  createMarketplaceSearchRepository,
  type SearchRepositoryParams,
} from "./search-repository";
import type { MarketplaceRpcClient } from "./repository";
import type { PublicFeedItem } from "@campusmarkt/types";

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

describe("MarketplaceSearchRepository", () => {
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

  it("calls search_listings RPC with provided filters and maps to typed items", async () => {
    const client = mockRpcClient([sampleFeedItem]);
    const repo = createMarketplaceSearchRepository({ service: client });

    const params: SearchRepositoryParams = {
      query: "desk",
      categories: ["furniture"],
      pickupAreas: ["innenstadt"],
      listingTypes: ["SELL"],
      conditions: ["GOOD"],
      minPriceCents: 1000,
      maxPriceCents: 5000,
      verifiedOnly: true,
      sort: "price_asc",
      cursorRank: 0.5,
      cursorPriceCents: 2000,
      cursorCreatedAt: "2026-09-23T10:00:00.000Z",
      cursorId: "00000000-0000-4000-8000-000000000099",
      limit: 10,
    };

    const result = await repo.searchListings(params);

    expect(result).toEqual({ ok: true, value: [sampleFeedItem] });
    expect(client.calls).toEqual([
      {
        functionName: "search_listings",
        arguments_: {
          p_query: "desk",
          p_categories: ["furniture"],
          p_pickup_areas: ["innenstadt"],
          p_listing_types: ["SELL"],
          p_conditions: ["GOOD"],
          p_min_price_cents: 1000,
          p_max_price_cents: 5000,
          p_verified_only: true,
          p_sort: "price_asc",
          p_cursor_rank: 0.5,
          p_cursor_price_cents: 2000,
          p_cursor_created_at: "2026-09-23T10:00:00.000Z",
          p_cursor_id: "00000000-0000-4000-8000-000000000099",
          p_limit: 10,
        },
      },
    ]);
  });

  it("defaults parameters when none are supplied", async () => {
    const client = mockRpcClient([]);
    const repo = createMarketplaceSearchRepository({ service: client });

    const result = await repo.searchListings();

    expect(result).toEqual({ ok: true, value: [] });
    expect(client.calls).toEqual([
      {
        functionName: "search_listings",
        arguments_: {
          p_query: null,
          p_categories: null,
          p_pickup_areas: null,
          p_listing_types: null,
          p_conditions: null,
          p_min_price_cents: null,
          p_max_price_cents: null,
          p_verified_only: false,
          p_sort: "relevance",
          p_cursor_rank: null,
          p_cursor_price_cents: null,
          p_cursor_created_at: null,
          p_cursor_id: null,
          p_limit: 20,
        },
      },
    ]);
  });

  it("maps results to SearchResultsResponse shape via search() method", async () => {
    const client = mockRpcClient([sampleFeedItem]);
    const repo = createMarketplaceSearchRepository({ service: client });

    const result = await repo.search({ limit: 1 }, { query: "desk" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toEqual([sampleFeedItem]);
      expect(result.value.appliedFilters).toEqual({ query: "desk", limit: 1 });
      expect(result.value.nextCursor).toBeDefined();
    }
  });

  it("returns INVALID_PROVIDER_RESPONSE if returned items fail schema check", async () => {
    const client = mockRpcClient([{ invalid: "item" }]);
    const repo = createMarketplaceSearchRepository({ service: client });

    const result = await repo.searchListings();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
    }
  });

  it("maps database 22023 constraint violation to INVALID_INPUT", async () => {
    const client = mockRpcClient(null, {
      code: "22023",
      message: "invalid query syntax",
    });
    const repo = createMarketplaceSearchRepository({ service: client });

    const result = await repo.searchListings();

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      message: "invalid query syntax",
    });
  });

  it("maps unexpected database error to DEPENDENCY_UNAVAILABLE", async () => {
    const client = mockRpcClient(null, {
      code: "08006",
      message: "connection failure",
    });
    const repo = createMarketplaceSearchRepository({ service: client });

    const result = await repo.searchListings();

    expect(result).toEqual({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
      message: "connection failure",
    });
  });
});
