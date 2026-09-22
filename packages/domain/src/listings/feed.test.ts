import { describe, expect, it } from "vitest";

import {
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_TYPES,
  PICKUP_AREAS,
} from "./index.ts";
import {
  formatListingPrice,
  formatRelativeTime,
  getCategoryBadgeInfo,
  getCategoryLabel,
  getConditionLabel,
  getListingTypeLabel,
  getPickupAreaLabel,
} from "./feed.ts";

describe("formatListingPrice", () => {
  it("formats prices for SELL listings in euros", () => {
    expect(formatListingPrice("SELL", 1000)).toBe("€10.00");
    expect(formatListingPrice("SELL", 50)).toBe("€0.50");
    expect(formatListingPrice("SELL", 123456)).toBe("€1234.56");
  });

  it("formats GIVE_AWAY as free in DE and EN", () => {
    expect(formatListingPrice("GIVE_AWAY", null)).toBe("Zu verschenken");
    expect(formatListingPrice("GIVE_AWAY", null, "de")).toBe("Zu verschenken");
    expect(formatListingPrice("GIVE_AWAY", null, "en")).toBe("Free");
    expect(formatListingPrice("GIVE_AWAY", 0)).toBe("Zu verschenken");
  });

  it("formats WANTED listings with budget cap", () => {
    expect(formatListingPrice("WANTED", 2500, "de")).toBe("Bis zu €25.00");
    expect(formatListingPrice("WANTED", 2500, "en")).toBe("Max. €25.00");
  });

  it("formats WANTED listings without specified budget", () => {
    expect(formatListingPrice("WANTED", null, "de")).toBe(
      "Gesuch (Kein Budget)",
    );
    expect(formatListingPrice("WANTED", null, "en")).toBe(
      "Max. budget not specified",
    );
    expect(formatListingPrice("WANTED", undefined)).toBe(
      "Gesuch (Kein Budget)",
    );
  });

  it("returns fallback placeholder for SELL with missing price", () => {
    expect(formatListingPrice("SELL", null)).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  const baseTime = new Date("2026-09-23T12:00:00.000Z");

  it("formats under 60 seconds as just now", () => {
    const thirtySecsAgo = new Date("2026-09-23T11:59:30.000Z");
    expect(formatRelativeTime(thirtySecsAgo, baseTime, "de")).toBe(
      "Gerade eben",
    );
    expect(formatRelativeTime(thirtySecsAgo, baseTime, "en")).toBe("Just now");
  });

  it("formats minutes ago singular and plural", () => {
    const oneMinAgo = new Date("2026-09-23T11:59:00.000Z");
    expect(formatRelativeTime(oneMinAgo, baseTime, "de")).toBe("vor 1 Minute");
    expect(formatRelativeTime(oneMinAgo, baseTime, "en")).toBe("1 minute ago");

    const twentyMinAgo = new Date("2026-09-23T11:40:00.000Z");
    expect(formatRelativeTime(twentyMinAgo, baseTime, "de")).toBe(
      "vor 20 Minuten",
    );
    expect(formatRelativeTime(twentyMinAgo, baseTime, "en")).toBe(
      "20 minutes ago",
    );
  });

  it("formats hours ago singular and plural", () => {
    const oneHourAgo = new Date("2026-09-23T11:00:00.000Z");
    expect(formatRelativeTime(oneHourAgo, baseTime, "de")).toBe("vor 1 Stunde");
    expect(formatRelativeTime(oneHourAgo, baseTime, "en")).toBe("1 hour ago");

    const fiveHoursAgo = new Date("2026-09-23T07:00:00.000Z");
    expect(formatRelativeTime(fiveHoursAgo, baseTime, "de")).toBe(
      "vor 5 Stunden",
    );
    expect(formatRelativeTime(fiveHoursAgo, baseTime, "en")).toBe(
      "5 hours ago",
    );
  });

  it("formats days ago singular and plural", () => {
    const yesterday = new Date("2026-09-22T12:00:00.000Z");
    expect(formatRelativeTime(yesterday, baseTime, "de")).toBe("Gestern");
    expect(formatRelativeTime(yesterday, baseTime, "en")).toBe("Yesterday");

    const fourDaysAgo = new Date("2026-09-19T12:00:00.000Z");
    expect(formatRelativeTime(fourDaysAgo, baseTime, "de")).toBe("vor 4 Tagen");
    expect(formatRelativeTime(fourDaysAgo, baseTime, "en")).toBe("4 days ago");
  });

  it("formats older dates as DD.MM.YYYY", () => {
    const tenDaysAgo = new Date("2026-09-13T12:00:00.000Z");
    expect(formatRelativeTime(tenDaysAgo, baseTime, "de")).toBe("13.09.2026");
  });

  it("returns empty string on invalid date", () => {
    expect(formatRelativeTime("invalid-date", baseTime)).toBe("");
  });
});

describe("labels and badge helpers", () => {
  it("translates every category to DE and EN", () => {
    for (const cat of LISTING_CATEGORIES) {
      const de = getCategoryLabel(cat, "de");
      const en = getCategoryLabel(cat, "en");
      expect(de).toBeTruthy();
      expect(en).toBeTruthy();
      expect(de).not.toBe(cat);
    }
  });

  it("translates every pickup area to DE and EN", () => {
    for (const area of PICKUP_AREAS) {
      const de = getPickupAreaLabel(area, "de");
      const en = getPickupAreaLabel(area, "en");
      expect(de).toBeTruthy();
      expect(en).toBeTruthy();
    }
  });

  it("translates every condition to DE and EN", () => {
    for (const cond of ITEM_CONDITIONS) {
      const de = getConditionLabel(cond, "de");
      const en = getConditionLabel(cond, "en");
      expect(de).toBeTruthy();
      expect(en).toBeTruthy();
    }
  });

  it("translates every listing type to DE and EN", () => {
    for (const type of LISTING_TYPES) {
      const de = getListingTypeLabel(type, "de");
      const en = getListingTypeLabel(type, "en");
      expect(de).toBeTruthy();
      expect(en).toBeTruthy();
    }
  });

  it("returns badge info for category", () => {
    const info = getCategoryBadgeInfo("furniture", "de");
    expect(info.category).toBe("furniture");
    expect(info.label).toBe("Möbel & Wohnen");
    expect(info.colorClass).toBe("badge-amber");
  });
});
