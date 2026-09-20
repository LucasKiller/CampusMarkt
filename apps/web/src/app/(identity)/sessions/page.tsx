import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In · CampusMarkt",
  description: "Sign in to your CampusMarkt account.",
};

export default function SignInPage() {
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

      <section className="auth-container" aria-labelledby="signin-title">
        <h1 id="signin-title" className="auth-title">
          Sign In
        </h1>
        <p className="auth-subtitle">
          Welcome back to CampusMarkt Braunschweig.
        </p>

        <Suspense fallback={<p>Loading...</p>}>
          <SignInForm />
        </Suspense>
      </section>

      <footer>
        <p>Für die Hochschulcommunity und ganz Braunschweig.</p>
      </footer>
    </main>
  );
}
