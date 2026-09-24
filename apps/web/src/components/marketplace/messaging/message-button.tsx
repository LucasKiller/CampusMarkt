"use client";

import React, { useState } from "react";

export interface MessageButtonProps {
  listingId: string;
  sellerId: string;
  currentUserId?: string | null;
  onNavigate?: (url: string) => void;
  className?: string;
}

export function MessageButton({
  listingId,
  sellerId,
  currentUserId = null,
  onNavigate,
  className = "",
}: MessageButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSeller = Boolean(
    currentUserId &&
    sellerId &&
    currentUserId.trim().toLowerCase() === sellerId.trim().toLowerCase(),
  );

  const navigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };

  const handleStartMessage = async () => {
    if (!currentUserId) {
      const next = encodeURIComponent(
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/listings/${listingId}`,
      );
      navigate(`/login?next=${next}`);
      return;
    }

    if (isSeller) {
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/marketplace/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });

      if (!res.ok) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errorJson.message || "Fehler beim Starten der Unterhaltung.",
        );
      }

      const json = (await res.json()) as {
        data?: { conversation?: { id: string } };
      };

      const convId = json.data?.conversation?.id;
      if (convId) {
        navigate(`/messages/${convId}`);
      } else {
        navigate("/messages");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler aufgetreten.";
      setErrorMessage(msg);
      setIsStarting(false);
    }
  };

  if (isSeller) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        type="button"
        data-testid="cta-send-message"
        disabled={isStarting}
        onClick={handleStartMessage}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-sm font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50 ${className}`}
      >
        <svg
          className="w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>{isStarting ? "Wird geöffnet..." : "Nachricht schreiben"}</span>
      </button>
      {errorMessage && (
        <span className="text-xs text-destructive">{errorMessage}</span>
      )}
    </div>
  );
}
