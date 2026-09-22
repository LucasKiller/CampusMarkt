import type {
  ItemCondition,
  ListingCategory,
  ListingStatus,
  ListingType,
  PickupArea,
} from "@campusmarkt/domain";
import {
  ITEM_CONDITIONS,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  LISTING_TYPES,
  PICKUP_AREAS,
} from "@campusmarkt/domain";
import type { UniversityBadge } from "../identity/university.ts";
import { isUniversityBadge } from "../identity/university.ts";

export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface PublicListingSeller {
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
  universityBadge: UniversityBadge | null;
}

export interface PublicListingImage {
  storagePath: string;
  position: number;
}

export interface PublicFeedItem {
  id: string;
  listingType: ListingType;
  title: string;
  priceCents: number | null;
  category: ListingCategory;
  pickupArea: PickupArea;
  condition: ItemCondition;
  status: "active" | "reserved";
  createdAt: string;
  coverImage: string | null;
  seller: PublicListingSeller;
}

export interface PublicFeedResponse {
  items: PublicFeedItem[];
  nextCursor: string | null;
}

export interface PublicListingDetails extends Omit<PublicFeedItem, "status"> {
  status: ListingStatus;
  description: string;
  images: PublicListingImage[];
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

export function isFeedCursor(value: unknown): value is FeedCursor {
  if (!isRecord(value) || !hasExactKeys(value, ["createdAt", "id"])) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    isValidIsoDate(value.createdAt)
  );
}

export function isPublicListingSeller(
  value: unknown,
): value is PublicListingSeller {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "publicId",
      "displayName",
      "avatarUrl",
      "universityBadge",
    ])
  ) {
    return false;
  }

  const validBase =
    typeof value.publicId === "string" &&
    UUID_PATTERN.test(value.publicId) &&
    typeof value.displayName === "string" &&
    value.displayName.trim().length > 0 &&
    (value.avatarUrl === null ||
      (typeof value.avatarUrl === "string" && value.avatarUrl.length > 0));

  if (!validBase) {
    return false;
  }

  if (value.universityBadge === null) {
    return true;
  }

  return isUniversityBadge(value.universityBadge);
}

export function isPublicListingImage(
  value: unknown,
): value is PublicListingImage {
  if (!isRecord(value) || !hasExactKeys(value, ["storagePath", "position"])) {
    return false;
  }

  return (
    typeof value.storagePath === "string" &&
    value.storagePath.length > 0 &&
    typeof value.position === "number" &&
    Number.isInteger(value.position) &&
    value.position >= 0 &&
    value.position <= 7
  );
}

export function isPublicFeedItem(value: unknown): value is PublicFeedItem {
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
    (value.status === "active" || value.status === "reserved") &&
    isValidIsoDate(value.createdAt) &&
    (value.coverImage === null ||
      (typeof value.coverImage === "string" && value.coverImage.length > 0)) &&
    isPublicListingSeller(value.seller)
  );
}

export function isPublicFeedResponse(
  value: unknown,
): value is PublicFeedResponse {
  if (!isRecord(value) || !hasExactKeys(value, ["items", "nextCursor"])) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isPublicFeedItem) &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}

export function isPublicListingDetails(
  value: unknown,
): value is PublicListingDetails {
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
      "description",
      "images",
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
    LISTING_STATUSES.includes(value.status as ListingStatus) &&
    isValidIsoDate(value.createdAt) &&
    (value.coverImage === null ||
      (typeof value.coverImage === "string" && value.coverImage.length > 0)) &&
    isPublicListingSeller(value.seller) &&
    typeof value.description === "string" &&
    Array.isArray(value.images) &&
    value.images.every(isPublicListingImage)
  );
}
