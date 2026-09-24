import type { CompletePickupRequest } from "@campusmarkt/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type PickupValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

const COMPLETE_PICKUP_FIELDS = new Set(["completionNote"]);

export function validateReservationId(
  id: unknown,
): PickupValidationResult<string> {
  if (typeof id !== "string" || !UUID_PATTERN.test(id.trim())) {
    const msg = "Reservation ID must be a valid UUID.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { reservationId: [msg] },
    };
  }

  return {
    ok: true,
    value: id.trim(),
  };
}

export function validateCompletePickupInput(
  input: unknown,
): PickupValidationResult<CompletePickupRequest> {
  if (!isRecord(input)) {
    const msg = "Pickup completion payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !COMPLETE_PICKUP_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  let completionNote: string | null = null;
  if (input.completionNote !== undefined && input.completionNote !== null) {
    if (typeof input.completionNote !== "string") {
      fieldErrors.completionNote = ["Completion note must be a string."];
    } else {
      const trimmed = input.completionNote.trim();
      if (input.completionNote.length > 500) {
        fieldErrors.completionNote = [
          "Completion note cannot exceed 500 characters.",
        ];
      } else {
        completionNote = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const allErrors = Object.values(fieldErrors).flat();
    return {
      ok: false,
      errors: allErrors,
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      completionNote,
    },
  };
}

export interface CompletedHistoryQuery {
  limit?: number;
  cursor?: string;
}

export function validateCompletedHistoryQuery(
  query: unknown,
): PickupValidationResult<CompletedHistoryQuery> {
  if (!isRecord(query)) {
    return {
      ok: true,
      value: { limit: 50 },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  let limit = 50;
  let cursor: string | undefined = undefined;

  if (query.limit !== undefined) {
    const parsedLimit =
      typeof query.limit === "number" ? query.limit : Number(query.limit);
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      fieldErrors.limit = ["Limit must be an integer between 1 and 100."];
    } else {
      limit = parsedLimit;
    }
  }

  if (query.cursor !== undefined) {
    if (typeof query.cursor !== "string" || query.cursor.trim().length === 0) {
      fieldErrors.cursor = ["Cursor must be a non-empty string."];
    } else {
      cursor = query.cursor.trim();
    }
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
      limit,
      cursor,
    },
  };
}
