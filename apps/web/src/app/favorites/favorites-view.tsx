"use client";

import React, { useState } from "react";
import type { FavoriteItemDTO } from "@campusmarkt/types";
import {
  formatListingPrice,
  formatRelativeTime,
  getCategoryLabel,
  getPickupAreaLabel,
  getListingTypeLabel,
} from "@campusmarkt/domain";
import { TrustBadge } from "../../components/marketplace/feed";

export interface FavoritesViewProps {
  initialItems: FavoriteItemDTO[];
}

export function FavoritesView({ initialItems }: FavoritesViewProps) {
  const [items, setItems] = useState<FavoriteItemDTO[]>(initialItems);
  const [undoItem, setUndoItem] = useState<{
    item: FavoriteItemDTO;
    index: number;
  } | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(
    null,
  );

  const handleRemove = async (itemToRemove: FavoriteItemDTO) => {
    const idx = items.findIndex((i) => i.id === itemToRemove.id);
    if (idx === -1) return;

    // Optimistically remove from list
    const updated = items.filter((i) => i.id !== itemToRemove.id);
    setItems(updated);

    // Clear previous undo timer if active
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }

    setUndoItem({ item: itemToRemove, index: idx });
    const timer = setTimeout(() => {
      setUndoItem(null);
    }, 5000);
    setUndoTimeoutId(timer);

    try {
      await fetch(
        `/api/marketplace/favorites/${encodeURIComponent(itemToRemove.id)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
        },
      );
    } catch {
      // ignore
    }
  };

  const handleUndo = async () => {
    if (!undoItem) return;
    const { item, index } = undoItem;

    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
    }
    setUndoItem(null);

    // Restore item to list
    const restored = [...items];
    restored.splice(index, 0, item);
    setItems(restored);

    try {
      await fetch(`/api/marketplace/favorites/${encodeURIComponent(item.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
    } catch {
      // ignore
    }
  };

  if (items.length === 0 && !undoItem) {
    return (
      <div
        className="favorites-empty-state"
        data-testid="favorites-empty-state"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 2rem",
          textAlign: "center",
          backgroundColor: "#f8fafc",
          borderRadius: "1rem",
          border: "1px dashed #cbd5e1",
          margin: "2rem 0",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: "1rem" }}
          aria-hidden="true"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#1e293b",
            margin: "0 0 0.5rem 0",
          }}
        >
          Deine Merkliste ist leer
        </h2>
        <p
          style={{
            color: "#64748b",
            maxWidth: "28rem",
            margin: "0 0 1.5rem 0",
            fontSize: "0.9375rem",
            lineHeight: 1.5,
          }}
        >
          Speichere interessante Inserate auf deiner Merkliste, um sie später
          wiederzufinden und zu vergleichen.
        </p>
        <a
          href="/feed"
          className="cta-feed-button"
          data-testid="explore-feed-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "0.9375rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            transition: "background-color 0.15s ease",
          }}
        >
          Inserate entdecken
        </a>
      </div>
    );
  }

  return (
    <div className="favorites-dashboard-container">
      {/* Undo Notification Toast */}
      {undoItem && (
        <div
          role="status"
          aria-live="polite"
          className="favorites-undo-toast"
          data-testid="favorites-undo-toast"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#1e293b",
            color: "#ffffff",
            padding: "0.75rem 1.25rem",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        >
          <span>„{undoItem.item.title}“ wurde aus der Merkliste entfernt.</span>
          <button
            type="button"
            onClick={handleUndo}
            data-testid="favorites-undo-button"
            style={{
              background: "none",
              border: "none",
              color: "#38bdf8",
              fontWeight: 700,
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              textDecoration: "underline",
            }}
          >
            Rückgängig machen
          </button>
        </div>
      )}

      {/* Grid of Saved Items */}
      <div
        className="favorites-grid"
        data-testid="favorites-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {items.map((item) => {
          const isReserved = item.status === "reserved";
          const isSold = item.status === "sold";
          const isGiveaway = item.listingType === "GIVE_AWAY";

          return (
            <article
              key={item.id}
              className="favorite-listing-card"
              data-testid={`favorite-item-${item.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                boxShadow:
                  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                position: "relative",
              }}
            >
              {/* Media wrapper */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4 / 3",
                  backgroundColor: "#f1f5f9",
                  overflow: "hidden",
                }}
              >
                {item.coverImage ? (
                  <img
                    src={
                      item.coverImage.startsWith("http")
                        ? item.coverImage
                        : `/${item.coverImage}`
                    }
                    alt={item.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "0.875rem",
                    }}
                  >
                    Kein Bild
                  </div>
                )}

                {/* Status Badges Overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    left: "0.5rem",
                    display: "flex",
                    gap: "0.35rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.375rem",
                      background:
                        item.listingType === "GIVE_AWAY"
                          ? "#15803d"
                          : item.listingType === "WANTED"
                            ? "#7c3aed"
                            : "#0f172a",
                      color: "#ffffff",
                    }}
                  >
                    {getListingTypeLabel(item.listingType)}
                  </span>

                  {/* Status chip: reserved (amber) */}
                  {isReserved && (
                    <span
                      className="status-chip chip-reserved"
                      role="status"
                      data-testid={`status-badge-reserved-${item.id}`}
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "0.375rem",
                        background: "#b45309",
                        color: "#ffffff",
                        textTransform: "uppercase",
                      }}
                    >
                      Reserviert
                    </span>
                  )}

                  {/* Status chip: sold (neutral) */}
                  {isSold && (
                    <span
                      className="status-chip chip-sold"
                      role="status"
                      data-testid={`status-badge-sold-${item.id}`}
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "0.375rem",
                        background: "#64748b",
                        color: "#ffffff",
                        textTransform: "uppercase",
                      }}
                    >
                      Verkauft
                    </span>
                  )}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  aria-label={`Aus Merkliste entfernen: ${item.title}`}
                  data-testid={`remove-favorite-${item.id}`}
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    width: "32px",
                    height: "32px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    color: "#e11d48",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="#e11d48"
                    stroke="#e11d48"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div
                style={{
                  padding: "0.875rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                  flexGrow: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 800,
                      color: isGiveaway ? "#15803d" : "#0f172a",
                    }}
                  >
                    {formatListingPrice(item.listingType, item.priceCents)}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {formatRelativeTime(item.favoritedAt)} gespeichert
                  </span>
                </div>

                <a
                  href={`/listings/${item.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      margin: 0,
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.title}
                  </h3>
                </a>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                    marginTop: "0.25rem",
                    fontSize: "0.75rem",
                    color: "#475569",
                  }}
                >
                  <span
                    style={{
                      background: "#f1f5f9",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {getCategoryLabel(item.category)}
                  </span>
                  <span
                    style={{
                      background: "#f1f5f9",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "0.25rem",
                    }}
                  >
                    {getPickupAreaLabel(item.pickupArea)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    marginTop: "auto",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid #f1f5f9",
                    fontSize: "0.8rem",
                  }}
                >
                  <span style={{ color: "#64748b" }}>
                    {item.seller.displayName}
                  </span>
                  {item.seller.universityBadge && (
                    <TrustBadge badge={item.seller.universityBadge} />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
