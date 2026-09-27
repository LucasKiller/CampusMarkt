"use client";

import React, { useEffect, useState } from "react";
import { useFavorites } from "./favorites-context";

export interface PerformFavoriteToggleOptions {
  listingId: string;
  isCurrentlyFavorited: boolean;
  isAuthenticated?: boolean;
  currentUrl?: string;
  onNavigate?: (url: string) => void;
  toggleApi?: typeof fetch;
}

export interface PerformFavoriteToggleResult {
  isFavorited: boolean;
  redirected: boolean;
}

export async function performFavoriteToggle({
  listingId,
  isCurrentlyFavorited,
  isAuthenticated,
  currentUrl = "/",
  onNavigate = (url) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  },
  toggleApi = globalThis.fetch,
}: PerformFavoriteToggleOptions): Promise<PerformFavoriteToggleResult> {
  // 1. Guest visitor redirect
  if (isAuthenticated === false) {
    onNavigate(`/login?next=${encodeURIComponent(currentUrl)}`);
    return { isFavorited: isCurrentlyFavorited, redirected: true };
  }

  // 2. Perform toggle via API
  try {
    const res = await toggleApi(
      `/api/marketplace/favorites/${encodeURIComponent(listingId)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      },
    );

    if (res.status === 401) {
      onNavigate(`/login?next=${encodeURIComponent(currentUrl)}`);
      return { isFavorited: isCurrentlyFavorited, redirected: true };
    }

    if (!res.ok) {
      return { isFavorited: isCurrentlyFavorited, redirected: false };
    }

    const json = await res.json();
    if (json.ok && json.data && typeof json.data.isFavorited === "boolean") {
      return { isFavorited: json.data.isFavorited, redirected: false };
    }

    return { isFavorited: isCurrentlyFavorited, redirected: false };
  } catch {
    return { isFavorited: isCurrentlyFavorited, redirected: false };
  }
}

export interface FavoriteButtonProps {
  listingId: string;
  initialIsFavorited?: boolean;
  isAuthenticated?: boolean;
  variant?: "card" | "details";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
  onToggle?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  listingId,
  initialIsFavorited = false,
  isAuthenticated,
  variant = "card",
  size = "md",
  className = "",
  showLabel = false,
  onToggle,
}: FavoriteButtonProps) {
  const context = useFavorites();
  const [localFavorited, setLocalFavorited] = useState(initialIsFavorited);
  const [isPending, setIsPending] = useState(false);

  const isFavorited = context ? context.isFavorited(listingId) : localFavorited;

  useEffect(() => {
    setLocalFavorited(initialIsFavorited);
  }, [initialIsFavorited]);

  const handleToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (context) {
      const nextState = await context.toggleFavorite(listingId);
      onToggle?.(nextState);
      return;
    }

    setIsPending(true);
    const currentUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";

    try {
      const result = await performFavoriteToggle({
        listingId,
        isCurrentlyFavorited: localFavorited,
        isAuthenticated,
        currentUrl,
      });

      if (!result.redirected) {
        setLocalFavorited(result.isFavorited);
        onToggle?.(result.isFavorited);
      }
    } finally {
      setIsPending(false);
    }
  };

  const label = isFavorited
    ? "Aus Merkliste entfernen"
    : "Auf die Merkliste setzen";

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };
  const iconSize = iconSizes[size] || 20;

  if (variant === "details") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isFavorited}
        aria-label={label}
        data-testid={`favorite-button-${listingId}`}
        data-favorited={isFavorited ? "true" : "false"}
        disabled={isPending}
        className={`favorite-button-details ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.25rem",
          borderRadius: "0.5rem",
          fontWeight: 600,
          fontSize: "0.9375rem",
          cursor: "pointer",
          border: isFavorited ? "1px solid #f43f5e" : "1px solid #cbd5e1",
          backgroundColor: isFavorited ? "#fff1f2" : "#ffffff",
          color: isFavorited ? "#e11d48" : "#334155",
          pointerEvents: "auto",
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={isFavorited ? "#e11d48" : "none"}
          stroke={isFavorited ? "#e11d48" : "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <span>{showLabel ? (isFavorited ? "Gemerkt" : "Merken") : label}</span>
      </button>
    );
  }

  // "card" variant (default)
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isFavorited}
      aria-label={label}
      title={label}
      data-testid={`favorite-button-${listingId}`}
      data-favorited={isFavorited ? "true" : "false"}
      disabled={isPending}
      className={`favorite-button-card ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size === "sm" ? "28px" : size === "lg" ? "40px" : "34px",
        height: size === "sm" ? "28px" : size === "lg" ? "40px" : "34px",
        borderRadius: "9999px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        color: isFavorited ? "#e11d48" : "#64748b",
        cursor: "pointer",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.12)",
        pointerEvents: "auto",
        zIndex: 5,
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isFavorited ? "#e11d48" : "none"}
        stroke={isFavorited ? "#e11d48" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {showLabel && (
        <span style={{ marginLeft: "0.25rem", fontSize: "0.8125rem" }}>
          {isFavorited ? "Gemerkt" : "Merken"}
        </span>
      )}
    </button>
  );
}
