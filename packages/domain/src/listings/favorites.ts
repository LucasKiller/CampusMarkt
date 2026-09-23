export class SelfFavoriteError extends Error {
  readonly code = "CANNOT_FAVORITE_OWN_LISTING";

  constructor(message = "Users cannot favorite their own listings.") {
    super(message);
    this.name = "SelfFavoriteError";
  }
}

export function canFavorite(userId: string, sellerId: string): boolean {
  if (!userId || !sellerId) {
    return false;
  }
  return userId.trim().toLowerCase() !== sellerId.trim().toLowerCase();
}

export function assertCanFavorite(userId: string, sellerId: string): void {
  if (!userId || !sellerId) {
    throw new Error("User ID and Seller ID must be non-empty strings.");
  }
  if (userId.trim().toLowerCase() === sellerId.trim().toLowerCase()) {
    throw new SelfFavoriteError();
  }
}

export function isListingFavorited(
  favoriteIds: ReadonlySet<string> | readonly string[],
  listingId: string,
): boolean {
  if (!listingId) {
    return false;
  }
  const normalizedId = listingId.trim().toLowerCase();
  for (const id of favoriteIds) {
    if (id.trim().toLowerCase() === normalizedId) {
      return true;
    }
  }
  return false;
}

export function addFavoriteId(
  currentIds: ReadonlySet<string> | readonly string[],
  listingId: string,
): Set<string> {
  const result = new Set<string>();
  for (const id of currentIds) {
    result.add(id.trim().toLowerCase());
  }
  if (listingId && listingId.trim().length > 0) {
    result.add(listingId.trim().toLowerCase());
  }
  return result;
}

export function removeFavoriteId(
  currentIds: ReadonlySet<string> | readonly string[],
  listingId: string,
): Set<string> {
  const result = new Set<string>();
  const target = listingId.trim().toLowerCase();
  for (const id of currentIds) {
    const normalized = id.trim().toLowerCase();
    if (normalized !== target) {
      result.add(normalized);
    }
  }
  return result;
}

export function toggleFavoriteId(
  currentIds: ReadonlySet<string> | readonly string[],
  listingId: string,
): { nextIds: Set<string>; isFavorited: boolean } {
  const target = listingId.trim().toLowerCase();
  const currentlyFavorited = isListingFavorited(currentIds, target);

  if (currentlyFavorited) {
    return {
      nextIds: removeFavoriteId(currentIds, target),
      isFavorited: false,
    };
  }

  return {
    nextIds: addFavoriteId(currentIds, target),
    isFavorited: true,
  };
}

export function reconcileOptimisticFavorite(
  currentIds: ReadonlySet<string> | readonly string[],
  listingId: string,
  serverIsFavorited: boolean,
): Set<string> {
  return serverIsFavorited
    ? addFavoriteId(currentIds, listingId)
    : removeFavoriteId(currentIds, listingId);
}

export function revertOptimisticFavorite(
  currentIds: ReadonlySet<string> | readonly string[],
  listingId: string,
  wasFavoritedBefore: boolean,
): Set<string> {
  return wasFavoritedBefore
    ? addFavoriteId(currentIds, listingId)
    : removeFavoriteId(currentIds, listingId);
}
