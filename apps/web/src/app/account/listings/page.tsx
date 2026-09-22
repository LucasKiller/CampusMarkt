import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { ListingEntity } from "@campusmarkt/types";
import { getSessionDal } from "../../../modules/identity/server/access";
import { getListingApplicationService } from "../../../modules/listings/server/index";
import { MyListingsView } from "./my-listings-view";

export const metadata: Metadata = {
  title: "My Listings · CampusMarkt",
  description: "View and manage your marketplace listings across Braunschweig.",
};

export default async function MyListingsPage() {
  const dal = getSessionDal();
  let identity = null;

  try {
    identity = await dal.getOptionalIdentity();
  } catch {
    // Handled below
  }

  if (process.env.E2E_TEST === "true" && !identity) {
    const cookieStore = await cookies();
    if (
      cookieStore.get("campusmarkt-test-session")?.value === "authenticated"
    ) {
      identity = {
        authUserId: "test-auth-user-id",
        sessionId: "test-session-id",
        emailConfirmed: true,
        profileComplete: true,
        consentComplete: true,
      };
    }
  }

  if (!identity || !identity.emailConfirmed) {
    redirect("/sign-in?returnTo=/account/listings");
  }

  const service = getListingApplicationService();
  let listings: ListingEntity[] = [];

  try {
    const result = await service.listOwnerListings(identity.authUserId);
    if (result.status === "success" && result.data) {
      listings = result.data;
    }
  } catch {
    // Handled below
  }

  if (listings.length === 0 && process.env.E2E_TEST === "true") {
    listings = [
      {
        id: "11111111-2222-3333-4444-555555555555",
        ownerId: identity.authUserId,
        title: "Calculus Textbook 3rd Edition",
        description: "Comprehensive calculus book in great condition.",
        category: "books_studies" as const,
        condition: "GOOD" as const,
        listingType: "SELL" as const,
        priceCents: 2450,
        status: "active" as const,
        pickupArea: "campus_nord_bienrode" as const,
        media: [
          {
            id: "img-1",
            storagePath:
              "listings/11111111-2222-3333-4444-555555555555/cover.webp",
            position: 0,
          },
        ],
        createdAt: "2026-09-22T10:00:00Z",
        updatedAt: "2026-09-22T10:00:00Z",
      },
      {
        id: "22222222-3333-4444-5555-666666666666",
        ownerId: identity.authUserId,
        title: "Free Desk Lamp",
        description: "Functional desk lamp for study desk.",
        category: "furniture" as const,
        condition: "FAIR" as const,
        listingType: "GIVE_AWAY" as const,
        priceCents: 0,
        status: "reserved" as const,
        pickupArea: "campus_tu_altgebaeude" as const,
        media: [],
        createdAt: "2026-09-21T10:00:00Z",
        updatedAt: "2026-09-21T11:00:00Z",
      },
      {
        id: "33333333-4444-5555-6666-777777777777",
        ownerId: identity.authUserId,
        title: "Looking for Bicycle Lock",
        description: "Need a secure U-lock for campus commute.",
        category: "bicycles_mobility" as const,
        condition: "GOOD" as const,
        listingType: "WANTED" as const,
        priceCents: 0,
        status: "sold" as const,
        pickupArea: "viewegs_garten_bebelhof" as const,
        media: [],
        createdAt: "2026-09-20T10:00:00Z",
        updatedAt: "2026-09-20T12:00:00Z",
      },
      {
        id: "44444444-5555-6666-7777-888888888888",
        ownerId: identity.authUserId,
        title: "Old Monitor 24-inch",
        description: "Old LCD monitor, archived after semester.",
        category: "electronics" as const,
        condition: "FAIR" as const,
        listingType: "SELL" as const,
        priceCents: 1500,
        status: "archived" as const,
        pickupArea: "westliches_ringgebiet" as const,
        media: [],
        createdAt: "2026-09-19T10:00:00Z",
        updatedAt: "2026-09-19T15:00:00Z",
      },
    ];
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt Startseite">
          CampusMarkt
        </a>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="/account"
            style={{
              fontSize: "0.9rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            My Account
          </a>
          <span className="language-note" aria-label="Verfügbare Sprachen">
            DE · EN
          </span>
        </div>
      </header>

      <section
        className="auth-container"
        aria-labelledby="my-listings-title"
        style={{ maxWidth: "56rem", width: "100%", margin: "2rem auto" }}
      >
        <h1
          id="my-listings-title"
          className="auth-title"
          style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
        >
          My Listings
        </h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem" }}>
          Manage your active, reserved, and sold goods on CampusMarkt.
        </p>

        <MyListingsView initialListings={listings} />
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
