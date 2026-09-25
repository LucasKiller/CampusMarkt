"use client";

import React, { useState } from "react";
import type { UserBlockDTO } from "@campusmarkt/types";

function formatBlockDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export interface BlockedUsersViewProps {
  initialBlockedUsers: UserBlockDTO[];
  unblockApi?: (blockedId: string) => Promise<Response>;
}

export function BlockedUsersView({
  initialBlockedUsers,
  unblockApi,
}: BlockedUsersViewProps) {
  const [blockedUsers, setBlockedUsers] =
    useState<UserBlockDTO[]>(initialBlockedUsers);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleUnblock = async (user: UserBlockDTO) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnblockingId(user.blockedId);

    try {
      const apiFn =
        unblockApi ??
        (async (id) =>
          fetch(`/api/marketplace/blocks/${id}`, {
            method: "DELETE",
            headers: { "content-type": "application/json" },
          }));

      const res = await apiFn(user.blockedId);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrorMessage(
          json.message ||
            "Blockierung konnte nicht aufgehoben werden. Bitte versuchen Sie es später erneut.",
        );
        return;
      }

      setBlockedUsers((prev) =>
        prev.filter((u) => u.blockedId !== user.blockedId),
      );
      setSuccessMessage(`${user.blockedName} wurde erfolgreich entsperrt.`);
    } catch {
      setErrorMessage(
        "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.",
      );
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="blocked-users-container">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      )}

      {blockedUsers.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700"
          data-testid="blocked-users-empty-state"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
            🛡️
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Keine blockierten Nutzer
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sie haben derzeit keine Nutzer blockiert. Wenn Sie einen Nutzer
            blockieren, erscheint er hier und Sie können die Blockierung
            jederzeit aufheben.
          </p>
        </div>
      ) : (
        <ul
          className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="blocked-users-list"
        >
          {blockedUsers.map((user) => {
            const isUnblocking = unblockingId === user.blockedId;
            const formattedDate = formatBlockDate(user.createdAt);

            return (
              <li
                key={user.id}
                className="flex items-center justify-between p-4"
                data-testid={`blocked-user-item-${user.blockedId}`}
              >
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.blockedName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      {user.blockedName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {user.blockedName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {`Blockiert am ${formattedDate}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUnblock(user)}
                  disabled={isUnblocking}
                  data-testid={`unblock-btn-${user.blockedId}`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {isUnblocking ? "Wird entsperrt..." : "Entsperren"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
