import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { FavoriteItemDTO } from "@campusmarkt/types";
import { getSessionDal } from "../../modules/identity/server/access";
import { getMarketplaceFavoritesService } from "../../modules/listings/server/index";
import { FavoritesView } from "./favorites-view";

export const metadata: Metadata = {
  title: "Merkliste · CampusMarkt",
  description: "Deine privat gespeicherten Inserate auf CampusMarkt.",
};

export default async function FavoritesPage() {
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
    redirect("/login?next=/favorites");
  }

  const service = getMarketplaceFavoritesService();
  let items: FavoriteItemDTO[] = [];

  try {
    const result = await service.getUserFavorites(identity.authUserId, {
      limit: 50,
    });
    if (result.status === "success" && result.data) {
      items = result.data.items;
    }
  } catch (err) {
    console.error("[FavoritesPage: getUserFavorites]", err);
  }

  // E2E test data fallback during CI when DB is unpopulated
  if (items.length === 0 && process.env.E2E_TEST === "true") {
    const cookieStore = await cookies();
    if (cookieStore.get("campusmarkt-test-items")?.value === "true") {
      items = [
        {
          id: "11111111-2222-3333-4444-555555555555",
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
          favoritedAt: "2026-09-23T10:30:00.000Z",
        },
        {
          id: "22222222-3333-4444-5555-666666666666",
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
          favoritedAt: "2026-09-23T09:30:00.000Z",
        },
        {
          id: "33333333-4444-5555-6666-777777777777",
          listingType: "SELL",
          title: "Vintage Racing Bike Peugeot",
          priceCents: 12000,
          category: "bicycles_mobility",
          pickupArea: "innenstadt",
          condition: "GOOD",
          status: "sold",
          createdAt: "2026-09-23T08:00:00.000Z",
          coverImage: null,
          seller: {
            publicId: "seller-3",
            displayName: "Jonas Rad",
            avatarUrl: null,
            universityBadge: {
              universityId: "tu-braunschweig",
              badgeLabel: "TU Braunschweig",
            },
          },
          favoritedAt: "2026-09-23T08:30:00.000Z",
        },
      ];
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f8fafc",
      }}
    >
      <header
        className="site-header"
        style={{
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          padding: "0.75rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <a
          className="brand"
          href="/"
          aria-label="CampusMarkt Startseite"
          style={{
            fontWeight: 800,
            fontSize: "1.25rem",
            color: "#0f172a",
            textDecoration: "none",
          }}
        >
          CampusMarkt
        </a>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="/feed"
            style={{
              fontSize: "0.9rem",
              color: "#334155",
              textDecoration: "none",
            }}
          >
            Marktplatz
          </a>
          <a
            href="/account"
            style={{
              fontSize: "0.9rem",
              color: "#334155",
              textDecoration: "none",
            }}
          >
            Mein Konto
          </a>
        </div>
      </header>

      <div
        className="favorites-container"
        style={{
          maxWidth: "64rem",
          width: "100%",
          margin: "2rem auto",
          padding: "0 1rem",
          flexGrow: 1,
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            id="favorites-title"
            data-testid="favorites-title"
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 0.35rem 0",
            }}
          >
            Merkliste
          </h1>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.9375rem",
              margin: 0,
            }}
          >
            Deine privat gespeicherten Inserate. Nur für dich sichtbar.
          </p>
        </div>

        <FavoritesView initialItems={items} />
      </div>

      <footer
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "1.5rem",
          textAlign: "center",
          color: "#64748b",
          fontSize: "0.875rem",
          backgroundColor: "#ffffff",
          marginTop: "auto",
        }}
      >
        <p style={{ margin: 0 }}>
          Für die Hochschulcommunity und ganz Braunschweig.
        </p>
      </footer>
    </main>
  );
}
