import type {
  ItemCondition,
  ListingCategory,
  ListingType,
  PickupArea,
} from "@campusmarkt/domain";
import type { SearchFilters, SearchSortOption } from "@campusmarkt/types";
import { isSearchSortOption } from "@campusmarkt/types";
import type { ParseResult } from "../identity/account/index.ts";
import {
  parseCategory,
  parseCondition,
  parseListingType,
  parsePickupArea,
} from "./index.ts";

const ALLOWED_SEARCH_KEYS = new Set([
  "q",
  "query",
  "categories",
  "category",
  "pickupAreas",
  "pickupArea",
  "listingTypes",
  "listingType",
  "conditions",
  "condition",
  "minPriceCents",
  "minPrice",
  "maxPriceCents",
  "maxPrice",
  "verifiedOnly",
  "sort",
  "cursor",
  "limit",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArrayField<T>(
  raw: unknown,
  fieldName: string,
  parser: (item: unknown) => { ok: boolean; value?: T; errors?: string[] },
): { ok: true; value: T[] } | { ok: false; errors: string[] } {
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string") {
    items = raw.includes(",")
      ? raw.split(",").map((s) => s.trim())
      : [raw.trim()];
  } else {
    return {
      ok: false,
      errors: [
        `${fieldName} must be an array of values or comma-separated string.`,
      ],
    };
  }

  const results: T[] = [];
  const errors: string[] = [];

  for (const item of items) {
    if (typeof item === "string" && item.trim().length === 0) continue;
    const res = parser(item);
    if (!res.ok) {
      if (res.errors) {
        errors.push(...res.errors);
      }
    } else if (res.value !== undefined) {
      results.push(res.value);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: Array.from(new Set(results)) };
}

function parsePriceCents(
  raw: unknown,
  fieldName: string,
): { ok: true; value?: number } | { ok: false; errors: string[] } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }

  let num: number;
  if (typeof raw === "number") {
    num = raw;
  } else if (typeof raw === "string") {
    num = Number(raw);
  } else {
    return { ok: false, errors: [`${fieldName} must be a number.`] };
  }

  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      ok: false,
      errors: [`${fieldName} must be an integer number of cents.`],
    };
  }

  if (num < 0) {
    return {
      ok: false,
      errors: [`${fieldName} must be a non-negative integer.`],
    };
  }

  return { ok: true, value: num };
}

export function validateSearchParams(
  params: unknown,
): ParseResult<SearchFilters> {
  if (!isRecord(params)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Search parameters must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownKeys = Object.keys(params).filter(
    (k) => !ALLOWED_SEARCH_KEYS.has(k),
  );
  if (unknownKeys.length > 0) {
    fieldErrors._form = ["Search parameters contain unknown fields."];
  }

  let query: string | undefined;
  const rawQuery = params.q !== undefined ? params.q : params.query;
  if (rawQuery !== undefined && rawQuery !== null) {
    if (typeof rawQuery !== "string") {
      fieldErrors.query = ["Search query must be a string."];
    } else {
      const trimmed = rawQuery.trim();
      if (trimmed.length > 0) {
        query = trimmed.slice(0, 100);
      }
    }
  }

  let categories: ListingCategory[] | undefined;
  const rawCategories =
    params.categories !== undefined ? params.categories : params.category;
  if (
    rawCategories !== undefined &&
    rawCategories !== null &&
    rawCategories !== ""
  ) {
    const res = parseArrayField(rawCategories, "categories", parseCategory);
    if (!res.ok) {
      fieldErrors.categories = res.errors;
    } else if (res.value.length > 0) {
      categories = res.value;
    }
  }

  let pickupAreas: PickupArea[] | undefined;
  const rawPickupAreas =
    params.pickupAreas !== undefined ? params.pickupAreas : params.pickupArea;
  if (
    rawPickupAreas !== undefined &&
    rawPickupAreas !== null &&
    rawPickupAreas !== ""
  ) {
    const res = parseArrayField(rawPickupAreas, "pickupAreas", parsePickupArea);
    if (!res.ok) {
      fieldErrors.pickupAreas = res.errors;
    } else if (res.value.length > 0) {
      pickupAreas = res.value;
    }
  }

  let listingTypes: ListingType[] | undefined;
  const rawListingTypes =
    params.listingTypes !== undefined
      ? params.listingTypes
      : params.listingType;
  if (
    rawListingTypes !== undefined &&
    rawListingTypes !== null &&
    rawListingTypes !== ""
  ) {
    const res = parseArrayField(
      rawListingTypes,
      "listingTypes",
      parseListingType,
    );
    if (!res.ok) {
      fieldErrors.listingTypes = res.errors;
    } else if (res.value.length > 0) {
      listingTypes = res.value;
    }
  }

  let conditions: ItemCondition[] | undefined;
  const rawConditions =
    params.conditions !== undefined ? params.conditions : params.condition;
  if (
    rawConditions !== undefined &&
    rawConditions !== null &&
    rawConditions !== ""
  ) {
    const res = parseArrayField(rawConditions, "conditions", parseCondition);
    if (!res.ok) {
      fieldErrors.conditions = res.errors;
    } else if (res.value.length > 0) {
      conditions = res.value;
    }
  }

  let minPriceCents: number | undefined;
  const rawMinPrice =
    params.minPriceCents !== undefined ? params.minPriceCents : params.minPrice;
  const minRes = parsePriceCents(rawMinPrice, "Minimum price");
  if (!minRes.ok) {
    fieldErrors.minPriceCents = minRes.errors;
  } else {
    minPriceCents = minRes.value;
  }

  let maxPriceCents: number | undefined;
  const rawMaxPrice =
    params.maxPriceCents !== undefined ? params.maxPriceCents : params.maxPrice;
  const maxRes = parsePriceCents(rawMaxPrice, "Maximum price");
  if (!maxRes.ok) {
    fieldErrors.maxPriceCents = maxRes.errors;
  } else {
    maxPriceCents = maxRes.value;
  }

  if (
    minPriceCents !== undefined &&
    maxPriceCents !== undefined &&
    minPriceCents > maxPriceCents
  ) {
    fieldErrors.priceRange = [
      "Minimum price cannot be greater than maximum price.",
    ];
  }

  let verifiedOnly: boolean | undefined;
  if (
    params.verifiedOnly !== undefined &&
    params.verifiedOnly !== null &&
    params.verifiedOnly !== ""
  ) {
    if (typeof params.verifiedOnly === "boolean") {
      verifiedOnly = params.verifiedOnly;
    } else if (params.verifiedOnly === "true" || params.verifiedOnly === "1") {
      verifiedOnly = true;
    } else if (params.verifiedOnly === "false" || params.verifiedOnly === "0") {
      verifiedOnly = false;
    } else {
      fieldErrors.verifiedOnly = ["Verified filter must be a boolean."];
    }
  }

  let sort: SearchSortOption | undefined;
  if (params.sort !== undefined && params.sort !== null && params.sort !== "") {
    if (isSearchSortOption(params.sort)) {
      sort = params.sort;
    } else {
      fieldErrors.sort = [
        "Sort option must be one of: relevance, newest, price_asc, price_desc.",
      ];
    }
  }

  let cursor: string | undefined;
  if (
    params.cursor !== undefined &&
    params.cursor !== null &&
    params.cursor !== ""
  ) {
    if (typeof params.cursor !== "string") {
      fieldErrors.cursor = ["Cursor must be a string."];
    } else if (params.cursor.trim().length > 0) {
      cursor = params.cursor.trim();
    }
  }

  let limit = 20;
  if (
    params.limit !== undefined &&
    params.limit !== null &&
    params.limit !== ""
  ) {
    let parsedNum: number;
    if (typeof params.limit === "number") {
      parsedNum = params.limit;
    } else if (typeof params.limit === "string") {
      parsedNum = Number(params.limit);
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

  const result: SearchFilters = { limit };
  if (query !== undefined) result.query = query;
  if (categories !== undefined) result.categories = categories;
  if (pickupAreas !== undefined) result.pickupAreas = pickupAreas;
  if (listingTypes !== undefined) result.listingTypes = listingTypes;
  if (conditions !== undefined) result.conditions = conditions;
  if (minPriceCents !== undefined) result.minPriceCents = minPriceCents;
  if (maxPriceCents !== undefined) result.maxPriceCents = maxPriceCents;
  if (verifiedOnly !== undefined) result.verifiedOnly = verifiedOnly;
  if (sort !== undefined) result.sort = sort;
  if (cursor !== undefined) result.cursor = cursor;

  return { ok: true, value: result };
}
