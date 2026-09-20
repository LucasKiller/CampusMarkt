import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set New Password · CampusMarkt",
  description: "Set a new password for your CampusMarkt account.",
};

export default function ResetPasswordPage() {
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

      <section className="auth-container" aria-labelledby="reset-title">
        <h1 id="reset-title" className="auth-title">
          Set New Password
        </h1>
        <p className="auth-subtitle">
          Choose a strong password to secure your account.
        </p>

        <Suspense fallback={<p>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
