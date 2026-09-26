import type { Metadata } from "next";
import Link from "next/link";
import {
  getServerLocale,
  getServerDictionary,
} from "../../modules/localization/server/index";
import { LanguageSwitcher } from "../../modules/localization/components/LanguageSwitcher";

export const metadata: Metadata = {
  title: "AGB | CampusMarkt",
  description: "Nutzungsbedingungen und AGB für den CampusMarkt Braunschweig.",
};

export default async function AgbPage() {
  const locale = await getServerLocale();
  const dict = await getServerDictionary(locale);
  const isEn = locale === "en";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-emerald-600 hover:text-emerald-700"
          >
            {dict.common.appName}
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {dict.common.back}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <article className="prose prose-slate max-w-none rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {isEn
              ? "Terms of Service (AGB)"
              : "Allgemeine Geschäftsbedingungen (AGB)"}
          </h1>

          {isEn && (
            <div
              className="my-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
              role="note"
            >
              <strong>Notice:</strong> {dict.legal.bindingGermanNotice}
            </div>
          )}

          <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">
              {isEn
                ? "1. Scope and Platform Nature"
                : "1. Geltungsbereich und Plattformcharakter"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "CampusMarkt is a regional, local-first marketplace facilitating direct peer-to-peer contact for physical goods in Braunschweig. Agreements are concluded exclusively between users."
                : "CampusMarkt ist ein regionaler Kleinanzeigenmarkt zur direkten Kontaktaufnahme für physische Güter im Raum Braunschweig. Verträge kommen ausschließlich unmittelbar zwischen den beteiligten Nutzern zustande."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "2. In-Person Handover and Payment Boundary (AD-004, AD-015)"
                : "2. Vor-Ort-Übergabe und Zahlungsgrundsatz (AD-004, AD-015)"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "Transactions are completed in person via local pickup. Payment (cash or direct arrangement) occurs outside CampusMarkt upon handover. CampusMarkt does not hold, process, escrow, or guarantee funds."
                : "Die Übergabe der Waren erfolgt persönlich vor Ort. Die Zahlung (z. B. in bar) erfolgt unmittelbar bei Übergabe außerhalb der Plattform. CampusMarkt verwahrt, treuhändet oder garantiert zu keinem Zeitpunkt finanzielle Transaktionen."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "3. Prohibited Goods and Content"
                : "3. Unzulässige Inserate und Waren"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "The listing of weapons, hazardous chemicals, illegal drugs, prescription medicine, academic ghostwriting, pirated media, or counterfeit items is strictly forbidden."
                : "Das Einstellen von Waffen, Gefahrstoffen, Drogen, verschreibungspflichtigen Medikamenten, akademischem Ghostwriting, Plagiaten sowie gefälschter Ware ist strengstens untersagt."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "4. Moderation, Takedown, and Account Suspension (AD-017)"
                : "4. Moderationsmaßnahmen und Kontosperren (AD-017)"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "CampusMarkt reserves the right to remove listings violating policies or applicable law, cancel associated reservations, and suspend offending accounts. All moderation actions are logged in an immutable audit trail."
                : "CampusMarkt behält sich das Recht vor, richtlinien- oder rechtswidrige Inserate unverzüglich zu entfernen, aktive Reservierungen aufzuheben und Nutzerkonten bei Verstößen zu sperren. Alle Maßnahmen werden unveränderlich protokolliert."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn ? "5. Applicable Law" : "5. Anwendbares Recht"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "These terms are governed by the laws of the Federal Republic of Germany. Place of jurisdiction is Braunschweig, Germany."
                : "Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Braunschweig."}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
