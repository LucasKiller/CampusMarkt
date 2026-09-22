import { describe, expect, it } from "vitest";
import { STATUS_LABELS, STATUS_BADGE_STYLES } from "./listing-manage-editor";
import { LISTING_STATUSES, canTransitionStatus } from "@campusmarkt/domain";

describe("ListingManageEditor status logic and configuration", () => {
  it("defines readable labels for all 4 listing statuses", () => {
    for (const status of LISTING_STATUSES) {
      expect(STATUS_LABELS[status]).toBeDefined();
      expect(typeof STATUS_LABELS[status]).toBe("string");
    }
  });

  it("defines distinctive badge colors for statuses", () => {
    for (const status of LISTING_STATUSES) {
      expect(STATUS_BADGE_STYLES[status]).toBeDefined();
      expect(STATUS_BADGE_STYLES[status].bg).toBeDefined();
      expect(STATUS_BADGE_STYLES[status].color).toBeDefined();
      expect(STATUS_BADGE_STYLES[status].border).toBeDefined();
    }
  });

  it("enforces allowed state machine transitions correctly", () => {
    // Active can move to reserved, sold, archived
    expect(canTransitionStatus("active", "reserved")).toBe(true);
    expect(canTransitionStatus("active", "sold")).toBe(true);
    expect(canTransitionStatus("active", "archived")).toBe(true);

    // Reserved can move to active, sold, archived
    expect(canTransitionStatus("reserved", "active")).toBe(true);
    expect(canTransitionStatus("reserved", "sold")).toBe(true);
    expect(canTransitionStatus("reserved", "archived")).toBe(true);

    // Sold can only move to archived
    expect(canTransitionStatus("sold", "archived")).toBe(true);
    expect(canTransitionStatus("sold", "active")).toBe(false);
    expect(canTransitionStatus("sold", "reserved")).toBe(false);

    // Archived is terminal
    expect(canTransitionStatus("archived", "active")).toBe(false);
    expect(canTransitionStatus("archived", "reserved")).toBe(false);
    expect(canTransitionStatus("archived", "sold")).toBe(false);
  });
});
