"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { reconcileOptimisticFavorite } from "@campusmarkt/domain";

export interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isLoaded: boolean;
  isFavorited: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  children,
  initialFavoriteIds = [],
}: {
  children: React.ReactNode;
  initialFavoriteIds?: string[];
}) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialFavoriteIds.map((id) => id.toLowerCase())),
  );
  const [isLoaded, setIsLoaded] = useState(initialFavoriteIds.length > 0);

  // Hydrate from GET /api/marketplace/favorites/ids
  useEffect(() => {
    let isCancelled = false;

    async function hydrate() {
      try {
        const res = await fetch("/api/marketplace/favorites/ids");
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && json.ok && Array.isArray(json.data?.ids)) {
            setFavoriteIds(
              new Set(
                json.data.ids.map((id: string) => id.trim().toLowerCase()),
              ),
            );
          }
        }
      } catch {
        // Network or guest error; neutral placeholder remains
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
        }
      }
    }

    hydrate();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Synchronize across browser tabs using BroadcastChannel
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      return;
    }

    const channel = new BroadcastChannel("cm_favorites");
    channel.onmessage = (event) => {
      if (event.data?.type === "TOGGLE" && event.data?.listingId) {
        const { listingId, isFavorited } = event.data;
        setFavoriteIds((prev) =>
          reconcileOptimisticFavorite(prev, listingId, isFavorited),
        );
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const isFavorited = useCallback(
    (listingId: string) => {
      if (!listingId) return false;
      return favoriteIds.has(listingId.trim().toLowerCase());
    },
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (listingId: string): Promise<boolean> => {
      if (!listingId) return false;
      const normalizedId = listingId.trim().toLowerCase();
      const currentlyFavorited = favoriteIds.has(normalizedId);
      const nextState = !currentlyFavorited;

      // 1. Optimistic update
      setFavoriteIds((prev) =>
        reconcileOptimisticFavorite(prev, normalizedId, nextState),
      );

      // 2. Broadcast optimistic state to other tabs
      if (
        typeof window !== "undefined" &&
        typeof BroadcastChannel !== "undefined"
      ) {
        try {
          const channel = new BroadcastChannel("cm_favorites");
          channel.postMessage({
            type: "TOGGLE",
            listingId: normalizedId,
            isFavorited: nextState,
          });
          channel.close();
        } catch {
          // ignore broadcast errors
        }
      }

      // 3. Persist mutation to API
      try {
        const res = await fetch(
          `/api/marketplace/favorites/${encodeURIComponent(normalizedId)}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
          },
        );

        if (res.status === 401 || res.status === 403) {
          // Revert optimistic update and redirect guest
          setFavoriteIds((prev) =>
            reconcileOptimisticFavorite(prev, normalizedId, currentlyFavorited),
          );
          const next =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/";
          window.location.href = `/login?next=${encodeURIComponent(next)}`;
          return currentlyFavorited;
        }

        if (!res.ok) {
          // Revert optimistic update on server error
          setFavoriteIds((prev) =>
            reconcileOptimisticFavorite(prev, normalizedId, currentlyFavorited),
          );
          return currentlyFavorited;
        }

        const json = await res.json();
        if (
          json.ok &&
          json.data &&
          typeof json.data.isFavorited === "boolean"
        ) {
          const serverFavorited = json.data.isFavorited;
          setFavoriteIds((prev) =>
            reconcileOptimisticFavorite(prev, normalizedId, serverFavorited),
          );
          return serverFavorited;
        } else {
          setFavoriteIds((prev) =>
            reconcileOptimisticFavorite(prev, normalizedId, currentlyFavorited),
          );
          return currentlyFavorited;
        }
      } catch {
        // Revert on network exception
        setFavoriteIds((prev) =>
          reconcileOptimisticFavorite(prev, normalizedId, currentlyFavorited),
        );
        return currentlyFavorited;
      }
    },
    [favoriteIds],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isLoaded,
        isFavorited,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
