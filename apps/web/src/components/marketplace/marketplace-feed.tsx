"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PublicFeedItem } from "@campusmarkt/types";
import { EmptyFeedState, FeedFilterBar, ListingCard } from "./feed";
import { FavoritesProvider } from "./favorites/favorites-context";

export interface MarketplaceFeedProps {
  initialItems: PublicFeedItem[];
  initialCursor: string | null;
  initialCategory?: string | null;
  initialArea?: string | null;
  initialType?: string | null;
}

export function MarketplaceFeed({
  initialItems,
  initialCursor,
  initialCategory = null,
  initialArea = null,
  initialType = null,
}: MarketplaceFeedProps) {
  const [items, setItems] = useState<PublicFeedItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [area, setArea] = useState<string | null>(initialArea);
  const [type, setType] = useState<string | null>(initialType);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchFeed = useCallback(
    async (
      targetCategory: string | null,
      targetArea: string | null,
      targetType: string | null,
      cursor: string | null,
      append = false,
    ) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (targetCategory) params.set("category", targetCategory);
      if (targetArea) params.set("pickupArea", targetArea);
      if (targetType && targetType !== "ALL")
        params.set("listingType", targetType);
      params.set("limit", "20");

      try {
        const res = await fetch(`/api/marketplace/feed?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Feed request failed with status ${res.status}`);
        }
        const json = await res.json();
        if (json.ok && json.data) {
          const newItems: PublicFeedItem[] = json.data.items;
          const newCursor: string | null = json.data.nextCursor;

          if (append) {
            setItems((prev) => {
              const existingIds = new Set(prev.map((i) => i.id));
              const deduplicated = newItems.filter(
                (i) => !existingIds.has(i.id),
              );
              return [...prev, ...deduplicated];
            });
          } else {
            setItems(newItems);
          }
          setNextCursor(newCursor);
          setError(null);
        }
      } catch (err) {
        console.error("[MarketplaceFeed: fetchFeed]", err);
        setError("Fehler beim Laden der Inserate. Bitte versuche es erneut.");
      }
    },
    [],
  );

  const handleCategoryChange = async (newCategory: string | null) => {
    setCategory(newCategory);
    setIsFiltering(true);
    await fetchFeed(newCategory, area, type, null, false);
    setIsFiltering(false);
  };

  const handleAreaChange = async (newArea: string | null) => {
    setArea(newArea);
    setIsFiltering(true);
    await fetchFeed(category, newArea, type, null, false);
    setIsFiltering(false);
  };

  const handleTypeChange = async (newType: string | null) => {
    setType(newType);
    setIsFiltering(true);
    await fetchFeed(category, area, newType, null, false);
    setIsFiltering(false);
  };

  const handleReset = async () => {
    setCategory(null);
    setArea(null);
    setType(null);
    setIsFiltering(true);
    await fetchFeed(null, null, null, null, false);
    setIsFiltering(false);
  };

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!nextCursor || isLoadingMore || isFiltering) {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      async (entries) => {
        const [first] = entries;
        if (first.isIntersecting && nextCursor && !isLoadingMore) {
          setIsLoadingMore(true);
          await fetchFeed(category, area, type, nextCursor, true);
          setIsLoadingMore(false);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [nextCursor, isLoadingMore, isFiltering, category, area, type, fetchFeed]);

  return (
    <FavoritesProvider>
      <div className="marketplace-feed-container" style={{ width: "100%" }}>
        {/* Filter Bar */}
        <FeedFilterBar
          selectedCategory={category}
          selectedArea={area}
          selectedType={type}
          onCategoryChange={handleCategoryChange}
          onAreaChange={handleAreaChange}
          onTypeChange={handleTypeChange}
          onReset={handleReset}
        />

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              background: "#fee2e2",
              border: "1px solid #f87171",
              color: "#991b1b",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {isFiltering ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "#64748b",
              fontSize: "0.95rem",
            }}
          >
            Inserate werden gefiltert...
          </div>
        ) : items.length === 0 ? (
          <EmptyFeedState onReset={handleReset} />
        ) : (
          <>
            <div
              className="marketplace-feed-grid"
              data-testid="marketplace-feed-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1.25rem",
                width: "100%",
              }}
            >
              {items.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            {nextCursor && (
              <div
                ref={sentinelRef}
                data-testid="feed-sentinel"
                style={{
                  textAlign: "center",
                  padding: "2rem 1rem",
                  color: "#64748b",
                  fontSize: "0.9rem",
                }}
              >
                {isLoadingMore ? "Weitere Inserate laden..." : ""}
              </div>
            )}

            {!nextCursor && items.length > 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                }}
              >
                Alle aktuellen Inserate für Braunschweig geladen.
              </div>
            )}
          </>
        )}
      </div>
    </FavoritesProvider>
  );
}
