import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

import type { FavoriteItemDTO } from "@campusmarkt/types";
import FavoritesPage from "./page";
import { FavoritesView } from "./favorites-view";

const sampleFavoriteItem: FavoriteItemDTO = {
  id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  listingType: "SELL",
  title: "Vintage Oak Desk",
  priceCents: 4500,
  category: "furniture",
  pickupArea: "innenstadt",
  condition: "GOOD",
  status: "active",
  createdAt: "2026-09-23T12:00:00.000Z",
  coverImage: "media/listings/cover1.webp",
  seller: {
    publicId: "11111111-1111-4111-8111-111111111111",
    displayName: "TU Student",
    avatarUrl: null,
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  },
  favoritedAt: "2026-09-23T13:00:00.000Z",
};

let mockIdentity: { authUserId: string; emailConfirmed: boolean } | null = {
  authUserId: "user-123",
  emailConfirmed: true,
};

let mockFavoritesList: FavoriteItemDTO[] = [sampleFavoriteItem];

vi.mock("../../modules/identity/server/access", () => ({
  getSessionDal: () => ({
    getOptionalIdentity: async () => mockIdentity,
  }),
}));

vi.mock("../../modules/listings/server/index", () => ({
  getMarketplaceFavoritesService: () => ({
    getUserFavorites: async () => ({
      status: "success",
      data: {
        items: mockFavoritesList,
        nextCursor: null,
      },
    }),
  }),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

describe("Favorites Dashboard Page UI (T15)", () => {
  beforeEach(() => {
    mockIdentity = { authUserId: "user-123", emailConfirmed: true };
    mockFavoritesList = [sampleFavoriteItem];
    mockRedirect.mockClear();
  });

  describe("FavoritesPage server component", () => {
    it("redirects unauthenticated visitor to /login?next=/favorites", async () => {
      mockIdentity = null;

      await expect(FavoritesPage()).rejects.toThrow(
        "REDIRECT:/login?next=/favorites",
      );
      expect(mockRedirect).toHaveBeenCalledWith("/login?next=/favorites");
    });

    it("renders page with title and saved listings grid for authenticated user", async () => {
      mockIdentity = { authUserId: "user-123", emailConfirmed: true };
      mockFavoritesList = [sampleFavoriteItem];

      const pageJsx = await FavoritesPage();
      const html = renderToString(pageJsx);

      expect(html).toContain("Merkliste");
      expect(html).toContain('data-testid="favorites-title"');
      expect(html).toContain("Vintage Oak Desk");
      expect(html).toContain("€45.00");
      expect(html).toContain("TU Student");
      expect(html).toContain("TU Braunschweig");
    });

    it("renders empty state with CTA to /feed when user has no favorites", async () => {
      mockIdentity = { authUserId: "user-123", emailConfirmed: true };
      mockFavoritesList = [];

      const pageJsx = await FavoritesPage();
      const html = renderToString(pageJsx);

      expect(html).toContain("Deine Merkliste ist leer");
      expect(html).toContain('data-testid="favorites-empty-state"');
      expect(html).toContain('href="/feed"');
      expect(html).toContain("Inserate entdecken");
    });
  });

  describe("FavoritesView component", () => {
    it("renders a saved cover photo from the public listing bucket", () => {
      const html = renderToString(
        <FavoritesView initialItems={[sampleFavoriteItem]} />,
      );

      expect(html).toContain(
        'src="/storage/v1/object/public/listing-media/media/listings/cover1.webp"',
      );
    });

    it("renders status chips for reserved and sold items", () => {
      const reservedItem: FavoriteItemDTO = {
        ...sampleFavoriteItem,
        id: "22222222-2222-4222-8222-222222222222",
        status: "reserved",
      };
      const soldItem: FavoriteItemDTO = {
        ...sampleFavoriteItem,
        id: "33333333-3333-4333-8333-333333333333",
        status: "sold",
      };

      const html = renderToString(
        <FavoritesView
          initialItems={[sampleFavoriteItem, reservedItem, soldItem]}
        />,
      );

      expect(html).toContain("Reserviert");
      expect(html).toContain("Verkauft");
      expect(html).toContain("chip-reserved");
      expect(html).toContain("chip-sold");
    });

    it("renders remove action button for each saved item", () => {
      const html = renderToString(
        <FavoritesView initialItems={[sampleFavoriteItem]} />,
      );

      expect(html).toContain(
        `data-testid="remove-favorite-${sampleFavoriteItem.id}"`,
      );
      expect(html).toContain("Aus Merkliste entfernen: Vintage Oak Desk");
    });
  });
});
