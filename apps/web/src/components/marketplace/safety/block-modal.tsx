"use client";

import React, { useEffect, useRef, useState } from "react";
import type { BlockUserRequest, BlockUserResponse } from "@campusmarkt/types";

export interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedUserId: string;
  blockedUserName?: string;
  onUserBlocked?: (result: BlockUserResponse) => void;
  blockApi?: (payload: BlockUserRequest) => Promise<Response>;
}

export function BlockUserModal({
  isOpen,
  onClose,
  blockedUserId,
  blockedUserName,
  onUserBlocked,
  blockApi,
}: BlockUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setSubmitError(null);
      setIsSubmitting(false);
      setIsBlocked(false);

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

  const displayName = blockedUserName || "diesen Nutzer";

  const handleConfirm = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    const payload: BlockUserRequest = {
      blockedId: blockedUserId,
    };

    try {
      const apiFn =
        blockApi ??
        (async (p) =>
          fetch("/api/marketplace/blocks", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(p),
          }));

      const res = await apiFn(payload);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (
          json.fieldErrors?.blockedId ||
          json.message?.includes("cannot block")
        ) {
          setSubmitError("Sie können sich nicht selbst blockieren.");
        } else if (json.code === "RATE_LIMITED") {
          setSubmitError(
            "Zu viele Aktionen. Bitte warten Sie einen kurzen Moment.",
          );
        } else {
          setSubmitError(
            json.message ||
              "Nutzer konnte nicht blockiert werden. Bitte versuchen Sie es später erneut.",
          );
        }
        return;
      }

      setIsBlocked(true);
      onUserBlocked?.(json.data);
    } catch {
      setSubmitError(
        "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="alertdialog"
      aria-labelledby="block-modal-title"
      aria-describedby="block-modal-description"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-100">
        {isBlocked ? (
          <div className="space-y-4" data-testid="block-success-feedback">
            <h2
              id="block-modal-title"
              className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
            >
              Nutzer blockiert
            </h2>
            <div className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <p className="font-medium">
                {`${displayName} wurde erfolgreich blockiert.`}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Sie können die Blockierung jederzeit in Ihren Kontoeinstellungen
                unter &quot;Blockierte Nutzer&quot; wieder aufheben.
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
          <div className="space-y-4">
            <div>
              <h2
                id="block-modal-title"
                className="text-xl font-bold text-zinc-900 dark:text-zinc-100"
              >
                {`Möchten Sie ${displayName} blockieren?`}
              </h2>
              <p
                id="block-modal-description"
                className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
              >
                Das Blockieren hat folgende gegenseitige Auswirkungen:
              </p>
            </div>

            <ul className="space-y-2 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  <strong>Gegenseitige Sichtbarkeit:</strong> Ihre Inserate und
                  die Inserate dieser Person werden im Feed und in der Suche
                  füreinander ausgeblendet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  <strong>Nachrichten:</strong> Sie können einander keine neuen
                  Nachrichten mehr senden.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  <strong>Angebote:</strong> Preisverhandlungen und Angebote
                  zwischen Ihnen werden gesperrt.
                </span>
              </li>
            </ul>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sie können diese Blockierung jederzeit in Ihrem Profil unter
              &quot;Blockierte Nutzer&quot; verwalten und rückgängig machen.
            </p>

            {submitError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
              >
                {submitError}
              </div>
            )}

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
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Wird blockiert..." : "Nutzer blockieren"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
