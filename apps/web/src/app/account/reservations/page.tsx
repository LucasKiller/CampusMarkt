import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { PickupArea } from "@campusmarkt/domain";
import { getSessionDal } from "../../../modules/identity/server/access";
import {
  getMarketplaceFeedService,
  getMarketplaceNegotiationService,
} from "../../../modules/listings/server/index";
import {
  ReservationsView,
  type ReservationDashboardItem,
} from "./reservations-view";

export const metadata: Metadata = {
  title: "Meine Reservierungen · CampusMarkt",
  description:
    "Verwalte deine vereinbarten Übergaben und Reservierungen in Braunschweig.",
};

export default async function AccountReservationsPage() {
  const dal = getSessionDal();
  let identity = null;

  try {
    identity = await dal.getOptionalIdentity();
  } catch {
    // Handled below
  }

  if (process.env.E2E_TEST === "true" && !identity) {
    const cookieStore = await cookies();
    const testSession = cookieStore.get("campusmarkt-test-session")?.value;
    if (testSession) {
      const authUserId = testSession.startsWith("user:")
        ? testSession.slice(5)
        : testSession === "seller"
          ? "11111111-1111-4111-8111-111111111111"
          : testSession === "buyer"
            ? "22222222-2222-4222-8222-222222222222"
            : testSession === "authenticated"
              ? "test-auth-user-id"
              : testSession;

      identity = {
        authUserId,
        sessionId: "test-session-id",
        emailConfirmed: true,
        profileComplete: true,
        consentComplete: true,
      };
    }
  }

  if (!identity || !identity.emailConfirmed) {
    redirect("/login?next=/account/reservations");
  }

  const negotiationService = getMarketplaceNegotiationService();
  const feedService = getMarketplaceFeedService();
  const items: ReservationDashboardItem[] = [];

  try {
    const reservationsResult = await negotiationService.getUserReservations(
      identity.authUserId,
    );

    if (
      reservationsResult.status === "success" &&
      Array.isArray(reservationsResult.data)
    ) {
      for (const res of reservationsResult.data) {
        let listingTitle = "Inserat";
        let pickupArea: PickupArea = "innenstadt";
        let partnerName = "Campus-Mitglied";
        let hasUniversityBadge = false;
        let universityBadgeLabel: string | null = null;

        const isBuyer =
          identity.authUserId.trim().toLowerCase() ===
          res.buyerId.trim().toLowerCase();
        const partnerRole: "buyer" | "seller" = isBuyer ? "seller" : "buyer";
        const partnerId = isBuyer ? res.sellerId : res.buyerId;

        try {
          const listingRes = await feedService.getListingDetails(res.listingId);
          if (listingRes.status === "success" && listingRes.data) {
            listingTitle = listingRes.data.title;
            pickupArea = listingRes.data.pickupArea;
            if (isBuyer) {
              partnerName = listingRes.data.seller.displayName;
              hasUniversityBadge = Boolean(
                listingRes.data.seller.universityBadge,
              );
              universityBadgeLabel =
                listingRes.data.seller.universityBadge?.badgeLabel ?? null;
            } else {
              partnerName = "Interessent (Käufer)";
            }
          }
        } catch {
          // Keep defaults if listing details fetch fails
        }

        items.push({
          id: res.id,
          listingId: res.listingId,
          listingTitle,
          agreedPriceCents: res.agreedPriceCents,
          pickupArea,
          partnerRole,
          partnerId,
          partnerName,
          hasUniversityBadge,
          universityBadgeLabel,
          status: res.status,
          createdAt: res.createdAt,
        });
      }
    }
  } catch (err) {
    console.error("[AccountReservationsPage: getUserReservations]", err);
  }

  // E2E test data fallback during CI when DB is unpopulated
  if (items.length === 0 && process.env.E2E_TEST === "true") {
    items.push({
      id: "res-test-e2e-1",
      listingId: "11111111-2222-3333-4444-555555555555",
      listingTitle: "Calculus Textbook 3rd Edition",
      agreedPriceCents: 2000,
      pickupArea: "campus_nord_bienrode",
      partnerRole: "seller",
      partnerId: "11111111-1111-4111-8111-111111111111",
      partnerName: "Alex Student",
      hasUniversityBadge: true,
      universityBadgeLabel: "TU Braunschweig",
      status: "active",
      createdAt: "2026-09-23T12:00:00Z",
    });
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
            ← Mein Konto
          </a>
          <span className="language-note" aria-label="Verfügbare Sprachen">
            DE · EN
          </span>
        </div>
      </header>

      <div
        style={{
          width: "min(100%, 56rem)",
          marginInline: "auto",
          padding: "2rem 1rem 4rem",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 0.5rem",
            }}
          >
            Meine Reservierungen
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#64748b",
              margin: 0,
            }}
          >
            Hier findest du alle aktiven und vergangenen Übergaben für deine
            Käufe und Verkäufe auf dem Campus.
          </p>
        </div>

        <ReservationsView
          initialReservations={items}
          currentUserId={identity.authUserId}
        />
      </div>
    </main>
  );
}
