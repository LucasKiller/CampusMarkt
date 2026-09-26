"use client";

import React, { useState, useEffect } from "react";
import type { ItemCondition, SupportedLocale } from "@campusmarkt/domain";
import {
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_TYPES,
  PICKUP_AREAS,
  SEARCH_SORT_OPTIONS,
  type SearchSortOption,
  getCategoryLabel,
  getPickupAreaLabel,
  getListingTypeLabel,
} from "@campusmarkt/domain";
import type { SearchFilters } from "@campusmarkt/types";
import { LanguageSwitcher } from "../../../modules/localization/index";

export interface FilterProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset?: () => void;
  className?: string;
  locale?: SupportedLocale;
}

const SORT_LABELS: Record<SearchSortOption, string> = {
  relevance: "Beste Treffer (Relevanz)",
  newest: "Neueste zuerst",
  price_asc: "Preis: Niedrigster zuerst",
  price_desc: "Preis: Höchster zuerst",
};

const EN_SORT_LABELS: Record<SearchSortOption, string> = {
  relevance: "Best match",
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: "Neu",
  LIKE_NEW: "Wie neu",
  GOOD: "Gut",
  FAIR: "Akzeptabel",
};

const EN_CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
};

export function FilterBar({
  filters,
  onFiltersChange,
  onReset,
  className = "",
  locale = "de",
}: FilterProps) {
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      sort: e.target.value as SearchSortOption,
      cursor: undefined,
    });
  };

  const handleVerifiedToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      verifiedOnly: e.target.checked || undefined,
      cursor: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    (filters.categories && filters.categories.length > 0) ||
    (filters.pickupAreas && filters.pickupAreas.length > 0) ||
    (filters.listingTypes && filters.listingTypes.length > 0) ||
    (filters.conditions && filters.conditions.length > 0) ||
    filters.minPriceCents !== undefined ||
    filters.maxPriceCents !== undefined ||
    filters.verifiedOnly,
  );

  return (
    <div
      className={`filter-bar ${className}`}
      data-testid="filter-bar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem 0",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label
            htmlFor="filter-sort-select"
            style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: 500 }}
          >
            {locale === "en" ? "Sort by:" : "Sortierung:"}
          </label>
          <select
            id="filter-sort-select"
            data-testid="sort-select"
            value={filters.sort ?? "relevance"}
            onChange={handleSortChange}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              fontSize: "0.875rem",
              color: "#111827",
            }}
          >
            {SEARCH_SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {locale === "en" ? EN_SORT_LABELS[opt] : SORT_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.875rem",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            data-testid="verified-toggle"
            checked={Boolean(filters.verifiedOnly)}
            onChange={handleVerifiedToggle}
            style={{ borderRadius: "0.25rem" }}
          />
          <span>
            {locale === "en"
              ? "TU Braunschweig verified only"
              : "Nur TU Braunschweig verifiziert"}
          </span>
        </label>
      </div>

      {hasActiveFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          data-testid="clear-all-filters"
          style={{
            background: "none",
            border: "none",
            color: "#dc2626",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.25rem",
          }}
        >
          {locale === "en" ? "Clear all filters" : "Alle Filter zurücksetzen"}
        </button>
      )}
    </div>
  );
}

export interface FilterDrawerProps extends FilterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterDrawer({
  filters,
  onFiltersChange,
  onReset,
  isOpen,
  onClose,
  className = "",
  locale = "de",
}: FilterDrawerProps) {
  // Local state staging changes until applied
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onFiltersChange({
      ...localFilters,
      cursor: undefined,
    });
    onClose();
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: filters.query,
      sort: filters.sort,
      limit: filters.limit,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
    onClose();
  };

  const toggleArrayItem = <T extends string>(
    list: T[] | undefined,
    item: T,
  ): T[] => {
    const current = list ? [...list] : [];
    const index = current.indexOf(item);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(item);
    }
    return current;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={locale === "en" ? "Filter settings" : "Filtereinstellungen"}
      data-testid="filter-drawer"
      className={`filter-drawer-overlay ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        className="filter-drawer-content"
        style={{
          width: "100%",
          maxWidth: "380px",
          height: "100%",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.15)",
          overflowY: "auto",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {locale === "en" ? "Filters" : "Filter"}
          </h2>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <LanguageSwitcher />
            <button
              type="button"
              onClick={onClose}
              data-testid="filter-drawer-close"
              aria-label={locale === "en" ? "Close" : "Schließen"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: "#6b7280",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer Body with Filter Sections */}
        <div
          style={{
            flex: 1,
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            overflowY: "auto",
          }}
        >
          {/* Categories */}
          <div>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              {locale === "en" ? "Category" : "Kategorie"}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              {LISTING_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(localFilters.categories?.includes(cat))}
                    onChange={() => {
                      const updated = toggleArrayItem(
                        localFilters.categories,
                        cat,
                      );
                      setLocalFilters({
                        ...localFilters,
                        categories: updated.length > 0 ? updated : undefined,
                      });
                    }}
                  />
                  <span>{getCategoryLabel(cat, locale)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pickup Areas */}
          <div>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              {locale === "en" ? "Pickup area" : "Abholgebiet"}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              {PICKUP_AREAS.map((area) => (
                <label
                  key={area}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(localFilters.pickupAreas?.includes(area))}
                    onChange={() => {
                      const updated = toggleArrayItem(
                        localFilters.pickupAreas,
                        area,
                      );
                      setLocalFilters({
                        ...localFilters,
                        pickupAreas: updated.length > 0 ? updated : undefined,
                      });
                    }}
                  />
                  <span>{getPickupAreaLabel(area, locale)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              {locale === "en" ? "Price (€)" : "Preis (€)"}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Min €"
                data-testid="price-min-input"
                aria-label={
                  locale === "en"
                    ? "Minimum price in euros"
                    : "Mindestpreis in Euro"
                }
                value={
                  localFilters.minPriceCents !== undefined
                    ? Math.round(localFilters.minPriceCents / 100)
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalFilters({
                    ...localFilters,
                    minPriceCents: val
                      ? Math.round(Number(val) * 100)
                      : undefined,
                  });
                }}
                style={{
                  width: "50%",
                  padding: "0.375rem 0.5rem",
                  fontSize: "0.875rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                }}
              />
              <span style={{ color: "#6b7280" }}>–</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Max €"
                data-testid="price-max-input"
                aria-label={
                  locale === "en"
                    ? "Maximum price in euros"
                    : "Maximalpreis in Euro"
                }
                value={
                  localFilters.maxPriceCents !== undefined
                    ? Math.round(localFilters.maxPriceCents / 100)
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalFilters({
                    ...localFilters,
                    maxPriceCents: val
                      ? Math.round(Number(val) * 100)
                      : undefined,
                  });
                }}
                style={{
                  width: "50%",
                  padding: "0.375rem 0.5rem",
                  fontSize: "0.875rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                }}
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              {locale === "en" ? "Condition" : "Zustand"}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              {ITEM_CONDITIONS.map((cond) => (
                <label
                  key={cond}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(localFilters.conditions?.includes(cond))}
                    onChange={() => {
                      const updated = toggleArrayItem(
                        localFilters.conditions,
                        cond,
                      );
                      setLocalFilters({
                        ...localFilters,
                        conditions: updated.length > 0 ? updated : undefined,
                      });
                    }}
                  />
                  <span>
                    {locale === "en"
                      ? EN_CONDITION_LABELS[cond]
                      : CONDITION_LABELS[cond]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Listing Types */}
          <div>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              {locale === "en" ? "Listing type" : "Inserat-Typ"}
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              {LISTING_TYPES.map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(localFilters.listingTypes?.includes(type))}
                    onChange={() => {
                      const updated = toggleArrayItem(
                        localFilters.listingTypes,
                        type,
                      );
                      setLocalFilters({
                        ...localFilters,
                        listingTypes: updated.length > 0 ? updated : undefined,
                      });
                    }}
                  />
                  <span>{getListingTypeLabel(type, locale)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Verified Seller Toggle */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                color: "#111827",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                data-testid="filter-drawer-verified"
                checked={Boolean(localFilters.verifiedOnly)}
                onChange={(e) => {
                  setLocalFilters({
                    ...localFilters,
                    verifiedOnly: e.target.checked || undefined,
                  });
                }}
              />
              <span>
                {locale === "en"
                  ? "TU Braunschweig verified only"
                  : "Nur TU Braunschweig verifiziert"}
              </span>
            </label>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            data-testid="filter-drawer-reset"
            style={{
              flex: 1,
              padding: "0.625rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              backgroundColor: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {locale === "en" ? "Reset" : "Zurücksetzen"}
          </button>
          <button
            type="button"
            onClick={handleApply}
            data-testid="filter-drawer-apply"
            style={{
              flex: 1,
              padding: "0.625rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#ffffff",
              backgroundColor: "#2563eb",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {locale === "en" ? "Apply" : "Anwenden"}
          </button>
        </div>
      </div>
    </div>
  );
}
