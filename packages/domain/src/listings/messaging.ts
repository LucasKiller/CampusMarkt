export class SelfMessagingError extends Error {
  readonly code = "CANNOT_MESSAGE_OWN_LISTING";

  constructor(
    message = "Users cannot message themselves on their own listings.",
  ) {
    super(message);
    this.name = "SelfMessagingError";
  }
}

export function canMessage(buyerId: string, sellerId: string): boolean {
  if (!buyerId || !sellerId) {
    return false;
  }
  return buyerId.trim().toLowerCase() !== sellerId.trim().toLowerCase();
}

export function assertCanMessage(buyerId: string, sellerId: string): void {
  if (!buyerId || !sellerId) {
    throw new Error("Buyer ID and Seller ID must be non-empty strings.");
  }
  if (!canMessage(buyerId, sellerId)) {
    throw new SelfMessagingError();
  }
}

export interface ConversationPartnerResolution {
  partnerId: string;
  isBuyer: boolean;
  isSeller: boolean;
}

export function resolveConversationPartner(
  conversation: { buyerId: string; sellerId: string },
  currentUserId: string,
): ConversationPartnerResolution {
  const normCurrent = currentUserId.trim().toLowerCase();
  const normBuyer = conversation.buyerId.trim().toLowerCase();
  const normSeller = conversation.sellerId.trim().toLowerCase();

  if (normCurrent !== normBuyer && normCurrent !== normSeller) {
    throw new Error("Current user is not a participant in this conversation.");
  }

  const isBuyer = normCurrent === normBuyer;
  return {
    partnerId: isBuyer ? conversation.sellerId : conversation.buyerId,
    isBuyer,
    isSeller: !isBuyer,
  };
}

export type ConversationMilestoneType =
  | "offer_created"
  | "offer_countered"
  | "offer_accepted"
  | "offer_declined"
  | "offer_withdrawn"
  | "reservation_active"
  | "reservation_completed"
  | "reservation_cancelled";

export interface ConversationMilestone {
  id: string;
  type: ConversationMilestoneType;
  timestamp: string;
  label: string;
  description?: string;
  amountCents?: number;
}

export function formatCurrencyEuros(amountCents: number): string {
  return `€${(amountCents / 100).toFixed(2)}`;
}

export function formatOfferMilestone(offer: {
  id: string;
  status: string;
  amountCents: number;
  createdAt: string;
  updatedAt?: string;
  parentOfferId?: string | null;
  buyerId?: string;
  sellerId?: string;
}): ConversationMilestone {
  const amountStr = formatCurrencyEuros(offer.amountCents);
  let type: ConversationMilestoneType = "offer_created";
  let label = `Angebot: ${amountStr}`;

  if (offer.status === "countered" || offer.parentOfferId) {
    type = "offer_countered";
    label = `Gegenangebot: ${amountStr}`;
  }
  if (offer.status === "accepted") {
    type = "offer_accepted";
    label = `Angebot über ${amountStr} angenommen`;
  } else if (offer.status === "declined") {
    type = "offer_declined";
    label = `Angebot abgelehnt`;
  } else if (offer.status === "withdrawn") {
    type = "offer_withdrawn";
    label = `Angebot zurückgezogen`;
  }

  return {
    id: `milestone-offer-${offer.id}-${offer.status}`,
    type,
    timestamp: offer.updatedAt ?? offer.createdAt,
    label,
    amountCents: offer.amountCents,
  };
}

export function formatReservationMilestone(reservation: {
  id: string;
  status: string;
  agreedPriceCents: number;
  createdAt: string;
  updatedAt?: string;
  cancellationReason?: string | null;
}): ConversationMilestone {
  const amountStr = formatCurrencyEuros(reservation.agreedPriceCents);
  let type: ConversationMilestoneType = "reservation_active";
  let label = `Reserviert zur Abholung (${amountStr})`;

  if (reservation.status === "completed") {
    type = "reservation_completed";
    label = `Kauf abgeschlossen (${amountStr})`;
  } else if (reservation.status === "cancelled") {
    type = "reservation_cancelled";
    label = `Reservierung storniert`;
  }

  return {
    id: `milestone-res-${reservation.id}-${reservation.status}`,
    type,
    timestamp: reservation.updatedAt ?? reservation.createdAt,
    label,
    amountCents: reservation.agreedPriceCents,
    description: reservation.cancellationReason ?? undefined,
  };
}
