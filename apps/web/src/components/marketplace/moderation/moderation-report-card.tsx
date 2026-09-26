"use client";

import React from "react";
import Link from "next/link";
import type {
  ModerationActionType,
  ModerationQueueItemDTO,
} from "@campusmarkt/types";

export interface ModerationReportCardProps {
  item: ModerationQueueItemDTO;
  onActionSelect: (
    actionType: ModerationActionType,
    item: ModerationQueueItemDTO,
  ) => void;
}

const REASON_LABELS: Record<string, string> = {
  prohibited_content: "Verbotene Inhalte",
  counterfeit_or_scam: "Täuschung oder Betrug",
  harassment_or_abuse: "Belästigung oder Missbrauch",
  duplicate_or_spam: "Spam oder Duplikat",
  wrong_category_or_tag: "Falsche Kategorie",
  other: "Sonstiges",
};

export function ModerationReportCard({
  item,
  onActionSelect,
}: ModerationReportCardProps) {
  const isListing = item.targetType === "listing";
  const displayTitle = isListing
    ? item.listingTitle || `Inserat (${item.targetId.slice(0, 8)})`
    : item.userName || `Nutzer (${item.targetId.slice(0, 8)})`;

  const reasonDisplay = REASON_LABELS[item.reason] || item.reason;

  return (
    <div
      data-testid="moderation-report-card"
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isListing
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
            }`}
          >
            {isListing ? "Inserat" : "Nutzer"}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Meldung vom {new Date(item.createdAt).toLocaleString("de-DE")}
          </span>
        </div>

        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
          Ausstehend
        </span>
      </div>

      <div className="mt-3">
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          {isListing ? (
            <Link
              href={`/listings/${item.targetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-emerald-700 dark:text-emerald-400"
            >
              {displayTitle}
            </Link>
          ) : (
            <span>{displayTitle}</span>
          )}
        </h3>

        <div className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          <span className="font-semibold text-stone-900 dark:text-stone-100">
            Meldungsgrund:
          </span>{" "}
          <span className="inline-block rounded bg-stone-100 px-2 py-0.5 font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-200">
            {reasonDisplay}
          </span>
        </div>

        {item.details && (
          <p className="mt-2 text-sm text-stone-600 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-300">
            &bdquo;{item.details}&ldquo;
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <button
          type="button"
          data-testid="dismiss-report-button"
          onClick={() => onActionSelect("dismiss_report", item)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Meldung verwerfen
        </button>

        {isListing && (
          <button
            type="button"
            data-testid="remove-listing-button"
            onClick={() => onActionSelect("remove_listing", item)}
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Inserat entfernen
          </button>
        )}

        <button
          type="button"
          data-testid="suspend-user-button"
          onClick={() => onActionSelect("suspend_user", item)}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Nutzer sperren
        </button>
      </div>
    </div>
  );
}
