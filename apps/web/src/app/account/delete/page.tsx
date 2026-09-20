import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionDal } from "../../../modules/identity/server/access";
import { AccountDeletionForm } from "./account-deletion-form";

export const metadata: Metadata = {
  title: "Delete Account · CampusMarkt",
  description: "Permanently delete your CampusMarkt account.",
};

export default async function DeleteAccountPage() {
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
    redirect("/sign-in?returnTo=/account/delete");
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

      <section
        className="auth-container"
        aria-labelledby="delete-account-title"
      >
        <h1 id="delete-account-title" className="auth-title">
          Delete Account
        </h1>
        <p className="auth-subtitle">
          Permanently delete your CampusMarkt account and profile.
        </p>

        <AccountDeletionForm />
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
