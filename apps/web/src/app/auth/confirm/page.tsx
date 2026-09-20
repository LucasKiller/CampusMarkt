import type { Metadata } from "next";
import { Suspense } from "react";

import { ConfirmView } from "./confirm-view";

export const metadata: Metadata = {
  title: "Confirm Email · CampusMarkt",
  description: "Confirm your email address for CampusMarkt.",
};

export default function ConfirmPage() {
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

      <section className="auth-container" aria-labelledby="confirm-title">
        <h1 id="confirm-title" className="auth-title">
          Email Confirmation
        </h1>

        <Suspense fallback={<p>Loading...</p>}>
          <ConfirmView />
        </Suspense>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
