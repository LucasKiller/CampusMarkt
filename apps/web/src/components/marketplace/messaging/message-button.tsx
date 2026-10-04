"use client";

import React, { useState } from "react";
import type { SupportedLocale } from "@campusmarkt/domain";

export interface MessageButtonProps {
  listingId: string;
  sellerId: string;
  currentUserId?: string | null;
  isListingOwner?: boolean;
  locale?: SupportedLocale;
  onNavigate?: (url: string) => void;
  className?: string;
}

export function MessageButton({
  listingId,
  sellerId,
  currentUserId = null,
  isListingOwner = false,
  locale = "de",
  onNavigate,
  className = "",
}: MessageButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSeller =
    isListingOwner ||
    Boolean(
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
          errorJson.message ||
            (locale === "en"
              ? "Could not open the conversation."
              : "Fehler beim Starten der Unterhaltung."),
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
      const msg =
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Something went wrong."
            : "Fehler aufgetreten.";
      setErrorMessage(msg);
      setIsStarting(false);
    }
  };

  if (isSeller) {
    return null;
  }

  return (
    <div className="messages-start-wrapper">
      <button
        type="button"
        data-testid="cta-send-message"
        disabled={isStarting}
        onClick={handleStartMessage}
        className={`messages-start-button ${className}`}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>
          {isStarting
            ? locale === "en"
              ? "Opening…"
              : "Wird geöffnet..."
            : locale === "en"
              ? "Message seller"
              : "Nachricht schreiben"}
        </span>
      </button>
      {errorMessage && (
        <span role="alert" className="messages-start-error">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
