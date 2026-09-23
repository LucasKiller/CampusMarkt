export const LISTING_TYPES = ["SELL", "GIVE_AWAY", "WANTED"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = [
  "active",
  "reserved",
  "sold",
  "archived",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_CATEGORIES = [
  "furniture",
  "electronics",
  "books_studies",
  "bicycles_mobility",
  "clothing",
  "home_kitchen",
  "other",
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const PICKUP_AREAS = [
  "innenstadt",
  "campus_tu_altgebaeude",
  "campus_nord_bienrode",
  "oestliches_ringgebiet",
  "westliches_ringgebiet",
  "noerdliches_ringgebiet_siegfriedviertel",
  "viewegs_garten_bebelhof",
  "heidberg_melverode",
  "weststadt",
  "lehndorf_kanzlerfeld",
] as const;
export type PickupArea = (typeof PICKUP_AREAS)[number];

export const ITEM_CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

export const SEARCH_SORT_OPTIONS = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
] as const;
export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number];

export const PRICE_LIMITS_CENTS = {
  min: 50,
  max: 1_000_000,
} as const;

export const IMAGE_LIMITS = {
  minOffered: 1,
  minWanted: 0,
  max: 8,
} as const;

export interface PriceRuleResult {
  valid: boolean;
  reason?: string;
}

export function validatePriceRule(
  type: ListingType,
  priceCents: number | null | undefined,
): PriceRuleResult {
  if (type === "SELL") {
    if (priceCents === null || priceCents === undefined) {
      return {
        valid: false,
        reason: "Asking price is required for items for sale.",
      };
    }
    if (!Number.isInteger(priceCents)) {
      return {
        valid: false,
        reason: "Price must be an integer number of euro cents.",
      };
    }
    if (
      priceCents < PRICE_LIMITS_CENTS.min ||
      priceCents > PRICE_LIMITS_CENTS.max
    ) {
      return {
        valid: false,
        reason: `Asking price must be between €${(PRICE_LIMITS_CENTS.min / 100).toFixed(2)} and €${(PRICE_LIMITS_CENTS.max / 100).toFixed(2)}.`,
      };
    }
    return { valid: true };
  }

  if (type === "GIVE_AWAY") {
    if (priceCents !== null && priceCents !== undefined && priceCents !== 0) {
      return {
        valid: false,
        reason: "Giveaway items cannot have a price.",
      };
    }
    return { valid: true };
  }

  if (type === "WANTED") {
    if (priceCents === null || priceCents === undefined) {
      return { valid: true };
    }
    if (!Number.isInteger(priceCents)) {
      return {
        valid: false,
        reason: "Budget must be an integer number of euro cents.",
      };
    }
    if (
      priceCents < PRICE_LIMITS_CENTS.min ||
      priceCents > PRICE_LIMITS_CENTS.max
    ) {
      return {
        valid: false,
        reason: `Maximum budget must be between €${(PRICE_LIMITS_CENTS.min / 100).toFixed(2)} and €${(PRICE_LIMITS_CENTS.max / 100).toFixed(2)}.`,
      };
    }
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Unsupported listing type: ${type as string}`,
  };
}

export function isPriceRuleValid(
  type: ListingType,
  priceCents: number | null | undefined,
): boolean {
  return validatePriceRule(type, priceCents).valid;
}

export interface ImageCountResult {
  valid: boolean;
  reason?: string;
}

export function validateImageCount(
  type: ListingType,
  imageCount: number,
): ImageCountResult {
  if (!Number.isInteger(imageCount) || imageCount < 0) {
    return {
      valid: false,
      reason: "Image count must be a non-negative integer.",
    };
  }

  if (imageCount > IMAGE_LIMITS.max) {
    return {
      valid: false,
      reason: `A maximum of ${IMAGE_LIMITS.max} images is allowed.`,
    };
  }

  if (type === "SELL" || type === "GIVE_AWAY") {
    if (imageCount < IMAGE_LIMITS.minOffered) {
      return {
        valid: false,
        reason: "At least one image is required for offerings.",
      };
    }
    return { valid: true };
  }

  if (type === "WANTED") {
    if (imageCount < IMAGE_LIMITS.minWanted) {
      return {
        valid: false,
        reason: `Wanted listings require at least ${IMAGE_LIMITS.minWanted} images.`,
      };
    }
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Unsupported listing type: ${type as string}`,
  };
}

export function isImageCountValid(
  type: ListingType,
  imageCount: number,
): boolean {
  return validateImageCount(type, imageCount).valid;
}

const ALLOWED_STATUS_TRANSITIONS: ReadonlyMap<
  ListingStatus,
  ReadonlySet<ListingStatus>
> = new Map([
  ["active", new Set<ListingStatus>(["reserved", "sold", "archived"])],
  ["reserved", new Set<ListingStatus>(["active", "sold", "archived"])],
  ["sold", new Set<ListingStatus>(["archived"])],
  ["archived", new Set<ListingStatus>()],
]);

export function canTransitionStatus(
  from: ListingStatus,
  to: ListingStatus,
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

export type StatusTransitionResult =
  | {
      ok: true;
      state: ListingStatus;
      changed: boolean;
    }
  | {
      ok: false;
      state: ListingStatus;
      reason: "invalid_transition" | "unknown_status";
    };

export function transitionListingStatus(
  current: ListingStatus,
  target: ListingStatus,
): StatusTransitionResult {
  if (current === target) {
    return { ok: true, state: current, changed: false };
  }

  if (!canTransitionStatus(current, target)) {
    return {
      ok: false,
      state: current,
      reason: "invalid_transition",
    };
  }

  return {
    ok: true,
    state: target,
    changed: true,
  };
}

export * from "./feed.ts";
export * from "./search.ts";
export * from "./favorites.ts";
export * from "./offers.ts";
