import {
  RESERVATION_CANCELLATION_REASONS,
  type CancelReservationRequest,
  type CounterOfferRequest,
  type CreateOfferRequest,
  type ReservationCancellationReason,
} from "@campusmarkt/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type OfferValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

export interface ValidateCreateOfferOptions {
  askingPriceCents?: number | null;
  allowZero?: boolean;
}

export interface ValidateCounterOfferOptions {
  askingPriceCents?: number | null;
}

const CREATE_OFFER_FIELDS = new Set(["listingId", "amountCents", "message"]);
const COUNTER_OFFER_FIELDS = new Set(["amountCents", "message"]);
const CANCEL_RESERVATION_FIELDS = new Set(["reason"]);

export function validateCreateOfferInput(
  input: unknown,
  options?: ValidateCreateOfferOptions,
): OfferValidationResult<CreateOfferRequest> {
  if (!isRecord(input)) {
    const msg = "Offer payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !CREATE_OFFER_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  // Listing ID validation
  if (
    typeof input.listingId !== "string" ||
    !UUID_PATTERN.test(input.listingId.trim())
  ) {
    fieldErrors.listingId = ["Listing ID must be a valid UUID."];
  }

  // Amount validation
  const allowZero =
    options?.allowZero === true || options?.askingPriceCents === 0;
  const rawAmount = input.amountCents;

  if (
    typeof rawAmount !== "number" ||
    !Number.isInteger(rawAmount) ||
    !Number.isFinite(rawAmount)
  ) {
    fieldErrors.amountCents = ["Offer amount must be an integer in cents."];
  } else if (allowZero && rawAmount < 0) {
    fieldErrors.amountCents = [
      "Offer amount must be greater than or equal to 0.",
    ];
  } else if (!allowZero && rawAmount <= 0) {
    fieldErrors.amountCents = ["Offer amount must be strictly greater than 0."];
  } else if (
    options?.askingPriceCents !== undefined &&
    options?.askingPriceCents !== null &&
    rawAmount > options.askingPriceCents
  ) {
    fieldErrors.amountCents = [
      `Offer amount cannot exceed asking price of €${(options.askingPriceCents / 100).toFixed(2)}.`,
    ];
  }

  // Message validation
  let message: string | null = null;
  if (
    input.message !== undefined &&
    input.message !== null &&
    input.message !== ""
  ) {
    if (typeof input.message !== "string") {
      fieldErrors.message = ["Message must be a string."];
    } else {
      const trimmed = input.message.trim();
      if (trimmed.length > 500) {
        fieldErrors.message = ["Message must not exceed 500 characters."];
      } else {
        message = trimmed;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  const value: CreateOfferRequest = {
    listingId: (input.listingId as string).trim(),
    amountCents: rawAmount as number,
  };
  if (message !== null) {
    value.message = message;
  }

  return { ok: true, value };
}

export function validateCounterOfferInput(
  input: unknown,
  options?: ValidateCounterOfferOptions,
): OfferValidationResult<CounterOfferRequest> {
  if (!isRecord(input)) {
    const msg = "Counteroffer payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !COUNTER_OFFER_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  const rawAmount = input.amountCents;
  if (
    typeof rawAmount !== "number" ||
    !Number.isInteger(rawAmount) ||
    !Number.isFinite(rawAmount)
  ) {
    fieldErrors.amountCents = [
      "Counteroffer amount must be an integer in cents.",
    ];
  } else if (rawAmount <= 0) {
    fieldErrors.amountCents = [
      "Counteroffer amount must be strictly greater than 0.",
    ];
  } else if (
    options?.askingPriceCents !== undefined &&
    options?.askingPriceCents !== null &&
    rawAmount > options.askingPriceCents
  ) {
    fieldErrors.amountCents = [
      `Counteroffer amount cannot exceed asking price of €${(options.askingPriceCents / 100).toFixed(2)}.`,
    ];
  }

  let message: string | null = null;
  if (
    input.message !== undefined &&
    input.message !== null &&
    input.message !== ""
  ) {
    if (typeof input.message !== "string") {
      fieldErrors.message = ["Message must be a string."];
    } else {
      const trimmed = input.message.trim();
      if (trimmed.length > 500) {
        fieldErrors.message = ["Message must not exceed 500 characters."];
      } else {
        message = trimmed;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  const value: CounterOfferRequest = {
    amountCents: rawAmount as number,
  };
  if (message !== null) {
    value.message = message;
  }

  return { ok: true, value };
}

export function validateCancelReservationInput(
  input: unknown,
): OfferValidationResult<CancelReservationRequest> {
  if (!isRecord(input)) {
    const msg = "Cancel reservation payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !CANCEL_RESERVATION_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  const reason = input.reason;
  if (
    typeof reason !== "string" ||
    !RESERVATION_CANCELLATION_REASONS.includes(
      reason as ReservationCancellationReason,
    )
  ) {
    fieldErrors.reason = [
      `Cancellation reason must be one of: ${RESERVATION_CANCELLATION_REASONS.join(", ")}.`,
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      reason: reason as ReservationCancellationReason,
    },
  };
}
