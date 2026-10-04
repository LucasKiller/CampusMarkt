import React from "react";
import type { PublicFeedItem, PublicListingSeller } from "@campusmarkt/types";
import {
  LISTING_CATEGORIES,
  LISTING_TYPES,
  PICKUP_AREAS,
  formatListingPrice,
  formatRelativeTime,
  getCategoryLabel,
  getPickupAreaLabel,
  getListingTypeLabel,
  type SupportedLocale,
} from "@campusmarkt/domain";
import { FavoriteButton } from "./favorites/favorite-button";
import { listingMediaUrl } from "../../modules/listings/media-url";

export { MarketplaceFeed } from "./marketplace-feed";
export type { MarketplaceFeedProps } from "./marketplace-feed";

export interface TrustBadgeProps {
  badge: NonNullable<PublicListingSeller["universityBadge"]>;
  locale?: SupportedLocale;
}

export function TrustBadge({ badge, locale = "de" }: TrustBadgeProps) {
  const label = `${badge.badgeLabel} ${locale === "en" ? "verified" : "verifiziert"}`;
  return (
    <span className="trust-badge" title={label} aria-label={label}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      {badge.badgeLabel}
    </span>
  );
}

export interface ListingCardProps {
  item: PublicFeedItem;
  locale?: SupportedLocale;
}

export function ListingCard({ item, locale = "de" }: ListingCardProps) {
  const noPhotoLabel =
    item.listingType === "WANTED"
      ? locale === "en"
        ? "Wanted (No photo)"
        : "Gesuch ohne Foto"
      : locale === "en"
        ? "No image"
        : "Kein Bild";

  return (
    <article className="listing-card" data-testid={`listing-card-${item.id}`}>
      <a href={`/listings/${item.id}`}>
        <div className="listing-card-media-wrapper">
          {item.coverImage ? (
            <img
              src={listingMediaUrl(item.coverImage)}
              alt={item.title}
              loading="lazy"
            />
          ) : (
            <div
              className="listing-image-placeholder"
              role="img"
              aria-label={noPhotoLabel}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m4 18 5-5 3 3 3-4 5 6" />
              </svg>
              <span>{noPhotoLabel}</span>
            </div>
          )}
        </div>
        <div className="listing-card-body">
          <h3 className="listing-card-title">{item.title}</h3>
          <span className="listing-card-price">
            {formatListingPrice(item.listingType, item.priceCents, locale)}
          </span>
          <span className="listing-card-meta">
            {getPickupAreaLabel(item.pickupArea, locale)} ·{" "}
            {getCategoryLabel(item.category, locale)}
          </span>
          <time className="listing-card-meta" dateTime={item.createdAt}>
            {formatRelativeTime(item.createdAt, undefined, locale)}
          </time>
          <div className="listing-card-seller">
            <span className="listing-card-seller-name">
              {item.seller.displayName}
            </span>
            {item.seller.universityBadge && (
              <TrustBadge badge={item.seller.universityBadge} locale={locale} />
            )}
          </div>
        </div>
      </a>
      <div className="listing-card-overlay">
        <div className="listing-card-tags">
          <span
            className={`listing-type-tag type-${item.listingType.toLowerCase()}`}
          >
            {getListingTypeLabel(item.listingType, locale)}
          </span>
          {item.status === "reserved" && (
            <span className="reserved-badge" role="status">
              {locale === "en" ? "Reserved" : "Reserviert"}
            </span>
          )}
        </div>
        <FavoriteButton listingId={item.id} size="sm" />
      </div>
    </article>
  );
}

export interface FeedFilterBarProps {
  selectedCategory?: string | null;
  selectedArea?: string | null;
  selectedType?: string | null;
  onCategoryChange?: (category: string | null) => void;
  onAreaChange?: (area: string | null) => void;
  onTypeChange?: (type: string | null) => void;
  onReset?: () => void;
  locale?: SupportedLocale;
}

export function FeedFilterBar({
  selectedCategory,
  selectedArea,
  selectedType,
  onCategoryChange,
  onAreaChange,
  onTypeChange,
  onReset,
  locale = "de",
}: FeedFilterBarProps) {
  const hasActiveFilters = Boolean(
    selectedCategory ||
    selectedArea ||
    (selectedType && selectedType !== "ALL"),
  );
  return (
    <section
      className="feed-filter-bar"
      aria-label={locale === "en" ? "Marketplace filters" : "Marktplatz Filter"}
    >
      <div
        className="feed-type-options"
        aria-label={locale === "en" ? "Listing type" : "Inseratstyp"}
      >
        <button
          type="button"
          aria-pressed={!selectedType || selectedType === "ALL"}
          onClick={() => onTypeChange?.(null)}
        >
          {locale === "en" ? "All" : "Alle"}
        </button>
        {LISTING_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={selectedType === type}
            onClick={() => onTypeChange?.(selectedType === type ? null : type)}
          >
            {getListingTypeLabel(type, locale)}
          </button>
        ))}
      </div>
      <label htmlFor="filter-category-select">
        {locale === "en" ? "Category" : "Kategorie"}
        <select
          id="filter-category-select"
          value={selectedCategory ?? ""}
          onChange={(event) => onCategoryChange?.(event.target.value || null)}
        >
          <option value="">
            {locale === "en" ? "All categories" : "Alle Kategorien"}
          </option>
          {LISTING_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {getCategoryLabel(category, locale)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="filter-area-select">
        {locale === "en" ? "Pickup area" : "Stadtteil / Übergabeort"}
        <select
          id="filter-area-select"
          value={selectedArea ?? ""}
          onChange={(event) => onAreaChange?.(event.target.value || null)}
        >
          <option value="">
            {locale === "en" ? "All areas" : "Alle Stadtteile"}
          </option>
          {PICKUP_AREAS.map((area) => (
            <option key={area} value={area}>
              {getPickupAreaLabel(area, locale)}
            </option>
          ))}
        </select>
      </label>
      {hasActiveFilters && (
        <button className="filter-reset" type="button" onClick={onReset}>
          {locale === "en" ? "Reset filters" : "Filter zurücksetzen"}
        </button>
      )}
    </section>
  );
}

export function EmptyFeedState({
  onReset,
  locale = "de",
}: {
  onReset?: () => void;
  locale?: SupportedLocale;
}) {
  return (
    <div
      className="empty-feed-state"
      role="region"
      aria-label={locale === "en" ? "No listings" : "Keine Inserate"}
    >
      <h3>
        {locale === "en" ? "No listings found" : "Keine Inserate gefunden"}
      </h3>
      <p>
        {locale === "en"
          ? "Try another category or clear your filters to see what is nearby."
          : "Versuche eine andere Kategorie oder setze die Filter zurück."}
      </p>
      {onReset && (
        <button type="button" onClick={onReset}>
          {locale === "en" ? "Clear all filters" : "Filter zurücksetzen"}
        </button>
      )}
    </div>
  );
}
