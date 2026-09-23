import {
  assertCanFavorite,
  canFavorite,
  reconcileOptimisticFavorite,
  toggleFavoriteId,
} from "@campusmarkt/domain";
import type {
  FavoriteItemDTO,
  FavoritesListResponse,
  FavoriteToggleResponse,
  UserFavoriteIdsResponse,
} from "@campusmarkt/types";
import {
  validateFavoritesPaginationQuery,
  validateListingIdParam,
} from "@campusmarkt/validation";
import type {
  FavoritesRepositoryResult,
  GetUserFavoritesRepositoryParams,
} from "../server/favorites-repository";

export {
  assertCanFavorite,
  canFavorite,
  reconcileOptimisticFavorite,
  toggleFavoriteId,
};

export type {
  FavoriteItemDTO,
  FavoritesListResponse,
  FavoriteToggleResponse,
  UserFavoriteIdsResponse,
};

export interface FavoritesRepositoryPort {
  toggleFavorite(
    listingId: string,
  ): Promise<FavoritesRepositoryResult<FavoriteToggleResponse>>;
  getUserFavoriteIds(): Promise<FavoritesRepositoryResult<string[]>>;
  getUserFavorites(
    params?: GetUserFavoritesRepositoryParams,
  ): Promise<FavoritesRepositoryResult<FavoritesListResponse>>;
}

export type FavoritesTelemetryEvent = {
  eventType: "favorite.toggled" | "favorite.removed" | "favorites.queried";
  correlationId?: string;
  metadata?: {
    listingId?: string;
    userId?: string;
    isFavorited?: boolean;
    outcome?: string;
    durationMs?: number;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type FavoritesSecurityAudit = {
  recordTelemetry?(event: FavoritesTelemetryEvent): Promise<void>;
  checkRateLimit?(
    userId: string,
    action: "toggle_favorite",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type FavoritesApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "cannot_favorite_own_listing"; message: string }
  | { status: "not_found"; message?: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export interface MarketplaceFavoritesService {
  toggleFavorite(
    userId: string,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<FavoritesApplicationResult<FavoriteToggleResponse>>;

  getUserFavoriteIds(
    userId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<FavoritesApplicationResult<UserFavoriteIdsResponse>>;

  getUserFavorites(
    userId: string,
    query?: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<FavoritesApplicationResult<FavoritesListResponse>>;
}

export function createMarketplaceFavoritesService(ports: {
  repository: FavoritesRepositoryPort;
  security?: FavoritesSecurityAudit;
}): MarketplaceFavoritesService {
  const { repository, security } = ports;

  return {
    async toggleFavorite(userId, input, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      // 1. Validate listing ID parameter
      const parseResult = validateListingIdParam(input);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
        };
      }
      const listingId = parseResult.listingId;

      // 2. Enforce user rate limiting (30 actions/min)
      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(
          userId,
          "toggle_favorite",
        );
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "favorite.toggled",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                listingId,
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

      // 3. Call repository toggle RPC
      const repoResult = await repository.toggleFavorite(listingId);

      if (!repoResult.ok) {
        if (repoResult.code === "CANNOT_FAVORITE_OWN_LISTING") {
          if (security?.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "favorite.toggled",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                listingId,
                outcome: "cannot_favorite_own_listing",
              },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "cannot_favorite_own_listing",
            message: "Users cannot favorite their own listings.",
          };
        }

        if (repoResult.code === "NOT_FOUND") {
          if (security?.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "favorite.toggled",
              correlationId: context?.correlationId,
              metadata: {
                userId,
                listingId,
                outcome: "not_found",
              },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "not_found",
            message: repoResult.message || "Listing not found or archived.",
          };
        }

        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }

        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid input",
          };
        }

        return { status: "unavailable" };
      }

      // 4. Record telemetry
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: repoResult.value.isFavorited
            ? "favorite.toggled"
            : "favorite.removed",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            listingId,
            isFavorited: repoResult.value.isFavorited,
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

    async getUserFavoriteIds(userId) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const repoResult = await repository.getUserFavoriteIds();
      if (!repoResult.ok) {
        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }
        return { status: "unavailable" };
      }

      return {
        status: "success",
        data: { ids: repoResult.value },
      };
    },

    async getUserFavorites(userId, query) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const parseResult = validateFavoritesPaginationQuery(query ?? {});
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
        };
      }

      const repoResult = await repository.getUserFavorites({
        cursor: parseResult.value.cursor,
        limit: parseResult.value.limit,
      });

      if (!repoResult.ok) {
        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }
        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid pagination parameters",
          };
        }
        return { status: "unavailable" };
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },
  };
}
