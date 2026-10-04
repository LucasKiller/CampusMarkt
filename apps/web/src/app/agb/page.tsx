import type { Metadata } from "next";
import { getServerLocale } from "../../modules/localization/server/index";
import { LegalPageShell } from "../../components/marketplace/legal-page-shell";

export const metadata: Metadata = {
  title: "AGB | CampusMarkt",
  description: "Nutzungsbedingungen und AGB für den CampusMarkt Braunschweig.",
};

export default async function AgbPage() {
  const locale = await getServerLocale();
  const isEn = locale === "en";

  return (
    <LegalPageShell
      locale={locale}
      title={
        isEn
          ? "Terms of Service (AGB)"
          : "Allgemeine Geschäftsbedingungen (AGB)"
      }
    >
      <section>
        <h2>
          {isEn
            ? "1. Scope and Platform Nature"
            : "1. Geltungsbereich und Plattformcharakter"}
        </h2>
        <p>
          {isEn
            ? "CampusMarkt is a regional, local-first marketplace facilitating direct peer-to-peer contact for physical goods in Braunschweig. Agreements are concluded exclusively between users."
            : "CampusMarkt ist ein regionaler Kleinanzeigenmarkt zur direkten Kontaktaufnahme für physische Güter im Raum Braunschweig. Verträge kommen ausschließlich unmittelbar zwischen den beteiligten Nutzern zustande."}
        </p>

        <h2>
          {isEn
            ? "2. In-Person Handover and Payment"
            : "2. Vor-Ort-Übergabe und Zahlungsgrundsatz"}
        </h2>
        <p>
          {isEn
            ? "Transactions are completed in person via local pickup. Payment (cash or direct arrangement) occurs outside CampusMarkt upon handover. CampusMarkt does not hold, process, escrow, or guarantee funds."
            : "Die Übergabe der Waren erfolgt persönlich vor Ort. Die Zahlung (z. B. in bar) erfolgt unmittelbar bei Übergabe außerhalb der Plattform. CampusMarkt verwahrt, treuhändet oder garantiert zu keinem Zeitpunkt finanzielle Transaktionen."}
        </p>

        <h2>
          {isEn
            ? "3. Prohibited Goods and Content"
            : "3. Unzulässige Inserate und Waren"}
        </h2>
        <p>
          {isEn
            ? "The listing of weapons, hazardous chemicals, illegal drugs, prescription medicine, academic ghostwriting, pirated media, or counterfeit items is strictly forbidden."
            : "Das Einstellen von Waffen, Gefahrstoffen, Drogen, verschreibungspflichtigen Medikamenten, akademischem Ghostwriting, Plagiaten sowie gefälschter Ware ist strengstens untersagt."}
        </p>

        <h2>
          {isEn
            ? "4. Moderation, Takedown, and Account Suspension"
            : "4. Moderationsmaßnahmen und Kontosperren"}
        </h2>
        <p>
          {isEn
            ? "CampusMarkt reserves the right to remove listings violating policies or applicable law, cancel associated reservations, and suspend offending accounts. All moderation actions are logged in an immutable audit trail."
            : "CampusMarkt behält sich das Recht vor, richtlinien- oder rechtswidrige Inserate unverzüglich zu entfernen, aktive Reservierungen aufzuheben und Nutzerkonten bei Verstößen zu sperren. Alle Maßnahmen werden unveränderlich protokolliert."}
        </p>

        <h2>{isEn ? "5. Applicable Law" : "5. Anwendbares Recht"}</h2>
        <p>
          {isEn
            ? "These terms are governed by the laws of the Federal Republic of Germany. Place of jurisdiction is Braunschweig, Germany."
            : "Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Braunschweig."}
        </p>
      </section>
    </LegalPageShell>
  );
}
