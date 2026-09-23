import { describe, expect, it } from "vitest";

import {
  validateCancelReservationInput,
  validateCounterOfferInput,
  validateCreateOfferInput,
} from "./offers.ts";

describe("offers validation schemas", () => {
  const validListingId = "11111111-2222-3333-4444-555555555555";

  describe("validateCreateOfferInput", () => {
    it("accepts valid offer without message", () => {
      const res = validateCreateOfferInput({
        listingId: validListingId,
        amountCents: 1500,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.amountCents).toBe(1500);
        expect(res.value.listingId).toBe(validListingId);
      }
    });

    it("accepts valid offer with message", () => {
      const res = validateCreateOfferInput({
        listingId: validListingId,
        amountCents: 1500,
        message: "Can pick up today!",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.message).toBe("Can pick up today!");
      }
    });

    it("rejects non-object payload", () => {
      const res = validateCreateOfferInput("invalid");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects invalid UUID listingId", () => {
      const res = validateCreateOfferInput({
        listingId: "not-a-uuid",
        amountCents: 1000,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.listingId).toBeDefined();
      }
    });

    it("rejects non-positive amount when allowZero is false", () => {
      const resZero = validateCreateOfferInput({
        listingId: validListingId,
        amountCents: 0,
      });
      expect(resZero.ok).toBe(false);

      const resNegative = validateCreateOfferInput({
        listingId: validListingId,
        amountCents: -50,
      });
      expect(resNegative.ok).toBe(false);
    });

    it("accepts zero amount when allowZero is true", () => {
      const res = validateCreateOfferInput(
        {
          listingId: validListingId,
          amountCents: 0,
        },
        { allowZero: true },
      );
      expect(res.ok).toBe(true);
    });

    it("rejects amount exceeding asking price", () => {
      const res = validateCreateOfferInput(
        {
          listingId: validListingId,
          amountCents: 2500,
        },
        { askingPriceCents: 2000 },
      );
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.amountCents).toBeDefined();
        expect(res.fieldErrors.amountCents?.[0]).toContain("asking price");
      }
    });

    it("accepts amount equal to asking price", () => {
      const res = validateCreateOfferInput(
        {
          listingId: validListingId,
          amountCents: 2000,
        },
        { askingPriceCents: 2000 },
      );
      expect(res.ok).toBe(true);
    });

    it("rejects message exceeding 500 characters", () => {
      const res = validateCreateOfferInput({
        listingId: validListingId,
        amountCents: 1000,
        message: "x".repeat(501),
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.message).toBeDefined();
      }
    });

    it("rejects unknown fields", () => {
      const res = validateCreateOfferInput({
        listingId: validListingId,
        amountCents: 1000,
        extraHack: "malicious",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });
  });

  describe("validateCounterOfferInput", () => {
    it("accepts valid counteroffer", () => {
      const res = validateCounterOfferInput({
        amountCents: 1800,
        message: "How about 18?",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.amountCents).toBe(1800);
      }
    });

    it("rejects counteroffer with zero or negative amount", () => {
      const res = validateCounterOfferInput({
        amountCents: 0,
      });
      expect(res.ok).toBe(false);
    });

    it("rejects counteroffer exceeding asking price", () => {
      const res = validateCounterOfferInput(
        {
          amountCents: 3000,
        },
        { askingPriceCents: 2500 },
      );
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.amountCents).toBeDefined();
      }
    });
  });

  describe("validateCancelReservationInput", () => {
    it("accepts valid cancellation reasons", () => {
      const allowed = [
        "no_show",
        "changed_mind",
        "scheduling_conflict",
        "other",
        "listing_archived",
      ];
      for (const r of allowed) {
        const res = validateCancelReservationInput({ reason: r });
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.value.reason).toBe(r);
        }
      }
    });

    it("rejects invalid cancellation reason", () => {
      const res = validateCancelReservationInput({
        reason: "buyer_was_rude",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.reason).toBeDefined();
      }
    });

    it("rejects empty or missing reason", () => {
      expect(validateCancelReservationInput({}).ok).toBe(false);
      expect(validateCancelReservationInput({ reason: "" }).ok).toBe(false);
    });
  });
});
