import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { BlockUserModal } from "./block-modal";

describe("BlockUserModal component (T14)", () => {
  const blockedUserId = "22222222-2222-4222-8222-222222222222";
  const blockedUserName = "Max Mustermann";

  it("renders nothing when isOpen is false", () => {
    const html = renderToString(
      <BlockUserModal
        isOpen={false}
        onClose={vi.fn()}
        blockedUserId={blockedUserId}
      />,
    );

    expect(html).toBe("");
  });

  it("renders accessible confirmation dialog when open", () => {
    const html = renderToString(
      <BlockUserModal
        isOpen={true}
        onClose={vi.fn()}
        blockedUserId={blockedUserId}
        blockedUserName={blockedUserName}
      />,
    );

    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Möchten Sie Max Mustermann blockieren?");
  });

  it("explains bidirectional blocking consequences", () => {
    const html = renderToString(
      <BlockUserModal
        isOpen={true}
        onClose={vi.fn()}
        blockedUserId={blockedUserId}
        blockedUserName={blockedUserName}
      />,
    );

    expect(html).toContain("Gegenseitige Sichtbarkeit");
    expect(html).toContain("Nachrichten");
    expect(html).toContain("Angebote");
    expect(html).toContain("Blockierte Nutzer");
  });

  it("renders cancel and block action buttons", () => {
    const html = renderToString(
      <BlockUserModal
        isOpen={true}
        onClose={vi.fn()}
        blockedUserId={blockedUserId}
        blockedUserName={blockedUserName}
      />,
    );

    expect(html).toContain("Abbrechen");
    expect(html).toContain("Nutzer blockieren");
  });
});
