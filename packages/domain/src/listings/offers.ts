import type { OfferStatus, ReservationStatus } from "@campusmarkt/types";

export class SelfNegotiationError extends Error {
  readonly code = "CANNOT_NEGOTIATE_OWN_LISTING";

  constructor(
    message = "Users cannot negotiate or make offers on their own listings.",
  ) {
    super(message);
    this.name = "SelfNegotiationError";
  }
}

export class InvalidOfferTransitionError extends Error {
  readonly code = "INVALID_OFFER_TRANSITION";

  constructor(from: string, to: string) {
    super(`Cannot transition offer from '${from}' to '${to}'.`);
    this.name = "InvalidOfferTransitionError";
  }
}

export class InvalidReservationTransitionError extends Error {
  readonly code = "INVALID_RESERVATION_TRANSITION";

  constructor(from: string, to: string) {
    super(`Cannot transition reservation from '${from}' to '${to}'.`);
    this.name = "InvalidReservationTransitionError";
  }
}

export class ListingAlreadyReservedError extends Error {
  readonly code = "LISTING_ALREADY_RESERVED";

  constructor(
    message = "Listing is already reserved by another accepted offer.",
  ) {
    super(message);
    this.name = "ListingAlreadyReservedError";
  }
}

export function canNegotiate(buyerId: string, sellerId: string): boolean {
  if (!buyerId || !sellerId) {
    return false;
  }
  return buyerId.trim().toLowerCase() !== sellerId.trim().toLowerCase();
}

export function assertCanNegotiate(buyerId: string, sellerId: string): void {
  if (!buyerId || !sellerId) {
    throw new Error("Buyer ID and Seller ID must be non-empty strings.");
  }
  if (!canNegotiate(buyerId, sellerId)) {
    throw new SelfNegotiationError();
  }
}

const ALLOWED_OFFER_TRANSITIONS: ReadonlyMap<
  OfferStatus,
  ReadonlySet<OfferStatus>
> = new Map([
  [
    "pending",
    new Set<OfferStatus>([
      "accepted",
      "declined",
      "withdrawn",
      "countered",
      "superseded",
    ]),
  ],
  ["accepted", new Set<OfferStatus>()],
  ["declined", new Set<OfferStatus>()],
  ["withdrawn", new Set<OfferStatus>()],
  ["countered", new Set<OfferStatus>()],
  ["superseded", new Set<OfferStatus>()],
]);

export function canTransitionOffer(
  from: OfferStatus,
  to: OfferStatus,
): boolean {
  const allowed = ALLOWED_OFFER_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

export function assertValidOfferTransition(
  from: OfferStatus,
  to: OfferStatus,
): void {
  if (from === to) {
    return;
  }
  if (!canTransitionOffer(from, to)) {
    throw new InvalidOfferTransitionError(from, to);
  }
}

const ALLOWED_RESERVATION_TRANSITIONS: ReadonlyMap<
  ReservationStatus,
  ReadonlySet<ReservationStatus>
> = new Map([
  ["active", new Set<ReservationStatus>(["completed", "cancelled"])],
  ["completed", new Set<ReservationStatus>()],
  ["cancelled", new Set<ReservationStatus>()],
]);

export function canTransitionReservation(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  const allowed = ALLOWED_RESERVATION_TRANSITIONS.get(from);
  return allowed ? allowed.has(to) : false;
}

export function assertValidReservationTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): void {
  if (from === to) {
    return;
  }
  if (!canTransitionReservation(from, to)) {
    throw new InvalidReservationTransitionError(from, to);
  }
}

export function supersedeCompromisedOffers<
  T extends { id: string; status: OfferStatus },
>(offers: readonly T[], acceptedOfferId: string): T[] {
  return offers.map((offer) => {
    if (offer.id !== acceptedOfferId && offer.status === "pending") {
      return {
        ...offer,
        status: "superseded" as OfferStatus,
      };
    }
    return offer;
  });
}
