import type {
  ListingCategory,
  ListingType,
  PickupArea,
} from "@campusmarkt/domain";
import type { FeedCursor } from "@campusmarkt/types";
import { isFeedCursor } from "@campusmarkt/types";
import type { ParseResult, ValueResult } from "../identity/account/index.ts";
import { parseCategory, parseListingType, parsePickupArea } from "./index.ts";

export interface FeedFilterParams {
  cursor?: string;
  category?: ListingCategory;
  pickupArea?: PickupArea;
  listingType?: ListingType;
  limit: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FILTER_KEYS = new Set([
  "cursor",
  "category",
  "pickupArea",
  "listingType",
  "limit",
]);

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

export function encodeCursor(cursor: FeedCursor): string {
  if (!isFeedCursor(cursor)) {
    throw new TypeError("Invalid FeedCursor to encode.");
  }

  const payload = JSON.stringify({
    createdAt: cursor.createdAt,
    id: cursor.id,
  });

  return Buffer.from(payload, "utf-8").toString("base64url");
}

export function decodeCursor(encoded: string): ValueResult<FeedCursor> {
  if (typeof encoded !== "string" || encoded.trim().length === 0) {
    return {
      ok: false,
      errors: ["Cursor must be a non-empty string."],
    };
  }

  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const parsed: unknown = JSON.parse(json);

    if (!isRecord(parsed) || !hasExactKeys(parsed, ["createdAt", "id"])) {
      return {
        ok: false,
        errors: ["Cursor payload must contain exactly createdAt and id."],
      };
    }

    if (typeof parsed.id !== "string" || !UUID_PATTERN.test(parsed.id)) {
      return {
        ok: false,
        errors: ["Cursor id must be a valid UUID."],
      };
    }

    if (!isValidIsoDate(parsed.createdAt)) {
      return {
        ok: false,
        errors: ["Cursor createdAt must be a valid ISO 8601 timestamp."],
      };
    }

    return {
      ok: true,
      value: {
        createdAt: parsed.createdAt,
        id: parsed.id,
      },
    };
  } catch {
    return {
      ok: false,
      errors: ["Malformed cursor string."],
    };
  }
}

export function validateFeedFilterParams(
  input: unknown,
): ParseResult<FeedFilterParams> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Filter parameters must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownKeys = Object.keys(input).filter(
    (k) => !ALLOWED_FILTER_KEYS.has(k),
  );
  if (unknownKeys.length > 0) {
    fieldErrors._form = ["Filter parameters contain unknown fields."];
  }

  let cursor: string | undefined;
  if (
    input.cursor !== undefined &&
    input.cursor !== null &&
    input.cursor !== ""
  ) {
    if (typeof input.cursor !== "string") {
      fieldErrors.cursor = ["Cursor must be a string."];
    } else {
      const decoded = decodeCursor(input.cursor);
      if (!decoded.ok) {
        fieldErrors.cursor = decoded.errors;
      } else {
        cursor = input.cursor;
      }
    }
  }

  let category: ListingCategory | undefined;
  if (
    input.category !== undefined &&
    input.category !== null &&
    input.category !== ""
  ) {
    const res = parseCategory(input.category);
    if (!res.ok) {
      fieldErrors.category = res.errors;
    } else {
      category = res.value;
    }
  }

  let pickupArea: PickupArea | undefined;
  if (
    input.pickupArea !== undefined &&
    input.pickupArea !== null &&
    input.pickupArea !== ""
  ) {
    const res = parsePickupArea(input.pickupArea);
    if (!res.ok) {
      fieldErrors.pickupArea = res.errors;
    } else {
      pickupArea = res.value;
    }
  }

  let listingType: ListingType | undefined;
  if (
    input.listingType !== undefined &&
    input.listingType !== null &&
    input.listingType !== ""
  ) {
    const res = parseListingType(input.listingType);
    if (!res.ok) {
      fieldErrors.listingType = res.errors;
    } else {
      listingType = res.value;
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

    if (!Number.isFinite(parsedNum) || !Number.isInteger(parsedNum)) {
      fieldErrors.limit = ["Limit must be an integer between 1 and 50."];
    } else {
      limit = Math.min(50, Math.max(1, parsedNum));
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const result: FeedFilterParams = { limit };
  if (cursor !== undefined) result.cursor = cursor;
  if (category !== undefined) result.category = category;
  if (pickupArea !== undefined) result.pickupArea = pickupArea;
  if (listingType !== undefined) result.listingType = listingType;

  return {
    ok: true,
    value: result,
  };
}
