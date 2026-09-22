import type {
  ItemCondition,
  ListingCategory,
  ListingType,
  PickupArea,
} from "./index.ts";
import {
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_TYPES,
  PICKUP_AREAS,
  SEARCH_SORT_OPTIONS,
  type SearchSortOption,
} from "./index.ts";

export interface DomainSearchFilters {
  query?: string;
  categories?: ListingCategory[];
  pickupAreas?: PickupArea[];
  listingTypes?: ListingType[];
  conditions?: ItemCondition[];
  minPriceCents?: number;
  maxPriceCents?: number;
  verifiedOnly?: boolean;
  sort?: SearchSortOption;
  cursor?: string;
  limit?: number;
}

export function sanitizeSearchQuery(raw: string | null | undefined): string {
  if (typeof raw !== "string") {
    return "";
  }

  return Array.from(raw.normalize("NFC"))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return !(code < 32 || (code >= 127 && code <= 159));
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function getDefaultSortOption(query?: string | null): SearchSortOption {
  if (query && query.trim().length > 0) {
    return "relevance";
  }
  return "newest";
}

export function resolveSortOption(
  explicitSort?: SearchSortOption | null,
  query?: string | null,
): SearchSortOption {
  if (explicitSort && SEARCH_SORT_OPTIONS.includes(explicitSort)) {
    return explicitSort;
  }
  return getDefaultSortOption(query);
}

export function toURLSearchParams(
  filters: DomainSearchFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query && filters.query.trim().length > 0) {
    params.set("q", filters.query.trim());
  }

  if (filters.categories && filters.categories.length > 0) {
    params.set("category", filters.categories.join(","));
  }

  if (filters.pickupAreas && filters.pickupAreas.length > 0) {
    params.set("area", filters.pickupAreas.join(","));
  }

  if (filters.listingTypes && filters.listingTypes.length > 0) {
    params.set("type", filters.listingTypes.join(","));
  }

  if (filters.conditions && filters.conditions.length > 0) {
    params.set("condition", filters.conditions.join(","));
  }

  if (
    filters.minPriceCents !== undefined &&
    filters.minPriceCents !== null &&
    Number.isInteger(filters.minPriceCents) &&
    filters.minPriceCents >= 0
  ) {
    params.set("minPrice", String(filters.minPriceCents));
  }

  if (
    filters.maxPriceCents !== undefined &&
    filters.maxPriceCents !== null &&
    Number.isInteger(filters.maxPriceCents) &&
    filters.maxPriceCents >= 0
  ) {
    params.set("maxPrice", String(filters.maxPriceCents));
  }

  if (filters.verifiedOnly === true) {
    params.set("verified", "true");
  }

  if (filters.sort && SEARCH_SORT_OPTIONS.includes(filters.sort)) {
    params.set("sort", filters.sort);
  }

  if (filters.cursor && filters.cursor.trim().length > 0) {
    params.set("cursor", filters.cursor.trim());
  }

  if (
    filters.limit !== undefined &&
    Number.isInteger(filters.limit) &&
    filters.limit !== 20 &&
    filters.limit >= 1 &&
    filters.limit <= 50
  ) {
    params.set("limit", String(filters.limit));
  }

  return params;
}

export function serializeSearchParams(filters: DomainSearchFilters): string {
  return toURLSearchParams(filters).toString();
}

export function deserializeSearchParams(
  input: string | URLSearchParams,
): DomainSearchFilters {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input;

  const result: DomainSearchFilters = {};

  const rawQuery = params.get("q") ?? params.get("query");
  const sanitizedQuery = sanitizeSearchQuery(rawQuery);
  if (sanitizedQuery.length > 0) {
    result.query = sanitizedQuery;
  }

  const rawCategory = params.get("category") ?? params.get("categories");
  if (rawCategory) {
    const validCats = rawCategory
      .split(",")
      .map((c) => c.trim())
      .filter((c): c is ListingCategory =>
        LISTING_CATEGORIES.includes(c as ListingCategory),
      );
    if (validCats.length > 0) {
      result.categories = Array.from(new Set(validCats));
    }
  }

  const rawArea =
    params.get("area") ?? params.get("pickupArea") ?? params.get("pickupAreas");
  if (rawArea) {
    const validAreas = rawArea
      .split(",")
      .map((a) => a.trim())
      .filter((a): a is PickupArea => PICKUP_AREAS.includes(a as PickupArea));
    if (validAreas.length > 0) {
      result.pickupAreas = Array.from(new Set(validAreas));
    }
  }

  const rawType =
    params.get("type") ??
    params.get("listingType") ??
    params.get("listingTypes");
  if (rawType) {
    const validTypes = rawType
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is ListingType =>
        LISTING_TYPES.includes(t as ListingType),
      );
    if (validTypes.length > 0) {
      result.listingTypes = Array.from(new Set(validTypes));
    }
  }

  const rawCondition = params.get("condition") ?? params.get("conditions");
  if (rawCondition) {
    const validConditions = rawCondition
      .split(",")
      .map((c) => c.trim())
      .filter((c): c is ItemCondition =>
        ITEM_CONDITIONS.includes(c as ItemCondition),
      );
    if (validConditions.length > 0) {
      result.conditions = Array.from(new Set(validConditions));
    }
  }

  const rawMinPrice = params.get("minPrice") ?? params.get("minPriceCents");
  if (rawMinPrice !== null) {
    const num = Number(rawMinPrice);
    if (Number.isFinite(num) && Number.isInteger(num) && num >= 0) {
      result.minPriceCents = num;
    }
  }

  const rawMaxPrice = params.get("maxPrice") ?? params.get("maxPriceCents");
  if (rawMaxPrice !== null) {
    const num = Number(rawMaxPrice);
    if (Number.isFinite(num) && Number.isInteger(num) && num >= 0) {
      result.maxPriceCents = num;
    }
  }

  if (
    result.minPriceCents !== undefined &&
    result.maxPriceCents !== undefined &&
    result.minPriceCents > result.maxPriceCents
  ) {
    delete result.minPriceCents;
    delete result.maxPriceCents;
  }

  const rawVerified = params.get("verified") ?? params.get("verifiedOnly");
  if (rawVerified === "true" || rawVerified === "1") {
    result.verifiedOnly = true;
  }

  const rawSort = params.get("sort");
  if (rawSort && SEARCH_SORT_OPTIONS.includes(rawSort as SearchSortOption)) {
    result.sort = rawSort as SearchSortOption;
  }

  const rawCursor = params.get("cursor");
  if (rawCursor && rawCursor.trim().length > 0) {
    result.cursor = rawCursor.trim();
  }

  const rawLimit = params.get("limit");
  if (rawLimit !== null) {
    const num = Number(rawLimit);
    if (
      Number.isFinite(num) &&
      Number.isInteger(num) &&
      num >= 1 &&
      num <= 50
    ) {
      result.limit = num;
    }
  }

  return result;
}

export function formatSearchSummary(
  total: number,
  query?: string,
  locale: "de" | "en" = "de",
): string {
  if (locale === "en") {
    const itemStr = total === 1 ? "1 listing found" : `${total} listings found`;
    return query ? `${itemStr} for "${query}"` : itemStr;
  }

  const itemStr =
    total === 1 ? "1 Inserat gefunden" : `${total} Inserate gefunden`;
  return query ? `${itemStr} für "${query}"` : itemStr;
}
