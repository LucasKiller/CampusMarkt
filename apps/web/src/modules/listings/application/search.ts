import type { PublicFeedItem, SearchResultsResponse } from "@campusmarkt/types";
import { validateSearchParams } from "@campusmarkt/validation";
import { resolveSortOption } from "@campusmarkt/domain";
import type {
  SearchRepositoryParams,
  SearchRepositoryResult,
} from "../server/search-repository";

export interface SearchRepositoryPort {
  searchListings(
    params?: SearchRepositoryParams,
  ): Promise<SearchRepositoryResult<PublicFeedItem[]>>;
}

export type SearchTelemetryEvent = {
  eventType: "search.queried";
  correlationId?: string;
  metadata?: {
    query?: string;
    categories?: string[];
    pickupAreas?: string[];
    listingTypes?: string[];
    conditions?: string[];
    minPriceCents?: number;
    maxPriceCents?: number;
    verifiedOnly?: boolean;
    sort?: string;
    resultCount?: number;
    hasCursor?: boolean;
    durationMs?: number;
    outcome?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type SearchSecurityAudit = {
  recordTelemetry?(event: SearchTelemetryEvent): Promise<void>;
  checkRateLimit?(
    clientIp: string,
    action: "search_listings",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type SearchApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

export interface MarketplaceSearchService {
  search(
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<SearchApplicationResult<SearchResultsResponse>>;
}

export function createMarketplaceSearchService(ports: {
  repository: SearchRepositoryPort;
  security?: SearchSecurityAudit;
}): MarketplaceSearchService {
  const { repository, security } = ports;

  return {
    async search(input, context) {
      const clientIp = context?.clientIp ?? "127.0.0.1";

      // 1. Enforce IP rate limiting (60 req/min)
      if (security?.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(
          clientIp,
          "search_listings",
        );
        if (!rateLimit.allowed) {
          if (security.recordTelemetry) {
            await security.recordTelemetry({
              eventType: "search.queried",
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
      const parseResult = validateSearchParams(input);
      if (!parseResult.ok) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "search.queried",
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
      let cursorRank: number | null = null;
      let cursorPriceCents: number | null = null;
      let cursorCreatedAt: string | null = null;
      let cursorId: string | null = null;

      if (parseResult.value.cursor) {
        try {
          const decodedJson = Buffer.from(
            parseResult.value.cursor,
            "base64url",
          ).toString("utf-8");
          const decoded = JSON.parse(decodedJson);
          if (
            decoded &&
            typeof decoded === "object" &&
            !Array.isArray(decoded)
          ) {
            if (typeof decoded.createdAt === "string")
              cursorCreatedAt = decoded.createdAt;
            if (typeof decoded.id === "string") cursorId = decoded.id;
            if (typeof decoded.rank === "number") cursorRank = decoded.rank;
            if (
              typeof decoded.priceCents === "number" ||
              decoded.priceCents === null
            ) {
              cursorPriceCents = decoded.priceCents;
            }
          }
        } catch {
          return {
            status: "invalid",
            fieldErrors: { cursor: ["Invalid search cursor format."] },
          };
        }
      }

      // 4. Query repository
      const startTime = Date.now();
      const sort = resolveSortOption(
        parseResult.value.sort,
        parseResult.value.query,
      );

      const repoResult = await repository.searchListings({
        query: parseResult.value.query ?? null,
        categories: parseResult.value.categories ?? null,
        pickupAreas: parseResult.value.pickupAreas ?? null,
        listingTypes: parseResult.value.listingTypes ?? null,
        conditions: parseResult.value.conditions ?? null,
        minPriceCents: parseResult.value.minPriceCents ?? null,
        maxPriceCents: parseResult.value.maxPriceCents ?? null,
        verifiedOnly: parseResult.value.verifiedOnly ?? false,
        sort,
        cursorRank,
        cursorPriceCents,
        cursorCreatedAt,
        cursorId,
        limit: parseResult.value.limit,
      });

      if (!repoResult.ok) {
        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid search query parameters",
          };
        }
        return { status: "unavailable" };
      }

      const items = repoResult.value;

      // 5. Compute nextCursor using keyset coordinates of the last item
      let nextCursor: string | null = null;
      if (items.length === parseResult.value.limit && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = Buffer.from(
          JSON.stringify({
            createdAt: lastItem.createdAt,
            id: lastItem.id,
            priceCents: lastItem.priceCents,
          }),
          "utf-8",
        ).toString("base64url");
      }

      // 6. Record telemetry
      const durationMs = Date.now() - startTime;
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "search.queried",
          correlationId: context?.correlationId,
          metadata: {
            query: parseResult.value.query,
            categories: parseResult.value.categories,
            pickupAreas: parseResult.value.pickupAreas,
            listingTypes: parseResult.value.listingTypes,
            conditions: parseResult.value.conditions,
            minPriceCents: parseResult.value.minPriceCents,
            maxPriceCents: parseResult.value.maxPriceCents,
            verifiedOnly: parseResult.value.verifiedOnly,
            sort,
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
          appliedFilters: {
            ...parseResult.value,
            sort,
          },
        },
      };
    },
  };
}
