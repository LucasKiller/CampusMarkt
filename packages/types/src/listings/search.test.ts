import { describe, expect, it } from "vitest";

import type { PublicFeedItem } from "./feed.ts";
import {
  isSearchFilters,
  isSearchResultsResponse,
  isSearchSortOption,
  SEARCH_SORT_OPTIONS,
  type SearchFilters,
} from "./search.ts";

describe("isSearchSortOption", () => {
  it("accepts all valid sort options", () => {
    for (const opt of SEARCH_SORT_OPTIONS) {
      expect(isSearchSortOption(opt)).toBe(true);
    }
  });

  it("rejects invalid options and types", () => {
    expect(isSearchSortOption("random")).toBe(false);
    expect(isSearchSortOption("")).toBe(false);
    expect(isSearchSortOption(null)).toBe(false);
    expect(isSearchSortOption(undefined)).toBe(false);
    expect(isSearchSortOption(123)).toBe(false);
    expect(isSearchSortOption({})).toBe(false);
  });
});

describe("isSearchFilters", () => {
  const validFilters: SearchFilters = {
    query: "Fahrrad",
    categories: ["bicycles_mobility", "electronics"],
    pickupAreas: ["innenstadt", "campus_tu_altgebaeude"],
    listingTypes: ["SELL", "GIVE_AWAY"],
    conditions: ["LIKE_NEW", "GOOD"],
    minPriceCents: 500,
    maxPriceCents: 50000,
    verifiedOnly: true,
    sort: "price_asc",
    cursor: "cursor-123",
    limit: 20,
  };

  it("accepts valid full filter object", () => {
    expect(isSearchFilters(validFilters)).toBe(true);
  });

  it("accepts empty filter object", () => {
    expect(isSearchFilters({})).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isSearchFilters(null)).toBe(false);
    expect(isSearchFilters(undefined)).toBe(false);
    expect(isSearchFilters("search")).toBe(false);
    expect(isSearchFilters(123)).toBe(false);
    expect(isSearchFilters([])).toBe(false);
  });

  it("rejects unknown properties", () => {
    expect(isSearchFilters({ ...validFilters, unknownProp: "val" })).toBe(
      false,
    );
  });

  it("rejects invalid query type", () => {
    expect(isSearchFilters({ query: 123 })).toBe(false);
  });

  it("rejects invalid categories", () => {
    expect(isSearchFilters({ categories: "invalid" })).toBe(false);
    expect(isSearchFilters({ categories: ["not_a_category"] })).toBe(false);
  });

  it("rejects invalid pickupAreas", () => {
    expect(isSearchFilters({ pickupAreas: ["outer_space"] })).toBe(false);
  });

  it("rejects invalid listingTypes", () => {
    expect(isSearchFilters({ listingTypes: ["RENT"] })).toBe(false);
  });

  it("rejects invalid conditions", () => {
    expect(isSearchFilters({ conditions: ["BROKEN"] })).toBe(false);
  });

  it("rejects invalid prices", () => {
    expect(isSearchFilters({ minPriceCents: -10 })).toBe(false);
    expect(isSearchFilters({ minPriceCents: 10.5 })).toBe(false);
    expect(isSearchFilters({ maxPriceCents: -1 })).toBe(false);
    expect(isSearchFilters({ minPriceCents: "100" })).toBe(false);
  });

  it("rejects invalid verifiedOnly", () => {
    expect(isSearchFilters({ verifiedOnly: "true" })).toBe(false);
    expect(isSearchFilters({ verifiedOnly: 1 })).toBe(false);
  });

  it("rejects invalid sort", () => {
    expect(isSearchFilters({ sort: "invalid_sort" })).toBe(false);
  });

  it("rejects invalid limit", () => {
    expect(isSearchFilters({ limit: 0 })).toBe(false);
    expect(isSearchFilters({ limit: 51 })).toBe(false);
    expect(isSearchFilters({ limit: 10.5 })).toBe(false);
    expect(isSearchFilters({ limit: "20" })).toBe(false);
  });
});

describe("isSearchResultsResponse", () => {
  const sampleItem: PublicFeedItem = {
    id: "12345678-1234-1234-1234-123456789abc",
    listingType: "SELL",
    title: "Vintage Rennrad Peugeot",
    priceCents: 15000,
    category: "bicycles_mobility",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T10:00:00.000Z",
    coverImage: "/storage/img1.webp",
    seller: {
      publicId: "87654321-4321-4321-4321-210987654321",
      displayName: "Alex M.",
      avatarUrl: null,
      universityBadge: null,
    },
  };

  const validResponse = {
    items: [sampleItem],
    totalEstimate: 1,
    nextCursor: "next-cursor-string",
    appliedFilters: {
      query: "Rennrad",
      sort: "relevance" as const,
    },
  };

  it("accepts valid search results response", () => {
    expect(isSearchResultsResponse(validResponse)).toBe(true);
  });

  it("accepts null nextCursor and omitted totalEstimate", () => {
    const withoutEstimate = {
      items: validResponse.items,
      nextCursor: null,
      appliedFilters: validResponse.appliedFilters,
    };
    expect(isSearchResultsResponse(withoutEstimate)).toBe(true);
  });

  it("rejects non-records", () => {
    expect(isSearchResultsResponse(null)).toBe(false);
    expect(isSearchResultsResponse("")).toBe(false);
    expect(isSearchResultsResponse([])).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(isSearchResultsResponse({ items: [] })).toBe(false);
    expect(isSearchResultsResponse({ items: [], nextCursor: null })).toBe(
      false,
    );
  });

  it("rejects invalid item in items array", () => {
    expect(
      isSearchResultsResponse({
        ...validResponse,
        items: [{ invalid: "item" }],
      }),
    ).toBe(false);
  });

  it("rejects invalid nextCursor", () => {
    expect(
      isSearchResultsResponse({
        ...validResponse,
        nextCursor: 12345,
      }),
    ).toBe(false);
  });

  it("rejects invalid appliedFilters", () => {
    expect(
      isSearchResultsResponse({
        ...validResponse,
        appliedFilters: { query: 123 },
      }),
    ).toBe(false);
  });

  it("rejects invalid totalEstimate", () => {
    expect(
      isSearchResultsResponse({
        ...validResponse,
        totalEstimate: -5,
      }),
    ).toBe(false);
  });
});
