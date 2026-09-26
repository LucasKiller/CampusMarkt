import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Moderation · CampusMarkt",
  description: "Marktplatz-Moderation und Prüfwarteschlange.",
};

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 py-8 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Moderationskonsole
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Verwaltung von Meldungen, Inseratsbeschränkungen und Audit-Trail
            </p>
          </div>

          <nav
            aria-label="Moderation Navigation"
            className="flex space-x-2 rounded-lg bg-stone-200/70 p-1 dark:bg-stone-800"
          >
            <Link
              href="/moderation"
              className="rounded-md px-3.5 py-1.5 text-sm font-medium text-stone-800 hover:bg-white hover:shadow-sm dark:text-stone-200 dark:hover:bg-stone-700"
            >
              Prüfwarteschlange
            </Link>
            <Link
              href="/moderation/audit"
              className="rounded-md px-3.5 py-1.5 text-sm font-medium text-stone-800 hover:bg-white hover:shadow-sm dark:text-stone-200 dark:hover:bg-stone-700"
            >
              Audit-Protokoll
            </Link>
          </nav>
        </div>

        {children}
      </div>
    </div>
  );
}
