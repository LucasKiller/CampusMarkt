import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ModerationQueueItemDTO } from "@campusmarkt/types";
import { ModerationQueueView } from "./page";

describe("ModerationQueueView component (T14)", () => {
  const sampleReport: ModerationQueueItemDTO = {
    id: "rep-1111-1111-1111-111111111111",
    targetType: "listing",
    targetId: "list-2222-2222-2222-222222222222",
    reason: "prohibited_content",
    details: "Prohibited item listed for sale.",
    status: "pending",
    createdAt: "2026-09-26T01:00:00.000Z",
    listingTitle: "Suspicious Item",
  };

  it("renders 403 access denied state for non-moderators", () => {
    const html = renderToString(
      <ModerationQueueView initialIsModerator={false} initialLoading={false} />,
    );

    expect(html).toContain('data-testid="moderation-forbidden"');
    expect(html).toContain("Zugriff verweigert (403)");
    expect(html).toContain(
      "Dieser Bereich ist ausschließlich für autorisierte Moderatoren zugänglich.",
    );
    expect(html).toContain("Zurück zur Startseite");
  });

  it("renders empty queue message when no pending reports exist", () => {
    const html = renderToString(
      <ModerationQueueView
        initialIsModerator={true}
        initialQueue={[]}
        initialLoading={false}
      />,
    );

    expect(html).toContain('data-testid="empty-queue-message"');
    expect(html).toContain("Keine ausstehenden Meldungen");
    expect(html).toContain("Ausstehende Meldungen (0)");
  });

  it("renders queue items and report cards for authorized moderator", () => {
    const html = renderToString(
      <ModerationQueueView
        initialIsModerator={true}
        initialQueue={[sampleReport]}
        initialLoading={false}
      />,
    );

    expect(html).toContain('data-testid="moderation-queue-list"');
    expect(html).toContain("Ausstehende Meldungen (1)");
    expect(html).toContain("Suspicious Item");
    expect(html).toContain("Prohibited item listed for sale.");
    expect(html).toContain("Meldung verwerfen");
    expect(html).toContain("Inserat entfernen");
    expect(html).toContain("Nutzer sperren");
  });

  it("renders loading indicator when initialLoading is true", () => {
    const html = renderToString(<ModerationQueueView initialLoading={true} />);

    expect(html).toContain('data-testid="moderation-loading"');
    expect(html).toContain("Moderator-Berechtigungen werden geprüft...");
  });
});
