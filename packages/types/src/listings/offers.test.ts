import { describe, expect, it } from "vitest";

import {
  isCancelReservationRequest,
  isCounterOfferRequest,
  isCreateOfferRequest,
  isOfferDTO,
  isOfferStatus,
  isReservationDTO,
  isReservationStatus,
  OFFER_STATUSES,
  RESERVATION_STATUSES,
  type OfferDTO,
  type OfferStatus,
  type ReservationDTO,
} from "./offers.ts";

describe("offers types and predicates", () => {
  const validOffer: OfferDTO = {
    id: "11111111-1111-1111-1111-111111111111",
    listingId: "22222222-2222-2222-2222-222222222222",
    buyerId: "33333333-3333-3333-3333-333333333333",
    sellerId: "44444444-4444-4444-4444-444444444444",
    amountCents: 1500,
    message: "Would you take 15 euros?",
    status: "pending",
    createdAt: "2026-09-23T20:00:00.000Z",
  };

  const validReservation: ReservationDTO = {
    id: "55555555-5555-5555-5555-555555555555",
    listingId: "22222222-2222-2222-2222-222222222222",
    buyerId: "33333333-3333-3333-3333-333333333333",
    sellerId: "44444444-4444-4444-4444-444444444444",
    offerId: "11111111-1111-1111-1111-111111111111",
    agreedPriceCents: 1500,
    status: "active",
    createdAt: "2026-09-23T20:05:00.000Z",
  };

  describe("isOfferStatus and isReservationStatus", () => {
    it("validates all supported offer statuses", () => {
      for (const s of OFFER_STATUSES) {
        expect(isOfferStatus(s)).toBe(true);
      }
      expect(isOfferStatus("unknown_status")).toBe(false);
      expect(isOfferStatus(123)).toBe(false);
    });

    it("validates all supported reservation statuses", () => {
      for (const s of RESERVATION_STATUSES) {
        expect(isReservationStatus(s)).toBe(true);
      }
      expect(isReservationStatus("pending")).toBe(false);
      expect(isReservationStatus(null)).toBe(false);
    });
  });

  describe("isOfferDTO", () => {
    it("accepts valid offer DTO", () => {
      expect(isOfferDTO(validOffer)).toBe(true);
    });

    it("accepts valid offer with null message and optional parentOfferId", () => {
      expect(
        isOfferDTO({
          ...validOffer,
          message: null,
          parentOfferId: "00000000-0000-0000-0000-000000000000",
        }),
      ).toBe(true);
    });

    it("rejects non-objects and null", () => {
      expect(isOfferDTO(null)).toBe(false);
      expect(isOfferDTO(undefined)).toBe(false);
      expect(isOfferDTO("string")).toBe(false);
    });

    it("rejects invalid UUIDs", () => {
      expect(isOfferDTO({ ...validOffer, id: "invalid-id" })).toBe(false);
      expect(isOfferDTO({ ...validOffer, listingId: "invalid-id" })).toBe(
        false,
      );
    });

    it("rejects negative amountCents", () => {
      expect(isOfferDTO({ ...validOffer, amountCents: -10 })).toBe(false);
    });

    it("rejects message exceeding 500 chars", () => {
      expect(isOfferDTO({ ...validOffer, message: "a".repeat(501) })).toBe(
        false,
      );
    });

    it("rejects invalid status", () => {
      expect(
        isOfferDTO({
          ...validOffer,
          status: "completed" as unknown as OfferStatus,
        }),
      ).toBe(false);
    });

    it("rejects extra unknown keys", () => {
      expect(isOfferDTO({ ...validOffer, extraField: true })).toBe(false);
    });
  });

  describe("isReservationDTO", () => {
    it("accepts valid reservation DTO", () => {
      expect(isReservationDTO(validReservation)).toBe(true);
    });

    it("accepts reservation with cancellation details", () => {
      expect(
        isReservationDTO({
          ...validReservation,
          status: "cancelled",
          cancellationReason: "changed_mind",
          cancelledBy: "33333333-3333-3333-3333-333333333333",
        }),
      ).toBe(true);
    });

    it("rejects non-object or null", () => {
      expect(isReservationDTO(null)).toBe(false);
      expect(isReservationDTO([])).toBe(false);
    });

    it("rejects invalid UUIDs", () => {
      expect(isReservationDTO({ ...validReservation, id: "bad" })).toBe(false);
      expect(
        isReservationDTO({ ...validReservation, cancelledBy: "bad" }),
      ).toBe(false);
    });

    it("rejects negative price", () => {
      expect(
        isReservationDTO({ ...validReservation, agreedPriceCents: -1 }),
      ).toBe(false);
    });
  });

  describe("request predicates", () => {
    it("validates CreateOfferRequest", () => {
      expect(
        isCreateOfferRequest({
          listingId: "22222222-2222-2222-2222-222222222222",
          amountCents: 1000,
          message: "Hello",
        }),
      ).toBe(true);
      expect(
        isCreateOfferRequest({
          listingId: "invalid",
          amountCents: 1000,
        }),
      ).toBe(false);
      expect(
        isCreateOfferRequest({
          listingId: "22222222-2222-2222-2222-222222222222",
          amountCents: -1,
        }),
      ).toBe(false);
    });

    it("validates CounterOfferRequest", () => {
      expect(isCounterOfferRequest({ amountCents: 2000 })).toBe(true);
      expect(
        isCounterOfferRequest({ amountCents: 2000, message: "My counter" }),
      ).toBe(true);
      expect(isCounterOfferRequest({ amountCents: -1 })).toBe(false);
      expect(isCounterOfferRequest({ amountCents: 2000, extra: 1 })).toBe(
        false,
      );
    });

    it("validates CancelReservationRequest", () => {
      expect(isCancelReservationRequest({ reason: "changed_mind" })).toBe(true);
      expect(isCancelReservationRequest({ reason: "" })).toBe(false);
      expect(isCancelReservationRequest({ reason: "   " })).toBe(false);
      expect(isCancelReservationRequest({})).toBe(false);
    });
  });
});
