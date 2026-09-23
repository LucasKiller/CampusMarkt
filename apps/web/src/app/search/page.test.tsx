import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () =>
    new URLSearchParams("q=calculus&category=books_studies"),
  usePathname: () => "/search",
}));

vi.mock("../../modules/listings/server/index", () => ({
  getMarketplaceSearchService: () => ({
    search: async () => ({
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
        appliedFilters: { query: "calculus", categories: ["books_studies"] },
      },
    }),
  }),
}));

import SearchPage from "./page";
import { SearchClientView } from "./search-client-view";
import type { PublicFeedItem } from "@campusmarkt/types";

describe("SearchPage and SearchClientView UI (T15)", () => {
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
  ];

  it("renders SearchPage Server Component with header and initial search results", async () => {
    const pageJsx = await SearchPage({
      searchParams: Promise.resolve({ q: "calculus" }),
    });
    const html = renderToString(pageJsx);

    expect(html).toContain("CampusMarkt");
    expect(html).toContain("Inserat aufgeben");
    expect(html).toContain("Meine Inserate");
    expect(html).toContain('data-testid="search-page-container"');
    expect(html).toContain("Calculus Textbook 3rd Edition");
  });

  it("renders SearchClientView with active items, summary, and filter controls", () => {
    const html = renderToString(
      <SearchClientView
        initialItems={sampleItems}
        initialCursor={null}
        initialFilters={{ query: "calculus" }}
      />,
    );

    expect(html).toContain('data-testid="search-form"');
    expect(html).toContain('data-testid="search-input"');
    expect(html).toContain('data-testid="filter-drawer-open"');
    expect(html).toContain('data-testid="filter-bar"');
    expect(html).toContain('data-testid="search-results-grid"');
    expect(html).toContain("Calculus Textbook 3rd Edition");
    expect(html).toContain("1 Inserat gefunden");
  });

  it("renders accessible empty state when items list is empty", () => {
    const html = renderToString(
      <SearchClientView
        initialItems={[]}
        initialCursor={null}
        initialFilters={{ query: "nonexistent" }}
      />,
    );

    expect(html).toContain('data-testid="search-empty-state"');
    expect(html).toContain("Keine Inserate gefunden");
    expect(html).toContain('data-testid="empty-reset-filters"');
    expect(html).not.toContain('data-testid="search-results-grid"');
  });
});
