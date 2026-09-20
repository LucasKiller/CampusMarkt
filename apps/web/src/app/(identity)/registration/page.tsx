import type { Metadata } from "next";

import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = {
  title: "Create an Account · CampusMarkt",
  description: "Register to participate in CampusMarkt Braunschweig.",
};

export default function RegistrationPage() {
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

      <section className="auth-container" aria-labelledby="registration-title">
        <h1 id="registration-title" className="auth-title">
          Join CampusMarkt
        </h1>
        <p className="auth-subtitle">
          Buy, sell, and give away in the Braunschweig community.
        </p>

        <RegistrationForm />
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
