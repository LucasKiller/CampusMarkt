import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionDal } from "../../../../modules/identity/server/access";
import { getListingApplicationService } from "../../../../modules/listings/server/index";
import { ListingManageEditor } from "./listing-manage-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Manage Listing · CampusMarkt",
  description: "Update details, photos, or status for your listing.",
};

export default async function ManageListingPage({ params }: PageProps) {
  const { id } = await params;
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
    redirect(`/sign-in?returnTo=/listings/${id}/manage`);
  }

  const service = getListingApplicationService();
  const result = await service.getOwnerListing(identity.authUserId, id);

  if (result.status !== "success" || !result.data) {
    notFound();
  }

  const listing = result.data;

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
        aria-labelledby="manage-listing-title"
        style={{ maxWidth: "42rem", width: "100%", margin: "2rem auto" }}
      >
        <h1
          id="manage-listing-title"
          className="auth-title"
          style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
        >
          Manage Listing
        </h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem" }}>
          Update availability status, item condition, price, or photos.
        </p>

        <div className="info-card">
          <ListingManageEditor listing={listing} />
        </div>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
