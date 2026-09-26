"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  ModerationActionType,
  ModerationQueueItemDTO,
} from "@campusmarkt/types";
import {
  ModerationActionModal,
  ModerationReportCard,
} from "../../components/marketplace/moderation/index";

export interface ModerationQueueViewProps {
  initialIsModerator?: boolean;
  initialQueue?: ModerationQueueItemDTO[];
  initialLoading?: boolean;
  statusApiUrl?: string;
  queueApiUrl?: string;
}

export function ModerationQueueView({
  initialIsModerator,
  initialQueue,
  initialLoading,
  statusApiUrl = "/api/moderation/status",
  queueApiUrl = "/api/moderation/queue",
}: ModerationQueueViewProps) {
  const [isModerator, setIsModerator] = useState<boolean | null>(
    initialIsModerator ?? null,
  );
  const [queue, setQueue] = useState<ModerationQueueItemDTO[]>(
    initialQueue ?? [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialLoading ?? initialIsModerator === undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] =
    useState<ModerationActionType>("dismiss_report");
  const [activeItem, setActiveItem] = useState<ModerationQueueItemDTO | null>(
    null,
  );

  const fetchStatusAndQueue = useCallback(async () => {
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

      const queueRes = await fetch(queueApiUrl);
      const queueJson = await queueRes.json();

      if (queueRes.ok && queueJson.ok && Array.isArray(queueJson.data?.queue)) {
        setQueue(queueJson.data.queue);
      } else {
        setError("Fehler beim Laden der Prüfwarteschlange.");
      }
    } catch {
      setError("Netzwerkfehler beim Abrufen der Moderationsdaten.");
    } finally {
      setIsLoading(false);
    }
  }, [statusApiUrl, queueApiUrl]);

  useEffect(() => {
    if (initialIsModerator === undefined) {
      void fetchStatusAndQueue();
    }
  }, [initialIsModerator, fetchStatusAndQueue]);

  const handleActionSelect = (
    actionType: ModerationActionType,
    item: ModerationQueueItemDTO,
  ) => {
    setActiveAction(actionType);
    setActiveItem(item);
    setIsModalOpen(true);
  };

  const handleActionSuccess = () => {
    if (!activeItem) return;

    if (activeAction === "dismiss_report") {
      setQueue((prev) => prev.filter((r) => r.id !== activeItem.id));
      setSuccessNotice("Meldung erfolgreich verworfen.");
    } else if (activeAction === "remove_listing") {
      setQueue((prev) =>
        prev.filter(
          (r) =>
            !(r.targetType === "listing" && r.targetId === activeItem.targetId),
        ),
      );
      setSuccessNotice(
        "Inserat erfolgreich entfernt und Reservierungen storniert.",
      );
    } else if (activeAction === "suspend_user") {
      setQueue((prev) =>
        prev.filter(
          (r) =>
            !(r.targetType === "user" && r.targetId === activeItem.targetId),
        ),
      );
      setSuccessNotice("Nutzerkonto erfolgreich gesperrt.");
    }

    setIsModalOpen(false);
    setActiveItem(null);
  };

  if (isLoading) {
    return (
      <div
        data-testid="moderation-loading"
        className="flex min-h-[300px] items-center justify-center rounded-xl bg-white p-8 dark:bg-stone-900"
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Moderator-Berechtigungen werden geprüft...
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
    <div data-testid="moderation-queue-view" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {`Ausstehende Meldungen (${queue.length})`}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Chronologisch geordnet nach Eingangszeitpunkt
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchStatusAndQueue()}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          Aktualisieren
        </button>
      </div>

      {successNotice && (
        <div
          role="status"
          data-testid="moderation-success-notice"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {successNotice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div
          data-testid="empty-queue-message"
          className="rounded-xl border border-stone-200 bg-white p-12 text-center dark:border-stone-800 dark:bg-stone-900"
        >
          <p className="text-base font-medium text-stone-700 dark:text-stone-300">
            Keine ausstehenden Meldungen.
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Die Prüfwarteschlange ist vollständig abgearbeitet.
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="moderation-queue-list">
          {queue.map((item) => (
            <ModerationReportCard
              key={item.id}
              item={item}
              onActionSelect={handleActionSelect}
            />
          ))}
        </div>
      )}

      {activeItem && (
        <ModerationActionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setActiveItem(null);
          }}
          actionType={activeAction}
          targetType={activeItem.targetType}
          targetId={activeItem.targetId}
          reportId={activeItem.id}
          targetTitle={
            activeItem.targetType === "listing"
              ? activeItem.listingTitle
              : activeItem.userName
          }
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}

export default function ModerationPage() {
  return <ModerationQueueView />;
}
