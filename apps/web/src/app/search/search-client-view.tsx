"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicFeedItem, SearchFilters } from "@campusmarkt/types";
import {
  deserializeSearchParams,
  toURLSearchParams,
  formatSearchSummary,
} from "@campusmarkt/domain";
import { SearchBar } from "../../components/marketplace/search/search-bar";
import {
  FilterBar,
  FilterDrawer,
} from "../../components/marketplace/search/filter-drawer";
import { ListingCard } from "../../components/marketplace/feed";

export interface SearchClientViewProps {
  initialItems: PublicFeedItem[];
  initialCursor: string | null;
  initialFilters: SearchFilters;
}

export function SearchClientView({
  initialItems = [],
  initialCursor = null,
  initialFilters = {},
}: SearchClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<PublicFeedItem[]>(initialItems);
  const [, setNextCursor] = useState<string | null>(initialCursor);
  const [filters, setFilters] = useState<SearchFilters>(() => {
    if (searchParams && searchParams.toString().length > 0) {
      return deserializeSearchParams(searchParams);
    }
    return initialFilters;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state from URL params if browser back/forward is used
  useEffect(() => {
    if (searchParams) {
      const fromUrl = deserializeSearchParams(searchParams);
      setFilters(fromUrl);
    }
  }, [searchParams]);

  const executeSearch = useCallback(
    async (activeFilters: SearchFilters) => {
      setIsLoading(true);
      const queryParams = toURLSearchParams(activeFilters);
      const queryString = queryParams.toString();

      // Synchronize browser URL without page reload
      const newPath = queryString ? `/search?${queryString}` : "/search";
      router.replace(newPath, { scroll: false });

      try {
        const res = await fetch(`/api/marketplace/search?${queryString}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) {
            setItems(json.data.items ?? []);
            setNextCursor(json.data.nextCursor ?? null);
          }
        }
      } catch (err) {
        console.error("[SearchClientView: executeSearch]", err);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleSearchTermChange = (searchTerm: string) => {
    const updated: SearchFilters = {
      ...filters,
      query: searchTerm || undefined,
      cursor: undefined,
    };
    if (!searchTerm) {
      delete updated.query;
    }
    setFilters(updated);
    executeSearch(updated);
  };

  const handleFiltersChange = (updatedFilters: SearchFilters) => {
    const next: SearchFilters = {
      ...updatedFilters,
      query: filters.query,
      cursor: undefined,
    };
    setFilters(next);
    executeSearch(next);
  };

  const handleResetAll = () => {
    const reset: SearchFilters = {
      sort: "relevance",
    };
    setFilters(reset);
    executeSearch(reset);
  };

  const activeFilterCount =
    (filters.categories?.length ?? 0) +
    (filters.pickupAreas?.length ?? 0) +
    (filters.listingTypes?.length ?? 0) +
    (filters.conditions?.length ?? 0) +
    (filters.minPriceCents !== undefined ? 1 : 0) +
    (filters.maxPriceCents !== undefined ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0);

  const summary = formatSearchSummary(items.length, filters.query, "de");

  return (
    <div
      className="search-container"
      data-testid="search-page-container"
      style={{
        width: "min(100%, 76rem)",
        marginInline: "auto",
        padding: "1.5rem 1rem 4rem",
      }}
    >
      {/* Search Header Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <SearchBar
          initialQuery={filters.query ?? ""}
          onSearch={handleSearchTermChange}
        />

        {/* Mobile Filter Open Button */}
        <button
          type="button"
          data-testid="filter-drawer-open"
          onClick={() => setIsDrawerOpen(true)}
          aria-label={`Filter öffnen (${activeFilterCount} aktiv)`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.55rem 0.9rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#374151",
            cursor: "pointer",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span
              data-testid="active-filter-count-badge"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: "9999px",
                padding: "0.1rem 0.4rem",
                lineHeight: 1,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetAll}
      />

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetAll}
      />

      {/* Search Results Summary */}
      <div
        data-testid="search-summary"
        style={{
          margin: "1.25rem 0 1rem",
          fontSize: "1rem",
          fontWeight: 600,
          color: "#374151",
        }}
      >
        {summary}
      </div>

      {/* Results or Empty State */}
      {isLoading ? (
        <div
          data-testid="search-loading"
          style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}
        >
          Laden...
        </div>
      ) : items.length > 0 ? (
        <div
          data-testid="search-results-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {items.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div
          data-testid="search-empty-state"
          role="status"
          aria-label="Keine Inserate gefunden"
          style={{
            padding: "3.5rem 1.5rem",
            textAlign: "center",
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
            border: "1px dashed #d1d5db",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 1rem",
              color: "#9ca3af",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#111827",
              marginBottom: "0.5rem",
            }}
          >
            Keine Inserate gefunden
          </h3>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
              maxWidth: "28rem",
              marginInline: "auto",
            }}
          >
            Versuche, die Suchbegriffe zu ändern oder Filter zurückzusetzen.
          </p>
          <button
            type="button"
            data-testid="empty-reset-filters"
            onClick={handleResetAll}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Alle Filter zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}
