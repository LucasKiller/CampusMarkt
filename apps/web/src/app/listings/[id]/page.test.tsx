import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("../../../modules/localization/server/index", () => ({
  getServerLocale: async () => "de",
}));

import { ListingGallery } from "../../../components/marketplace/listing-gallery";
import ListingDetailsPage from "./page";
import type { PublicListingDetails } from "@campusmarkt/types";

const sampleDetails: PublicListingDetails = {
  id: "00000000-0000-4000-8000-000000000001",
  listingType: "SELL",
  title: "Vintage Oak Desk",
  priceCents: 4500,
  category: "furniture",
  pickupArea: "innenstadt",
  condition: "GOOD",
  status: "active",
  createdAt: "2026-09-23T12:00:00.000Z",
  coverImage: "media/listings/cover1.webp",
  description: "Solid oak study desk in good condition.",
  seller: {
    publicId: "11111111-1111-4111-8111-111111111111",
    displayName: "TU Student",
    avatarUrl: null,
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  },
  images: [
    { storagePath: "media/listings/cover1.webp", position: 0 },
    { storagePath: "media/listings/photo2.webp", position: 1 },
    { storagePath: "media/listings/photo3.webp", position: 2 },
  ],
};

let mockListingToReturn: PublicListingDetails | null = sampleDetails;
const mockIdentity = null;

vi.mock("../../../modules/identity/server/access", () => ({
  getSessionDal: () => ({
    getOptionalIdentity: async () => mockIdentity,
  }),
}));

vi.mock("../../../modules/listings/server/index", () => ({
  getMarketplaceFeedService: () => ({
    getListingDetails: async () => ({
      status: mockListingToReturn ? "success" : "not_found",
      data: mockListingToReturn,
    }),
  }),
  getMarketplaceNegotiationService: () => ({
    getOffersForListing: async () => ({
      status: "success",
      data: [],
    }),
    getActiveReservationForListing: async () => ({
      status: "success",
      data: null,
    }),
  }),
}));

describe("Public Listing Details Page UI (T15)", () => {
  describe("ListingGallery", () => {
    it("renders carousel with main image and dot indicators for multiple photos", () => {
      const html = renderToString(
        <ListingGallery
          images={sampleDetails.images}
          title={sampleDetails.title}
          listingType={sampleDetails.listingType}
        />,
      );

      expect(html).toContain("listing-gallery-carousel");
      expect(html).toContain(
        'src="/storage/v1/object/public/listing-media/media/listings/cover1.webp"',
      );
      expect(html).toContain("gallery-dots");
      expect(html).toContain("1 / 3");
    });

    it("renders accessible placeholder for zero-image WANTED listing", () => {
      const html = renderToString(
        <ListingGallery
          images={[]}
          title="Need Monitor"
          listingType="WANTED"
        />,
      );

      expect(html).toContain("listing-gallery-placeholder");
      expect(html).toContain("Gesuch ohne Foto");
    });
  });

  describe("ListingDetailsPage", () => {
    it("renders active listing with price, gallery, description, and seller trust badge", async () => {
      mockListingToReturn = sampleDetails;
      const pageJsx = await ListingDetailsPage({
        params: Promise.resolve({ id: sampleDetails.id }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain("Vintage Oak Desk");
      expect(html).toContain("€45.00");
      expect(html).toContain("Solid oak study desk in good condition.");
      expect(html).toContain("Innenstadt");
      expect(html).toContain("TU Student");
      expect(html).toContain("TU Braunschweig");
      expect(html).toContain("trust-badge");
      expect(html).not.toContain("inactive-notice-banner");
    });

    it("renders favorite button in details action toolbar", async () => {
      mockListingToReturn = sampleDetails;
      const pageJsx = await ListingDetailsPage({
        params: Promise.resolve({ id: sampleDetails.id }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain("listing-details-actions");
      expect(html).toContain(
        `data-testid="favorite-button-${sampleDetails.id}"`,
      );
      expect(html).toContain("favorite-button-details");
    });

    it("renders negotiation bar within action toolbar", async () => {
      mockListingToReturn = sampleDetails;
      const pageJsx = await ListingDetailsPage({
        params: Promise.resolve({ id: sampleDetails.id }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain('data-testid="negotiation-bar"');
      expect(html).toContain('data-testid="cta-buy-now"');
    });

    it("displays prominent sold banner, badge, and hides negotiation CTAs when listing is sold", async () => {
      mockListingToReturn = {
        ...sampleDetails,
        status: "sold",
      };
      const pageJsx = await ListingDetailsPage({
        params: Promise.resolve({ id: sampleDetails.id }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain('data-testid="sold-banner"');
      expect(html).toContain('data-testid="badge-sold"');
      expect(html).toContain("Verkauft");
      expect(html).toContain(
        "Dieser Artikel wurde erfolgreich verkauft und übergeben.",
      );
      expect(html).not.toContain('data-testid="negotiation-bar"');
      expect(html).not.toContain('data-testid="message-button"');
    });

    it("displays inactive notice banner when listing is archived", async () => {
      mockListingToReturn = {
        ...sampleDetails,
        status: "archived",
      };
      const pageJsx = await ListingDetailsPage({
        params: Promise.resolve({ id: sampleDetails.id }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain("inactive-notice-banner");
      expect(html).toContain(
        "Dieses Inserat wurde archiviert und ist nicht mehr verfügbar.",
      );
    });

    it("displays reservation banner when listing is reserved", async () => {
      mockListingToReturn = {
        ...sampleDetails,
        status: "reserved",
      };
      const pageJsx = await ListingDetailsPage({
        params: Promise.resolve({ id: sampleDetails.id }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain("reserved-notice-banner");
      expect(html).toContain(
        "Dieses Inserat ist derzeit für einen Interessenten reserviert.",
      );
    });
  });
});
