import type { Metadata } from "next";
import Link from "next/link";
import {
  getServerLocale,
  getServerDictionary,
} from "../../modules/localization/server/index";
import { LanguageSwitcher } from "../../modules/localization/components/LanguageSwitcher";
import { getPublicContactConfiguration } from "../../modules/config/server/public-contact";

export const metadata: Metadata = {
  title: "Impressum | CampusMarkt",
  description: "Angaben gemäß § 5 DDG für CampusMarkt Braunschweig.",
};

export default async function ImpressumPage() {
  const locale = await getServerLocale();
  const dict = await getServerDictionary(locale);
  const isEn = locale === "en";
  const { contactEmail } = getPublicContactConfiguration();

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
            {isEn ? "Legal Notice (Impressum)" : "Impressum"}
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
                ? "Information according to § 5 DDG"
                : "Angaben gemäß § 5 DDG"}
            </h2>
            <p className="text-slate-600">
              CampusMarkt Initiative Braunschweig
              <br />
              Universitätsplatz 2<br />
              38106 Braunschweig
              <br />
              Deutschland / Germany
            </p>

            <h3 className="text-lg font-medium text-slate-800">
              {isEn ? "Represented by" : "Vertreten durch"}
            </h3>
            <p className="text-slate-600">
              {isEn
                ? "CampusMarkt student project team, TU Braunschweig community."
                : "Projektleitung CampusMarkt, studentische Initiative der TU Braunschweig."}
            </p>

            <h3 className="text-lg font-medium text-slate-800">
              {isEn ? "Contact" : "Kontakt"}
            </h3>
            <p className="text-slate-600">
              E-Mail:{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-emerald-600 underline"
              >
                {contactEmail}
              </a>
            </p>

            <h2 className="mt-8 text-xl font-semibold text-slate-800">
              {isEn
                ? "Disclaimers and Marketplace Nature"
                : "Haftungsausschluss & Plattformhinweis"}
            </h2>
            <p className="text-slate-600">
              {isEn
                ? "CampusMarkt is a non-commercial, regional classifieds board exclusively facilitating direct, in-person peer-to-peer exchanges in Braunschweig. The platform operator does not hold funds, process payments, or guarantee item conditions."
                : "CampusMarkt ist ein nicht-kommerzieller, regionaler Marktplatz zur Vermittlung persönlicher Übergaben unter Studierenden in Braunschweig. Der Betreiber verwahrt keine Gelder, wickelt keine Zahlungen ab und übernimmt keine Gewährleistung für angebotene Waren."}
            </p>

            <h3 className="text-lg font-medium text-slate-800">
              {isEn
                ? "Liability for Contents & External Links"
                : "Haftung für Inhalte & Links"}
            </h3>
            <p className="text-slate-600">
              {isEn
                ? "As a service provider according to § 7 Abs. 1 DDG, we are responsible for our own content. According to §§ 8 to 10 DDG, we are not obligated to monitor submitted third-party information or investigate circumstances that indicate illegal activity. Obligations to remove information according to general laws remain unaffected upon notification."
                : "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte verantwortlich. Nach §§ 8 bis 10 DDG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt."}
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
