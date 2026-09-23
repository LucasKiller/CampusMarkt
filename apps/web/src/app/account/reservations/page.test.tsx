import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

import type { ReservationDTO, PublicListingDetails } from "@campusmarkt/types";
import AccountReservationsPage from "./page";
import {
  ReservationsView,
  type ReservationDashboardItem,
} from "./reservations-view";

const sampleReservation: ReservationDTO = {
  id: "res-00000000-0000-4000-8000-000000000001",
  listingId: "list-00000000-0000-4000-8000-000000000001",
  buyerId: "buyer-user-id",
  sellerId: "seller-user-id",
  offerId: "offer-00000000-0000-4000-8000-000000000001",
  agreedPriceCents: 2000,
  status: "active",
  createdAt: "2026-09-23T12:00:00.000Z",
};

const sampleListing: PublicListingDetails = {
  id: "list-00000000-0000-4000-8000-000000000001",
  listingType: "SELL",
  title: "Calculus Textbook 3rd Edition",
  priceCents: 2450,
  category: "books_studies",
  pickupArea: "campus_nord_bienrode",
  condition: "GOOD",
  status: "reserved",
  createdAt: "2026-09-23T10:00:00.000Z",
  coverImage: "listings/sample/cover.webp",
  seller: {
    publicId: "seller-user-id",
    displayName: "Alex Student",
    avatarUrl: null,
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  },
  images: [],
  description: "Great textbook",
};

let mockIdentity: { authUserId: string; emailConfirmed: boolean } | null = {
  authUserId: "buyer-user-id",
  emailConfirmed: true,
};

let mockReservations: ReservationDTO[] = [sampleReservation];

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: vi.fn(),
}));

vi.mock("../../../modules/identity/server/access", () => ({
  getSessionDal: () => ({
    getOptionalIdentity: async () => mockIdentity,
  }),
}));

vi.mock("../../../modules/listings/server/index", () => ({
  getMarketplaceFeedService: () => ({
    getListingDetails: async (id: string) => {
      if (id === sampleListing.id) {
        return { status: "success", data: sampleListing };
      }
      return { status: "not_found" };
    },
  }),
  getMarketplaceNegotiationService: () => ({
    getUserReservations: async () => ({
      status: "success",
      data: mockReservations,
    }),
  }),
}));

describe("AccountReservationsPage & ReservationsView (T15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      authUserId: "buyer-user-id",
      emailConfirmed: true,
    };
    mockReservations = [sampleReservation];
  });

  describe("Server Component Authentication & Navigation", () => {
    it("redirects unauthenticated users to login with returnTo", async () => {
      mockIdentity = null;

      await expect(AccountReservationsPage()).rejects.toThrow(
        "REDIRECT:/login?next=/account/reservations",
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        "/login?next=/account/reservations",
      );
    });

    it("renders active reservations with agreed price and coarse pickup area for buyer", async () => {
      const pageJsx = await AccountReservationsPage();
      const html = renderToString(pageJsx);

      expect(html).toContain("Meine Reservierungen");
      expect(html).toContain("Calculus Textbook 3rd Edition");
      expect(html).toContain("€20.00");
      expect(html).toContain("Campus Nord / Bienrode");
      expect(html).toContain("Alex Student");
      expect(html).toContain("TU Braunschweig");
      expect(html).toContain("Reservierung stornieren");
    });
  });

  describe("ReservationsView Client Component", () => {
    const dashboardItems: ReservationDashboardItem[] = [
      {
        id: "res-1",
        listingId: "list-1",
        listingTitle: "Vintage Oak Desk",
        agreedPriceCents: 4500,
        pickupArea: "innenstadt",
        partnerRole: "buyer",
        partnerId: "buyer-1",
        partnerName: "Interessent (Käufer)",
        hasUniversityBadge: false,
        universityBadgeLabel: null,
        status: "active",
        createdAt: "2026-09-23T12:00:00Z",
      },
      {
        id: "res-2",
        listingId: "list-2",
        listingTitle: "Desk Lamp",
        agreedPriceCents: 0,
        pickupArea: "campus_tu_altgebaeude",
        partnerRole: "seller",
        partnerId: "seller-2",
        partnerName: "Sarah TU",
        hasUniversityBadge: true,
        universityBadgeLabel: "TU Braunschweig",
        status: "cancelled",
        createdAt: "2026-09-22T10:00:00Z",
      },
    ];

    it("renders reservations cards with correct details and status badges", () => {
      const html = renderToString(
        <ReservationsView
          initialReservations={dashboardItems}
          currentUserId="seller-1"
        />,
      );

      expect(html).toContain("Vintage Oak Desk");
      expect(html).toContain("€45.00");
      expect(html).toContain("Innenstadt");
      expect(html).toContain("Aktiv");
      expect(html).toContain("Desk Lamp");
      expect(html).toContain("Storniert");
      expect(html).toContain("Sarah TU");
      expect(html).toContain("TU Braunschweig");
    });

    it("displays cancellation action button only for active reservations", () => {
      const html = renderToString(
        <ReservationsView
          initialReservations={dashboardItems}
          currentUserId="seller-1"
        />,
      );

      expect(html).toContain('data-testid="cancel-reservation-btn-res-1"');
      expect(html).not.toContain('data-testid="cancel-reservation-btn-res-2"');
    });

    it("renders empty state notice when no reservations match", () => {
      const html = renderToString(
        <ReservationsView initialReservations={[]} currentUserId="seller-1" />,
      );

      expect(html).toContain('data-testid="empty-reservations-notice"');
      expect(html).toContain(
        "Keine Reservierungen in dieser Ansicht gefunden.",
      );
    });
  });
});
