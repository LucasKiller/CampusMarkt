import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { OfferModal, validateOfferAmount } from "./offer-modal";

describe("OfferModal negotiation component (T13)", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  const listingTitle = "Statik für Bauingenieure (Lehrbuch)";
  const askingPriceCents = 2500; // €25.00

  describe("validateOfferAmount", () => {
    it("rejects amounts <= 0", () => {
      expect(validateOfferAmount(0, 2500).valid).toBe(false);
      expect(validateOfferAmount(-5, 2500).valid).toBe(false);
      expect(validateOfferAmount(Number.NaN, 2500).valid).toBe(false);
    });

    it("rejects amounts exceeding asking price", () => {
      const res = validateOfferAmount(25.01, 2500);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("nicht überschreiten");
    });

    it("accepts valid offer amounts <= asking price and converts to integer cents", () => {
      const res1 = validateOfferAmount(25, 2500);
      expect(res1.valid).toBe(true);
      expect(res1.cents).toBe(2500);

      const res2 = validateOfferAmount(18.5, 2500);
      expect(res2.valid).toBe(true);
      expect(res2.cents).toBe(1850);
    });
  });

  describe("OfferModal rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToString(
        <OfferModal
          isOpen={false}
          onClose={vi.fn()}
          listingId={listingId}
          listingTitle={listingTitle}
          askingPriceCents={askingPriceCents}
        />,
      );

      expect(html).toBe("");
    });

    it("renders accessible modal dialog with Buy and Offer tabs when open", () => {
      const html = renderToString(
        <OfferModal
          isOpen={true}
          onClose={vi.fn()}
          listingId={listingId}
          listingTitle={listingTitle}
          askingPriceCents={askingPriceCents}
        />,
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="offer-modal-title"');
      expect(html).toContain('data-testid="offer-modal-dialog"');
      expect(html).toContain('data-testid="close-modal-btn"');
      expect(html).toContain('data-testid="tab-buy"');
      expect(html).toContain('data-testid="tab-offer"');
      expect(html).toContain('data-testid="submit-intent-btn"');
      expect(html).toContain("Kaufanfrage senden");
      expect(html).toContain("€25.00");
    });

    it("renders initialTab='offer' with amount input", () => {
      const html = renderToString(
        <OfferModal
          isOpen={true}
          onClose={vi.fn()}
          listingId={listingId}
          listingTitle={listingTitle}
          askingPriceCents={askingPriceCents}
          initialTab="offer"
        />,
      );

      expect(html).toContain('data-testid="offer-amount-input"');
      expect(html).toContain('data-testid="submit-offer-btn"');
      expect(html).toContain("Preisvorschlag senden");
    });

    it("renders giveaway mode without offer tab for free items", () => {
      const html = renderToString(
        <OfferModal
          isOpen={true}
          onClose={vi.fn()}
          listingId={listingId}
          listingTitle="Alte Schreibtischlampe"
          askingPriceCents={0}
          listingType="GIVE_AWAY"
        />,
      );

      expect(html).not.toContain('data-testid="tab-offer"');
      expect(html).toContain("Artikel anfragen");
      expect(html).toContain("Kostenlos");
    });
  });
});
