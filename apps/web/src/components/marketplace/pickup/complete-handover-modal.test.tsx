import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import {
  CompleteHandoverButton,
  CompleteHandoverModal,
  validateCompletionNote,
} from "./complete-handover-modal";
import { formatCurrencyEuros } from "@campusmarkt/domain";

describe("CompleteHandoverModal and CompleteHandoverButton (T14)", () => {
  const reservationId = "33333333-3333-4333-8333-333333333333";
  const listingTitle = "E-Gitarre mit Verstärker";
  const agreedPriceCents = 12000;

  describe("validateCompletionNote", () => {
    it("accepts valid notes <= 500 characters and trims whitespace", () => {
      const res = validateCompletionNote("  Geld erhalten, alles bestens.  ");
      expect(res.valid).toBe(true);
      expect(res.trimmed).toBe("Geld erhalten, alles bestens.");
    });

    it("returns null trimmed value for empty/whitespace note", () => {
      const res = validateCompletionNote("   ");
      expect(res.valid).toBe(true);
      expect(res.trimmed).toBeNull();
    });

    it("rejects notes exceeding 500 characters", () => {
      const res = validateCompletionNote("a".repeat(501));
      expect(res.valid).toBe(false);
      expect(res.error).toContain("maximal 500 Zeichen");
    });
  });

  describe("CompleteHandoverModal rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToString(
        <CompleteHandoverModal
          isOpen={false}
          onClose={vi.fn()}
          reservationId={reservationId}
        />,
      );

      expect(html).toBe("");
    });

    it("renders accessible modal with title, listing details, and inputs when open", () => {
      const html = renderToString(
        <CompleteHandoverModal
          isOpen={true}
          onClose={vi.fn()}
          reservationId={reservationId}
          listingTitle={listingTitle}
          agreedPriceCents={agreedPriceCents}
        />,
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="complete-handover-title"');
      expect(html).toContain("Übergabe abschließen");
      expect(html).toContain(listingTitle);
      expect(html).toContain(formatCurrencyEuros(agreedPriceCents));
      expect(html).toContain('data-testid="completion-note-input"');
      expect(html).toContain('data-testid="complete-handover-cancel"');
      expect(html).toContain('data-testid="complete-handover-confirm"');
    });
  });

  describe("CompleteHandoverButton rendering", () => {
    it("renders action button with 'Übergabe abschließen' text", () => {
      const html = renderToString(
        <CompleteHandoverButton
          reservationId={reservationId}
          listingTitle={listingTitle}
          agreedPriceCents={agreedPriceCents}
        />,
      );

      expect(html).toContain('data-testid="complete-handover-trigger"');
      expect(html).toContain("Übergabe abschließen");
      expect(html).not.toContain('disabled=""');
    });

    it("renders disabled button when disabled=true", () => {
      const html = renderToString(
        <CompleteHandoverButton
          reservationId={reservationId}
          disabled={true}
        />,
      );

      expect(html).toContain("disabled");
    });
  });
});
