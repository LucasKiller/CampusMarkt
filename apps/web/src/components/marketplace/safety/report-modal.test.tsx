import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { ReportModal, REPORT_REASON_LABELS } from "./report-modal";
import { REPORT_REASONS } from "@campusmarkt/types";

describe("ReportModal component (T13)", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  const listingTitle = "Vintage Fahrrad 28 Zoll";

  it("renders nothing when isOpen is false", () => {
    const html = renderToString(
      <ReportModal
        isOpen={false}
        onClose={vi.fn()}
        targetType="listing"
        targetId={listingId}
      />,
    );

    expect(html).toBe("");
  });

  it("renders accessible modal dialog with title and target info when open", () => {
    const html = renderToString(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="listing"
        targetId={listingId}
        targetTitle={listingTitle}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Inhalt melden");
    expect(html).toContain("Vintage Fahrrad 28 Zoll");
  });

  it("renders user report modal with appropriate title and description", () => {
    const html = renderToString(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="user"
        targetId="22222222-2222-4222-8222-222222222222"
        targetTitle="Verdächtiger Nutzer"
      />,
    );

    expect(html).toContain("Nutzer: Verdächtiger Nutzer");
  });

  it("renders all taxonomy report reasons in select options", () => {
    const html = renderToString(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="listing"
        targetId={listingId}
      />,
    );

    for (const reason of REPORT_REASONS) {
      expect(html).toContain(`value="${reason}"`);
      expect(html).toContain(REPORT_REASON_LABELS[reason]);
    }
  });

  it("renders optional details textarea and character counter", () => {
    const html = renderToString(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="listing"
        targetId={listingId}
      />,
    );

    expect(html).toContain('id="report-details"');
    expect(html).toContain('data-testid="char-counter"');
    expect(html).toContain("0 / 1000");
  });

  it("displays confidentiality assurance notice", () => {
    const html = renderToString(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="listing"
        targetId={listingId}
      />,
    );

    expect(html).toContain("Vertraulich");
    expect(html).toContain(
      "Die gemeldete Person erfährt nicht, wer diesen Bericht eingereicht hat.",
    );
  });

  it("renders action buttons (cancel and submit)", () => {
    const html = renderToString(
      <ReportModal
        isOpen={true}
        onClose={vi.fn()}
        targetType="listing"
        targetId={listingId}
      />,
    );

    expect(html).toContain("Abbrechen");
    expect(html).toContain("Meldung absenden");
  });
});
