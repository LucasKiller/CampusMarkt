"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  CreateReportRequest,
  ReportConfirmationDTO,
  ReportReason,
  ReportTargetType,
} from "@campusmarkt/types";
import { REPORT_REASONS } from "@campusmarkt/types";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  prohibited_content: "Verbotene Inhalte (z.B. Waffen, Drogen)",
  fraud_or_scam: "Betrug oder Täuschung",
  harassment_or_abuse: "Belästigung oder Beleidigung",
  unsupported_content:
    "Nicht unterstützte Inhalte (z.B. Dienstleistungen, Jobs)",
  privacy_violation: "Datenschutz- oder Privatsphärenverletzung",
  other: "Sonstiger Verstoß",
};

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  onReportSubmitted?: (receipt: ReportConfirmationDTO) => void;
  reportApi?: (payload: CreateReportRequest) => Promise<Response>;
}

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onReportSubmitted,
  reportApi,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>("prohibited_content");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] =
    useState<ReportConfirmationDTO | null>(null);

  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setReason("prohibited_content");
      setDetails("");
      setSubmitError(null);
      setIsSubmitting(false);
      setSubmittedReceipt(null);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (details.length > 1000) {
      setSubmitError("Die Beschreibung darf maximal 1000 Zeichen enthalten.");
      return;
    }

    const payload: CreateReportRequest = {
      targetType,
      targetId,
      reason,
      ...(details.trim().length > 0 ? { details: details.trim() } : {}),
    };

    setIsSubmitting(true);
    try {
      const apiFn =
        reportApi ??
        (async (p) =>
          fetch("/api/marketplace/reports", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(p),
          }));

      const res = await apiFn(payload);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (json.code === "CONFLICT") {
          setSubmitError(
            "Sie haben für diesen Inhalt bereits eine offene Meldung eingereicht.",
          );
        } else if (
          json.fieldErrors?.targetId ||
          json.message?.includes("cannot report")
        ) {
          setSubmitError(
            "Sie können Ihre eigenen Inhalte oder Ihr eigenes Profil nicht melden.",
          );
        } else if (json.code === "RATE_LIMITED") {
          setSubmitError(
            "Zu viele Anfragen. Bitte warten Sie einen Moment vor der nächsten Meldung.",
          );
        } else {
          setSubmitError(
            json.message ||
              "Die Meldung konnte nicht übermittelt werden. Bitte versuchen Sie es später erneut.",
          );
        }
        return;
      }

      setSubmittedReceipt(json.data);
      onReportSubmitted?.(json.data);
    } catch {
      setSubmitError(
        "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetDescription =
    targetType === "listing"
      ? `Inserat: ${targetTitle || targetId}`
      : `Nutzer: ${targetTitle || targetId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
        {submittedReceipt ? (
          <div className="space-y-4" data-testid="report-confirmation">
            <h2
              id="report-modal-title"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              Meldung eingegangen
            </h2>
            <div className="rounded-lg bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <p className="font-medium">Vielen Dank für Ihre Meldung.</p>
              <p className="mt-1 text-sm">
                Unser Moderationsteam prüft den Fall sorgfältig. Ihre Identität
                wird streng vertraulich behandelt und zu keinem Zeitpunkt an die
                gemeldete Person weitergegeben.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              >
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2
                id="report-modal-title"
                className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
              >
                Inhalt melden
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {targetDescription}
              </p>
            </div>

            {submitError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
              >
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="report-reason"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Grund der Meldung
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REPORT_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label
                  htmlFor="report-details"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Zusätzliche Details (optional)
                </label>
                <span
                  className={`text-xs ${
                    details.length > 1000
                      ? "text-red-600 font-semibold"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                  data-testid="char-counter"
                >
                  {`${details.length} / 1000`}
                </span>
              </div>
              <textarea
                id="report-details"
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Beschreiben Sie kurz, was gegen die CampusMarkt-Richtlinien verstößt..."
                className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <span>
                🔒 Vertraulich: Die gemeldete Person erfährt nicht, wer diesen
                Bericht eingereicht hat.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || details.length > 1000}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Wird gesendet..." : "Meldung absenden"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
