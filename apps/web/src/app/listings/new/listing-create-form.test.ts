import { describe, expect, it } from "vitest";
import {
  CATEGORY_LABELS,
  PICKUP_AREA_LABELS,
  CONDITION_LABELS,
} from "./listing-create-form";
import {
  LISTING_CATEGORIES,
  PICKUP_AREAS,
  ITEM_CONDITIONS,
  LISTING_TYPES,
} from "@campusmarkt/domain";

describe("ListingCreateForm definitions and labels", () => {
  it("provides user-friendly labels for all 7 physical goods categories", () => {
    for (const cat of LISTING_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it("provides labels for all 10 Braunschweig pickup zones without private addresses", () => {
    for (const area of PICKUP_AREAS) {
      expect(PICKUP_AREA_LABELS[area]).toBeDefined();
      expect(typeof PICKUP_AREA_LABELS[area]).toBe("string");
      expect(PICKUP_AREA_LABELS[area].length).toBeGreaterThan(0);
    }
  });

  it("provides labels for all 4 item conditions", () => {
    for (const cond of ITEM_CONDITIONS) {
      expect(CONDITION_LABELS[cond]).toBeDefined();
      expect(typeof CONDITION_LABELS[cond]).toBe("string");
    }
  });

  it("has exactly 3 listing types supported", () => {
    expect(LISTING_TYPES).toEqual(["SELL", "GIVE_AWAY", "WANTED"]);
  });
});
