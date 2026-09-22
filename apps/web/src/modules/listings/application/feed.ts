import type {
  PublicFeedItem,
  PublicFeedResponse,
  PublicListingDetails,
} from "@campusmarkt/types";
import {
  decodeCursor,
  encodeCursor,
  validateFeedFilterParams,
} from "@campusmarkt/validation";
import type { FeedRepositoryResult } from "../server/feed-repository";

export interface FeedRepositoryPort {
  getPublicFeed(params?: {
    cursorCreatedAt?: string | null;
    cursorId?: string | null;
    category?: string | null;
    pickupArea?: string | null;
    listingType?: string | null;
    limit?: number;
  }): Promise<FeedRepositoryResult<PublicFeedItem[]>>;
  getPublicListingDetails(
    listingId: string,
  ): Promise<FeedRepositoryResult<PublicListingDetails | null>>;
}

export type FeedTelemetryEvent = {
  eventType: "feed.queried" | "listing.viewed";
  correlationId?: string;
  metadata?: {
    category?: string;
    pickupArea?: string;
    listingType?: string;
    resultCount?: number;
    hasCursor?: boolean;
    durationMs?: number;
    outcome?: string;
    listingId?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type FeedSecurityAudit = {
  recordTelemetry?(event: FeedTelemetryEvent): Promise<void>;
  checkRateLimit?(
    clientIp: string,
    action: "get_feed",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type FeedApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "not_found" }
  | { status: "unavailable" };

export interface MarketplaceFeedService {
  getPublicFeed(
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<FeedApplicationResult<PublicFeedResponse>>;

  getListingDetails(
    listingId: string,
    context?: { correlationId?: string },
  ): Promise<FeedApplicationResult<PublicListingDetails>>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createMarketplaceFeedService(ports: {
  repository: FeedRepositoryPort;
  security?: FeedSecurityAudit;
}): MarketplaceFeedService {
  const { repository, security } = ports;

  return {
    async getPublicFeed(input, context) {
      const clientIp = context?.clientIp ?? "127.0.0.1";

      // 1. Enforce IP rate limiting (120 req/min)
      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(clientIp, "get_feed");
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "feed.queried",
              correlationId: context?.correlationId,
              metadata: { outcome: "rate_limited" },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      // 2. Validate filter parameters with pure validation schema
      const parseResult = validateFeedFilterParams(input);
      if (!parseResult.ok) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "feed.queried",
            correlationId: context?.correlationId,
            metadata: { outcome: "invalid_input" },
            timestamp: new Date().toISOString(),
          });
        }
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
        };
      }

      // 3. Decode cursor if present
      let cursorCreatedAt: string | null = null;
      let cursorId: string | null = null;
      if (parseResult.value.cursor) {
        const decoded = decodeCursor(parseResult.value.cursor);
        if (decoded.ok) {
          cursorCreatedAt = decoded.value.createdAt;
          cursorId = decoded.value.id;
        }
      }

      // 4. Query repository
      const startTime = Date.now();
      const repoResult = await repository.getPublicFeed({
        cursorCreatedAt,
        cursorId,
        category: parseResult.value.category ?? null,
        pickupArea: parseResult.value.pickupArea ?? null,
        listingType: parseResult.value.listingType ?? null,
        limit: parseResult.value.limit,
      });

      if (!repoResult.ok) {
        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid query parameters",
          };
        }
        return { status: "unavailable" };
      }

      const items = repoResult.value;

      // 5. Compute nextCursor using keyset coordinates of the last item
      let nextCursor: string | null = null;
      if (items.length === parseResult.value.limit && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = encodeCursor({
          createdAt: lastItem.createdAt,
          id: lastItem.id,
        });
      }

      // 6. Record telemetry
      const durationMs = Date.now() - startTime;
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "feed.queried",
          correlationId: context?.correlationId,
          metadata: {
            category: parseResult.value.category,
            pickupArea: parseResult.value.pickupArea,
            listingType: parseResult.value.listingType,
            resultCount: items.length,
            hasCursor: Boolean(parseResult.value.cursor),
            durationMs,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: {
          items,
          nextCursor,
        },
      };
    },

    async getListingDetails(listingId, context) {
      if (
        !listingId ||
        typeof listingId !== "string" ||
        !UUID_PATTERN.test(listingId)
      ) {
        return {
          status: "invalid",
          message: "Invalid listing ID format",
        };
      }

      const repoResult = await repository.getPublicListingDetails(listingId);
      if (!repoResult.ok) {
        if (repoResult.code === "NOT_FOUND") {
          return { status: "not_found" };
        }
        if (repoResult.code === "INVALID_INPUT") {
          return { status: "invalid", message: repoResult.message };
        }
        return { status: "unavailable" };
      }

      if (!repoResult.value) {
        return { status: "not_found" };
      }

      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "listing.viewed",
          correlationId: context?.correlationId,
          metadata: {
            listingId,
            status: repoResult.value.status,
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
  };
}
