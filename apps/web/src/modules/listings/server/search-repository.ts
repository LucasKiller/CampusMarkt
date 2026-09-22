import "server-only";

import type {
  PublicFeedItem,
  SearchFilters,
  SearchResultsResponse,
} from "@campusmarkt/types";
import { isPublicFeedItem } from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "./repository";

export interface SearchRepositoryParams {
  query?: string | null;
  categories?: string[] | null;
  pickupAreas?: string[] | null;
  listingTypes?: string[] | null;
  conditions?: string[] | null;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  verifiedOnly?: boolean | null;
  sort?: string | null;
  cursorRank?: number | null;
  cursorPriceCents?: number | null;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number | null;
}

export type SearchRepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "INVALID_INPUT"
        | "DEPENDENCY_UNAVAILABLE"
        | "INVALID_PROVIDER_RESPONSE";
      message?: string;
    };

async function callMarketplaceRpc(
  client: MarketplaceRpcClient,
  functionName: string,
  arguments_?: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  const target =
    typeof client.schema === "function"
      ? (client.schema("marketplace_api") as unknown as MarketplaceRpcClient)
      : client;

  return target.rpc(functionName, arguments_);
}

function mapDatabaseError(error: unknown): {
  code: "NOT_FOUND" | "INVALID_INPUT" | "DEPENDENCY_UNAVAILABLE";
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (err.code === "P0002" || message.includes("not found")) {
    return { code: "NOT_FOUND", message };
  }

  if (
    err.code === "22023" ||
    err.code === "22P02" ||
    message.includes("invalid") ||
    message.includes("malformed")
  ) {
    return { code: "INVALID_INPUT", message };
  }

  return { code: "DEPENDENCY_UNAVAILABLE", message };
}

export function createMarketplaceSearchRepository(clients: {
  service: MarketplaceRpcClient;
}) {
  const { service } = clients;

  return {
    async searchListings(
      params: SearchRepositoryParams = {},
    ): Promise<SearchRepositoryResult<PublicFeedItem[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "search_listings",
          {
            p_query: params.query ?? null,
            p_categories: params.categories ?? null,
            p_pickup_areas: params.pickupAreas ?? null,
            p_listing_types: params.listingTypes ?? null,
            p_conditions: params.conditions ?? null,
            p_min_price_cents: params.minPriceCents ?? null,
            p_max_price_cents: params.maxPriceCents ?? null,
            p_verified_only: params.verifiedOnly ?? false,
            p_sort: params.sort ?? "relevance",
            p_cursor_rank: params.cursorRank ?? null,
            p_cursor_price_cents: params.cursorPriceCents ?? null,
            p_cursor_created_at: params.cursorCreatedAt ?? null,
            p_cursor_id: params.cursorId ?? null,
            p_limit: params.limit ?? 20,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        if (!Array.isArray(data)) {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        const items: PublicFeedItem[] = [];
        for (const item of data) {
          if (!isPublicFeedItem(item)) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message:
                "Search result item does not match PublicFeedItem schema",
            };
          }
          items.push(item);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error("[MarketplaceSearchRepository: searchListings]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async search(
      params: SearchRepositoryParams = {},
      appliedFilters: SearchFilters = {},
    ): Promise<SearchRepositoryResult<SearchResultsResponse>> {
      const itemsResult = await this.searchListings(params);
      if (!itemsResult.ok) {
        return itemsResult;
      }

      const items = itemsResult.value;
      const limit = params.limit ?? 20;
      let nextCursor: string | null = null;
      if (items.length === limit && items.length > 0) {
        const last = items[items.length - 1];
        nextCursor = Buffer.from(
          JSON.stringify({
            createdAt: last.createdAt,
            id: last.id,
            priceCents: last.priceCents,
          }),
          "utf-8",
        ).toString("base64url");
      }

      return {
        ok: true,
        value: {
          items,
          nextCursor,
          appliedFilters: {
            ...appliedFilters,
            limit,
          },
        },
      };
    },
  };
}

export type MarketplaceSearchRepository = ReturnType<
  typeof createMarketplaceSearchRepository
>;
