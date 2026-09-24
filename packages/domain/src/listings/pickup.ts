import type { SafePickupSpot } from "@campusmarkt/types";

export const CAMPUS_PICKUP_SPOTS: readonly SafePickupSpot[] = [
  {
    id: "MENSA_1",
    name: "Mensa 1 Katharinenstraße",
    description: "Hauptfoyer / Vorplatz",
  },
  {
    id: "UNIVERSITAETSPLATZ",
    name: "Universitätsplatz",
    description: "Vor dem Forumsgebäude",
  },
  {
    id: "UB_FOYER",
    name: "Universitätsbibliothek",
    description: "Universitätsplatz - Eingangsbereich",
  },
  {
    id: "CAMPUS_NORD",
    name: "Campus Nord",
    description: "Bienroder Weg - Mensa 2 Vorplatz",
  },
] as const;

export const SAFE_PICKUP_RULES = [
  "Treffpunkt an belebten Campus-Orten (z.B. Mensa 1, Universitätsplatz, Universitätsbibliothek).",
  "Begutachtung vor der Bezahlung: Zustand der Ware vor Ort genau prüfen.",
  "Direktzahlung bei Übergabe: Bar oder Sofortüberweisung. Niemals im Voraus bezahlen!",
  "Tageslicht-Treffen bevorzugen.",
] as const;

export class PickupCompletionAuthorityError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "Only the seller can mark the handover as completed.") {
    super(message);
    this.name = "PickupCompletionAuthorityError";
  }
}

export class ReservationNotActiveError extends Error {
  readonly code = "RESERVATION_NOT_ACTIVE";

  constructor(message = "Reservation is not active and cannot be completed.") {
    super(message);
    this.name = "ReservationNotActiveError";
  }
}

export class ReservationAlreadyCompletedError extends Error {
  readonly code = "RESERVATION_ALREADY_COMPLETED";

  constructor(message = "Reservation is already completed.") {
    super(message);
    this.name = "ReservationAlreadyCompletedError";
  }
}

export function canCompletePickup(userId: string, sellerId: string): boolean {
  if (!userId || !sellerId) {
    return false;
  }
  return userId.trim().toLowerCase() === sellerId.trim().toLowerCase();
}

export function assertCanCompletePickup(
  userId: string,
  sellerId: string,
): void {
  if (!userId || !sellerId) {
    throw new PickupCompletionAuthorityError(
      "User ID and Seller ID must be non-empty strings.",
    );
  }
  if (!canCompletePickup(userId, sellerId)) {
    throw new PickupCompletionAuthorityError();
  }
}

export function assertCanTransitionToCompleted(
  reservationStatus: string,
  listingStatus: string,
): void {
  if (reservationStatus === "completed") {
    throw new ReservationAlreadyCompletedError();
  }
  if (reservationStatus !== "active") {
    throw new ReservationNotActiveError(
      `Cannot complete reservation with status '${reservationStatus}'.`,
    );
  }
  if (listingStatus !== "reserved" && listingStatus !== "active") {
    throw new ReservationNotActiveError(
      `Cannot complete reservation for listing with status '${listingStatus}'.`,
    );
  }
}
