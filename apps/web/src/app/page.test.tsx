import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
  headers: async () => ({
    get: () => "de",
  }),
}));
vi.mock("../modules/listings/server/index", () => ({
  getMarketplaceFeedService: () => ({
    getPublicFeed: async () => ({
      status: "success",
      data: {
        items: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            listingType: "SELL",
            title: "Calculus Textbook 3rd Edition",
            priceCents: 2450,
            category: "books_studies",
            pickupArea: "campus_nord_bienrode",
            condition: "GOOD",
            status: "active",
            createdAt: "2026-09-23T10:00:00.000Z",
            coverImage: "listings/sample/cover.webp",
            seller: {
              publicId: "seller-1",
              displayName: "Alex Student",
              avatarUrl: null,
              universityBadge: {
                universityId: "tu-braunschweig",
                badgeLabel: "TU Braunschweig",
              },
            },
          },
        ],
        nextCursor: null,
      },
    }),
  }),
}));

import HomePage from "./page";
import ListingsPage from "./listings/page";
import { MarketplaceFeed } from "../components/marketplace/feed";
import type { PublicFeedItem } from "@campusmarkt/types";

describe("HomePage and ListingsPage public feed UI (T14)", () => {
  const sampleItems: PublicFeedItem[] = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      listingType: "SELL",
      title: "Calculus Textbook 3rd Edition",
      priceCents: 2450,
      category: "books_studies",
      pickupArea: "campus_nord_bienrode",
      condition: "GOOD",
      status: "active",
      createdAt: "2026-09-23T10:00:00.000Z",
      coverImage: "listings/sample/cover.webp",
      seller: {
        publicId: "seller-1",
        displayName: "Alex Student",
        avatarUrl: null,
        universityBadge: {
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
        },
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      listingType: "GIVE_AWAY",
      title: "Free Desk Lamp",
      priceCents: null,
      category: "furniture",
      pickupArea: "campus_tu_altgebaeude",
      condition: "FAIR",
      status: "reserved",
      createdAt: "2026-09-23T09:00:00.000Z",
      coverImage: null,
      seller: {
        publicId: "seller-2",
        displayName: "Maria WG",
        avatarUrl: null,
        universityBadge: null,
      },
    },
  ];

  describe("MarketplaceFeed client container rendering", () => {
    it("renders feed grid with listing cards and filter bar", () => {
      const html = renderToString(
        <MarketplaceFeed
          initialItems={sampleItems}
          initialCursor="test-cursor-123"
        />,
      );

      expect(html).toContain("Calculus Textbook 3rd Edition");
      expect(html).toContain("Free Desk Lamp");
      expect(html).toContain("€24.50");
      expect(html).toContain("Zu verschenken");
      expect(html).toContain("Reserviert");
      expect(html).toContain("feed-filter-bar");
      expect(html).toContain("feed-sentinel");
    });

    it("renders empty state when initialItems is empty", () => {
      const html = renderToString(
        <MarketplaceFeed initialItems={[]} initialCursor={null} />,
      );

      expect(html).toContain("Keine Inserate gefunden");
      expect(html).not.toContain("feed-sentinel");
    });
  });

  describe("Server Component page renders", () => {
    it("renders HomePage HTML with header, hero, and feed", async () => {
      const pageJsx = await HomePage({});
      const html = renderToString(pageJsx);

      expect(html).toContain("Dein Marktplatz für Braunschweig");
      expect(html).toContain("Aktuelle Inserate in Braunschweig");
      expect(html).toContain("CampusMarkt");
    });

    it("renders ListingsPage HTML with listings heading", async () => {
      const pageJsx = await ListingsPage({});
      const html = renderToString(pageJsx);

      expect(html).toContain("Alle Inserate");
      expect(html).toContain("CampusMarkt");
    });
  });
});
