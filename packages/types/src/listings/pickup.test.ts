import { describe, expect, it } from "vitest";

import {
  isCompletePickupRequest,
  isPublicProfileDTO,
  isSafePickupGuidanceDTO,
  isSafePickupSpot,
  isTransactionReceiptDTO,
  type CompletePickupRequest,
  type PublicProfileDTO,
  type SafePickupGuidanceDTO,
  type SafePickupSpot,
  type TransactionReceiptDTO,
} from "./pickup.ts";

describe("pickup completion types and predicates", () => {
  const validSpot: SafePickupSpot = {
    id: "MENSA_1",
    name: "Mensa 1 Katharinenstraße",
    description: "Hauptfoyer / Vorplatz",
  };

  const validPartner: PublicProfileDTO = {
    id: "33333333-3333-3333-3333-333333333333",
    displayName: "Max Mustermann",
    avatarUrl: "/media/avatars/33333333-3333-3333-3333-333333333333/1.webp",
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  };

  const validReceipt: TransactionReceiptDTO = {
    reservationId: "11111111-1111-1111-1111-111111111111",
    listingId: "22222222-2222-2222-2222-222222222222",
    listingTitle: "Analysis I Lehrbuch",
    listingType: "SELL",
    agreedPriceCents: 2000,
    status: "completed",
    partner: validPartner,
    pickupArea: "campus_nord_bienrode",
    completedAt: "2026-09-25T12:00:00.000Z",
    completionNote: "Item handed over smoothly in person",
    role: "seller",
  };

  describe("isSafePickupSpot", () => {
    it("accepts valid safe pickup spot", () => {
      expect(isSafePickupSpot(validSpot)).toBe(true);
    });

    it("rejects invalid spot objects or missing fields", () => {
      expect(isSafePickupSpot(null)).toBe(false);
      expect(isSafePickupSpot({})).toBe(false);
      expect(isSafePickupSpot({ id: "X", name: "" })).toBe(false);
      expect(isSafePickupSpot({ ...validSpot, extra: "extra" })).toBe(false);
    });
  });

  describe("isSafePickupGuidanceDTO", () => {
    it("accepts valid guidance DTO", () => {
      const guidance: SafePickupGuidanceDTO = {
        rules: ["Rule 1", "Rule 2"],
        spots: [validSpot],
      };
      expect(isSafePickupGuidanceDTO(guidance)).toBe(true);
    });

    it("rejects non-arrays or malformed spots", () => {
      expect(isSafePickupGuidanceDTO({ rules: "rule", spots: [] })).toBe(false);
      expect(
        isSafePickupGuidanceDTO({
          rules: ["rule"],
          spots: [{ invalid: true }],
        }),
      ).toBe(false);
    });
  });

  describe("isPublicProfileDTO", () => {
    it("accepts valid partner profile", () => {
      expect(isPublicProfileDTO(validPartner)).toBe(true);
      expect(
        isPublicProfileDTO({
          id: "33333333-3333-3333-3333-333333333333",
          displayName: "Erika",
        }),
      ).toBe(true);
    });

    it("rejects empty displayName or bad badge", () => {
      expect(
        isPublicProfileDTO({
          id: "33333333-3333-3333-3333-333333333333",
          displayName: "",
        }),
      ).toBe(false);
      expect(
        isPublicProfileDTO({
          id: "33333333-3333-3333-3333-333333333333",
          displayName: "Erika",
          universityBadge: "invalid",
        }),
      ).toBe(false);
    });
  });

  describe("isCompletePickupRequest", () => {
    it("accepts empty request or valid completion note", () => {
      const req: CompletePickupRequest = { completionNote: "Cash received" };
      expect(isCompletePickupRequest(req)).toBe(true);
      expect(isCompletePickupRequest({})).toBe(true);
      expect(isCompletePickupRequest({ completionNote: null })).toBe(true);
      expect(
        isCompletePickupRequest({
          completionNote: "Cash received, bike handed over",
        }),
      ).toBe(true);
    });

    it("rejects notes exceeding 500 characters or extra keys", () => {
      expect(
        isCompletePickupRequest({
          completionNote: "a".repeat(501),
        }),
      ).toBe(false);
      expect(
        isCompletePickupRequest({
          completionNote: "ok",
          extraKey: 123,
        }),
      ).toBe(false);
      expect(isCompletePickupRequest(null)).toBe(false);
    });
  });

  describe("isTransactionReceiptDTO", () => {
    it("accepts valid transaction receipt DTO", () => {
      expect(isTransactionReceiptDTO(validReceipt)).toBe(true);
      const minimalReceipt = {
        ...validReceipt,
        completionNote: undefined,
        role: undefined,
      };
      expect(isTransactionReceiptDTO(minimalReceipt)).toBe(true);
    });

    it("rejects non-completed status or malformed uuid", () => {
      expect(
        isTransactionReceiptDTO({
          ...validReceipt,
          status: "active",
        }),
      ).toBe(false);
      expect(
        isTransactionReceiptDTO({
          ...validReceipt,
          reservationId: "invalid-uuid",
        }),
      ).toBe(false);
      expect(
        isTransactionReceiptDTO({
          ...validReceipt,
          agreedPriceCents: -10,
        }),
      ).toBe(false);
      expect(
        isTransactionReceiptDTO({
          ...validReceipt,
          completedAt: "invalid-date",
        }),
      ).toBe(false);
    });
  });
});
