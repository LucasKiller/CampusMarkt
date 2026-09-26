import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ModerationQueueItemDTO } from "@campusmarkt/types";
import { ModerationActionModal } from "./moderation-action-modal";
import { ModerationReportCard } from "./moderation-report-card";

describe("ModerationActionModal component (T13)", () => {
  it("renders nothing when isOpen is false", () => {
    const html = renderToString(
      <ModerationActionModal
        isOpen={false}
        onClose={vi.fn()}
        actionType="dismiss_report"
        targetType="listing"
        targetId="11111111-1111-4111-8111-111111111111"
      />,
    );

    expect(html).toBe("");
  });

  it("renders accessible modal dialog with mandatory justification note input", () => {
    const html = renderToString(
      <ModerationActionModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="dismiss_report"
        targetType="listing"
        targetId="11111111-1111-4111-8111-111111111111"
        targetTitle="Suspicious Calculus Notes"
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Meldung verwerfen");
    expect(html).toContain("Suspicious Calculus Notes");
    expect(html).toContain("Begründung (Pflichtfeld)");
    expect(html).toContain("Wird unveränderlich im Audit-Log erfasst.");
    expect(html).toContain("0/1000");
    expect(html).toContain("Abbrechen");
  });

  it("adapts title and button for remove_listing action", () => {
    const html = renderToString(
      <ModerationActionModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="remove_listing"
        targetType="listing"
        targetId="11111111-1111-4111-8111-111111111111"
      />,
    );

    expect(html).toContain("Inserat entfernen");
    expect(html).toContain("Inserat unwiderruflich entfernen");
    expect(html).toContain(
      "Aktive Reservierungen werden automatisch storniert.",
    );
  });

  it("adapts title and button for suspend_user action", () => {
    const html = renderToString(
      <ModerationActionModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="suspend_user"
        targetType="user"
        targetId="22222222-2222-4222-8222-222222222222"
      />,
    );

    expect(html).toContain("Nutzer sperren");
    expect(html).toContain("Nutzerkonto sperren");
    expect(html).toContain("Alle aktiven Inserate werden entfernt");
  });
});

describe("ModerationReportCard component (T13)", () => {
  const listingItem: ModerationQueueItemDTO = {
    id: "rep-1111-1111-1111-111111111111",
    targetType: "listing",
    targetId: "list-2222-2222-2222-222222222222",
    reason: "prohibited_content",
    details: "Violates weapons policy.",
    status: "pending",
    createdAt: "2026-09-26T01:00:00.000Z",
    listingTitle: "Airsoft Pistol",
  };

  const userItem: ModerationQueueItemDTO = {
    id: "rep-3333-3333-3333-333333333333",
    targetType: "user",
    targetId: "user-4444-4444-4444-444444444444",
    reason: "harassment_or_abuse",
    details: "Insulting messages sent to multiple buyers.",
    status: "pending",
    createdAt: "2026-09-26T02:00:00.000Z",
    userName: "Aggressive Seller",
  };

  it("renders listing report card with target title, details, and action triggers", () => {
    const html = renderToString(
      <ModerationReportCard item={listingItem} onActionSelect={vi.fn()} />,
    );

    expect(html).toContain("Inserat");
    expect(html).toContain("Airsoft Pistol");
    expect(html).toContain("Verbotene Inhalte");
    expect(html).toContain("Violates weapons policy.");
    expect(html).toContain("Meldung verwerfen");
    expect(html).toContain("Inserat entfernen");
    expect(html).toContain("Nutzer sperren");
  });

  it("renders user report card with username and without remove_listing button", () => {
    const html = renderToString(
      <ModerationReportCard item={userItem} onActionSelect={vi.fn()} />,
    );

    expect(html).toContain("Nutzer");
    expect(html).toContain("Aggressive Seller");
    expect(html).toContain("Belästigung oder Missbrauch");
    expect(html).toContain("Insulting messages sent to multiple buyers.");
    expect(html).toContain("Meldung verwerfen");
    expect(html).toContain("Nutzer sperren");
    expect(html).not.toContain("Inserat entfernen");
  });
});
