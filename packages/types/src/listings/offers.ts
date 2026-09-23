export const OFFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "countered",
  "superseded",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const RESERVATION_STATUSES = [
  "active",
  "completed",
  "cancelled",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_CANCELLATION_REASONS = [
  "no_show",
  "changed_mind",
  "scheduling_conflict",
  "listing_archived",
  "other",
] as const;

export type ReservationCancellationReason =
  (typeof RESERVATION_CANCELLATION_REASONS)[number];

export interface OfferDTO {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  parentOfferId?: string | null;
  amountCents: number;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ReservationDTO {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  offerId?: string | null;
  agreedPriceCents: number;
  status: ReservationStatus;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOfferRequest {
  listingId: string;
  amountCents: number;
  message?: string | null;
}

export interface CounterOfferRequest {
  amountCents: number;
  message?: string | null;
}

export interface CancelReservationRequest {
  reason: ReservationCancellationReason | string;
}

export interface AcceptOfferResponse {
  reservationId: string;
  listingId: string;
  agreedPriceCents: number;
  status: ReservationStatus;
}

export interface CancelReservationResponse {
  reservationId: string;
  listingId: string;
  status: ReservationStatus;
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

export function isOfferStatus(value: unknown): value is OfferStatus {
  return (
    typeof value === "string" && OFFER_STATUSES.includes(value as OfferStatus)
  );
}

export function isReservationStatus(
  value: unknown,
): value is ReservationStatus {
  return (
    typeof value === "string" &&
    RESERVATION_STATUSES.includes(value as ReservationStatus)
  );
}

export function isOfferDTO(value: unknown): value is OfferDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "id",
        "listingId",
        "buyerId",
        "sellerId",
        "amountCents",
        "message",
        "status",
        "createdAt",
      ],
      ["parentOfferId", "updatedAt"],
    )
  ) {
    return false;
  }

  const validBase =
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.listingId === "string" &&
    UUID_PATTERN.test(value.listingId) &&
    typeof value.buyerId === "string" &&
    UUID_PATTERN.test(value.buyerId) &&
    typeof value.sellerId === "string" &&
    UUID_PATTERN.test(value.sellerId) &&
    typeof value.amountCents === "number" &&
    Number.isInteger(value.amountCents) &&
    value.amountCents >= 0 &&
    (value.message === null ||
      (typeof value.message === "string" && value.message.length <= 500)) &&
    isOfferStatus(value.status) &&
    isValidIsoDate(value.createdAt);

  if (!validBase) {
    return false;
  }

  if (
    value.parentOfferId !== undefined &&
    value.parentOfferId !== null &&
    (typeof value.parentOfferId !== "string" ||
      !UUID_PATTERN.test(value.parentOfferId))
  ) {
    return false;
  }

  if (value.updatedAt !== undefined && !isValidIsoDate(value.updatedAt)) {
    return false;
  }

  return true;
}

export function isReservationDTO(value: unknown): value is ReservationDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "id",
        "listingId",
        "buyerId",
        "sellerId",
        "agreedPriceCents",
        "status",
        "createdAt",
      ],
      ["offerId", "cancellationReason", "cancelledBy", "updatedAt"],
    )
  ) {
    return false;
  }

  const validBase =
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.listingId === "string" &&
    UUID_PATTERN.test(value.listingId) &&
    typeof value.buyerId === "string" &&
    UUID_PATTERN.test(value.buyerId) &&
    typeof value.sellerId === "string" &&
    UUID_PATTERN.test(value.sellerId) &&
    typeof value.agreedPriceCents === "number" &&
    Number.isInteger(value.agreedPriceCents) &&
    value.agreedPriceCents >= 0 &&
    isReservationStatus(value.status) &&
    isValidIsoDate(value.createdAt);

  if (!validBase) {
    return false;
  }

  if (
    value.offerId !== undefined &&
    value.offerId !== null &&
    (typeof value.offerId !== "string" || !UUID_PATTERN.test(value.offerId))
  ) {
    return false;
  }

  if (
    value.cancelledBy !== undefined &&
    value.cancelledBy !== null &&
    (typeof value.cancelledBy !== "string" ||
      !UUID_PATTERN.test(value.cancelledBy))
  ) {
    return false;
  }

  if (
    value.cancellationReason !== undefined &&
    value.cancellationReason !== null &&
    typeof value.cancellationReason !== "string"
  ) {
    return false;
  }

  if (value.updatedAt !== undefined && !isValidIsoDate(value.updatedAt)) {
    return false;
  }

  return true;
}

export function isCreateOfferRequest(
  value: unknown,
): value is CreateOfferRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["listingId", "amountCents"], ["message"])
  ) {
    return false;
  }

  return (
    typeof value.listingId === "string" &&
    UUID_PATTERN.test(value.listingId) &&
    typeof value.amountCents === "number" &&
    Number.isInteger(value.amountCents) &&
    value.amountCents >= 0 &&
    (value.message === undefined ||
      value.message === null ||
      (typeof value.message === "string" && value.message.length <= 500))
  );
}

export function isCounterOfferRequest(
  value: unknown,
): value is CounterOfferRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["amountCents"], ["message"])) {
    return false;
  }

  return (
    typeof value.amountCents === "number" &&
    Number.isInteger(value.amountCents) &&
    value.amountCents >= 0 &&
    (value.message === undefined ||
      value.message === null ||
      (typeof value.message === "string" && value.message.length <= 500))
  );
}

export function isCancelReservationRequest(
  value: unknown,
): value is CancelReservationRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["reason"])) {
    return false;
  }

  return (
    typeof value.reason === "string" &&
    value.reason.trim().length > 0 &&
    value.reason.length <= 500
  );
}
