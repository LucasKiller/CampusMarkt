export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIsoDate(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function isValidCursorString(value: string): boolean {
  if (isValidIsoDate(value)) {
    return true;
  }

  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) {
      return false;
    }
    return (
      typeof parsed.createdAt === "string" &&
      isValidIsoDate(parsed.createdAt) &&
      typeof parsed.id === "string" &&
      UUID_PATTERN.test(parsed.id)
    );
  } catch {
    return false;
  }
}

export type ListingIdParamResult =
  | {
      ok: true;
      value: string;
      listingId: string;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

export function validateListingIdParam(input: unknown): ListingIdParamResult {
  let candidate: unknown = input;

  if (isRecord(input)) {
    candidate = input.listingId !== undefined ? input.listingId : input.id;
  }

  if (typeof candidate !== "string" || !UUID_PATTERN.test(candidate.trim())) {
    const errorMsg = "Listing ID must be a valid UUID.";
    return {
      ok: false,
      errors: [errorMsg],
      fieldErrors: { listingId: [errorMsg] },
    };
  }

  const validId = candidate.trim().toLowerCase();
  return {
    ok: true,
    value: validId,
    listingId: validId,
  };
}

export interface FavoritesPaginationQuery {
  cursor?: string;
  limit: number;
}

export type FavoritesPaginationResult =
  | {
      ok: true;
      value: FavoritesPaginationQuery;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

const ALLOWED_PAGINATION_KEYS = new Set(["cursor", "limit"]);

export function validateFavoritesPaginationQuery(
  input: unknown,
): FavoritesPaginationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: ["Query parameters must be an object."],
      fieldErrors: { _form: ["Query parameters must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownKeys = Object.keys(input).filter(
    (k) => !ALLOWED_PAGINATION_KEYS.has(k),
  );
  if (unknownKeys.length > 0) {
    fieldErrors._form = ["Query parameters contain unknown fields."];
  }

  let cursor: string | undefined;
  if (
    input.cursor !== undefined &&
    input.cursor !== null &&
    input.cursor !== ""
  ) {
    if (
      typeof input.cursor !== "string" ||
      !isValidCursorString(input.cursor)
    ) {
      fieldErrors.cursor = [
        "Cursor must be a valid ISO 8601 timestamp or cursor token.",
      ];
    } else {
      cursor = input.cursor;
    }
  }

  let limit = 20;
  if (input.limit !== undefined && input.limit !== null && input.limit !== "") {
    let parsedNum: number;
    if (typeof input.limit === "number") {
      parsedNum = input.limit;
    } else if (typeof input.limit === "string") {
      parsedNum = Number(input.limit);
    } else {
      parsedNum = NaN;
    }

    if (
      !Number.isFinite(parsedNum) ||
      !Number.isInteger(parsedNum) ||
      parsedNum < 1 ||
      parsedNum > 50
    ) {
      fieldErrors.limit = ["Limit must be an integer between 1 and 50."];
    } else {
      limit = parsedNum;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  const value: FavoritesPaginationQuery = { limit };
  if (cursor !== undefined) {
    value.cursor = cursor;
  }

  return {
    ok: true,
    value,
  };
}
