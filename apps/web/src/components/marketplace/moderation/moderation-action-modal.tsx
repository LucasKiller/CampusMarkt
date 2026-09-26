"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  ExecuteModerationActionRequest,
  ExecuteModerationActionResponse,
  ModerationActionType,
  ReportTargetType,
} from "@campusmarkt/types";

export interface ModerationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ModerationActionType;
  targetType: ReportTargetType;
  targetId: string;
  reportId?: string;
  targetTitle?: string;
  onSuccess?: (response: ExecuteModerationActionResponse) => void;
  actionApi?: (payload: ExecuteModerationActionRequest) => Promise<Response>;
}

const ACTION_TITLES: Record<ModerationActionType, string> = {
  dismiss_report: "Meldung verwerfen",
  remove_listing: "Inserat entfernen",
  suspend_user: "Nutzer sperren",
};

const ACTION_DESCRIPTIONS: Record<ModerationActionType, string> = {
  dismiss_report:
    "Die Meldung wird als unbegründet abgelehnt und aus der Prüfwarteschlange entfernt.",
  remove_listing:
    "Das Inserat wird dauerhaft aus dem Marktplatz entfernt. Aktive Reservierungen werden automatisch storniert.",
  suspend_user:
    "Das Nutzerkonto wird gesperrt. Alle aktiven Inserate werden entfernt und laufende Reservierungen storniert.",
};

const ACTION_BUTTON_LABELS: Record<ModerationActionType, string> = {
  dismiss_report: "Meldung verwerfen",
  remove_listing: "Inserat unwiderruflich entfernen",
  suspend_user: "Nutzerkonto sperren",
};

export function ModerationActionModal({
  isOpen,
  onClose,
  actionType,
  targetType,
  targetId,
  reportId,
  targetTitle,
  onSuccess,
  actionApi,
}: ModerationActionModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setReason("");
      setSubmitError(null);
      setIsSubmitting(false);

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

  const trimmedReason = reason.trim();
  const charLength = Array.from(reason).length;
  const isReasonValid = trimmedReason.length > 0 && charLength <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReasonValid || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const payload: ExecuteModerationActionRequest = {
      actionType,
      targetType,
      targetId,
      reason: trimmedReason,
      ...(reportId ? { reportId } : {}),
    };

    try {
      const apiFn =
        actionApi ??
        (async (p) =>
          fetch("/api/moderation/actions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(p),
          }));

      const res = await apiFn(payload);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (json.code === "CONFLICT") {
          setSubmitError(
            "Diese Meldung oder dieses Element wurde bereits bearbeitet.",
          );
        } else if (json.code === "FORBIDDEN") {
          setSubmitError(
            "Keine Berechtigung zur Durchführung dieser Moderationsaktion.",
          );
        } else {
          setSubmitError(
            json.message ||
              json.fieldErrors?.reason?.[0] ||
              "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.",
          );
        }
        return;
      }

      onSuccess?.(json.data);
      onClose();
    } catch {
      setSubmitError(
        "Netzwerkfehler. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="moderation-modal-title"
      aria-describedby="moderation-modal-desc"
      data-testid="moderation-action-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900">
        <h2
          id="moderation-modal-title"
          className="text-xl font-bold text-stone-900 dark:text-stone-100"
        >
          {ACTION_TITLES[actionType]}
        </h2>

        <p
          id="moderation-modal-desc"
          className="mt-2 text-sm text-stone-600 dark:text-stone-300"
        >
          {ACTION_DESCRIPTIONS[actionType]}
        </p>

        {targetTitle && (
          <div className="mt-3 rounded-lg bg-stone-100 p-3 text-sm text-stone-800 dark:bg-stone-800 dark:text-stone-200">
            <span className="font-semibold">Ziel:</span> {targetTitle}
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            data-testid="moderation-modal-error"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="moderation-justification-note"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Begründung (Pflichtfeld)
            </label>
            <textarea
              id="moderation-justification-note"
              data-testid="moderation-reason-input"
              rows={4}
              maxLength={1000}
              required
              disabled={isSubmitting}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Geben Sie eine sachliche Begründung für das Audit-Protokoll an..."
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            />
            <div className="mt-1 flex justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>Wird unveränderlich im Audit-Log erfasst.</span>
              <span
                data-testid="char-counter"
                className={
                  charLength > 1000 ? "font-bold text-red-600" : undefined
                }
              >
                {`${charLength}/1000`}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              data-testid="moderation-cancel-button"
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!isReasonValid || isSubmitting}
              data-testid="moderation-submit-button"
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                actionType === "dismiss_report"
                  ? "bg-stone-700 hover:bg-stone-800 focus:ring-stone-600"
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
              }`}
            >
              {isSubmitting
                ? "Wird ausgeführt..."
                : ACTION_BUTTON_LABELS[actionType]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
