import "server-only";

import type { PublicFeedItem, PublicListingDetails } from "@campusmarkt/types";
import { isPublicFeedItem, isPublicListingDetails } from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "./repository";

export interface GetPublicFeedParams {
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  category?: string | null;
  pickupArea?: string | null;
  listingType?: string | null;
  limit?: number;
}

export type FeedRepositoryResult<T> =
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

export function createMarketplaceFeedRepository(clients: {
  service: MarketplaceRpcClient;
}) {
  const { service } = clients;

  return {
    async getPublicFeed(
      params: GetPublicFeedParams = {},
    ): Promise<FeedRepositoryResult<PublicFeedItem[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_public_feed",
          {
            p_cursor_created_at: params.cursorCreatedAt ?? null,
            p_cursor_id: params.cursorId ?? null,
            p_category: params.category ?? null,
            p_pickup_area: params.pickupArea ?? null,
            p_listing_type: params.listingType ?? null,
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
              message: "Feed item does not match PublicFeedItem schema",
            };
          }
          items.push(item);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error("[MarketplaceFeedRepository: getPublicFeed]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getPublicListingDetails(
      listingId: string,
    ): Promise<FeedRepositoryResult<PublicListingDetails | null>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_public_listing_details",
          {
            p_listing_id: listingId,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        if (data === null || data === undefined) {
          return { ok: true, value: null };
        }

        if (!isPublicListingDetails(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Listing details do not match PublicListingDetails schema",
          };
        }

        return { ok: true, value: data };
      } catch (err) {
        console.error(
          "[MarketplaceFeedRepository: getPublicListingDetails]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export type MarketplaceFeedRepository = ReturnType<
  typeof createMarketplaceFeedRepository
>;
