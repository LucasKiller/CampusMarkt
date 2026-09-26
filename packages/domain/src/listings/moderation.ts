export const MODERATION_REMOVED_STATUS = "removed" as const;
export type ModerationRemovedStatus = typeof MODERATION_REMOVED_STATUS;

export const MODERATOR_CANCELLATION_REASONS = [
  "moderation_removal",
  "moderation_suspension",
] as const;
export type ModeratorCancellationReason =
  (typeof MODERATOR_CANCELLATION_REASONS)[number];

export class UnauthorizedModeratorError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "User is not authorized as a marketplace moderator.") {
    super(message);
    this.name = "UnauthorizedModeratorError";
  }
}

export class AccountSuspendedError extends Error {
  readonly code = "ACCOUNT_SUSPENDED";

  constructor(message = "Account is suspended by moderation.") {
    super(message);
    this.name = "AccountSuspendedError";
  }
}

export class ListingRemovedError extends Error {
  readonly code = "LISTING_REMOVED";

  constructor(message = "Listing has been removed by moderation.") {
    super(message);
    this.name = "ListingRemovedError";
  }
}

export function canModerate(isModerator: unknown): boolean {
  return isModerator === true;
}

export function assertCanModerate(isModerator: unknown): void {
  if (!canModerate(isModerator)) {
    throw new UnauthorizedModeratorError();
  }
}

export function assertAccountNotSuspended(isSuspended: unknown): void {
  if (isSuspended === true) {
    throw new AccountSuspendedError();
  }
}

export function isListingRemoved(status: string | null | undefined): boolean {
  return status === MODERATION_REMOVED_STATUS;
}

export function assertListingNotRemoved(
  status: string | null | undefined,
): void {
  if (isListingRemoved(status)) {
    throw new ListingRemovedError();
  }
}

export function canEditOrRelistListing(
  status: string | null | undefined,
): boolean {
  if (isListingRemoved(status)) {
    return false;
  }
  return true;
}

export function isListingPubliclyDiscoverable(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return status === "active" || status === "reserved" || status === "sold";
}

export interface ReservationCascadeResult {
  shouldCancel: boolean;
  cancellationReason?: ModeratorCancellationReason;
}

export function resolveReservationCascadeOnListingRemoval(
  reservationStatus: string | null | undefined,
): ReservationCascadeResult {
  if (reservationStatus === "active") {
    return {
      shouldCancel: true,
      cancellationReason: "moderation_removal",
    };
  }
  return {
    shouldCancel: false,
  };
}

export function resolveReservationCascadeOnUserSuspension(
  reservationStatus: string | null | undefined,
): ReservationCascadeResult {
  if (reservationStatus === "active") {
    return {
      shouldCancel: true,
      cancellationReason: "moderation_suspension",
    };
  }
  return {
    shouldCancel: false,
  };
}
