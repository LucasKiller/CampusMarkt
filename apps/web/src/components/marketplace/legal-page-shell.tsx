import type { ReactNode } from "react";
import Link from "next/link";
import { dictionaries, type SupportedLocale } from "@campusmarkt/domain";
import { LanguageSwitcher } from "../../modules/localization/index";
import { MarketplaceFooter } from "./marketplace-footer";
import { MarketplaceHeader } from "./marketplace-header";

export function LegalPageShell({
  locale,
  title,
  children,
}: {
  locale: SupportedLocale;
  title: string;
  children: ReactNode;
}) {
  const dictionary = dictionaries[locale];

  return (
    <main className="marketplace-page legal-page">
      <MarketplaceHeader locale={locale} />
      <div className="legal-content">
        <div className="legal-intro">
          <Link href="/">← {dictionary.common.back}</Link>
          <div className="legal-mobile-language">
            <LanguageSwitcher />
          </div>
          <p>
            {locale === "en"
              ? "CAMPUSMARKT · LEGAL"
              : "CAMPUSMARKT · RECHTLICHES"}
          </p>
          <h1>{title}</h1>
          {locale === "en" && (
            <div className="legal-binding-note" role="note">
              <strong>Notice:</strong> {dictionary.legal.bindingGermanNotice}
            </div>
          )}
        </div>
        <article className="legal-article">{children}</article>
      </div>
      <MarketplaceFooter locale={locale} />
    </main>
  );
}
