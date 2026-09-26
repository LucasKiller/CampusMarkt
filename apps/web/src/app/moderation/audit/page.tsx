"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  ModerationActionDTO,
  ModerationActionType,
} from "@campusmarkt/types";

export interface ModerationAuditViewProps {
  initialIsModerator?: boolean;
  initialAuditLog?: ModerationActionDTO[];
  initialLoading?: boolean;
  statusApiUrl?: string;
  auditApiUrl?: string;
}

const ACTION_BADGES: Record<
  ModerationActionType,
  { label: string; className: string }
> = {
  dismiss_report: {
    label: "Meldung verworfen",
    className:
      "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300",
  },
  remove_listing: {
    label: "Inserat entfernt",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  },
  suspend_user: {
    label: "Nutzer gesperrt",
    className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  },
};

export function ModerationAuditView({
  initialIsModerator,
  initialAuditLog,
  initialLoading,
  statusApiUrl = "/api/moderation/status",
  auditApiUrl = "/api/moderation/audit",
}: ModerationAuditViewProps) {
  const [isModerator, setIsModerator] = useState<boolean | null>(
    initialIsModerator ?? null,
  );
  const [auditLog, setAuditLog] = useState<ModerationActionDTO[]>(
    initialAuditLog ?? [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialLoading ?? initialIsModerator === undefined,
  );
  const [error, setError] = useState<string | null>(null);

  const fetchStatusAndAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const statusRes = await fetch(statusApiUrl);
      const statusJson = await statusRes.json();

      if (!statusRes.ok || !statusJson.ok || !statusJson.data?.isModerator) {
        setIsModerator(false);
        setIsLoading(false);
        return;
      }

      setIsModerator(true);

      const auditRes = await fetch(auditApiUrl);
      const auditJson = await auditRes.json();

      if (
        auditRes.ok &&
        auditJson.ok &&
        Array.isArray(auditJson.data?.auditLog)
      ) {
        setAuditLog(auditJson.data.auditLog);
      } else {
        setError("Fehler beim Laden des Audit-Protokolls.");
      }
    } catch {
      setError("Netzwerkfehler beim Abrufen des Audit-Protokolls.");
    } finally {
      setIsLoading(false);
    }
  }, [statusApiUrl, auditApiUrl]);

  useEffect(() => {
    if (initialIsModerator === undefined) {
      void fetchStatusAndAudit();
    }
  }, [initialIsModerator, fetchStatusAndAudit]);

  if (isLoading) {
    return (
      <div
        data-testid="moderation-loading"
        className="flex min-h-[300px] items-center justify-center rounded-xl bg-white p-8 dark:bg-stone-900"
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Audit-Protokoll wird geladen...
        </p>
      </div>
    );
  }

  if (isModerator === false) {
    return (
      <div
        data-testid="moderation-forbidden"
        className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950"
      >
        <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
          Zugriff verweigert (403)
        </h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Dieser Bereich ist ausschließlich für autorisierte Moderatoren
          zugänglich.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="moderation-audit-view" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {`Audit-Protokoll (${auditLog.length})`}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Unveränderlicher Revisionsverlauf aller Moderationsentscheidungen
            (AD-017)
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchStatusAndAudit()}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Aktualisieren
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {auditLog.length === 0 ? (
        <div
          data-testid="empty-audit-message"
          className="rounded-xl border border-stone-200 bg-white p-12 text-center dark:border-stone-800 dark:bg-stone-900"
        >
          <p className="text-base font-medium text-stone-700 dark:text-stone-300">
            Keine Audit-Einträge vorhanden.
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Es wurden noch keine Moderationsaktionen protokolliert.
          </p>
        </div>
      ) : (
        <div
          data-testid="moderation-audit-list"
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {auditLog.map((action) => {
              const badge = ACTION_BADGES[action.actionType] || {
                label: action.actionType,
                className: "bg-stone-100 text-stone-800",
              };

              return (
                <div
                  key={action.id}
                  data-testid="audit-row"
                  className="p-5 transition hover:bg-stone-50/50 dark:hover:bg-stone-800/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {new Date(action.createdAt).toLocaleString("de-DE")}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        Moderator:
                      </span>{" "}
                      <code>{action.moderatorId.slice(0, 8)}</code>
                    </div>
                  </div>

                  <div className="mt-2 text-sm">
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      Ziel (
                      {action.targetType === "listing" ? "Inserat" : "Nutzer"}):
                    </span>{" "}
                    <code>{action.targetId}</code>
                  </div>

                  <div className="mt-2 text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-lg border border-stone-100 dark:border-stone-800">
                    <span className="font-medium text-stone-900 dark:text-stone-100">
                      Begründung:
                    </span>{" "}
                    {action.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModerationAuditPage() {
  return <ModerationAuditView />;
}
