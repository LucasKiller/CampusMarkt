import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionDal } from "../../../modules/identity/server/access";
import { ListingCreateForm } from "./listing-create-form";

export const metadata: Metadata = {
  title: "Create Listing · CampusMarkt",
  description:
    "Create a new physical goods listing for local exchange in Braunschweig.",
};

export default async function NewListingPage() {
  const dal = getSessionDal();
  let identity = null;

  try {
    identity = await dal.getOptionalIdentity();
  } catch {
    // Redirect below
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
    redirect("/sign-in?returnTo=/listings/new");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt Startseite">
          CampusMarkt
        </a>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="/account/listings"
            style={{
              fontSize: "0.9rem",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            My Listings
          </a>
          <span className="language-note" aria-label="Verfügbare Sprachen">
            DE · EN
          </span>
        </div>
      </header>

      <section
        className="auth-container"
        aria-labelledby="create-listing-title"
        style={{ maxWidth: "42rem", width: "100%", margin: "2rem auto" }}
      >
        <h1
          id="create-listing-title"
          className="auth-title"
          style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
        >
          Create a Listing
        </h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem" }}>
          Offer items for sale, give away reusable goods, or request needed
          items across Braunschweig.
        </p>

        <div className="info-card">
          <ListingCreateForm />
        </div>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
