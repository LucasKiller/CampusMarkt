import { describe, expect, it } from "vitest";

import {
  deserializeSearchParams,
  formatSearchSummary,
  getDefaultSortOption,
  resolveSortOption,
  sanitizeSearchQuery,
  serializeSearchParams,
  toURLSearchParams,
  type DomainSearchFilters,
} from "./search.ts";

describe("sanitizeSearchQuery", () => {
  it("normalizes NFC and collapses whitespace", () => {
    expect(sanitizeSearchQuery("   Fahrrad    Helm   ")).toBe("Fahrrad Helm");
  });

  it("strips control characters", () => {
    expect(sanitizeSearchQuery("Buch\u0000\u0007\u001F")).toBe("Buch");
  });

  it("truncates at 100 characters", () => {
    const long = "a".repeat(150);
    expect(sanitizeSearchQuery(long)).toBe("a".repeat(100));
  });

  it("returns empty string on non-string or whitespace", () => {
    expect(sanitizeSearchQuery(null)).toBe("");
    expect(sanitizeSearchQuery(undefined)).toBe("");
    expect(sanitizeSearchQuery("     ")).toBe("");
  });
});

describe("getDefaultSortOption and resolveSortOption", () => {
  it("selects relevance sort when query is non-empty, newest when query is empty", () => {
    expect(getDefaultSortOption("rennrad")).toBe("relevance");
    expect(getDefaultSortOption("")).toBe("newest");
    expect(getDefaultSortOption("   ")).toBe("newest");
    expect(getDefaultSortOption(null)).toBe("newest");
    expect(getDefaultSortOption(undefined)).toBe("newest");
  });

  it("resolves explicit sort when provided", () => {
    expect(resolveSortOption("price_asc", "rennrad")).toBe("price_asc");
    expect(resolveSortOption("price_desc", "")).toBe("price_desc");
  });

  it("falls back to default sort when explicit sort is invalid or undefined", () => {
    expect(resolveSortOption(undefined, "rennrad")).toBe("relevance");
    expect(resolveSortOption(undefined, "")).toBe("newest");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveSortOption("invalid" as any, "rennrad")).toBe("relevance");
  });
});

describe("URL Search Params serialization and deserialization", () => {
  const sampleFilters: DomainSearchFilters = {
    query: "peugeot rennrad",
    categories: ["bicycles_mobility", "electronics"],
    pickupAreas: ["innenstadt", "campus_tu_altgebaeude"],
    listingTypes: ["SELL", "GIVE_AWAY"],
    conditions: ["LIKE_NEW", "GOOD"],
    minPriceCents: 2000,
    maxPriceCents: 15000,
    verifiedOnly: true,
    sort: "price_asc",
    cursor: "cursor-token",
    limit: 25,
  };

  it("serializes and parses search filters bidirectionally", () => {
    const serialized = serializeSearchParams(sampleFilters);
    const deserialized = deserializeSearchParams(serialized);

    expect(deserialized).toEqual(sampleFilters);
  });

  it("handles URLSearchParams object directly", () => {
    const params = toURLSearchParams(sampleFilters);
    const deserialized = deserializeSearchParams(params);
    expect(deserialized).toEqual(sampleFilters);
  });

  it("handles leading question mark in query string", () => {
    const serialized = `?${serializeSearchParams(sampleFilters)}`;
    const deserialized = deserializeSearchParams(serialized);
    expect(deserialized).toEqual(sampleFilters);
  });

  it("gracefully discards invalid enums and keeps valid ones", () => {
    const query =
      "category=furniture,invalid_cat,electronics&area=not_an_area,innenstadt&type=UNKNOWN,SELL&condition=GOOD,BROKEN";
    const res = deserializeSearchParams(query);
    expect(res.categories).toEqual(["furniture", "electronics"]);
    expect(res.pickupAreas).toEqual(["innenstadt"]);
    expect(res.listingTypes).toEqual(["SELL"]);
    expect(res.conditions).toEqual(["GOOD"]);
  });

  it("discards inverted price bounds in query string", () => {
    const query = "minPrice=5000&maxPrice=1000";
    const res = deserializeSearchParams(query);
    expect(res.minPriceCents).toBeUndefined();
    expect(res.maxPriceCents).toBeUndefined();
  });

  it("omits default limit (20) in serialization", () => {
    const serialized = serializeSearchParams({ limit: 20, query: "buch" });
    expect(serialized).not.toContain("limit=");
  });
});

describe("formatSearchSummary", () => {
  it("formats German summaries correctly", () => {
    expect(formatSearchSummary(0, "Fahrrad", "de")).toBe(
      '0 Inserate gefunden für "Fahrrad"',
    );
    expect(formatSearchSummary(1, "Fahrrad", "de")).toBe(
      '1 Inserat gefunden für "Fahrrad"',
    );
    expect(formatSearchSummary(14, "Fahrrad", "de")).toBe(
      '14 Inserate gefunden für "Fahrrad"',
    );
    expect(formatSearchSummary(5, undefined, "de")).toBe("5 Inserate gefunden");
  });

  it("formats English summaries correctly", () => {
    expect(formatSearchSummary(1, "Bike", "en")).toBe(
      '1 listing found for "Bike"',
    );
    expect(formatSearchSummary(2, "Bike", "en")).toBe(
      '2 listings found for "Bike"',
    );
    expect(formatSearchSummary(0, undefined, "en")).toBe("0 listings found");
  });
});
