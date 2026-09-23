import {
  assertCanNegotiate,
  canNegotiate,
  assertValidOfferTransition,
  canTransitionOffer,
  canTransitionReservation,
  assertValidReservationTransition,
  supersedeCompromisedOffers,
  SelfNegotiationError,
} from "@campusmarkt/domain";
import type {
  AcceptOfferResponse,
  CancelReservationRequest,
  CancelReservationResponse,
  CounterOfferRequest,
  CreateOfferRequest,
  OfferDTO,
  OfferStatus,
  ReservationDTO,
  ReservationStatus,
} from "@campusmarkt/types";
import {
  validateCancelReservationInput,
  validateCounterOfferInput,
  validateCreateOfferInput,
} from "@campusmarkt/validation";
import type {
  OffersRepositoryErrorCode,
  OffersRepositoryResult,
} from "../server/offers-repository";

export {
  assertCanNegotiate,
  canNegotiate,
  assertValidOfferTransition,
  canTransitionOffer,
  canTransitionReservation,
  assertValidReservationTransition,
  supersedeCompromisedOffers,
};

export type {
  OfferDTO,
  ReservationDTO,
  OfferStatus,
  ReservationStatus,
  CreateOfferRequest,
  CounterOfferRequest,
  CancelReservationRequest,
  AcceptOfferResponse,
  CancelReservationResponse,
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface NegotiationRepositoryPort {
  createOffer(
    listingId: string,
    amountCents: number,
    message?: string | null,
  ): Promise<
    OffersRepositoryResult<{
      offerId: string;
      listingId: string;
      amountCents: number;
      status: OfferStatus;
    }>
  >;
  counterOffer(
    parentOfferId: string,
    amountCents: number,
    message?: string | null,
  ): Promise<
    OffersRepositoryResult<{
      offerId: string;
      parentOfferId: string;
      listingId: string;
      amountCents: number;
      status: OfferStatus;
    }>
  >;
  acceptOffer(
    offerId: string,
  ): Promise<OffersRepositoryResult<AcceptOfferResponse>>;
  cancelReservation(
    reservationId: string,
    reason: string,
  ): Promise<OffersRepositoryResult<CancelReservationResponse>>;
  declineOffer?(
    offerId: string,
  ): Promise<OffersRepositoryResult<{ offerId: string; status: OfferStatus }>>;
  withdrawOffer?(
    offerId: string,
  ): Promise<OffersRepositoryResult<{ offerId: string; status: OfferStatus }>>;
  getOffersForListing?(
    listingId: string,
  ): Promise<OffersRepositoryResult<OfferDTO[]>>;
  getOfferById?(
    offerId: string,
  ): Promise<OffersRepositoryResult<OfferDTO | null>>;
  getActiveReservationForListing?(
    listingId: string,
  ): Promise<OffersRepositoryResult<ReservationDTO | null>>;
  getUserReservations?(
    userId: string,
  ): Promise<OffersRepositoryResult<ReservationDTO[]>>;
}

export type NegotiationTelemetryEvent = {
  eventType:
    | "offer.created"
    | "offer.countered"
    | "offer.accepted"
    | "offer.declined"
    | "offer.withdrawn"
    | "reservation.cancelled";
  correlationId?: string;
  metadata?: {
    userId?: string;
    listingId?: string;
    offerId?: string;
    reservationId?: string;
    amountCents?: number;
    outcome?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type NegotiationSecurityAudit = {
  recordTelemetry?(event: NegotiationTelemetryEvent): Promise<void>;
  checkRateLimit?(
    userId: string,
    action:
      | "create_offer"
      | "counter_offer"
      | "accept_offer"
      | "cancel_reservation"
      | "decline_offer"
      | "withdraw_offer",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type NegotiationApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "cannot_negotiate_own_listing"; message: string }
  | { status: "listing_already_reserved"; message: string }
  | { status: "forbidden"; message?: string }
  | { status: "not_found"; message?: string }
  | { status: "conflict"; message: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

function mapRepoErrorCodeToApplicationResult<T>(
  code: OffersRepositoryErrorCode,
  message?: string,
): NegotiationApplicationResult<T> {
  switch (code) {
    case "CANNOT_NEGOTIATE_OWN_LISTING":
      return {
        status: "cannot_negotiate_own_listing",
        message:
          message ||
          "Users cannot negotiate or make offers on their own listings.",
      };
    case "LISTING_ALREADY_RESERVED":
      return {
        status: "listing_already_reserved",
        message:
          message || "Listing is already reserved by another accepted offer.",
      };
    case "UNAUTHENTICATED":
      return { status: "unauthenticated" };
    case "FORBIDDEN":
      return { status: "forbidden", message: message || "Forbidden" };
    case "NOT_FOUND":
      return { status: "not_found", message: message || "Resource not found" };
    case "INVALID_OFFER_AMOUNT":
    case "INVALID_INPUT":
    case "LISTING_NOT_ACTIVE":
      return { status: "invalid", message: message || "Invalid input" };
    case "OFFER_NOT_PENDING":
    case "RESERVATION_NOT_ACTIVE":
      return {
        status: "conflict",
        message: message || "Resource is not in an actionable state",
      };
    case "DEPENDENCY_UNAVAILABLE":
    case "INVALID_PROVIDER_RESPONSE":
    default:
      return { status: "unavailable" };
  }
}

export interface MarketplaceNegotiationService {
  createOffer(
    userId: string,
    input: unknown,
    context?: {
      correlationId?: string;
      clientIp?: string;
      sellerId?: string;
      askingPriceCents?: number | null;
      allowZero?: boolean;
    },
  ): Promise<
    NegotiationApplicationResult<{
      offerId: string;
      listingId: string;
      amountCents: number;
      status: OfferStatus;
    }>
  >;

  counterOffer(
    userId: string,
    parentOfferId: string,
    input: unknown,
    context?: {
      correlationId?: string;
      clientIp?: string;
      askingPriceCents?: number | null;
    },
  ): Promise<
    NegotiationApplicationResult<{
      offerId: string;
      parentOfferId: string;
      listingId: string;
      amountCents: number;
      status: OfferStatus;
    }>
  >;

  acceptOffer(
    userId: string,
    offerId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<NegotiationApplicationResult<AcceptOfferResponse>>;

  cancelReservation(
    userId: string,
    reservationId: string,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<NegotiationApplicationResult<CancelReservationResponse>>;

  declineOffer(
    userId: string,
    offerId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<
    NegotiationApplicationResult<{ offerId: string; status: OfferStatus }>
  >;

  withdrawOffer(
    userId: string,
    offerId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<
    NegotiationApplicationResult<{ offerId: string; status: OfferStatus }>
  >;

  getOffersForListing(
    userId: string,
    listingId: string,
  ): Promise<NegotiationApplicationResult<OfferDTO[]>>;

  getActiveReservationForListing(
    userId: string,
    listingId: string,
  ): Promise<NegotiationApplicationResult<ReservationDTO | null>>;

  getUserReservations(
    userId: string,
  ): Promise<NegotiationApplicationResult<ReservationDTO[]>>;
}

export function createMarketplaceNegotiationService(ports: {
  repository: NegotiationRepositoryPort;
  security?: NegotiationSecurityAudit;
}): MarketplaceNegotiationService {
  const { repository, security } = ports;

  return {
    async createOffer(userId, input, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      // 1. Validate payload
      const parseResult = validateCreateOfferInput(input, {
        askingPriceCents: context?.askingPriceCents,
        allowZero: context?.allowZero,
      });

      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
          message: parseResult.errors[0],
        };
      }

      // 2. Self-negotiation check if sellerId is provided in context
      if (context?.sellerId) {
        try {
          assertCanNegotiate(userId, context.sellerId);
        } catch (err) {
          if (err instanceof SelfNegotiationError) {
            return {
              status: "cannot_negotiate_own_listing",
              message: err.message,
            };
          }
          throw err;
        }
      }

      // 3. Rate limiting (15 actions/minute)
      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(userId, "create_offer");
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "offer.created",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                listingId: parseResult.value.listingId,
                amountCents: parseResult.value.amountCents,
                outcome: "rate_limited",
              },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      // 4. Call repository RPC
      const repoResult = await repository.createOffer(
        parseResult.value.listingId,
        parseResult.value.amountCents,
        parseResult.value.message,
      );

      if (!repoResult.ok) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "offer.created",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              listingId: parseResult.value.listingId,
              amountCents: parseResult.value.amountCents,
              outcome: repoResult.code,
            },
            timestamp: new Date().toISOString(),
          });
        }
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      // 5. Telemetry
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "offer.created",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            listingId: repoResult.value.listingId,
            offerId: repoResult.value.offerId,
            amountCents: repoResult.value.amountCents,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async counterOffer(userId, parentOfferId, input, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (
        !parentOfferId ||
        typeof parentOfferId !== "string" ||
        !UUID_PATTERN.test(parentOfferId.trim())
      ) {
        return {
          status: "invalid",
          fieldErrors: {
            parentOfferId: ["Parent offer ID must be a valid UUID."],
          },
          message: "Parent offer ID must be a valid UUID.",
        };
      }

      const parseResult = validateCounterOfferInput(input, {
        askingPriceCents: context?.askingPriceCents,
      });

      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
          message: parseResult.errors[0],
        };
      }

      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(
          userId,
          "counter_offer",
        );
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "offer.countered",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                parentOfferId,
                amountCents: parseResult.value.amountCents,
                outcome: "rate_limited",
              },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      const repoResult = await repository.counterOffer(
        parentOfferId.trim(),
        parseResult.value.amountCents,
        parseResult.value.message,
      );

      if (!repoResult.ok) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "offer.countered",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              parentOfferId,
              amountCents: parseResult.value.amountCents,
              outcome: repoResult.code,
            },
            timestamp: new Date().toISOString(),
          });
        }
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "offer.countered",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            parentOfferId,
            offerId: repoResult.value.offerId,
            listingId: repoResult.value.listingId,
            amountCents: repoResult.value.amountCents,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async acceptOffer(userId, offerId, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (
        !offerId ||
        typeof offerId !== "string" ||
        !UUID_PATTERN.test(offerId.trim())
      ) {
        return {
          status: "invalid",
          fieldErrors: { offerId: ["Offer ID must be a valid UUID."] },
          message: "Offer ID must be a valid UUID.",
        };
      }

      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(userId, "accept_offer");
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "offer.accepted",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                offerId,
                outcome: "rate_limited",
              },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      const repoResult = await repository.acceptOffer(offerId.trim());

      if (!repoResult.ok) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "offer.accepted",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              offerId,
              outcome: repoResult.code,
            },
            timestamp: new Date().toISOString(),
          });
        }
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "offer.accepted",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            offerId,
            reservationId: repoResult.value.reservationId,
            listingId: repoResult.value.listingId,
            agreedPriceCents: repoResult.value.agreedPriceCents,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async cancelReservation(userId, reservationId, input, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (
        !reservationId ||
        typeof reservationId !== "string" ||
        !UUID_PATTERN.test(reservationId.trim())
      ) {
        return {
          status: "invalid",
          fieldErrors: {
            reservationId: ["Reservation ID must be a valid UUID."],
          },
          message: "Reservation ID must be a valid UUID.",
        };
      }

      const parseResult = validateCancelReservationInput(input);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
          message: parseResult.errors[0],
        };
      }

      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(
          userId,
          "cancel_reservation",
        );
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "reservation.cancelled",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                reservationId,
                outcome: "rate_limited",
              },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      const repoResult = await repository.cancelReservation(
        reservationId.trim(),
        parseResult.value.reason,
      );

      if (!repoResult.ok) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "reservation.cancelled",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              reservationId,
              outcome: repoResult.code,
            },
            timestamp: new Date().toISOString(),
          });
        }
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "reservation.cancelled",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            reservationId,
            listingId: repoResult.value.listingId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async declineOffer(userId, offerId, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (
        !offerId ||
        typeof offerId !== "string" ||
        !UUID_PATTERN.test(offerId.trim())
      ) {
        return {
          status: "invalid",
          fieldErrors: { offerId: ["Offer ID must be a valid UUID."] },
          message: "Offer ID must be a valid UUID.",
        };
      }

      if (!repository.declineOffer) {
        return { status: "unavailable" };
      }

      const repoResult = await repository.declineOffer(offerId.trim());

      if (!repoResult.ok) {
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "offer.declined",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            offerId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async withdrawOffer(userId, offerId, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (
        !offerId ||
        typeof offerId !== "string" ||
        !UUID_PATTERN.test(offerId.trim())
      ) {
        return {
          status: "invalid",
          fieldErrors: { offerId: ["Offer ID must be a valid UUID."] },
          message: "Offer ID must be a valid UUID.",
        };
      }

      if (!repository.withdrawOffer) {
        return { status: "unavailable" };
      }

      const repoResult = await repository.withdrawOffer(offerId.trim());

      if (!repoResult.ok) {
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "offer.withdrawn",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            offerId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async getOffersForListing(userId, listingId) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (!repository.getOffersForListing) {
        return { status: "unavailable" };
      }

      const repoResult = await repository.getOffersForListing(listingId);
      if (!repoResult.ok) {
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async getActiveReservationForListing(userId, listingId) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (!repository.getActiveReservationForListing) {
        return { status: "unavailable" };
      }

      const repoResult =
        await repository.getActiveReservationForListing(listingId);
      if (!repoResult.ok) {
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async getUserReservations(userId) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      if (!repository.getUserReservations) {
        return { status: "unavailable" };
      }

      const repoResult = await repository.getUserReservations(userId);
      if (!repoResult.ok) {
        return mapRepoErrorCodeToApplicationResult(
          repoResult.code,
          repoResult.message,
        );
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },
  };
}
