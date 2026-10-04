import type { Metadata } from "next";
import { Suspense } from "react";

import { UniversityConfirmationView } from "./university-confirmation-view";

export const metadata: Metadata = {
  title: "University Verification · CampusMarkt",
  description: "Confirm your university affiliation on CampusMarkt.",
};

export default function UniversityVerificationPage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="CampusMarkt home">
          CampusMarkt
        </a>
      </header>

      <section className="auth-container" aria-labelledby="university-title">
        <h1 id="university-title" className="auth-title">
          University Verification
        </h1>
        <Suspense fallback={<p>Checking your verification link...</p>}>
          <UniversityConfirmationView />
        </Suspense>
      </section>
    </main>
  );
}
