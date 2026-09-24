import {
  CAMPUS_PICKUP_SPOTS,
  SAFE_PICKUP_RULES,
  assertCanCompletePickup,
  canCompletePickup,
  assertCanTransitionToCompleted,
} from "@campusmarkt/domain";
import type {
  CompletePickupRequest,
  TransactionReceiptDTO,
  SafePickupSpot,
  SafePickupGuidanceDTO,
  PublicProfileDTO,
} from "@campusmarkt/types";
import {
  validateCompletePickupInput,
  validateReservationId,
  validateCompletedHistoryQuery,
} from "@campusmarkt/validation";
import type {
  CompletePickupResult,
  PickupRepositoryErrorCode,
  PickupRepositoryResult,
} from "../server/pickup-repository";

export {
  CAMPUS_PICKUP_SPOTS,
  SAFE_PICKUP_RULES,
  assertCanCompletePickup,
  canCompletePickup,
  assertCanTransitionToCompleted,
};

export type {
  CompletePickupRequest,
  TransactionReceiptDTO,
  SafePickupSpot,
  SafePickupGuidanceDTO,
  PublicProfileDTO,
  CompletePickupResult,
};

export interface PickupRepositoryPort {
  completePickup(
    reservationId: string,
    completionNote?: string | null,
  ): Promise<PickupRepositoryResult<CompletePickupResult>>;
  getCompletedTransactions(
    limit?: number,
  ): Promise<PickupRepositoryResult<TransactionReceiptDTO[]>>;
}

export type PickupTelemetryEvent = {
  eventType: "pickup.completed" | "marketplace.pickup.completed";
  correlationId?: string;
  metadata?: {
    userId?: string;
    reservationId?: string;
    listingId?: string;
    agreedPriceCents?: number;
    outcome?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type PickupSecurityAudit = {
  recordTelemetry?(event: PickupTelemetryEvent): Promise<void>;
  checkRateLimit?(
    userId: string,
    action: "complete_pickup",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type PickupApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "forbidden"; message?: string }
  | { status: "not_found"; message?: string }
  | { status: "conflict"; message: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

function mapRepoErrorCodeToApplicationResult<T>(
  code: PickupRepositoryErrorCode,
  message?: string,
): PickupApplicationResult<T> {
  switch (code) {
    case "UNAUTHENTICATED":
      return { status: "unauthenticated" };
    case "FORBIDDEN":
      return {
        status: "forbidden",
        message:
          message || "Only the seller can mark the handover as completed.",
      };
    case "NOT_FOUND":
      return {
        status: "not_found",
        message: message || "Reservation not found.",
      };
    case "RESERVATION_NOT_ACTIVE":
      return {
        status: "conflict",
        message:
          message || "Reservation is not active and cannot be completed.",
      };
    case "RESERVATION_ALREADY_COMPLETED":
      return {
        status: "conflict",
        message: message || "Reservation is already completed.",
      };
    case "INVALID_INPUT":
      return {
        status: "invalid",
        message: message || "Invalid input.",
      };
    case "INVALID_PROVIDER_RESPONSE":
    case "DEPENDENCY_UNAVAILABLE":
    default:
      return { status: "unavailable" };
  }
}

export function createMarketplacePickupService(dependencies: {
  repository: PickupRepositoryPort;
  security?: PickupSecurityAudit;
}) {
  const { repository, security = {} } = dependencies;

  return {
    getSafePickupGuidance(): SafePickupGuidanceDTO {
      return {
        rules: [...SAFE_PICKUP_RULES],
        spots: [...CAMPUS_PICKUP_SPOTS],
      };
    },

    async completePickup(
      userId: string,
      reservationId: string,
      input?: unknown,
      context?: { correlationId?: string },
    ): Promise<PickupApplicationResult<CompletePickupResult>> {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const resIdValidation = validateReservationId(reservationId);
      if (!resIdValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: resIdValidation.fieldErrors,
          message: resIdValidation.errors[0],
        };
      }

      let completionNote: string | null = null;
      if (input !== undefined && input !== null) {
        const inputValidation = validateCompletePickupInput(input);
        if (!inputValidation.ok) {
          return {
            status: "invalid",
            fieldErrors: inputValidation.fieldErrors,
            message: inputValidation.errors[0],
          };
        }
        completionNote = inputValidation.value.completionNote ?? null;
      }

      if (security.checkRateLimit) {
        try {
          const rateLimit = await security.checkRateLimit(
            userId,
            "complete_pickup",
          );
          if (!rateLimit.allowed) {
            return {
              status: "rate_limited",
              retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
            };
          }
        } catch (err) {
          console.error("[MarketplacePickupService: rateLimit]", err);
          return { status: "unavailable" };
        }
      }

      try {
        const repoResult = await repository.completePickup(
          resIdValidation.value,
          completionNote,
        );

        if (!repoResult.ok) {
          return mapRepoErrorCodeToApplicationResult<CompletePickupResult>(
            repoResult.code,
            repoResult.message,
          );
        }

        if (security.recordTelemetry) {
          try {
            await security.recordTelemetry({
              eventType: "marketplace.pickup.completed",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                reservationId: repoResult.value.reservationId,
                listingId: repoResult.value.listingId,
                agreedPriceCents: repoResult.value.agreedPriceCents,
                outcome: "succeeded",
              },
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error("[MarketplacePickupService: telemetry]", err);
          }
        }

        return {
          status: "success",
          data: repoResult.value,
        };
      } catch (err) {
        console.error("[MarketplacePickupService: completePickup]", err);
        return { status: "unavailable" };
      }
    },

    async getCompletedTransactions(
      userId: string,
      query?: unknown,
    ): Promise<PickupApplicationResult<TransactionReceiptDTO[]>> {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const queryValidation = validateCompletedHistoryQuery(query);
      if (!queryValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: queryValidation.fieldErrors,
          message: queryValidation.errors[0],
        };
      }

      try {
        const repoResult = await repository.getCompletedTransactions(
          queryValidation.value.limit,
        );

        if (!repoResult.ok) {
          return mapRepoErrorCodeToApplicationResult<TransactionReceiptDTO[]>(
            repoResult.code,
            repoResult.message,
          );
        }

        return {
          status: "success",
          data: repoResult.value,
        };
      } catch (err) {
        console.error(
          "[MarketplacePickupService: getCompletedTransactions]",
          err,
        );
        return { status: "unavailable" };
      }
    },
  };
}

export type MarketplacePickupService = ReturnType<
  typeof createMarketplacePickupService
>;
