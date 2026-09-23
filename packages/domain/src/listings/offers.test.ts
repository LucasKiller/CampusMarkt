import { describe, expect, it } from "vitest";

import {
  assertCanNegotiate,
  assertValidOfferTransition,
  assertValidReservationTransition,
  canNegotiate,
  canTransitionOffer,
  canTransitionReservation,
  InvalidOfferTransitionError,
  InvalidReservationTransitionError,
  SelfNegotiationError,
  supersedeCompromisedOffers,
} from "./offers.ts";

describe("offers domain state machines and invariants", () => {
  const buyerId = "11111111-1111-1111-1111-111111111111";
  const sellerId = "22222222-2222-2222-2222-222222222222";

  describe("canNegotiate and assertCanNegotiate", () => {
    it("allows different users to negotiate", () => {
      expect(canNegotiate(buyerId, sellerId)).toBe(true);
      expect(() => assertCanNegotiate(buyerId, sellerId)).not.toThrow();
    });

    it("prevents self-negotiation with SelfNegotiationError", () => {
      expect(canNegotiate(buyerId, buyerId)).toBe(false);
      expect(() => assertCanNegotiate(buyerId, buyerId)).toThrow(
        SelfNegotiationError,
      );
      try {
        assertCanNegotiate(buyerId, buyerId);
      } catch (err) {
        expect((err as SelfNegotiationError).code).toBe(
          "CANNOT_NEGOTIATE_OWN_LISTING",
        );
      }
    });

    it("handles case-insensitive comparison", () => {
      expect(
        canNegotiate(
          "11111111-1111-1111-1111-111111111111",
          "11111111-1111-1111-1111-111111111111".toUpperCase(),
        ),
      ).toBe(false);
    });

    it("throws on missing or empty user IDs", () => {
      expect(() => assertCanNegotiate("", sellerId)).toThrow();
      expect(() => assertCanNegotiate(buyerId, "")).toThrow();
    });
  });

  describe("Offer state transitions", () => {
    it("allows valid transitions from pending", () => {
      const validTargets = [
        "accepted",
        "declined",
        "withdrawn",
        "countered",
        "superseded",
      ] as const;

      for (const target of validTargets) {
        expect(canTransitionOffer("pending", target)).toBe(true);
        expect(() =>
          assertValidOfferTransition("pending", target),
        ).not.toThrow();
      }
    });

    it("allows no-op transition (same state)", () => {
      expect(() =>
        assertValidOfferTransition("pending", "pending"),
      ).not.toThrow();
      expect(() =>
        assertValidOfferTransition("accepted", "accepted"),
      ).not.toThrow();
    });

    it("rejects transitions from terminal states", () => {
      const terminals = [
        "accepted",
        "declined",
        "withdrawn",
        "countered",
        "superseded",
      ] as const;

      for (const term of terminals) {
        expect(canTransitionOffer(term, "pending")).toBe(false);
        expect(() => assertValidOfferTransition(term, "pending")).toThrow(
          InvalidOfferTransitionError,
        );
      }
    });
  });

  describe("Reservation state transitions", () => {
    it("allows active to transition to completed or cancelled", () => {
      expect(canTransitionReservation("active", "completed")).toBe(true);
      expect(canTransitionReservation("active", "cancelled")).toBe(true);
      expect(() =>
        assertValidReservationTransition("active", "completed"),
      ).not.toThrow();
      expect(() =>
        assertValidReservationTransition("active", "cancelled"),
      ).not.toThrow();
    });

    it("allows no-op transition (same state)", () => {
      expect(() =>
        assertValidReservationTransition("active", "active"),
      ).not.toThrow();
    });

    it("rejects transitions from terminal states", () => {
      expect(canTransitionReservation("completed", "active")).toBe(false);
      expect(canTransitionReservation("cancelled", "active")).toBe(false);
      expect(() =>
        assertValidReservationTransition("completed", "active"),
      ).toThrow(InvalidReservationTransitionError);
    });
  });

  describe("supersedeCompromisedOffers", () => {
    it("marks all other pending offers as superseded", () => {
      const offers = [
        {
          id: "offer-1",
          status: "pending" as const,
        },
        {
          id: "offer-2",
          status: "pending" as const,
        },
        {
          id: "offer-3",
          status: "declined" as const,
        },
      ];

      const result = supersedeCompromisedOffers(offers, "offer-1");
      expect(result).toEqual([
        { id: "offer-1", status: "pending" }, // accepted offer not modified by this helper
        { id: "offer-2", status: "superseded" }, // competing pending offer superseded
        { id: "offer-3", status: "declined" }, // already declined offer unchanged
      ]);
    });
  });
});
