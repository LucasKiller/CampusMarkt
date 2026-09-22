import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const result = await service.listOwnerListings(identity.authUserId);
  const listings = result.status === "success" ? result.data : [];

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
