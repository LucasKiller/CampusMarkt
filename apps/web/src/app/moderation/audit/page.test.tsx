import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ModerationActionDTO } from "@campusmarkt/types";
import { ModerationAuditView } from "./page";

describe("ModerationAuditView component (T15)", () => {
  const sampleAuditAction: ModerationActionDTO = {
    id: "audit-1111-1111-1111-111111111111",
    moderatorId: "mod-2222-2222-2222-222222222222",
    reportId: "rep-3333-3333-3333-333333333333",
    actionType: "remove_listing",
    targetType: "listing",
    targetId: "list-4444-4444-4444-444444444444",
    reason: "Confirmed policy violation regarding prohibited exam content.",
    createdAt: "2026-09-26T02:00:00.000Z",
  };

  it("renders 403 access denied state for non-moderators", () => {
    const html = renderToString(
      <ModerationAuditView initialIsModerator={false} initialLoading={false} />,
    );

    expect(html).toContain('data-testid="moderation-forbidden"');
    expect(html).toContain("Zugriff verweigert (403)");
    expect(html).toContain(
      "Dieser Bereich ist ausschließlich für autorisierte Moderatoren zugänglich.",
    );
  });

  it("renders empty audit message when no actions have occurred", () => {
    const html = renderToString(
      <ModerationAuditView
        initialIsModerator={true}
        initialAuditLog={[]}
        initialLoading={false}
      />,
    );

    expect(html).toContain('data-testid="empty-audit-message"');
    expect(html).toContain("Keine Audit-Einträge vorhanden");
    expect(html).toContain("Audit-Protokoll (0)");
  });

  it("renders audit rows with action badge, target, moderator, and reason", () => {
    const html = renderToString(
      <ModerationAuditView
        initialIsModerator={true}
        initialAuditLog={[sampleAuditAction]}
        initialLoading={false}
      />,
    );

    expect(html).toContain('data-testid="moderation-audit-list"');
    expect(html).toContain('data-testid="audit-row"');
    expect(html).toContain("Audit-Protokoll (1)");
    expect(html).toContain("Inserat entfernt");
    expect(html).toContain("list-4444-4444-4444-444444444444");
    expect(html).toContain("mod-2222");
    expect(html).toContain(
      "Confirmed policy violation regarding prohibited exam content.",
    );
  });

  it("renders loading indicator when initialLoading is true", () => {
    const html = renderToString(<ModerationAuditView initialLoading={true} />);

    expect(html).toContain('data-testid="moderation-loading"');
    expect(html).toContain("Audit-Protokoll wird geladen...");
  });
});
