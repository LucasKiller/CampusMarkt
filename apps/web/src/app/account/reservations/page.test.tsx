import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));

import type { PickupArea } from "@campusmarkt/domain";
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

let mockCompletedTransactions: Array<{
  reservationId: string;
  listingId: string;
  listingTitle: string;
  agreedPriceCents: number;
  pickupArea: PickupArea;
  role: "buyer" | "seller";
  partner: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    universityBadge: {
      universityId: string;
      badgeLabel: string;
    } | null;
  };
  completedAt: string;
}> = [];

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
  getMarketplacePickupService: () => ({
    getCompletedTransactions: async () => ({
      status: "success",
      data: mockCompletedTransactions,
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

    it("renders completed transactions when returned from pickup service", async () => {
      mockCompletedTransactions = [
        {
          reservationId: "res-completed-1",
          listingId: "list-completed-1",
          listingTitle: "Mechanics Textbook",
          agreedPriceCents: 3500,
          pickupArea: "campus_nord_bienrode",
          role: "buyer",
          partner: {
            id: "partner-seller-1",
            displayName: "Maria Seller",
            avatarUrl: null,
            universityBadge: {
              universityId: "tu-braunschweig",
              badgeLabel: "TU Braunschweig",
            },
          },
          completedAt: "2026-09-24T14:30:00Z",
        },
      ];

      const pageJsx = await AccountReservationsPage({
        searchParams: Promise.resolve({ tab: "completed" }),
      });
      const html = renderToString(pageJsx);

      expect(html).toContain("Mechanics Textbook");
      expect(html).toContain("€35.00");
      expect(html).toContain("Maria Seller");
      expect(html).toContain("TU Braunschweig");
      expect(html).toContain("Abgeschlossen");
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

    it("renders filter tabs including Aktiv and Abgeschlossen with SafePickupChecklist", () => {
      const html = renderToString(
        <ReservationsView
          initialReservations={dashboardItems}
          currentUserId="seller-1"
          initialTab="active"
        />,
      );

      expect(html).toContain('data-testid="filter-all-btn"');
      expect(html).toContain('data-testid="filter-active-btn"');
      expect(html).toContain('data-testid="filter-completed-btn"');
      expect(html).toContain('data-testid="filter-cancelled-btn"');
      expect(html).toContain('data-testid="safe-pickup-checklist"');
      expect(html).toContain("Sichere Übergabe auf dem Campus");
    });

    it("renders CompleteHandoverButton trigger only for seller on active reservations", () => {
      // In dashboardItems:
      // res-1 has partnerRole === "buyer" (current user is seller) -> should show complete trigger
      const sellerHtml = renderToString(
        <ReservationsView
          initialReservations={dashboardItems}
          currentUserId="seller-1"
        />,
      );

      expect(sellerHtml).toContain('data-testid="complete-handover-trigger"');
      expect(sellerHtml).toContain("Übergabe abschließen");

      // res-buyer has partnerRole === "seller" (current user is buyer) -> should NOT show complete trigger
      const buyerOnlyItems: ReservationDashboardItem[] = [
        {
          id: "res-buyer-only",
          listingId: "list-b",
          listingTitle: "Calculus",
          agreedPriceCents: 1500,
          pickupArea: "innenstadt",
          partnerRole: "seller",
          partnerId: "seller-user",
          partnerName: "Seller Person",
          hasUniversityBadge: true,
          universityBadgeLabel: "TU Braunschweig",
          status: "active",
          createdAt: "2026-09-24T12:00:00Z",
        },
      ];

      const buyerHtml = renderToString(
        <ReservationsView
          initialReservations={buyerOnlyItems}
          currentUserId="buyer-user"
        />,
      );

      expect(buyerHtml).not.toContain(
        'data-testid="complete-handover-trigger"',
      );
    });

    it("renders completed reservation card with completed date, status badge, and partner info", () => {
      const completedItems: ReservationDashboardItem[] = [
        {
          id: "res-completed-1",
          listingId: "list-comp-1",
          listingTitle: "Physics Laboratory Manual",
          agreedPriceCents: 1800,
          pickupArea: "campus_tu_altgebaeude",
          partnerRole: "buyer",
          partnerId: "buyer-partner",
          partnerName: "Lisa Buyer",
          hasUniversityBadge: true,
          universityBadgeLabel: "TU Braunschweig",
          status: "completed",
          createdAt: "2026-09-24T15:00:00Z",
        },
      ];

      const html = renderToString(
        <ReservationsView
          initialReservations={completedItems}
          currentUserId="seller-1"
          initialTab="completed"
        />,
      );

      expect(html).toContain("Physics Laboratory Manual");
      expect(html).toContain("€18.00");
      expect(html).toContain("Lisa Buyer");
      expect(html).toContain("Abgeschlossen");
      expect(html).toContain(
        'data-testid="partner-trust-badge-res-completed-1"',
      );
      expect(html).toContain(
        'data-testid="reservation-completed-date-res-completed-1"',
      );
      expect(html).not.toContain('data-testid="complete-handover-trigger"');
      expect(html).not.toContain(
        'data-testid="cancel-reservation-btn-res-completed-1"',
      );
    });
  });
});
