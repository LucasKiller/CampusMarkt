import type { Metadata } from "next";
import Link from "next/link";
import {
  getServerLocale,
  getServerDictionary,
} from "../../modules/localization/server/index";
import { LanguageSwitcher } from "../../modules/localization/components/LanguageSwitcher";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | CampusMarkt",
  description:
    "Datenschutzerklärung gemäß DSGVO / GDPR für CampusMarkt Braunschweig.",
};

export default async function DatenschutzPage() {
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
              ? "Privacy Policy (Datenschutzerklärung)"
              : "Datenschutzerklärung"}
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
                ? "1. Responsible Body (Data Controller)"
                : "1. Verantwortliche Stelle"}
            </h2>
            <p className="text-slate-600">
              CampusMarkt Initiative Braunschweig
              <br />
              Universitätsplatz 2, 38106 Braunschweig
              <br />
              E-Mail:{" "}
              <a
                href="mailto:datenschutz@campusmarkt.tu-braunschweig.de"
                className="text-emerald-600 underline"
              >
                datenschutz@campusmarkt.tu-braunschweig.de
              </a>
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "2. Processed Data and Legal Bases"
                : "2. Verarbeitete Daten und Rechtsgrundlagen"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "We process personal data only to the extent necessary to provide a functioning marketplace platform and our services (Art. 6 (1) lit. b GDPR for marketplace interactions; Art. 6 (1) lit. f GDPR for fraud prevention, safety, and moderation)."
                : "Wir verarbeiten personenbezogene Daten unserer Nutzer nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO zur Durchführung vorvertraglicher Maßnahmen und Verträge; Art. 6 Abs. 1 lit. f DSGVO zur Missbrauchsprävention, Systemsicherheit und Moderation)."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "3. Pseudonymized University Verification (AD-008)"
                : "3. Pseudonymisierte Hochschulverifikation (AD-008)"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "CampusMarkt values data minimization. When verifying your status at TU Braunschweig, your institutional email is used strictly to send a one-time confirmation token. Immediately upon verification, the plaintext email is permanently discarded. Only a cryptographically salted HMAC-SHA-256 hash is retained to prevent duplicate badge claims, valid for 180 days."
                : "CampusMarkt setzt auf strikte Datensparsamkeit. Bei der freiwilligen Verifikation der Hochschulzugehörigkeit an der TU Braunschweig wird die universitäre E-Mail-Adresse ausschließlich zur Zustellung eines einmaligen Bestätigungscodes verwendet und danach umgehend unwiderruflich gelöscht. Es wird lediglich ein kryptografisch gehashter HMAC-SHA-256-Wert zur Verhinderung von Mehrfachverifikationen für 180 Tage gespeichert."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "4. Storage Duration and Deletion"
                : "4. Speicherdauer und Kontolöschung"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "User account data, listings, and messages are deleted when you delete your account or when statutory retention requirements expire. Moderation audit logs are retained without private identifiers for platform security compliance."
                : "Daten werden gelöscht, sobald der Zweck ihrer Erhebung entfällt oder das Benutzerkonto gelöscht wird. Relevante Moderationsprotokolle verbleiben zu Nachweiszwecken ohne personenbezogene Klardaten im System."}
            </p>

            <h2 className="mt-6 text-xl font-semibold text-slate-800">
              {isEn
                ? "5. Your Rights as a Data Subject"
                : "5. Ihre Rechte als betroffene Person"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "You have the right to information (Art. 15 GDPR), rectification (Art. 16 GDPR), erasure (Art. 17 GDPR), restriction of processing (Art. 18 GDPR), and data portability (Art. 20 GDPR). You also have the right to lodge a complaint with a supervisory authority (Landesbeauftragte für den Datenschutz Niedersachsen)."
                : "Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO) sowie Datenübertragbarkeit (Art. 20 DSGVO). Zudem steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde (LfD Niedersachsen) zu."}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
