import type { Metadata } from "next";
import { getServerLocale } from "../../modules/localization/server/index";
import { LegalPageShell } from "../../components/marketplace/legal-page-shell";
import { getPublicContactConfiguration } from "../../modules/config/server/public-contact";

export const metadata: Metadata = {
  title: "Impressum | CampusMarkt",
  description: "Angaben gemäß § 5 DDG für CampusMarkt Braunschweig.",
};

export default async function ImpressumPage() {
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const { contactEmail } = getPublicContactConfiguration();

  return (
    <LegalPageShell
      locale={locale}
      title={isEn ? "Legal Notice (Impressum)" : "Impressum"}
    >
      <section>
        <h2>
          {isEn ? "Information according to § 5 DDG" : "Angaben gemäß § 5 DDG"}
        </h2>
        <p>
          CampusMarkt Initiative Braunschweig
          <br />
          Universitätsplatz 2<br />
          38106 Braunschweig
          <br />
          Deutschland / Germany
        </p>

        <h3>{isEn ? "Represented by" : "Vertreten durch"}</h3>
        <p>
          {isEn
            ? "CampusMarkt student project team, TU Braunschweig community."
            : "Projektleitung CampusMarkt, studentische Initiative der TU Braunschweig."}
        </p>

        <h3>{isEn ? "Contact" : "Kontakt"}</h3>
        <p>
          E-Mail: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </p>

        <h2>
          {isEn
            ? "Disclaimers and Marketplace Nature"
            : "Haftungsausschluss & Plattformhinweis"}
        </h2>
        <p>
          {isEn
            ? "CampusMarkt is a regional marketplace for physical goods, open to everyone in Braunschweig. University verification is optional. Users arrange in-person pickup directly. The platform operator does not hold funds, process payments, or guarantee item conditions."
            : "CampusMarkt ist ein regionaler Marktplatz für physische Güter, offen für alle Menschen in Braunschweig. Die Hochschulverifikation ist freiwillig. Die Nutzer vereinbaren persönliche Übergaben direkt. Der Betreiber verwahrt keine Gelder, wickelt keine Zahlungen ab und übernimmt keine Gewährleistung für angebotene Waren."}
        </p>

        <h3>
          {isEn
            ? "Liability for Contents & External Links"
            : "Haftung für Inhalte & Links"}
        </h3>
        <p>
          {isEn
            ? "As a service provider according to § 7 Abs. 1 DDG, we are responsible for our own content. According to §§ 8 to 10 DDG, we are not obligated to monitor submitted third-party information or investigate circumstances that indicate illegal activity. Obligations to remove information according to general laws remain unaffected upon notification."
            : "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte verantwortlich. Nach §§ 8 bis 10 DDG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt."}
        </p>
      </section>
    </LegalPageShell>
  );
}
