import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { cookies } from "next/headers";
import { getSessionDal } from "../../modules/identity/server/access";
import { AvatarManager } from "./avatar/avatar-manager";
import { AccountAvatarSetup } from "./avatar/account-avatar-setup";
import { ProfileEditor } from "./profile/profile-editor";
import { SecurityControls } from "./security/security-controls";
import { UniversityVerificationSection } from "./university-verification-section";

export const metadata: Metadata = {
  title: "Account · CampusMarkt",
  description: "Manage your CampusMarkt account.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ setup?: string }>;
}) {
  const setupAvatar = (await searchParams)?.setup === "avatar";
  const dal = getSessionDal();
  let identity = null;

  try {
    identity = await dal.getOptionalIdentity();
  } catch {
    // If error, redirect to sign-in
  }

  if (process.env.E2E_TEST === "true" && !identity) {
    const cookieStore = await cookies();
    const testSession = cookieStore.get("campusmarkt-test-session")?.value;
    if (testSession === "authenticated" || testSession === "unconfirmed") {
      identity = {
        authUserId: "test-auth-user-id",
        sessionId: "test-session-id",
        emailConfirmed: testSession === "authenticated",
        profileComplete: true,
        consentComplete: true,
      };
    }
  }

  if (!identity || !identity.emailConfirmed) {
    const returnTo = setupAvatar ? "/account?setup=avatar" : "/account";
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
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

        {setupAvatar ? (
          <AccountAvatarSetup />
        ) : (
          <div className="info-card" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
              Public Profile
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
              Update your public avatar and display name.
            </p>

            <AvatarManager />
            <hr
              style={{
                margin: "1.5rem 0",
                border: "none",
                borderTop: "1px solid #e2e8f0",
              }}
            />
            <ProfileEditor />
          </div>
        )}

        <UniversityVerificationSection />

        <div className="info-card" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
            Session & Security
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
            You are signed in to CampusMarkt. Control your active sessions
            below.
          </p>

          <SecurityControls />
        </div>

        <div className="info-card" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.25rem", color: "#b91c1c" }}>
            Delete Account
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
            Permanently remove your account, public profile, and all active
            sessions.
          </p>

          <div style={{ marginTop: "1rem" }}>
            <a
              href="/account/delete"
              className="btn-secondary"
              style={{
                display: "inline-block",
                borderColor: "#b91c1c",
                color: "#b91c1c",
                textDecoration: "none",
              }}
            >
              Delete account
            </a>
          </div>
        </div>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
