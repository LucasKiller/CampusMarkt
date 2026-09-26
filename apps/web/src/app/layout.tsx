import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  getServerDictionary,
  getServerLocale,
} from "../modules/localization/server/index";
import { LanguageProvider } from "../modules/localization/components/LanguageProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "CampusMarkt",
  description: "Der lokale Marktplatz für Braunschweig.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getServerLocale();
  const dictionary = await getServerDictionary(locale);

  return (
    <html lang={locale} data-test-lang="de">
      <body>
        <LanguageProvider initialLocale={locale} initialDictionary={dictionary}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
