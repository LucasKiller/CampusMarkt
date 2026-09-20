import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { cookies } from "next/headers";
import { getSessionDal } from "../../modules/identity/server/access";
import { SecurityControls } from "./security/security-controls";

export const metadata: Metadata = {
  title: "Account · CampusMarkt",
  description: "Manage your CampusMarkt account.",
};

export default async function AccountPage() {
  const dal = getSessionDal();
  let identity = null;

  try {
    identity = await dal.getOptionalIdentity();
  } catch {
    // If error, redirect to sign-in
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
    redirect("/sign-in?returnTo=/account");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt Startseite">
          CampusMarkt
        </a>
        <span className="language-note" aria-label="Verfügbare Sprachen">
          DE · EN
        </span>
      </header>

      <section className="auth-container" aria-labelledby="account-title">
        <h1 id="account-title" className="auth-title">
          My Account
        </h1>
        <p className="auth-subtitle">
          Manage your session and account settings.
        </p>

        <div className="info-card">
          <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
            Session & Security
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
            You are signed in to CampusMarkt. Control your active sessions
            below.
          </p>

          <SecurityControls />
        </div>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
