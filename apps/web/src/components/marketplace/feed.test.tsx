import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { EmptyFeedState, FeedFilterBar, ListingCard, TrustBadge } from "./feed";
import type { PublicFeedItem } from "@campusmarkt/types";

describe("ListingCard and feed filter UI components (T13)", () => {
  const baseItem: PublicFeedItem = {
    id: "00000000-0000-4000-8000-000000000001",
    listingType: "SELL",
    title: "Wooden Study Desk",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T12:00:00.000Z",
    coverImage: "media/listings/cover1.webp",
    seller: {
      publicId: "11111111-1111-4111-8111-111111111111",
      displayName: "Brunswick Student",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
  };

  describe("ListingCard", () => {
    it("renders cover photo, price tag, category, pickup area, and title", () => {
      const html = renderToString(<ListingCard item={baseItem} />);

      expect(html).toContain("Wooden Study Desk");
      expect(html).toContain("€45.00");
      expect(html).toContain("Möbel &amp; Wohnen");
      expect(html).toContain("Innenstadt");
      expect(html).toContain("Brunswick Student");
      expect(html).toContain(
        'src="/storage/v1/object/public/listing-media/media/listings/cover1.webp"',
      );
      expect(html).toContain(
        'href="/listings/00000000-0000-4000-8000-000000000001"',
      );
    });

    it("renders prominent reserved badge when item is reserved", () => {
      const reservedItem: PublicFeedItem = {
        ...baseItem,
        status: "reserved",
      };
      const html = renderToString(<ListingCard item={reservedItem} />);

      expect(html).toContain("Reserviert");
      expect(html).toContain("reserved-badge");
    });

    it("does not render reserved badge when item is active", () => {
      const html = renderToString(<ListingCard item={baseItem} />);

      expect(html).not.toContain("reserved-badge");
      expect(html).not.toContain("Reserviert");
    });

    it("renders verified trust badge for sellers with active TU Braunschweig verification", () => {
      const html = renderToString(<ListingCard item={baseItem} />);

      expect(html).toContain("TU Braunschweig");
      expect(html).toContain("trust-badge");
      expect(html).toContain('aria-label="TU Braunschweig verifiziert"');
    });

    it("omits trust badge when seller is unverified", () => {
      const unverifiedItem: PublicFeedItem = {
        ...baseItem,
        seller: {
          ...baseItem.seller,
          universityBadge: null,
        },
      };
      const html = renderToString(<ListingCard item={unverifiedItem} />);

      expect(html).not.toContain("trust-badge");
      expect(html).not.toContain("TU Braunschweig verifiziert");
    });

    it("renders accessible placeholder for zero-image WANTED listings", () => {
      const wantedNoImageItem: PublicFeedItem = {
        ...baseItem,
        listingType: "WANTED",
        coverImage: null,
        priceCents: 3000,
      };
      const html = renderToString(<ListingCard item={wantedNoImageItem} />);

      expect(html).toContain("Gesuch");
      expect(html).toContain("Gesuch ohne Foto");
      expect(html).toContain("listing-image-placeholder");
      expect(html).not.toContain("<img");
    });

    it("renders Free for GIVE_AWAY items", () => {
      const giveawayItem: PublicFeedItem = {
        ...baseItem,
        listingType: "GIVE_AWAY",
        priceCents: null,
      };
      const html = renderToString(<ListingCard item={giveawayItem} />);

      expect(html).toContain("Zu verschenken");
    });

    it("renders favorite button on listing card overlay", () => {
      const html = renderToString(<ListingCard item={baseItem} />);

      expect(html).toContain(`data-testid="favorite-button-${baseItem.id}"`);
      expect(html).toContain("favorite-button-card");
    });
  });

  describe("TrustBadge", () => {
    it("renders badge label and check shield icon", () => {
      const html = renderToString(
        <TrustBadge
          badge={{
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          }}
        />,
      );

      expect(html).toContain("TU Braunschweig");
      expect(html).toContain("trust-badge");
    });
  });

  describe("FeedFilterBar", () => {
    it("renders filter controls for categories and pickup areas", () => {
      const html = renderToString(
        <FeedFilterBar
          selectedCategory="furniture"
          selectedArea="innenstadt"
          selectedType="SELL"
        />,
      );

      expect(html).toContain("filter-category-select");
      expect(html).toContain("filter-area-select");
      expect(html).toContain("Möbel &amp; Wohnen");
      expect(html).toContain("Innenstadt");
      expect(html).toContain("Filter zurücksetzen");
    });

    it("omits reset button when no filters are active", () => {
      const html = renderToString(<FeedFilterBar />);

      expect(html).not.toContain("Filter zurücksetzen");
    });
  });

  describe("EmptyFeedState", () => {
    it("renders friendly empty message with reset button", () => {
      const html = renderToString(<EmptyFeedState onReset={() => {}} />);

      expect(html).toContain("Keine Inserate gefunden");
      expect(html).toContain("Filter zurücksetzen");
    });
  });
});
