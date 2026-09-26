import Link from "next/link";
import { MarketplaceHeader } from "../../../components/marketplace/marketplace-header";
import { getServerLocale } from "../../../modules/localization/server/index";

export default async function ListingNotFound() {
  const locale = await getServerLocale();
  return (
    <main className="marketplace-page">
      <MarketplaceHeader locale={locale} />
      <section className="detail-not-found">
        <p>
          {locale === "en" ? "LISTING UNAVAILABLE" : "INSERAT NICHT VERFÜGBAR"}
        </p>
        <h1>
          {locale === "en"
            ? "This listing is not here anymore."
            : "Dieses Inserat ist nicht mehr verfügbar."}
        </h1>
        <span>
          {locale === "en"
            ? "It may have been removed or the link may be incorrect."
            : "Es wurde möglicherweise entfernt oder der Link ist nicht korrekt."}
        </span>
        <Link href="/">
          {locale === "en" ? "Back to browse" : "Zurück zur Übersicht"}
        </Link>
      </section>
    </main>
  );
}
