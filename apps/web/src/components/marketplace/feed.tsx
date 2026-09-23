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

export { MarketplaceFeed } from "./marketplace-feed";
export type { MarketplaceFeedProps } from "./marketplace-feed";

export interface TrustBadgeProps {
  badge: NonNullable<PublicListingSeller["universityBadge"]>;
}

export function TrustBadge({ badge }: TrustBadgeProps) {
  return (
    <span
      className="trust-badge"
      title={`${badge.badgeLabel} verifiziert`}
      aria-label={`${badge.badgeLabel} verifiziert`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#1e3a8a",
        background: "#dbeafe",
        padding: "0.15rem 0.5rem",
        borderRadius: "9999px",
        border: "1px solid #93c5fd",
        lineHeight: 1.2,
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      <span>{badge.badgeLabel}</span>
    </span>
  );
}

export interface ListingCardProps {
  item: PublicFeedItem;
  locale?: SupportedLocale;
}

export function ListingCard({ item, locale = "de" }: ListingCardProps) {
  const isWantedWithoutImage =
    item.listingType === "WANTED" && !item.coverImage;
  const isGiveaway = item.listingType === "GIVE_AWAY";
  const isReserved = item.status === "reserved";

  return (
    <article
      className="listing-card"
      data-testid={`listing-card-${item.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        borderRadius: "0.75rem",
        overflow: "hidden",
        boxShadow:
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        border: "1px solid #e2e8f0",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        height: "100%",
        position: "relative",
      }}
    >
      <a
        href={`/listings/${item.id}`}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
        }}
      >
        {/* Cover image or accessible placeholder */}
        <div
          className="listing-card-media-wrapper"
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            backgroundColor: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              className="listing-image-placeholder"
              role="img"
              aria-label={
                isWantedWithoutImage
                  ? "Gesuch ohne Foto"
                  : "Kein Bild vorhanden"
              }
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                color: "#64748b",
                padding: "1rem",
                textAlign: "center",
              }}
            >
              {isWantedWithoutImage ? (
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              ) : (
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
              <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                {isWantedWithoutImage
                  ? locale === "en"
                    ? "Wanted (No photo)"
                    : "Gesuch (Kein Foto)"
                  : locale === "en"
                    ? "No image"
                    : "Kein Bild"}
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          <div
            style={{
              position: "absolute",
              top: "0.5rem",
              left: "0.5rem",
              right: "0.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Listing Type Tag */}
              <span
                className={`listing-type-tag type-${item.listingType.toLowerCase()}`}
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
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {getListingTypeLabel(item.listingType, locale)}
              </span>

              {/* Reserved Tag */}
              {isReserved && (
                <span
                  className="reserved-badge"
                  role="status"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius: "0.375rem",
                    background: "#b45309",
                    color: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    textTransform: "uppercase",
                  }}
                >
                  {locale === "en" ? "Reserved" : "Reserviert"}
                </span>
              )}
            </div>

            {/* Favorite Button */}
            <FavoriteButton listingId={item.id} size="sm" />
          </div>
        </div>

        {/* Content details */}
        <div
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            flexGrow: 1,
          }}
        >
          {/* Price & Timestamp */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "0.5rem",
            }}
          >
            <span
              className="listing-card-price"
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: isGiveaway ? "#15803d" : "#0f172a",
              }}
            >
              {formatListingPrice(item.listingType, item.priceCents, locale)}
            </span>
            <time
              dateTime={item.createdAt}
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                whiteSpace: "nowrap",
              }}
            >
              {formatRelativeTime(item.createdAt, undefined, locale)}
            </time>
          </div>

          {/* Title */}
          <h3
            className="listing-card-title"
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 600,
              lineHeight: 1.4,
              color: "#1e293b",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.8em",
            }}
          >
            {item.title}
          </h3>

          {/* Area & Category */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              color: "#475569",
              marginTop: "auto",
              paddingTop: "0.25rem",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {getPickupAreaLabel(item.pickupArea, locale)}
            </span>
            <span>•</span>
            <span>{getCategoryLabel(item.category, locale)}</span>
          </div>

          {/* Seller Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid #f1f5f9",
              marginTop: "0.25rem",
            }}
          >
            <span
              className="listing-card-seller-name"
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "60%",
              }}
            >
              {item.seller.displayName}
            </span>
            {item.seller.universityBadge && (
              <TrustBadge badge={item.seller.universityBadge} />
            )}
          </div>
        </div>
      </a>
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
      aria-label="Marktplatz Filter"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        marginBottom: "1.5rem",
        padding: "1rem",
        background: "#ffffff",
        borderRadius: "0.75rem",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Type Filter Buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#334155",
            marginRight: "0.25rem",
          }}
        >
          {locale === "en" ? "Type:" : "Art:"}
        </span>
        <button
          type="button"
          onClick={() => onTypeChange?.(null)}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid",
            borderColor:
              !selectedType || selectedType === "ALL" ? "#0f172a" : "#cbd5e1",
            background:
              !selectedType || selectedType === "ALL" ? "#0f172a" : "#ffffff",
            color:
              !selectedType || selectedType === "ALL" ? "#ffffff" : "#334155",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {locale === "en" ? "All" : "Alle"}
        </button>
        {LISTING_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange?.(selectedType === type ? null : type)}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid",
              borderColor: selectedType === type ? "#0f172a" : "#cbd5e1",
              background: selectedType === type ? "#0f172a" : "#ffffff",
              color: selectedType === type ? "#ffffff" : "#334155",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {getListingTypeLabel(type, locale)}
          </button>
        ))}
      </div>

      {/* Category and Pickup Area Dropdowns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <div>
          <label
            htmlFor="filter-category-select"
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "0.25rem",
            }}
          >
            {locale === "en" ? "Category" : "Kategorie"}
          </label>
          <select
            id="filter-category-select"
            value={selectedCategory ?? ""}
            onChange={(e) =>
              onCategoryChange?.(e.target.value ? e.target.value : null)
            }
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.85rem",
              color: "#1e293b",
            }}
          >
            <option value="">
              {locale === "en" ? "All categories" : "Alle Kategorien"}
            </option>
            {LISTING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat, locale)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-area-select"
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#475569",
              marginBottom: "0.25rem",
            }}
          >
            {locale === "en" ? "Pickup Area" : "Stadtteil / Übergabeort"}
          </label>
          <select
            id="filter-area-select"
            value={selectedArea ?? ""}
            onChange={(e) =>
              onAreaChange?.(e.target.value ? e.target.value : null)
            }
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.85rem",
              color: "#1e293b",
            }}
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
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div
            style={{ display: "flex", alignItems: "flex-end", height: "100%" }}
          >
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {locale === "en" ? "Reset filters" : "Filter zurücksetzen"}
            </button>
          </div>
        )}
      </div>
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
      aria-label="Keine Inserate"
      style={{
        textAlign: "center",
        padding: "3rem 1.5rem",
        backgroundColor: "#ffffff",
        borderRadius: "0.75rem",
        border: "1px solid #e2e8f0",
        margin: "1.5rem 0",
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
        aria-hidden="true"
        style={{ margin: "0 auto 1rem" }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <h3
        style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "#1e293b" }}
      >
        {locale === "en" ? "No listings found" : "Keine Inserate gefunden"}
      </h3>
      <p
        style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.9rem" }}
      >
        {locale === "en"
          ? "Try adjusting or clearing your filters to discover items in Braunschweig."
          : "Versuche, die Filter anzupassen oder zurückzusetzen, um Inserate zu finden."}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            background: "#0f172a",
            color: "#ffffff",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {locale === "en" ? "Clear all filters" : "Filter zurücksetzen"}
        </button>
      )}
    </div>
  );
}
