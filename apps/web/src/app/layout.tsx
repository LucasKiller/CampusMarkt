import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "CampusMarkt",
  description: "Der lokale Marktplatz für Braunschweig.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
