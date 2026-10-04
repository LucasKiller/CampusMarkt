import Link from "next/link";
import { dictionaries, type SupportedLocale } from "@campusmarkt/domain";

export function MarketplaceFooter({ locale }: { locale: SupportedLocale }) {
  const dictionary = dictionaries[locale];

  return (
    <footer className="marketplace-footer">
      <p>
        {locale === "en"
          ? "For the campus community and all of Braunschweig."
          : "Für die Hochschulcommunity und ganz Braunschweig."}
      </p>
      <nav
        aria-label={
          locale === "en" ? "Legal information" : "Rechtliche Hinweise"
        }
      >
        <Link href="/impressum">{dictionary.legal.impressum}</Link>
        <Link href="/datenschutz">{dictionary.legal.datenschutz}</Link>
        <Link href="/agb">{dictionary.legal.agb}</Link>
      </nav>
    </footer>
  );
}
