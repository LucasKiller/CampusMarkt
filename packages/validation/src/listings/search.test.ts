import { describe, expect, it } from "vitest";

import { validateSearchParams } from "./search.ts";

describe("validateSearchParams", () => {
  it("validates empty search params with default limit", () => {
    const res = validateSearchParams({});
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual({ limit: 20 });
    }
  });

  it("trims and truncates query to max 100 characters", () => {
    const longString = "a".repeat(150);
    const res = validateSearchParams({ q: `  ${longString}  ` });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.query).toBe("a".repeat(100));
    }
  });

  it("handles whitespace-only query as undefined query", () => {
    const res = validateSearchParams({ query: "    " });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.query).toBeUndefined();
    }
  });

  it("rejects non-string query", () => {
    const res = validateSearchParams({ q: 12345 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors.query).toBeDefined();
    }
  });

  it("rejects inverted price range with actionable error", () => {
    const res = validateSearchParams({
      minPriceCents: 5000,
      maxPriceCents: 2000,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors.priceRange).toContain(
        "Minimum price cannot be greater than maximum price.",
      );
    }
  });

  it("accepts valid price bounds", () => {
    const res = validateSearchParams({
      minPrice: "1000",
      maxPrice: 2000,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.minPriceCents).toBe(1000);
      expect(res.value.maxPriceCents).toBe(2000);
    }
  });

  it("rejects negative or fractional prices", () => {
    expect(validateSearchParams({ minPriceCents: -5 }).ok).toBe(false);
    expect(validateSearchParams({ maxPriceCents: 10.5 }).ok).toBe(false);
  });

  it("validates categories array and comma-separated string", () => {
    const res1 = validateSearchParams({
      categories: ["furniture", "electronics"],
    });
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.value.categories).toEqual(["furniture", "electronics"]);
    }

    const res2 = validateSearchParams({
      category: "furniture, electronics",
    });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.value.categories).toEqual(["furniture", "electronics"]);
    }
  });

  it("rejects invalid categories", () => {
    const res = validateSearchParams({ categories: ["invalid_category"] });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors.categories).toBeDefined();
    }
  });

  it("validates pickup areas", () => {
    const res = validateSearchParams({
      pickupAreas: ["innenstadt", "campus_tu_altgebaeude"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.pickupAreas).toEqual([
        "innenstadt",
        "campus_tu_altgebaeude",
      ]);
    }

    const invalid = validateSearchParams({
      pickupAreas: ["outer_rim"],
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.fieldErrors.pickupAreas).toBeDefined();
    }
  });

  it("validates listing types", () => {
    const res = validateSearchParams({
      listingTypes: ["SELL", "GIVE_AWAY"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.listingTypes).toEqual(["SELL", "GIVE_AWAY"]);
    }

    const invalid = validateSearchParams({
      listingTypes: ["AUCTION"],
    });
    expect(invalid.ok).toBe(false);
  });

  it("validates conditions", () => {
    const res = validateSearchParams({
      conditions: ["NEW", "LIKE_NEW"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.conditions).toEqual(["NEW", "LIKE_NEW"]);
    }

    const invalid = validateSearchParams({
      conditions: ["DAMAGED"],
    });
    expect(invalid.ok).toBe(false);
  });

  it("validates verifiedOnly boolean and strings", () => {
    expect(validateSearchParams({ verifiedOnly: true }).ok).toBe(true);
    expect(validateSearchParams({ verifiedOnly: "true" }).ok).toBe(true);
    expect(validateSearchParams({ verifiedOnly: "1" }).ok).toBe(true);
    expect(validateSearchParams({ verifiedOnly: "false" }).ok).toBe(true);
    expect(validateSearchParams({ verifiedOnly: "not_a_bool" }).ok).toBe(false);
  });

  it("validates sort options", () => {
    expect(validateSearchParams({ sort: "relevance" }).ok).toBe(true);
    expect(validateSearchParams({ sort: "price_desc" }).ok).toBe(true);
    expect(validateSearchParams({ sort: "invalid_sort" }).ok).toBe(false);
  });

  it("validates limit and clamps to 1..50", () => {
    const resClamped = validateSearchParams({ limit: "100" });
    expect(resClamped.ok).toBe(true);
    if (resClamped.ok) {
      expect(resClamped.value.limit).toBe(50);
    }

    const resMinClamped = validateSearchParams({ limit: 0 });
    expect(resMinClamped.ok).toBe(true);
    if (resMinClamped.ok) {
      expect(resMinClamped.value.limit).toBe(1);
    }

    const resInvalid = validateSearchParams({ limit: "abc" });
    expect(resInvalid.ok).toBe(false);
  });

  it("rejects non-objects and unknown fields", () => {
    expect(validateSearchParams(null).ok).toBe(false);
    expect(validateSearchParams("string").ok).toBe(false);
    expect(validateSearchParams({ unknownField: "bad" }).ok).toBe(false);
  });
});
