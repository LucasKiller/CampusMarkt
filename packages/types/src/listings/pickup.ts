import type { ListingType, PickupArea } from "@campusmarkt/domain";
import { isListingType, isPickupArea } from "./index.ts";
import type { UniversityBadge } from "../identity/university.ts";
import { isUniversityBadge } from "../identity/university.ts";

export interface SafePickupSpot {
  id: string;
  name: string;
  description: string;
}

export interface SafePickupGuidanceDTO {
  rules: string[];
  spots: SafePickupSpot[];
}

export interface PublicProfileDTO {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  universityBadge?: UniversityBadge | null;
}

export interface CompletePickupRequest {
  completionNote?: string | null;
}

export interface TransactionReceiptDTO {
  reservationId: string;
  listingId: string;
  listingTitle: string;
  listingType: ListingType;
  agreedPriceCents: number;
  status: "completed";
  partner: PublicProfileDTO;
  pickupArea: PickupArea;
  completedAt: string;
  completionNote?: string | null;
  role?: "buyer" | "seller";
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

export function isSafePickupSpot(value: unknown): value is SafePickupSpot {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "name", "description"])) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.description === "string" &&
    value.description.length > 0
  );
}

export function isSafePickupGuidanceDTO(
  value: unknown,
): value is SafePickupGuidanceDTO {
  if (!isRecord(value) || !hasExactKeys(value, ["rules", "spots"])) {
    return false;
  }
  return (
    Array.isArray(value.rules) &&
    value.rules.every((r) => typeof r === "string" && r.length > 0) &&
    Array.isArray(value.spots) &&
    value.spots.every(isSafePickupSpot)
  );
}

export function isPublicProfileDTO(value: unknown): value is PublicProfileDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["id", "displayName"],
      ["avatarUrl", "universityBadge"],
    )
  ) {
    return false;
  }

  const baseValid =
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.displayName === "string" &&
    value.displayName.length > 0 &&
    (value.avatarUrl === undefined ||
      value.avatarUrl === null ||
      typeof value.avatarUrl === "string");

  if (!baseValid) {
    return false;
  }

  if (value.universityBadge !== undefined && value.universityBadge !== null) {
    return isUniversityBadge(value.universityBadge);
  }

  return true;
}

export function isCompletePickupRequest(
  value: unknown,
): value is CompletePickupRequest {
  if (!isRecord(value) || !hasExactKeys(value, [], ["completionNote"])) {
    return false;
  }

  if (value.completionNote !== undefined && value.completionNote !== null) {
    if (
      typeof value.completionNote !== "string" ||
      value.completionNote.length > 500
    ) {
      return false;
    }
  }

  return true;
}

export function isTransactionReceiptDTO(
  value: unknown,
): value is TransactionReceiptDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "reservationId",
        "listingId",
        "listingTitle",
        "listingType",
        "agreedPriceCents",
        "status",
        "partner",
        "pickupArea",
        "completedAt",
      ],
      ["completionNote", "role"],
    )
  ) {
    return false;
  }

  const baseValid =
    typeof value.reservationId === "string" &&
    UUID_PATTERN.test(value.reservationId) &&
    typeof value.listingId === "string" &&
    UUID_PATTERN.test(value.listingId) &&
    typeof value.listingTitle === "string" &&
    value.listingTitle.length > 0 &&
    isListingType(value.listingType) &&
    typeof value.agreedPriceCents === "number" &&
    Number.isInteger(value.agreedPriceCents) &&
    value.agreedPriceCents >= 0 &&
    value.status === "completed" &&
    isPublicProfileDTO(value.partner) &&
    isPickupArea(value.pickupArea) &&
    isValidIsoDate(value.completedAt);

  if (!baseValid) {
    return false;
  }

  if (
    value.completionNote !== undefined &&
    value.completionNote !== null &&
    (typeof value.completionNote !== "string" ||
      value.completionNote.length > 500)
  ) {
    return false;
  }

  if (
    value.role !== undefined &&
    value.role !== "buyer" &&
    value.role !== "seller"
  ) {
    return false;
  }

  return true;
}
