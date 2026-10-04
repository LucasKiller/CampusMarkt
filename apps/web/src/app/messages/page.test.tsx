import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

import type { ConversationDTO } from "@campusmarkt/types";
import InboxPage, { generateMetadata } from "./page";

const sampleConversation: ConversationDTO = {
  id: "conv-1111-4111-8111-111111111111",
  listingId: "listing-2222-4222-8222-222222222222",
  buyerId: "buyer-3333-4333-8333-333333333333",
  sellerId: "seller-4444-4444-8444-444444444444",
  createdAt: "2026-09-24T18:00:00.000Z",
  lastMessageAt: "2026-09-24T18:05:00.000Z",
  unreadCount: 2,
  partner: {
    id: "seller-4444-4444-8444-444444444444",
    displayName: "Alex Student",
    avatarUrl: null,
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  },
  listing: {
    id: "listing-2222-4222-8222-222222222222",
    title: "Calculus Textbook 3rd Edition",
    priceCents: 2450,
    listingType: "SELL",
    status: "active",
    coverImage: null,
  },
  lastMessage: {
    id: "msg-last-1",
    content: "Ja, noch da! Abholung an der UB.",
    senderId: "seller-4444-4444-8444-444444444444",
    createdAt: "2026-09-24T18:05:00.000Z",
    readAt: null,
  },
};

let mockIdentity: { authUserId: string; emailConfirmed: boolean } | null = {
  authUserId: "buyer-3333-4333-8333-333333333333",
  emailConfirmed: true,
};

let mockConversationsList: ConversationDTO[] = [sampleConversation];
let mockLocale: "en" | "de" = "en";
let mockLoadFailed = false;

vi.mock("../../modules/localization/server/index", () => ({
  getServerLocale: async () => mockLocale,
}));

vi.mock("../../modules/identity/server/access", () => ({
  getSessionDal: () => ({
    requireActiveIdentity: async () => {
      if (!mockIdentity) throw new Error("UNAUTHENTICATED");
      return mockIdentity;
    },
  }),
}));

vi.mock("../../modules/messaging/server/index", () => ({
  getMarketplaceMessagingService: () => ({
    getUserConversations: async () =>
      mockLoadFailed
        ? { status: "unavailable" }
        : { status: "success", data: mockConversationsList },
  }),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
  notFound: vi.fn(),
}));

describe("InboxPage component (T15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      authUserId: "buyer-3333-4333-8333-333333333333",
      emailConfirmed: true,
    };
    mockConversationsList = [sampleConversation];
    mockLocale = "en";
    mockLoadFailed = false;
  });

  it("redirects unauthenticated user to login", async () => {
    mockIdentity = null;

    try {
      await InboxPage();
    } catch {
      // ignore
    }

    expect(mockRedirect).toHaveBeenCalledWith("/login?next=/messages");
  });

  it("renders active conversations with partner profile, snippet, and unread count (MSG-04)", async () => {
    const component = await InboxPage();
    const html = renderToString(component);

    expect(html).toContain('data-testid="inbox-list"');
    expect(html).toContain("Alex Student");
    expect(html).toContain("TU Braunschweig");
    expect(html).toContain("Calculus Textbook 3rd Edition");
    expect(html).toContain("Ja, noch da! Abholung an der UB.");
    expect(html).toContain('data-testid="unread-pill"');
    expect(html).toContain("2");
  });

  it("renders empty state with browse link when no conversations exist", async () => {
    mockConversationsList = [];

    const component = await InboxPage();
    const html = renderToString(component);

    expect(html).toContain('data-testid="inbox-empty-state"');
    expect(html).toContain("No conversations yet");
    expect(html).toContain('data-testid="empty-inbox-browse-link"');
    expect(html).toContain("Browse listings");
  });

  it("uses German copy when German is selected", async () => {
    mockLocale = "de";
    mockConversationsList = [];

    const html = renderToString(await InboxPage());
    expect(html).toContain("Noch keine Unterhaltungen");
    expect(html).toContain("Inserate ansehen");
  });

  it("localizes page metadata with the selected language", async () => {
    expect((await generateMetadata()).title).toBe("Messages · CampusMarkt");
    mockLocale = "de";
    expect((await generateMetadata()).title).toBe("Nachrichten · CampusMarkt");
  });

  it("shows a retryable error instead of an empty inbox when loading fails", async () => {
    mockLoadFailed = true;
    mockConversationsList = [];

    const html = renderToString(await InboxPage());

    expect(html).toContain("Unable to load your messages");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('data-testid="inbox-empty-state"');
  });
});
