import { describe, expect, it } from "vitest";

import {
  assertCanCompletePickup,
  assertCanTransitionToCompleted,
  CAMPUS_PICKUP_SPOTS,
  canCompletePickup,
  PickupCompletionAuthorityError,
  ReservationAlreadyCompletedError,
  ReservationNotActiveError,
  SAFE_PICKUP_RULES,
} from "./pickup.ts";

describe("pickup domain invariants and guidance", () => {
  const sellerId = "11111111-1111-1111-1111-111111111111";
  const buyerId = "22222222-2222-2222-2222-222222222222";
  const randomUserId = "33333333-3333-3333-3333-333333333333";

  describe("CAMPUS_PICKUP_SPOTS", () => {
    it("contains TU Braunschweig recommended spots", () => {
      expect(CAMPUS_PICKUP_SPOTS.length).toBeGreaterThanOrEqual(4);
      const spotIds = CAMPUS_PICKUP_SPOTS.map((s) => s.id);
      expect(spotIds).toContain("MENSA_1");
      expect(spotIds).toContain("UNIVERSITAETSPLATZ");
      expect(spotIds).toContain("UB_FOYER");
      expect(spotIds).toContain("CAMPUS_NORD");
    });
  });

  describe("SAFE_PICKUP_RULES", () => {
    it("defines 4 core safe meeting rules", () => {
      expect(SAFE_PICKUP_RULES.length).toBe(4);
      expect(
        SAFE_PICKUP_RULES.some((r) => r.includes("Niemals im Voraus")),
      ).toBe(true);
    });
  });

  describe("seller-led completion authority", () => {
    it("allows seller to complete pickup", () => {
      expect(canCompletePickup(sellerId, sellerId)).toBe(true);
      expect(() => assertCanCompletePickup(sellerId, sellerId)).not.toThrow();
    });

    it("rejects non-seller (buyer or outsider) from completing pickup", () => {
      expect(canCompletePickup(buyerId, sellerId)).toBe(false);
      expect(() => assertCanCompletePickup(buyerId, sellerId)).toThrow(
        PickupCompletionAuthorityError,
      );

      expect(canCompletePickup(randomUserId, sellerId)).toBe(false);
      expect(() => assertCanCompletePickup(randomUserId, sellerId)).toThrow(
        PickupCompletionAuthorityError,
      );
    });

    it("handles empty or missing ids", () => {
      expect(canCompletePickup("", sellerId)).toBe(false);
      expect(() => assertCanCompletePickup("", sellerId)).toThrow(
        PickupCompletionAuthorityError,
      );
    });
  });

  describe("assertCanTransitionToCompleted", () => {
    it("allows transition from active reservation on reserved listing", () => {
      expect(() =>
        assertCanTransitionToCompleted("active", "reserved"),
      ).not.toThrow();
    });

    it("allows transition from active reservation on active listing", () => {
      expect(() =>
        assertCanTransitionToCompleted("active", "active"),
      ).not.toThrow();
    });

    it("throws ReservationAlreadyCompletedError if reservation is already completed", () => {
      expect(() => assertCanTransitionToCompleted("completed", "sold")).toThrow(
        ReservationAlreadyCompletedError,
      );
    });

    it("throws ReservationNotActiveError if reservation is cancelled", () => {
      expect(() =>
        assertCanTransitionToCompleted("cancelled", "active"),
      ).toThrow(ReservationNotActiveError);
    });

    it("throws ReservationNotActiveError if listing is archived or sold", () => {
      expect(() =>
        assertCanTransitionToCompleted("active", "archived"),
      ).toThrow(ReservationNotActiveError);
    });
  });
});
