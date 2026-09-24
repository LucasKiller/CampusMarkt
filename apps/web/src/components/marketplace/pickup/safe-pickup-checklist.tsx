"use client";

import React, { useState } from "react";
import { CAMPUS_PICKUP_SPOTS, SAFE_PICKUP_RULES } from "@campusmarkt/domain";

export interface SafePickupChecklistProps {
  className?: string;
  initiallyExpanded?: boolean;
  compact?: boolean;
  pickupArea?: string;
}

export function SafePickupChecklist({
  className = "",
  initiallyExpanded = true,
  compact = false,
  pickupArea,
}: SafePickupChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <section
      data-testid="safe-pickup-checklist"
      aria-labelledby="safe-pickup-heading"
      className={`rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs dark:bg-emerald-500"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3
              id="safe-pickup-heading"
              className="text-sm font-semibold tracking-tight text-emerald-900 dark:text-emerald-200"
            >
              Sichere Übergabe auf dem Campus
            </h3>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
              Leitfaden für die persönliche Abholung und Barzahlung
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="safe-pickup-content"
          className="rounded-md p-1.5 text-emerald-800 hover:bg-emerald-200/50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/40 cursor-pointer"
          title={isExpanded ? "Einklappen" : "Ausklappen"}
        >
          <span className="sr-only">
            {isExpanded
              ? "Sicherheitshinweise einklappen"
              : "Sicherheitshinweise ausklappen"}
          </span>
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div
          id="safe-pickup-content"
          className="mt-3.5 space-y-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-900/40"
        >
          {/* Pickup Area Banner if supplied */}
          {pickupArea && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-100/70 px-3 py-1.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{`Vorgeschlagener Bereich: ${pickupArea}`}</span>
            </div>
          )}

          {/* Safety Rules Checklist */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-900/90 dark:text-emerald-300/90">
              Checkliste für deine Sicherheit:
            </h4>
            <ul
              data-testid="safe-pickup-rules-list"
              className="mt-1.5 space-y-1.5 text-xs text-emerald-900/90 dark:text-emerald-200/90"
            >
              {SAFE_PICKUP_RULES.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                    ✓
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Spots */}
          {!compact && (
            <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/30">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-900/90 dark:text-emerald-300/90">
                Empfohlene Treffpunkte an der TU Braunschweig:
              </h4>
              <ul
                data-testid="safe-pickup-spots-list"
                className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs"
              >
                {CAMPUS_PICKUP_SPOTS.map((spot) => (
                  <li
                    key={spot.id}
                    className="flex flex-col rounded-md bg-white/70 p-2 border border-emerald-100 shadow-2xs dark:bg-emerald-950/40 dark:border-emerald-900/40"
                  >
                    <span className="font-semibold text-emerald-950 dark:text-emerald-100">
                      {spot.name}
                    </span>
                    <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                      {spot.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
