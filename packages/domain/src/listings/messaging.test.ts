import { describe, expect, it } from "vitest";

import {
  assertCanMessage,
  canMessage,
  formatCurrencyEuros,
  formatOfferMilestone,
  formatReservationMilestone,
  resolveConversationPartner,
  SelfMessagingError,
} from "./messaging.ts";

describe("messaging domain invariants and helpers", () => {
  const buyerId = "11111111-1111-1111-1111-111111111111";
  const sellerId = "22222222-2222-2222-2222-222222222222";

  describe("canMessage and assertCanMessage", () => {
    it("allows messaging between distinct buyer and seller", () => {
      expect(canMessage(buyerId, sellerId)).toBe(true);
      expect(() => assertCanMessage(buyerId, sellerId)).not.toThrow();
    });

    it("rejects messaging oneself on one's own listing", () => {
      expect(canMessage(sellerId, sellerId)).toBe(false);
      expect(() => assertCanMessage(sellerId, sellerId)).toThrow(
        SelfMessagingError,
      );
      expect(() => assertCanMessage(sellerId, sellerId)).toThrowError(
        expect.objectContaining({ code: "CANNOT_MESSAGE_OWN_LISTING" }),
      );
    });

    it("handles case-insensitive comparison of UUIDs", () => {
      expect(canMessage(sellerId.toUpperCase(), sellerId.toLowerCase())).toBe(
        false,
      );
    });

    it("rejects empty IDs", () => {
      expect(canMessage("", sellerId)).toBe(false);
      expect(canMessage(buyerId, "")).toBe(false);
      expect(() => assertCanMessage("", sellerId)).toThrow();
    });
  });

  describe("resolveConversationPartner", () => {
    const conversation = { buyerId, sellerId };

    it("resolves seller as partner when current user is buyer", () => {
      const result = resolveConversationPartner(conversation, buyerId);
      expect(result.partnerId).toBe(sellerId);
      expect(result.isBuyer).toBe(true);
      expect(result.isSeller).toBe(false);
    });

    it("resolves buyer as partner when current user is seller", () => {
      const result = resolveConversationPartner(conversation, sellerId);
      expect(result.partnerId).toBe(buyerId);
      expect(result.isBuyer).toBe(false);
      expect(result.isSeller).toBe(true);
    });

    it("throws when current user is not a participant", () => {
      const thirdParty = "33333333-3333-3333-3333-333333333333";
      expect(() =>
        resolveConversationPartner(conversation, thirdParty),
      ).toThrow("Current user is not a participant in this conversation.");
    });
  });

  describe("formatCurrencyEuros", () => {
    it("formats cents to currency string with 2 decimal places", () => {
      expect(formatCurrencyEuros(2500)).toBe("€25.00");
      expect(formatCurrencyEuros(0)).toBe("€0.00");
      expect(formatCurrencyEuros(99)).toBe("€0.99");
    });
  });

  describe("timeline milestones formatting", () => {
    it("formats offer milestone for pending offer", () => {
      const milestone = formatOfferMilestone({
        id: "offer-1",
        status: "pending",
        amountCents: 2000,
        createdAt: "2026-09-24T20:00:00.000Z",
      });
      expect(milestone.type).toBe("offer_created");
      expect(milestone.label).toBe("Angebot: €20.00");
      expect(milestone.amountCents).toBe(2000);
      expect(milestone.timestamp).toBe("2026-09-24T20:00:00.000Z");
    });

    it("formats offer milestone for countered offer", () => {
      const milestone = formatOfferMilestone({
        id: "offer-2",
        status: "countered",
        amountCents: 1800,
        createdAt: "2026-09-24T20:00:00.000Z",
        updatedAt: "2026-09-24T20:10:00.000Z",
      });
      expect(milestone.type).toBe("offer_countered");
      expect(milestone.label).toBe("Gegenangebot: €18.00");
      expect(milestone.timestamp).toBe("2026-09-24T20:10:00.000Z");
    });

    it("formats offer milestone for accepted offer", () => {
      const milestone = formatOfferMilestone({
        id: "offer-3",
        status: "accepted",
        amountCents: 1800,
        createdAt: "2026-09-24T20:00:00.000Z",
      });
      expect(milestone.type).toBe("offer_accepted");
      expect(milestone.label).toBe("Angebot über €18.00 angenommen");
    });

    it("formats reservation milestone for active reservation", () => {
      const milestone = formatReservationMilestone({
        id: "res-1",
        status: "active",
        agreedPriceCents: 1800,
        createdAt: "2026-09-24T20:15:00.000Z",
      });
      expect(milestone.type).toBe("reservation_active");
      expect(milestone.label).toBe("Reserviert zur Abholung (€18.00)");
      expect(milestone.amountCents).toBe(1800);
    });

    it("formats reservation milestone for cancelled reservation with reason", () => {
      const milestone = formatReservationMilestone({
        id: "res-2",
        status: "cancelled",
        agreedPriceCents: 1800,
        createdAt: "2026-09-24T20:15:00.000Z",
        updatedAt: "2026-09-24T20:30:00.000Z",
        cancellationReason: "no_show",
      });
      expect(milestone.type).toBe("reservation_cancelled");
      expect(milestone.label).toBe("Reservierung storniert");
      expect(milestone.description).toBe("no_show");
      expect(milestone.timestamp).toBe("2026-09-24T20:30:00.000Z");
    });
  });
});
