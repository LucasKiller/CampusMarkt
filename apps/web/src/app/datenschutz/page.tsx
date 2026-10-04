import type { Metadata } from "next";
import { getServerLocale } from "../../modules/localization/server/index";
import { LegalPageShell } from "../../components/marketplace/legal-page-shell";
import { getPublicContactConfiguration } from "../../modules/config/server/public-contact";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | CampusMarkt",
  description:
    "Datenschutzerklärung gemäß DSGVO / GDPR für CampusMarkt Braunschweig.",
};

export default async function DatenschutzPage() {
  const locale = await getServerLocale();
  const isEn = locale === "en";
  const { privacyEmail } = getPublicContactConfiguration();

  return (
    <LegalPageShell
      locale={locale}
      title={
        isEn ? "Privacy Policy (Datenschutzerklärung)" : "Datenschutzerklärung"
      }
    >
      <section>
        <h2>
          {isEn
            ? "1. Responsible Body (Data Controller)"
            : "1. Verantwortliche Stelle"}
        </h2>
        <p>
          CampusMarkt Initiative Braunschweig
          <br />
          Universitätsplatz 2, 38106 Braunschweig
          <br />
          E-Mail: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
        </p>

        <h2>
          {isEn
            ? "2. Processed Data and Legal Bases"
            : "2. Verarbeitete Daten und Rechtsgrundlagen"}
        </h2>
        <p>
          {isEn
            ? "We process personal data only to the extent necessary to provide a functioning marketplace platform and our services (Art. 6 (1) lit. b GDPR for marketplace interactions; Art. 6 (1) lit. f GDPR for fraud prevention, safety, and moderation)."
            : "Wir verarbeiten personenbezogene Daten unserer Nutzer nur, soweit dies zur Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO zur Durchführung vorvertraglicher Maßnahmen und Verträge; Art. 6 Abs. 1 lit. f DSGVO zur Missbrauchsprävention, Systemsicherheit und Moderation)."}
        </p>

        <h2>
          {isEn
            ? "3. Optional University Verification"
            : "3. Freiwillige Hochschulverifikation"}
        </h2>
        <p>
          {isEn
            ? "CampusMarkt values data minimization. When verifying your status at TU Braunschweig, your institutional email is used strictly to send a one-time confirmation token. Immediately upon verification, the plaintext email is permanently discarded. Only a cryptographically salted HMAC-SHA-256 hash is retained to prevent duplicate badge claims, valid for twelve calendar months."
            : "CampusMarkt setzt auf strikte Datensparsamkeit. Bei der freiwilligen Verifikation der Hochschulzugehörigkeit an der TU Braunschweig wird die universitäre E-Mail-Adresse ausschließlich zur Zustellung eines einmaligen Bestätigungscodes verwendet und danach umgehend unwiderruflich gelöscht. Es wird lediglich ein kryptografisch gehashter HMAC-SHA-256-Wert zur Verhinderung von Mehrfachverifikationen für zwölf Kalendermonate gespeichert."}
        </p>

        <h2>
          {isEn
            ? "4. Storage Duration and Deletion"
            : "4. Speicherdauer und Kontolöschung"}
        </h2>
        <p>
          {isEn
            ? "User account data, listings, and messages are deleted when you delete your account or when statutory retention requirements expire. Moderation audit logs are retained without private identifiers for platform security compliance."
            : "Daten werden gelöscht, sobald der Zweck ihrer Erhebung entfällt oder das Benutzerkonto gelöscht wird. Relevante Moderationsprotokolle verbleiben zu Nachweiszwecken ohne personenbezogene Klardaten im System."}
        </p>

        <h2>
          {isEn
            ? "5. Your Rights as a Data Subject"
            : "5. Ihre Rechte als betroffene Person"}
        </h2>
        <p>
          {isEn
            ? "You have the right to information (Art. 15 GDPR), rectification (Art. 16 GDPR), erasure (Art. 17 GDPR), restriction of processing (Art. 18 GDPR), and data portability (Art. 20 GDPR). You also have the right to lodge a complaint with a supervisory authority (Landesbeauftragte für den Datenschutz Niedersachsen)."
            : "Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO) sowie Datenübertragbarkeit (Art. 20 DSGVO). Zudem steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde (LfD Niedersachsen) zu."}
        </p>
      </section>
    </LegalPageShell>
  );
}
