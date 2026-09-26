import Link from "next/link";
import { dictionaries, type SupportedLocale } from "@campusmarkt/domain";
import { LanguageSwitcher } from "../../modules/localization/index";

type Destination = "explore" | "search" | "favorites" | "messages" | "account";

function NavigationIcon({ name }: { name: Destination }) {
  const paths: Record<Destination, React.ReactNode> = {
    explore: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <path d="M9 21v-7h6v7" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    favorites: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    ),
    messages: (
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.7-3.7A8.5 8.5 0 1 1 21 11.5z" />
    ),
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function MarketplaceHeader({
  locale,
  active,
}: {
  locale: SupportedLocale;
  active?: Destination;
}) {
  const dictionary = dictionaries[locale];
  const destinations: { name: Destination; href: string; label: string }[] = [
    {
      name: "explore",
      href: "/",
      label: locale === "en" ? "Explore" : dictionary.nav.browse,
    },
    {
      name: "search",
      href: "/search",
      label: locale === "en" ? "Search" : "Suche",
    },
    { name: "favorites", href: "/favorites", label: dictionary.nav.favorites },
    { name: "messages", href: "/messages", label: dictionary.nav.inbox },
    {
      name: "account",
      href: "/account",
      label: locale === "en" ? "Account" : "Konto",
    },
  ];

  return (
    <>
      <header className="marketplace-header">
        <div className="marketplace-header-inner">
          <Link
            className="marketplace-wordmark brand"
            href="/"
            aria-label={
              locale === "en" ? "CampusMarkt home" : "CampusMarkt Startseite"
            }
          >
            Campus<span>Markt</span>
          </Link>
          <Link
            className="header-search"
            href="/search"
            aria-label={locale === "en" ? "Search listings" : "Inserate suchen"}
          >
            <NavigationIcon name="search" />
            <span>
              {locale === "en" ? "What are you looking for?" : "Was suchst du?"}
            </span>
            <b>Braunschweig</b>
          </Link>
          <nav
            className="desktop-navigation"
            aria-label={locale === "en" ? "Main navigation" : "Hauptnavigation"}
          >
            <Link href="/favorites">{dictionary.nav.favorites}</Link>
            <Link href="/messages">{dictionary.nav.inbox}</Link>
            <Link href="/account">{locale === "en" ? "Account" : "Konto"}</Link>
            <LanguageSwitcher />
            <Link className="header-create" href="/listings/new">
              {dictionary.nav.createListing}
            </Link>
          </nav>
        </div>
      </header>
      <nav
        className="mobile-navigation"
        aria-label={locale === "en" ? "Mobile navigation" : "Mobile Navigation"}
      >
        {destinations.map(({ name, href, label }) => (
          <Link
            key={name}
            href={href}
            aria-current={active === name ? "page" : undefined}
          >
            <NavigationIcon name={name} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
