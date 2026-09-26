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
  validateImageCount,
  validatePriceRule,
} from "@campusmarkt/domain";
import type {
  AllowedMediaContentType,
  CreateListingRequest,
  MediaUploadIntentRequest,
  TransitionStatusRequest,
  UpdateListingRequest,
} from "@campusmarkt/types";
import { ALLOWED_MEDIA_CONTENT_TYPES } from "@campusmarkt/types";
import type { ParseResult, ValueResult } from "../identity/account/index.ts";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const STORAGE_PATH_PATTERN = /^(?!.*\.\.)[a-zA-Z0-9_\-/]+\.(jpe?g|png|webp)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function sanitizeListingText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function parseTitle(value: unknown): ValueResult<string> {
  if (typeof value !== "string") {
    return {
      ok: false,
      errors: ["Title must be a string."],
    };
  }

  const sanitized = sanitizeListingText(value);
  const length = codePointLength(sanitized);

  if (length < 5 || length > 100) {
    return {
      ok: false,
      errors: ["Title must contain between 5 and 100 characters."],
    };
  }

  return { ok: true, value: sanitized };
}

export function parseDescription(value: unknown): ValueResult<string> {
  if (typeof value !== "string") {
    return {
      ok: false,
      errors: ["Description must be a string."],
    };
  }

  const sanitized = sanitizeListingText(value);
  const length = codePointLength(sanitized);

  if (length < 10 || length > 2000) {
    return {
      ok: false,
      errors: ["Description must contain between 10 and 2000 characters."],
    };
  }

  return { ok: true, value: sanitized };
}

export function parseCategory(value: unknown): ValueResult<ListingCategory> {
  if (
    typeof value !== "string" ||
    !LISTING_CATEGORIES.includes(value as ListingCategory)
  ) {
    return {
      ok: false,
      errors: ["Select a valid category for physical goods."],
    };
  }
  return { ok: true, value: value as ListingCategory };
}

export function parsePickupArea(value: unknown): ValueResult<PickupArea> {
  if (
    typeof value !== "string" ||
    !PICKUP_AREAS.includes(value as PickupArea)
  ) {
    return {
      ok: false,
      errors: ["Select a valid pickup area in Braunschweig."],
    };
  }
  return { ok: true, value: value as PickupArea };
}

export function parseCondition(value: unknown): ValueResult<ItemCondition> {
  if (
    typeof value !== "string" ||
    !ITEM_CONDITIONS.includes(value as ItemCondition)
  ) {
    return {
      ok: false,
      errors: ["Select a valid item condition."],
    };
  }
  return { ok: true, value: value as ItemCondition };
}

export function parseListingType(value: unknown): ValueResult<ListingType> {
  if (
    typeof value !== "string" ||
    !LISTING_TYPES.includes(value as ListingType)
  ) {
    return {
      ok: false,
      errors: ["Select a valid listing type (SELL, GIVE_AWAY, or WANTED)."],
    };
  }
  return { ok: true, value: value as ListingType };
}

export function parseStoragePath(value: unknown): ValueResult<string> {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 500 ||
    !STORAGE_PATH_PATTERN.test(value)
  ) {
    return {
      ok: false,
      errors: ["Invalid image storage path format."],
    };
  }
  return { ok: true, value };
}

const CREATE_FIELDS = new Set([
  "listingType",
  "title",
  "description",
  "category",
  "pickupArea",
  "condition",
  "priceCents",
  "mediaStoragePaths",
]);

export function parseCreateListingInput(
  input: unknown,
): ParseResult<CreateListingRequest> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Create listing payload must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter((k) => !CREATE_FIELDS.has(k));
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  const typeResult = parseListingType(input.listingType);
  if (!typeResult.ok) {
    fieldErrors.listingType = typeResult.errors;
  }

  const titleResult = parseTitle(input.title);
  if (!titleResult.ok) {
    fieldErrors.title = titleResult.errors;
  }

  const descResult = parseDescription(input.description);
  if (!descResult.ok) {
    fieldErrors.description = descResult.errors;
  }

  const catResult = parseCategory(input.category);
  if (!catResult.ok) {
    fieldErrors.category = catResult.errors;
  }

  const areaResult = parsePickupArea(input.pickupArea);
  if (!areaResult.ok) {
    fieldErrors.pickupArea = areaResult.errors;
  }

  const condResult = parseCondition(input.condition);
  if (!condResult.ok) {
    fieldErrors.condition = condResult.errors;
  }

  // Price validation
  const listingType = typeResult.ok ? typeResult.value : undefined;
  const rawPrice = input.priceCents;
  const parsedPrice =
    rawPrice === null || rawPrice === undefined
      ? null
      : typeof rawPrice === "number"
        ? rawPrice
        : NaN;

  if (listingType) {
    const priceValidation = validatePriceRule(listingType, parsedPrice);
    if (!priceValidation.valid && priceValidation.reason) {
      fieldErrors.priceCents = [priceValidation.reason];
    }
  }

  // Media validation
  if (!Array.isArray(input.mediaStoragePaths)) {
    fieldErrors.mediaStoragePaths = ["mediaStoragePaths must be an array."];
  } else {
    const paths = input.mediaStoragePaths;
    if (listingType) {
      const countValidation = validateImageCount(listingType, paths.length);
      if (!countValidation.valid && countValidation.reason) {
        fieldErrors.mediaStoragePaths = [countValidation.reason];
      }
    }

    for (let i = 0; i < paths.length; i++) {
      const pathResult = parseStoragePath(paths[i]);
      if (!pathResult.ok) {
        fieldErrors.mediaStoragePaths = [
          ...(fieldErrors.mediaStoragePaths || []),
          `Image ${i + 1}: ${pathResult.errors.join(", ")}`,
        ];
        break;
      }
    }
  }

  if (
    !typeResult.ok ||
    !titleResult.ok ||
    !descResult.ok ||
    !catResult.ok ||
    !areaResult.ok ||
    !condResult.ok ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      listingType: typeResult.value,
      title: titleResult.value,
      description: descResult.value,
      category: catResult.value,
      pickupArea: areaResult.value,
      condition: condResult.value,
      priceCents: parsedPrice,
      mediaStoragePaths: input.mediaStoragePaths as string[],
    },
  };
}

const UPDATE_FIELDS = new Set([
  "title",
  "description",
  "category",
  "pickupArea",
  "condition",
  "priceCents",
  "mediaStoragePaths",
]);

export function parseUpdateListingInput(
  input: unknown,
  existingType?: ListingType,
): ParseResult<UpdateListingRequest> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Update payload must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};

  if ("listingType" in input) {
    fieldErrors.listingType = [
      "Listing intent cannot be changed after creation.",
    ];
  }

  const unknownFields = Object.keys(input).filter(
    (k) => !UPDATE_FIELDS.has(k) && k !== "listingType",
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  const keys = Object.keys(input).filter((k) => UPDATE_FIELDS.has(k));
  if (keys.length === 0 && !fieldErrors.listingType && !fieldErrors._form) {
    fieldErrors._form = ["At least one field must be provided to update."];
  }

  let title: string | undefined;
  if ("title" in input) {
    const res = parseTitle(input.title);
    if (!res.ok) fieldErrors.title = res.errors;
    else title = res.value;
  }

  let description: string | undefined;
  if ("description" in input) {
    const res = parseDescription(input.description);
    if (!res.ok) fieldErrors.description = res.errors;
    else description = res.value;
  }

  let category: ListingCategory | undefined;
  if ("category" in input) {
    const res = parseCategory(input.category);
    if (!res.ok) fieldErrors.category = res.errors;
    else category = res.value;
  }

  let pickupArea: PickupArea | undefined;
  if ("pickupArea" in input) {
    const res = parsePickupArea(input.pickupArea);
    if (!res.ok) fieldErrors.pickupArea = res.errors;
    else pickupArea = res.value;
  }

  let condition: ItemCondition | undefined;
  if ("condition" in input) {
    const res = parseCondition(input.condition);
    if (!res.ok) fieldErrors.condition = res.errors;
    else condition = res.value;
  }

  let priceCents: number | null | undefined;
  if ("priceCents" in input) {
    const rawPrice = input.priceCents;
    priceCents =
      rawPrice === null || rawPrice === undefined
        ? null
        : typeof rawPrice === "number"
          ? rawPrice
          : NaN;

    if (existingType) {
      const priceValidation = validatePriceRule(existingType, priceCents);
      if (!priceValidation.valid && priceValidation.reason) {
        fieldErrors.priceCents = [priceValidation.reason];
      }
    } else if (
      priceCents !== null &&
      (!Number.isInteger(priceCents) ||
        priceCents < 0 ||
        priceCents > 1_000_000)
    ) {
      fieldErrors.priceCents = [
        "Price must be an integer between 0 and €10,000.00.",
      ];
    }
  }

  let mediaStoragePaths: string[] | undefined;
  if ("mediaStoragePaths" in input) {
    if (!Array.isArray(input.mediaStoragePaths)) {
      fieldErrors.mediaStoragePaths = ["mediaStoragePaths must be an array."];
    } else {
      mediaStoragePaths = input.mediaStoragePaths;
      if (existingType) {
        const countValidation = validateImageCount(
          existingType,
          mediaStoragePaths.length,
        );
        if (!countValidation.valid && countValidation.reason) {
          fieldErrors.mediaStoragePaths = [countValidation.reason];
        }
      }

      for (let i = 0; i < mediaStoragePaths.length; i++) {
        const pathResult = parseStoragePath(mediaStoragePaths[i]);
        if (!pathResult.ok) {
          fieldErrors.mediaStoragePaths = [
            ...(fieldErrors.mediaStoragePaths || []),
            `Image ${i + 1}: ${pathResult.errors.join(", ")}`,
          ];
          break;
        }
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const result: UpdateListingRequest = {};
  if (title !== undefined) result.title = title;
  if (description !== undefined) result.description = description;
  if (category !== undefined) result.category = category;
  if (pickupArea !== undefined) result.pickupArea = pickupArea;
  if (condition !== undefined) result.condition = condition;
  if ("priceCents" in input) result.priceCents = priceCents;
  if (mediaStoragePaths !== undefined)
    result.mediaStoragePaths = mediaStoragePaths;

  return { ok: true, value: result };
}

export function parseTransitionStatusInput(
  input: unknown,
): ParseResult<TransitionStatusRequest> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Transition payload must be an object."] },
    };
  }

  const unknownFields = Object.keys(input).filter((k) => k !== "status");
  if (unknownFields.length > 0) {
    return {
      ok: false,
      fieldErrors: { _form: ["Payload contains unknown fields."] },
    };
  }

  if (
    typeof input.status !== "string" ||
    !LISTING_STATUSES.includes(input.status as ListingStatus)
  ) {
    return {
      ok: false,
      fieldErrors: {
        status: ["Status must be one of: active, reserved, sold, or archived."],
      },
    };
  }

  return {
    ok: true,
    value: { status: input.status as ListingStatus },
  };
}

export function parseMediaUploadIntentInput(
  input: unknown,
): ParseResult<MediaUploadIntentRequest> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Upload intent payload must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => k !== "contentType" && k !== "fileSizeBytes",
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  if (
    typeof input.contentType !== "string" ||
    !ALLOWED_MEDIA_CONTENT_TYPES.includes(
      input.contentType as AllowedMediaContentType,
    )
  ) {
    fieldErrors.contentType = [
      "Only JPEG, PNG, and WebP images are supported.",
    ];
  }

  if (
    typeof input.fileSizeBytes !== "number" ||
    !Number.isInteger(input.fileSizeBytes) ||
    input.fileSizeBytes <= 0
  ) {
    fieldErrors.fileSizeBytes = ["File size must be a positive integer."];
  } else if (input.fileSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    fieldErrors.fileSizeBytes = ["Image file size must not exceed 5MB."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      contentType: input.contentType as AllowedMediaContentType,
      fileSizeBytes: input.fileSizeBytes as number,
    },
  };
}

export * from "./feed.ts";
export * from "./search.ts";
export * from "./favorites.ts";
export * from "./offers.ts";
export * from "./messaging.ts";
export * from "./pickup.ts";
export * from "./safety.ts";
export * from "./moderation.ts";
