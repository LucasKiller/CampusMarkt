import { describe, expect, it } from "vitest";

import {
  IMAGE_LIMITS,
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  LISTING_TYPES,
  PICKUP_AREAS,
  PRICE_LIMITS_CENTS,
  canTransitionStatus,
  isImageCountValid,
  isPriceRuleValid,
  transitionListingStatus,
  validateImageCount,
  validatePriceRule,
} from "./index.ts";

describe("listing domain enums and constants", () => {
  it("defines all 3 supported listing types", () => {
    expect(LISTING_TYPES).toEqual(["SELL", "GIVE_AWAY", "WANTED"]);
  });

  it("defines all 4 lifecycle statuses", () => {
    expect(LISTING_STATUSES).toEqual([
      "active",
      "reserved",
      "sold",
      "archived",
    ]);
  });

  it("defines the 7 canonical categories", () => {
    expect(LISTING_CATEGORIES).toEqual([
      "furniture",
      "electronics",
      "books_studies",
      "bicycles_mobility",
      "clothing",
      "home_kitchen",
      "other",
    ]);
  });

  it("defines the 10 pickup areas in Braunschweig", () => {
    expect(PICKUP_AREAS).toEqual([
      "innenstadt",
      "campus_tu_altgebaeude",
      "campus_nord_bienrode",
      "oestliches_ringgebiet",
      "westliches_ringgebiet",
      "noerdliches_ringgebiet_siegfriedviertel",
      "viewegs_garten_bebelhof",
      "heidberg_melverode",
      "weststadt",
      "lehndorf_kanzlerfeld",
    ]);
  });

  it("defines the 4 item conditions", () => {
    expect(ITEM_CONDITIONS).toEqual(["NEW", "LIKE_NEW", "GOOD", "FAIR"]);
  });

  it("defines price and image limits", () => {
    expect(PRICE_LIMITS_CENTS).toEqual({ min: 50, max: 1_000_000 });
    expect(IMAGE_LIMITS).toEqual({ minOffered: 1, minWanted: 0, max: 8 });
  });
});

describe("price rule validation", () => {
  describe("SELL listings", () => {
    it("accepts prices within bounds (50 to 1,000,000 cents)", () => {
      expect(validatePriceRule("SELL", 50)).toEqual({ valid: true });
      expect(validatePriceRule("SELL", 1000)).toEqual({ valid: true });
      expect(validatePriceRule("SELL", 1_000_000)).toEqual({ valid: true });
      expect(isPriceRuleValid("SELL", 500)).toBe(true);
    });

    it("rejects missing, null, or undefined price", () => {
      expect(validatePriceRule("SELL", null).valid).toBe(false);
      expect(validatePriceRule("SELL", undefined).valid).toBe(false);
    });

    it("rejects non-integer prices", () => {
      expect(validatePriceRule("SELL", 49.99).valid).toBe(false);
    });

    it("rejects price below 50 cents (€0.50)", () => {
      expect(validatePriceRule("SELL", 49).valid).toBe(false);
      expect(validatePriceRule("SELL", 0).valid).toBe(false);
      expect(validatePriceRule("SELL", -100).valid).toBe(false);
    });

    it("rejects price above 1,000,000 cents (€10,000.00)", () => {
      expect(validatePriceRule("SELL", 1_000_001).valid).toBe(false);
    });
  });

  describe("GIVE_AWAY listings", () => {
    it("accepts 0, null, or undefined price", () => {
      expect(validatePriceRule("GIVE_AWAY", 0)).toEqual({ valid: true });
      expect(validatePriceRule("GIVE_AWAY", null)).toEqual({ valid: true });
      expect(validatePriceRule("GIVE_AWAY", undefined)).toEqual({
        valid: true,
      });
      expect(isPriceRuleValid("GIVE_AWAY", 0)).toBe(true);
    });

    it("rejects non-zero positive or negative prices", () => {
      expect(validatePriceRule("GIVE_AWAY", 100).valid).toBe(false);
      expect(validatePriceRule("GIVE_AWAY", -1).valid).toBe(false);
      expect(isPriceRuleValid("GIVE_AWAY", 50)).toBe(false);
    });
  });

  describe("WANTED listings", () => {
    it("accepts null or undefined price (no budget specified)", () => {
      expect(validatePriceRule("WANTED", null)).toEqual({ valid: true });
      expect(validatePriceRule("WANTED", undefined)).toEqual({ valid: true });
      expect(isPriceRuleValid("WANTED", null)).toBe(true);
    });

    it("accepts budget within bounds (50 to 1,000,000 cents)", () => {
      expect(validatePriceRule("WANTED", 50)).toEqual({ valid: true });
      expect(validatePriceRule("WANTED", 5000)).toEqual({ valid: true });
      expect(validatePriceRule("WANTED", 1_000_000)).toEqual({ valid: true });
      expect(isPriceRuleValid("WANTED", 100)).toBe(true);
    });

    it("rejects non-integer budget", () => {
      expect(validatePriceRule("WANTED", 50.5).valid).toBe(false);
    });

    it("rejects budget below 50 cents or above 1,000,000 cents", () => {
      expect(validatePriceRule("WANTED", 49).valid).toBe(false);
      expect(validatePriceRule("WANTED", 0).valid).toBe(false);
      expect(validatePriceRule("WANTED", 1_000_001).valid).toBe(false);
    });
  });

  it("handles unsupported listing type", () => {
    // @ts-expect-error testing runtime safeguard
    expect(validatePriceRule("UNKNOWN", 100).valid).toBe(false);
  });
});

describe("image count validation", () => {
  describe("SELL and GIVE_AWAY listings", () => {
    it("accepts 1 to 8 images", () => {
      for (let count = 1; count <= 8; count++) {
        expect(validateImageCount("SELL", count)).toEqual({ valid: true });
        expect(validateImageCount("GIVE_AWAY", count)).toEqual({ valid: true });
        expect(isImageCountValid("SELL", count)).toBe(true);
        expect(isImageCountValid("GIVE_AWAY", count)).toBe(true);
      }
    });

    it("rejects 0 images", () => {
      expect(validateImageCount("SELL", 0).valid).toBe(false);
      expect(validateImageCount("GIVE_AWAY", 0).valid).toBe(false);
    });

    it("rejects more than 8 images", () => {
      expect(validateImageCount("SELL", 9).valid).toBe(false);
      expect(validateImageCount("GIVE_AWAY", 9).valid).toBe(false);
    });
  });

  describe("WANTED listings", () => {
    it("accepts 0 to 8 images", () => {
      for (let count = 0; count <= 8; count++) {
        expect(validateImageCount("WANTED", count)).toEqual({ valid: true });
        expect(isImageCountValid("WANTED", count)).toBe(true);
      }
    });

    it("rejects more than 8 images", () => {
      expect(validateImageCount("WANTED", 9).valid).toBe(false);
    });
  });

  it("rejects non-integer or negative image counts", () => {
    expect(validateImageCount("SELL", -1).valid).toBe(false);
    expect(validateImageCount("SELL", 2.5).valid).toBe(false);
  });

  it("handles unsupported listing type", () => {
    // @ts-expect-error testing runtime safeguard
    expect(validateImageCount("UNKNOWN", 2).valid).toBe(false);
  });
});

describe("status transition state machine", () => {
  it("allows all valid forward and backward transitions specified in design", () => {
    // active -> reserved, sold, archived
    expect(canTransitionStatus("active", "reserved")).toBe(true);
    expect(canTransitionStatus("active", "sold")).toBe(true);
    expect(canTransitionStatus("active", "archived")).toBe(true);

    // reserved -> active, sold, archived
    expect(canTransitionStatus("reserved", "active")).toBe(true);
    expect(canTransitionStatus("reserved", "sold")).toBe(true);
    expect(canTransitionStatus("reserved", "archived")).toBe(true);

    // sold -> archived
    expect(canTransitionStatus("sold", "archived")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionStatus("sold", "active")).toBe(false);
    expect(canTransitionStatus("sold", "reserved")).toBe(false);
    expect(canTransitionStatus("archived", "active")).toBe(false);
    expect(canTransitionStatus("archived", "reserved")).toBe(false);
    expect(canTransitionStatus("archived", "sold")).toBe(false);
    expect(canTransitionStatus("active", "active")).toBe(false);
  });

  it("transitions status correctly via transitionListingStatus helper", () => {
    expect(transitionListingStatus("active", "reserved")).toEqual({
      ok: true,
      state: "reserved",
      changed: true,
    });

    expect(transitionListingStatus("active", "active")).toEqual({
      ok: true,
      state: "active",
      changed: false,
    });

    expect(transitionListingStatus("sold", "reserved")).toEqual({
      ok: false,
      state: "sold",
      reason: "invalid_transition",
    });
  });
});
