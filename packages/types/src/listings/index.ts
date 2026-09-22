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

export const LISTING_API_FAILURE_CODES = [
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "DEPENDENCY_UNAVAILABLE",
] as const;

export type ListingApiFailureCode = (typeof LISTING_API_FAILURE_CODES)[number];

export const ALLOWED_MEDIA_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMediaContentType =
  (typeof ALLOWED_MEDIA_CONTENT_TYPES)[number];

export interface ListingMediaItem {
  id: string;
  storagePath: string;
  position: number;
  createdAt?: string;
}

export interface ListingEntity {
  id: string;
  ownerId: string;
  listingType: ListingType;
  title: string;
  description: string;
  category: ListingCategory;
  pickupArea: PickupArea;
  condition: ItemCondition;
  priceCents: number | null;
  status: ListingStatus;
  media: ListingMediaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingRequest {
  listingType: ListingType;
  title: string;
  description: string;
  category: ListingCategory;
  pickupArea: PickupArea;
  condition: ItemCondition;
  priceCents?: number | null;
  mediaStoragePaths: string[];
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  category?: ListingCategory;
  pickupArea?: PickupArea;
  condition?: ItemCondition;
  priceCents?: number | null;
  mediaStoragePaths?: string[];
}

export interface TransitionStatusRequest {
  status: ListingStatus;
}

export interface MediaUploadIntentRequest {
  contentType: AllowedMediaContentType;
  fileSizeBytes: number;
}

export interface MediaUploadIntentResponse {
  storagePath: string;
  signedUploadUrl: string;
  expiresAt: string;
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

export function isListingType(value: unknown): value is ListingType {
  return (
    typeof value === "string" && LISTING_TYPES.includes(value as ListingType)
  );
}

export function isListingStatus(value: unknown): value is ListingStatus {
  return (
    typeof value === "string" &&
    LISTING_STATUSES.includes(value as ListingStatus)
  );
}

export function isListingCategory(value: unknown): value is ListingCategory {
  return (
    typeof value === "string" &&
    LISTING_CATEGORIES.includes(value as ListingCategory)
  );
}

export function isPickupArea(value: unknown): value is PickupArea {
  return (
    typeof value === "string" && PICKUP_AREAS.includes(value as PickupArea)
  );
}

export function isItemCondition(value: unknown): value is ItemCondition {
  return (
    typeof value === "string" &&
    ITEM_CONDITIONS.includes(value as ItemCondition)
  );
}

export function isListingMediaItem(value: unknown): value is ListingMediaItem {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["id", "storagePath", "position"], ["createdAt"])
  ) {
    return false;
  }

  const baseValid =
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.storagePath === "string" &&
    value.storagePath.length > 0 &&
    typeof value.position === "number" &&
    Number.isInteger(value.position) &&
    value.position >= 0 &&
    value.position <= 7;

  if (!baseValid) {
    return false;
  }

  if (value.createdAt !== undefined) {
    return typeof value.createdAt === "string";
  }

  return true;
}

export function isListingEntity(value: unknown): value is ListingEntity {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "ownerId",
      "listingType",
      "title",
      "description",
      "category",
      "pickupArea",
      "condition",
      "priceCents",
      "status",
      "media",
      "createdAt",
      "updatedAt",
    ])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.ownerId === "string" &&
    UUID_PATTERN.test(value.ownerId) &&
    isListingType(value.listingType) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isListingCategory(value.category) &&
    isPickupArea(value.pickupArea) &&
    isItemCondition(value.condition) &&
    (value.priceCents === null ||
      (typeof value.priceCents === "number" &&
        Number.isInteger(value.priceCents))) &&
    isListingStatus(value.status) &&
    Array.isArray(value.media) &&
    value.media.every(isListingMediaItem) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isCreateListingRequest(
  value: unknown,
): value is CreateListingRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "listingType",
        "title",
        "description",
        "category",
        "pickupArea",
        "condition",
        "mediaStoragePaths",
      ],
      ["priceCents"],
    )
  ) {
    return false;
  }

  return (
    isListingType(value.listingType) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    isListingCategory(value.category) &&
    isPickupArea(value.pickupArea) &&
    isItemCondition(value.condition) &&
    (value.priceCents === undefined ||
      value.priceCents === null ||
      (typeof value.priceCents === "number" &&
        Number.isInteger(value.priceCents))) &&
    Array.isArray(value.mediaStoragePaths) &&
    value.mediaStoragePaths.every(
      (path) => typeof path === "string" && path.length > 0,
    )
  );
}

export function isUpdateListingRequest(
  value: unknown,
): value is UpdateListingRequest {
  if (!isRecord(value)) {
    return false;
  }

  const allowedKeys = [
    "title",
    "description",
    "category",
    "pickupArea",
    "condition",
    "priceCents",
    "mediaStoragePaths",
  ];

  const keys = Object.keys(value);
  if (keys.length === 0 || !keys.every((k) => allowedKeys.includes(k))) {
    return false;
  }

  if (value.title !== undefined && typeof value.title !== "string") {
    return false;
  }
  if (
    value.description !== undefined &&
    typeof value.description !== "string"
  ) {
    return false;
  }
  if (value.category !== undefined && !isListingCategory(value.category)) {
    return false;
  }
  if (value.pickupArea !== undefined && !isPickupArea(value.pickupArea)) {
    return false;
  }
  if (value.condition !== undefined && !isItemCondition(value.condition)) {
    return false;
  }
  if (
    value.priceCents !== undefined &&
    value.priceCents !== null &&
    (typeof value.priceCents !== "number" ||
      !Number.isInteger(value.priceCents))
  ) {
    return false;
  }
  if (
    value.mediaStoragePaths !== undefined &&
    (!Array.isArray(value.mediaStoragePaths) ||
      !value.mediaStoragePaths.every(
        (p) => typeof p === "string" && p.length > 0,
      ))
  ) {
    return false;
  }

  return true;
}

export function isTransitionStatusRequest(
  value: unknown,
): value is TransitionStatusRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["status"])) {
    return false;
  }

  return isListingStatus(value.status);
}

export function isMediaUploadIntentRequest(
  value: unknown,
): value is MediaUploadIntentRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["contentType", "fileSizeBytes"])
  ) {
    return false;
  }

  return (
    typeof value.contentType === "string" &&
    ALLOWED_MEDIA_CONTENT_TYPES.includes(
      value.contentType as AllowedMediaContentType,
    ) &&
    typeof value.fileSizeBytes === "number" &&
    Number.isInteger(value.fileSizeBytes) &&
    value.fileSizeBytes > 0 &&
    value.fileSizeBytes <= 5 * 1024 * 1024
  );
}
