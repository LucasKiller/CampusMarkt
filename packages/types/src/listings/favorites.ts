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
import type { PublicListingSeller } from "./feed.ts";
import { isPublicListingSeller } from "./feed.ts";

export type FavoriteListingStatus = "active" | "reserved" | "sold";

export const FAVORITE_LISTING_STATUSES = [
  "active",
  "reserved",
  "sold",
] as const;

export interface FavoriteItemDTO {
  id: string;
  listingType: ListingType;
  title: string;
  priceCents: number | null;
  category: ListingCategory;
  pickupArea: PickupArea;
  condition: ItemCondition;
  status: FavoriteListingStatus;
  createdAt: string;
  coverImage: string | null;
  seller: PublicListingSeller;
  favoritedAt: string;
}

export type FavoriteFeedItem = FavoriteItemDTO;

export interface FavoriteToggleResponse {
  isFavorited: boolean;
  listingId: string;
}

export interface UserFavoriteIdsResponse {
  ids: string[];
}

export interface FavoritesListResponse {
  items: FavoriteItemDTO[];
  nextCursor: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function isFavoriteToggleResponse(
  value: unknown,
): value is FavoriteToggleResponse {
  if (!isRecord(value) || !hasExactKeys(value, ["isFavorited", "listingId"])) {
    return false;
  }

  return (
    typeof value.isFavorited === "boolean" &&
    typeof value.listingId === "string" &&
    UUID_PATTERN.test(value.listingId)
  );
}

export function isUserFavoriteIdsResponse(
  value: unknown,
): value is UserFavoriteIdsResponse {
  if (!isRecord(value) || !hasExactKeys(value, ["ids"])) {
    return false;
  }

  return (
    Array.isArray(value.ids) &&
    value.ids.every((id) => typeof id === "string" && UUID_PATTERN.test(id))
  );
}

export function isFavoriteItemDTO(value: unknown): value is FavoriteItemDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "listingType",
      "title",
      "priceCents",
      "category",
      "pickupArea",
      "condition",
      "status",
      "createdAt",
      "coverImage",
      "seller",
      "favoritedAt",
    ])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.listingType === "string" &&
    LISTING_TYPES.includes(value.listingType as ListingType) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (value.priceCents === null ||
      (typeof value.priceCents === "number" &&
        Number.isInteger(value.priceCents) &&
        value.priceCents >= 0)) &&
    typeof value.category === "string" &&
    LISTING_CATEGORIES.includes(value.category as ListingCategory) &&
    typeof value.pickupArea === "string" &&
    PICKUP_AREAS.includes(value.pickupArea as PickupArea) &&
    typeof value.condition === "string" &&
    ITEM_CONDITIONS.includes(value.condition as ItemCondition) &&
    typeof value.status === "string" &&
    FAVORITE_LISTING_STATUSES.includes(value.status as FavoriteListingStatus) &&
    isValidIsoDate(value.createdAt) &&
    (value.coverImage === null ||
      (typeof value.coverImage === "string" && value.coverImage.length > 0)) &&
    isPublicListingSeller(value.seller) &&
    isValidIsoDate(value.favoritedAt)
  );
}

export function isFavoritesListResponse(
  value: unknown,
): value is FavoritesListResponse {
  if (!isRecord(value) || !hasExactKeys(value, ["items", "nextCursor"])) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isFavoriteItemDTO) &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}
