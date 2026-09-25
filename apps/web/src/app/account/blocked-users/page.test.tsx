import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import type { UserBlockDTO } from "@campusmarkt/types";
import { BlockedUsersView } from "./blocked-users-view";

describe("BlockedUsersView component (T15)", () => {
  const sampleBlockedUser: UserBlockDTO = {
    id: "block-00000000-0000-4000-8000-000000000001",
    blockedId: "user-00000000-0000-4000-8000-000000000002",
    blockedName: "Nerviger Nutzer",
    avatarUrl: null,
    createdAt: "2026-09-25T12:00:00.000Z",
  };

  it("renders accessible empty state when no users are blocked", () => {
    const html = renderToString(<BlockedUsersView initialBlockedUsers={[]} />);

    expect(html).toContain('data-testid="blocked-users-empty-state"');
    expect(html).toContain("Keine blockierten Nutzer");
    expect(html).toContain("Sie haben derzeit keine Nutzer blockiert.");
  });

  it("renders blocked users list with user details and unblock action", () => {
    const html = renderToString(
      <BlockedUsersView initialBlockedUsers={[sampleBlockedUser]} />,
    );

    expect(html).toContain('data-testid="blocked-users-list"');
    expect(html).toContain("Nerviger Nutzer");
    expect(html).toContain(
      'data-testid="unblock-btn-user-00000000-0000-4000-8000-000000000002"',
    );
    expect(html).toContain("Entsperren");
    expect(html).toContain("Blockiert am");
  });

  it("renders user avatar when avatarUrl is provided", () => {
    const userWithAvatar: UserBlockDTO = {
      ...sampleBlockedUser,
      avatarUrl: "https://example.com/avatar.webp",
    };

    const html = renderToString(
      <BlockedUsersView initialBlockedUsers={[userWithAvatar]} />,
    );

    expect(html).toContain('src="https://example.com/avatar.webp"');
    expect(html).toContain('alt="Nerviger Nutzer"');
  });

  it("renders initial letter fallback when avatarUrl is null", () => {
    const html = renderToString(
      <BlockedUsersView initialBlockedUsers={[sampleBlockedUser]} />,
    );

    expect(html).toContain("N"); // First letter of "Nerviger Nutzer"
  });
});
