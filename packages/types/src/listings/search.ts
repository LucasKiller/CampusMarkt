import type {
  ItemCondition,
  ListingCategory,
  ListingType,
  PickupArea,
} from "@campusmarkt/domain";
import {
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_TYPES,
  PICKUP_AREAS,
} from "@campusmarkt/domain";
import type { PublicFeedItem } from "./feed.ts";
import { isPublicFeedItem } from "./feed.ts";

export const SEARCH_SORT_OPTIONS = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
] as const;

export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number];

export function isSearchSortOption(value: unknown): value is SearchSortOption {
  return (
    typeof value === "string" &&
    SEARCH_SORT_OPTIONS.includes(value as SearchSortOption)
  );
}

export interface SearchFilters {
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

export interface SearchResultsResponse {
  items: PublicFeedItem[];
  totalEstimate?: number;
  nextCursor: string | null;
  appliedFilters: SearchFilters;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ALLOWED_FILTER_KEYS = new Set([
  "query",
  "categories",
  "pickupAreas",
  "listingTypes",
  "conditions",
  "minPriceCents",
  "maxPriceCents",
  "verifiedOnly",
  "sort",
  "cursor",
  "limit",
]);

export function isSearchFilters(value: unknown): value is SearchFilters {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (!keys.every((key) => ALLOWED_FILTER_KEYS.has(key))) {
    return false;
  }

  if (value.query !== undefined && typeof value.query !== "string") {
    return false;
  }

  if (
    value.categories !== undefined &&
    (!Array.isArray(value.categories) ||
      !value.categories.every(
        (c) =>
          typeof c === "string" &&
          LISTING_CATEGORIES.includes(c as ListingCategory),
      ))
  ) {
    return false;
  }

  if (
    value.pickupAreas !== undefined &&
    (!Array.isArray(value.pickupAreas) ||
      !value.pickupAreas.every(
        (a) => typeof a === "string" && PICKUP_AREAS.includes(a as PickupArea),
      ))
  ) {
    return false;
  }

  if (
    value.listingTypes !== undefined &&
    (!Array.isArray(value.listingTypes) ||
      !value.listingTypes.every(
        (t) =>
          typeof t === "string" && LISTING_TYPES.includes(t as ListingType),
      ))
  ) {
    return false;
  }

  if (
    value.conditions !== undefined &&
    (!Array.isArray(value.conditions) ||
      !value.conditions.every(
        (c) =>
          typeof c === "string" && ITEM_CONDITIONS.includes(c as ItemCondition),
      ))
  ) {
    return false;
  }

  if (
    value.minPriceCents !== undefined &&
    (typeof value.minPriceCents !== "number" ||
      !Number.isInteger(value.minPriceCents) ||
      value.minPriceCents < 0)
  ) {
    return false;
  }

  if (
    value.maxPriceCents !== undefined &&
    (typeof value.maxPriceCents !== "number" ||
      !Number.isInteger(value.maxPriceCents) ||
      value.maxPriceCents < 0)
  ) {
    return false;
  }

  if (
    value.verifiedOnly !== undefined &&
    typeof value.verifiedOnly !== "boolean"
  ) {
    return false;
  }

  if (value.sort !== undefined && !isSearchSortOption(value.sort)) {
    return false;
  }

  if (value.cursor !== undefined && typeof value.cursor !== "string") {
    return false;
  }

  if (
    value.limit !== undefined &&
    (typeof value.limit !== "number" ||
      !Number.isInteger(value.limit) ||
      value.limit < 1 ||
      value.limit > 50)
  ) {
    return false;
  }

  return true;
}

export function isSearchResultsResponse(
  value: unknown,
): value is SearchResultsResponse {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  const required = ["items", "nextCursor", "appliedFilters"];
  if (
    !required.every((k) => keys.includes(k)) ||
    !keys.every((k) => required.includes(k) || k === "totalEstimate")
  ) {
    return false;
  }

  if (!Array.isArray(value.items) || !value.items.every(isPublicFeedItem)) {
    return false;
  }

  if (value.nextCursor !== null && typeof value.nextCursor !== "string") {
    return false;
  }

  if (!isSearchFilters(value.appliedFilters)) {
    return false;
  }

  if (
    value.totalEstimate !== undefined &&
    (typeof value.totalEstimate !== "number" ||
      !Number.isInteger(value.totalEstimate) ||
      value.totalEstimate < 0)
  ) {
    return false;
  }

  return true;
}
