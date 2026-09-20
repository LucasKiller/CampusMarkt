import type { Metadata } from "next";

import { RecoveryForm } from "./recovery-form";

export const metadata: Metadata = {
  title: "Reset Password · CampusMarkt",
  description: "Request a password reset link for your CampusMarkt account.",
};

export default function ForgotPasswordPage() {
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

      <section className="auth-container" aria-labelledby="recovery-title">
        <h1 id="recovery-title" className="auth-title">
          Reset Your Password
        </h1>
        <p className="auth-subtitle">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>

        <RecoveryForm />
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
