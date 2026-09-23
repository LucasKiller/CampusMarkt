import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { NegotiationBar } from "./negotiation-bar";
import type { OfferDTO, ReservationDTO } from "@campusmarkt/types";

describe("NegotiationBar component (T14)", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  const listingTitle = "Statik für Bauingenieure";
  const sellerId = "seller-uuid-1";
  const buyerId = "buyer-uuid-2";

  const sampleOffer: OfferDTO = {
    id: "offer-123",
    listingId,
    buyerId,
    sellerId,
    amountCents: 2000,
    message: "Kann ich heute um 16 Uhr abholen?",
    status: "pending",
    createdAt: "2026-09-23T12:00:00.000Z",
  };

  const sampleReservation: ReservationDTO = {
    id: "res-456",
    listingId,
    buyerId,
    sellerId,
    offerId: "offer-123",
    agreedPriceCents: 2000,
    status: "active",
    createdAt: "2026-09-23T12:30:00.000Z",
  };

  describe("Buyer View (OFFR-01, OFFR-02)", () => {
    it("renders Kaufanfrage senden and Preis vorschlagen buttons for SELL listing with price", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          listingType="SELL"
          currentUserId={buyerId}
        />,
      );

      expect(html).toContain('data-testid="cta-buy-now"');
      expect(html).toContain("Kaufanfrage senden");
      expect(html).toContain('data-testid="cta-make-offer"');
      expect(html).toContain("Preis vorschlagen");
      expect(html).not.toContain("seller-offers-card");
    });

    it("renders only Kaufanfrage senden for GIVE_AWAY listing without price", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={null}
          listingType="GIVE_AWAY"
          currentUserId={buyerId}
        />,
      );

      expect(html).toContain('data-testid="cta-buy-now"');
      expect(html).toContain("Kaufanfrage senden");
      expect(html).not.toContain('data-testid="cta-make-offer"');
    });

    it("displays pending offer status card when buyer has an active pending offer", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          currentUserId={buyerId}
          initialOffers={[sampleOffer]}
        />,
      );

      expect(html).toContain('data-testid="buyer-pending-offer-card"');
      expect(html).toContain("€20.00");
      expect(html).toContain("Ausstehend beim Verkäufer");
    });
  });

  describe("Seller View (OFFR-01, OFFR-02)", () => {
    it("renders seller offers card with incoming offers and actions, hiding buyer CTAs", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          currentUserId={sellerId}
          initialOffers={[sampleOffer]}
        />,
      );

      expect(html).not.toContain('data-testid="cta-buy-now"');
      expect(html).not.toContain('data-testid="cta-make-offer"');
      expect(html).toContain('data-testid="seller-offers-card"');
      expect(html).toContain("Eingehende Anfragen (1)");
      expect(html).toContain('data-testid="seller-offer-row-offer-123"');
      expect(html).toContain("€20.00");
      expect(html).toContain("Kann ich heute um 16 Uhr abholen?");
      expect(html).toContain('data-testid="seller-accept-btn"');
      expect(html).toContain('data-testid="seller-counter-btn"');
      expect(html).toContain('data-testid="seller-decline-btn"');
    });

    it("renders empty state in seller card when no pending offers exist", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          currentUserId={sellerId}
          initialOffers={[]}
        />,
      );

      expect(html).toContain('data-testid="seller-offers-card"');
      expect(html).toContain("Eingehende Anfragen (0)");
      expect(html).toContain("Aktuell liegen keine offenen Kaufanfragen vor.");
    });
  });

  describe("Reserved and Inactive States", () => {
    it("renders reserved badge and link to reservations when listing status is reserved", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          listingStatus="reserved"
          initialReservation={sampleReservation}
          currentUserId={buyerId}
        />,
      );

      expect(html).toContain('data-testid="listing-reserved-badge"');
      expect(html).toContain(
        "Dieser Artikel ist bereits für einen Käufer reserviert.",
      );
      expect(html).toContain("/account/reservations");
      expect(html).not.toContain('data-testid="cta-buy-now"');
      expect(html).not.toContain('data-testid="cta-make-offer"');
    });

    it("renders seller reserved notice when seller views a reserved listing", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          listingStatus="reserved"
          initialReservation={sampleReservation}
          currentUserId={sellerId}
        />,
      );

      expect(html).toContain('data-testid="listing-reserved-badge"');
      expect(html).toContain("Dieser Artikel ist aktuell reserviert.");
      expect(html).not.toContain('data-testid="seller-offers-card"');
    });

    it("hides negotiation controls when listing is sold", () => {
      const html = renderToString(
        <NegotiationBar
          listingId={listingId}
          listingTitle={listingTitle}
          sellerId={sellerId}
          askingPriceCents={2500}
          listingStatus="sold"
          currentUserId={buyerId}
        />,
      );

      expect(html).not.toContain('data-testid="cta-buy-now"');
      expect(html).not.toContain('data-testid="cta-make-offer"');
      expect(html).not.toContain('data-testid="seller-offers-card"');
    });
  });
});
