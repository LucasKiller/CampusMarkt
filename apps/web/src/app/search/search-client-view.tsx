"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicFeedItem, SearchFilters } from "@campusmarkt/types";
import {
  deserializeSearchParams,
  toURLSearchParams,
  formatSearchSummary,
  type SupportedLocale,
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
  locale?: SupportedLocale;
  initialError?: boolean;
}

export function SearchClientView({
  initialItems = [],
  initialCursor = null,
  initialFilters = {},
  locale = "de",
  initialError = false,
}: SearchClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PublicFeedItem[]>(initialItems);
  const [, setNextCursor] = useState<string | null>(initialCursor);
  const [filters, setFilters] = useState<SearchFilters>(() =>
    searchParams?.toString()
      ? deserializeSearchParams(searchParams)
      : initialFilters,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (searchParams) setFilters(deserializeSearchParams(searchParams));
  }, [searchParams]);

  const executeSearch = useCallback(
    async (activeFilters: SearchFilters) => {
      setIsLoading(true);
      setError(false);
      const queryString = toURLSearchParams(activeFilters).toString();
      router.replace(queryString ? `/search?${queryString}` : "/search", {
        scroll: false,
      });
      try {
        const response = await fetch(`/api/marketplace/search?${queryString}`);
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        const json = await response.json();
        if (!json.ok || !json.data) throw new Error("Invalid search response");
        setItems(json.data.items ?? []);
        setNextCursor(json.data.nextCursor ?? null);
      } catch (cause) {
        console.error("[SearchClientView: executeSearch]", cause);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleSearchTermChange = (query: string) => {
    const updated = {
      ...filters,
      query: query || undefined,
      cursor: undefined,
    };
    setFilters(updated);
    void executeSearch(updated);
  };

  const handleFiltersChange = (updatedFilters: SearchFilters) => {
    const next = { ...updatedFilters, query: filters.query, cursor: undefined };
    setFilters(next);
    void executeSearch(next);
  };

  const handleResetAll = () => {
    const reset: SearchFilters = { sort: "relevance" };
    setFilters(reset);
    void executeSearch(reset);
  };

  const activeFilterCount =
    (filters.categories?.length ?? 0) +
    (filters.pickupAreas?.length ?? 0) +
    (filters.listingTypes?.length ?? 0) +
    (filters.conditions?.length ?? 0) +
    (filters.minPriceCents !== undefined ? 1 : 0) +
    (filters.maxPriceCents !== undefined ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0);

  return (
    <div className="search-container" data-testid="search-page-container">
      <div className="search-intro">
        <p>
          {locale === "en" ? "DISCOVER NEAR YOU" : "IN DEINER NÄHE ENTDECKEN"}
        </p>
        <h1>
          {locale === "en"
            ? "Find your next good find."
            : "Entdecke deinen nächsten Fund."}
        </h1>
        <span>
          {locale === "en"
            ? "Useful things, local people, easy pickup."
            : "Nützliche Dinge, Menschen aus der Nähe, einfache Übergabe."}
        </span>
      </div>
      <div className="search-toolbar">
        <SearchBar
          initialQuery={filters.query ?? ""}
          onSearch={handleSearchTermChange}
          locale={locale}
          placeholder={
            locale === "en"
              ? "Search furniture, books, bikes..."
              : "Möbel, Bücher, Fahrräder suchen..."
          }
        />
        <button
          type="button"
          data-testid="filter-drawer-open"
          className="search-filter-trigger"
          onClick={() => setIsDrawerOpen(true)}
          aria-label={`${locale === "en" ? "Open filters" : "Filter öffnen"} (${activeFilterCount})`}
        >
          {locale === "en" ? "Filters" : "Filter"}
          {activeFilterCount > 0 && (
            <span data-testid="active-filter-count-badge">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetAll}
        locale={locale}
      />
      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetAll}
        locale={locale}
      />
      <div className="search-summary" data-testid="search-summary">
        {formatSearchSummary(items.length, filters.query, locale)}
      </div>
      {isLoading ? (
        <div
          className="search-feedback"
          data-testid="search-loading"
          role="status"
        >
          {locale === "en"
            ? "Searching listings..."
            : "Inserate werden gesucht..."}
        </div>
      ) : error ? (
        <div className="marketplace-error" role="alert">
          <span>
            {locale === "en"
              ? "Could not load listings. Please try again."
              : "Fehler beim Laden der Inserate. Bitte versuche es erneut."}
          </span>
          <button
            className="marketplace-retry"
            type="button"
            onClick={() => void executeSearch(filters)}
          >
            {locale === "en" ? "Retry" : "Erneut versuchen"}
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="search-results-grid" data-testid="search-results-grid">
          {items.map((item) => (
            <ListingCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      ) : (
        <div
          className="empty-feed-state"
          data-testid="search-empty-state"
          role="status"
        >
          <h3>
            {locale === "en" ? "No listings found" : "Keine Inserate gefunden"}
          </h3>
          <p>
            {locale === "en"
              ? "Try a different search or clear the filters."
              : "Versuche einen anderen Suchbegriff oder setze die Filter zurück."}
          </p>
          <button
            type="button"
            data-testid="empty-reset-filters"
            onClick={handleResetAll}
          >
            {locale === "en" ? "Clear all filters" : "Alle Filter zurücksetzen"}
          </button>
        </div>
      )}
    </div>
  );
}
