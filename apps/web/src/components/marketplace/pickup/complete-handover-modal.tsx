"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatCurrencyEuros } from "@campusmarkt/domain";
export interface CompletePickupResult {
  reservationId: string;
  listingId: string;
  status: "completed";
  agreedPriceCents: number;
  completedAt: string;
}

export function validateCompletionNote(note: string): {
  valid: boolean;
  error?: string;
  trimmed?: string | null;
} {
  if (note.length > 500) {
    return {
      valid: false,
      error: "Die Notiz darf maximal 500 Zeichen lang sein.",
    };
  }
  const trimmed = note.trim();
  return {
    valid: true,
    trimmed: trimmed.length > 0 ? trimmed : null,
  };
}

export interface CompleteHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  listingTitle?: string;
  agreedPriceCents?: number;
  onCompleted?: (result: CompletePickupResult) => void;
  completeApi?: (
    reservationId: string,
    payload: { completionNote?: string | null },
  ) => Promise<Response>;
}

export function CompleteHandoverModal({
  isOpen,
  onClose,
  reservationId,
  listingTitle,
  agreedPriceCents,
  onCompleted,
  completeApi,
}: CompleteHandoverModalProps) {
  const [completionNote, setCompletionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setCompletionNote("");
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

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateCompletionNote(completionNote);
    if (!validation.valid) {
      setSubmitError(validation.error || "Ungültige Eingabe.");
      return;
    }

    setIsSubmitting(true);
    try {
      const apiFn =
        completeApi ??
        (async (id, body) =>
          fetch(`/api/marketplace/reservations/${id}/complete`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }));

      const res = await apiFn(reservationId, {
        completionNote: validation.trimmed,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          throw new Error("Nur der Verkäufer kann die Übergabe abschließen.");
        }
        if (res.status === 409) {
          throw new Error(
            "Die Reservierung ist nicht mehr aktiv oder wurde bereits abgeschlossen.",
          );
        }
        throw new Error(
          errorData.message ||
            "Fehler beim Abschließen der Übergabe. Bitte versuche es erneut.",
        );
      }

      const responseBody = await res.json();
      const receipt: CompletePickupResult = responseBody.data || responseBody;

      onCompleted?.(receipt);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Ein unerwarteter Fehler ist aufgetreten.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 500 - completionNote.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-handover-title"
      aria-describedby="complete-handover-desc"
      data-testid="complete-handover-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl flex flex-col gap-4 text-card-foreground animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div>
              <h2
                id="complete-handover-title"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Übergabe abschließen
              </h2>
              <p
                id="complete-handover-desc"
                className="text-xs text-muted-foreground"
              >
                Bestätige die persönliche Übergabe und Bezahlung
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring cursor-pointer"
            aria-label="Schließen"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Item summary banner */}
        {(listingTitle || agreedPriceCents !== undefined) && (
          <div className="rounded-xl bg-muted/60 p-3.5 border border-border/80 flex flex-col gap-1">
            {listingTitle && (
              <span className="text-sm font-semibold text-foreground truncate">
                {listingTitle}
              </span>
            )}
            {agreedPriceCents !== undefined && (
              <span className="text-xs font-medium text-muted-foreground">
                Vereinbarter Betrag:{" "}
                <strong className="text-foreground">
                  {agreedPriceCents > 0
                    ? formatCurrencyEuros(agreedPriceCents)
                    : "Kostenlos"}
                </strong>
              </span>
            )}
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-medium">⚠️ Dieser Schritt ist endgültig:</p>
          <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
            Der Artikel wird als verkauft markiert und die Reservierung
            archiviert.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="completion-note"
                className="text-xs font-medium text-foreground"
              >
                Optionale Notiz zur Übergabe
              </label>
              <span
                className={`text-[11px] ${
                  remainingChars < 0
                    ? "text-destructive font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {remainingChars} Zeichen
              </span>
            </div>
            <textarea
              id="completion-note"
              data-testid="completion-note-input"
              rows={3}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="z.B. Bar bezahlt, alles in Ordnung..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring resize-none"
              maxLength={550}
            />
          </div>

          {submitError && (
            <div
              data-testid="complete-handover-error"
              className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive border border-destructive/20"
            >
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              data-testid="complete-handover-cancel"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              data-testid="complete-handover-confirm"
              disabled={isSubmitting || remainingChars < 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      strokeDasharray="32"
                      strokeDashoffset="12"
                    />
                  </svg>
                  <span>Wird abgeschlossen...</span>
                </>
              ) : (
                <span>Übergabe bestätigen</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export interface CompleteHandoverButtonProps {
  reservationId: string;
  listingTitle?: string;
  agreedPriceCents?: number;
  disabled?: boolean;
  className?: string;
  onCompleted?: (result: CompletePickupResult) => void;
  completeApi?: CompleteHandoverModalProps["completeApi"];
}

export function CompleteHandoverButton({
  reservationId,
  listingTitle,
  agreedPriceCents,
  disabled = false,
  className = "",
  onCompleted,
  completeApi,
}: CompleteHandoverButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="complete-handover-trigger"
        disabled={disabled}
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600 ${className}`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>Übergabe abschließen</span>
      </button>

      <CompleteHandoverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reservationId={reservationId}
        listingTitle={listingTitle}
        agreedPriceCents={agreedPriceCents}
        onCompleted={onCompleted}
        completeApi={completeApi}
      />
    </>
  );
}
