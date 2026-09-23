import "server-only";

import type {
  FavoriteItemDTO,
  FavoritesListResponse,
  FavoriteToggleResponse,
} from "@campusmarkt/types";
import {
  isFavoriteItemDTO,
  isFavoriteToggleResponse,
} from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "./repository";

export interface GetUserFavoritesRepositoryParams {
  cursor?: string | null;
  cursorCreatedAt?: string | null;
  cursorListingId?: string | null;
  limit?: number;
}

export type FavoritesRepositoryErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CANNOT_FAVORITE_OWN_LISTING"
  | "INVALID_INPUT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type FavoritesRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: FavoritesRepositoryErrorCode; message?: string };

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
  code: FavoritesRepositoryErrorCode;
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (
    err.code === "P0001" ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("unauthenticated")
  ) {
    return { code: "UNAUTHENTICATED", message };
  }

  if (
    err.code === "P0002" ||
    message.includes("LISTING_NOT_FOUND") ||
    message.includes("not found")
  ) {
    return { code: "NOT_FOUND", message };
  }

  if (err.code === "P0003" || message.includes("CANNOT_FAVORITE_OWN_LISTING")) {
    return { code: "CANNOT_FAVORITE_OWN_LISTING", message };
  }

  if (
    err.code === "P0004" ||
    err.code === "22023" ||
    err.code === "22P02" ||
    message.includes("INVALID_INPUT") ||
    message.includes("invalid") ||
    message.includes("malformed")
  ) {
    return { code: "INVALID_INPUT", message };
  }

  return { code: "DEPENDENCY_UNAVAILABLE", message };
}

function parseCursor(cursor?: string | null): {
  cursorCreatedAt: string | null;
  cursorListingId: string | null;
} {
  if (!cursor) {
    return { cursorCreatedAt: null, cursorListingId: null };
  }

  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.createdAt === "string" &&
      typeof parsed.id === "string"
    ) {
      return {
        cursorCreatedAt: parsed.createdAt,
        cursorListingId: parsed.id,
      };
    }
  } catch {
    // If not base64url JSON, treat as raw timestamp string
  }

  return {
    cursorCreatedAt: cursor,
    cursorListingId: null,
  };
}

function mapRawFavoriteRowToDTO(raw: unknown): FavoriteItemDTO | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;

  const seller =
    row.seller && typeof row.seller === "object"
      ? (row.seller as Record<string, unknown>)
      : {
          publicId: (row.seller_id ?? row.sellerId) as string,
          displayName: (row.seller_display_name ??
            row.sellerDisplayName ??
            "CampusMarkt User") as string,
          avatarUrl: (row.seller_avatar_url ?? row.sellerAvatarUrl ?? null) as
            string | null,
          universityBadge:
            Boolean(row.seller_verified ?? row.sellerVerified) &&
            Boolean(row.seller_institution ?? row.sellerInstitution)
              ? {
                  universityId: (row.seller_institution ??
                    row.sellerInstitution) as string,
                  badgeLabel:
                    (row.seller_institution ?? row.sellerInstitution) ===
                    "tu-braunschweig"
                      ? "TU Braunschweig"
                      : String(row.seller_institution ?? row.sellerInstitution),
                }
              : null,
        };

  const candidate: Record<string, unknown> = {
    id: row.listing_id ?? row.id,
    listingType: row.listing_type ?? row.listingType,
    title: row.title,
    priceCents:
      row.price_cents !== undefined
        ? row.price_cents
        : row.priceCents !== undefined
          ? row.priceCents
          : null,
    category: row.category,
    pickupArea: row.pickup_area ?? row.pickupArea,
    condition: row.condition,
    status: row.status,
    createdAt:
      row.created_at !== undefined
        ? new Date(String(row.created_at)).toISOString()
        : row.createdAt,
    coverImage:
      row.cover_image !== undefined
        ? row.cover_image
        : row.coverImage !== undefined
          ? row.coverImage
          : null,
    seller,
    favoritedAt:
      row.favorited_at !== undefined
        ? new Date(String(row.favorited_at)).toISOString()
        : row.favoritedAt,
  };

  if (!isFavoriteItemDTO(candidate)) {
    return null;
  }

  return candidate;
}

export function createMarketplaceFavoritesRepository(clients: {
  service: MarketplaceRpcClient;
}) {
  const { service } = clients;

  return {
    async toggleFavorite(
      listingId: string,
    ): Promise<FavoritesRepositoryResult<FavoriteToggleResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "toggle_favorite",
          {
            p_listing_id: listingId,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!isFavoriteToggleResponse(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "RPC did not return a valid FavoriteToggleResponse",
          };
        }

        return { ok: true, value: data };
      } catch (err) {
        console.error("[MarketplaceFavoritesRepository: toggleFavorite]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getUserFavoriteIds(): Promise<FavoritesRepositoryResult<string[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_user_favorite_ids",
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "RPC did not return an array",
          };
        }

        for (const id of data) {
          if (typeof id !== "string") {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "RPC returned non-string ID",
            };
          }
        }

        return { ok: true, value: data as string[] };
      } catch (err) {
        console.error(
          "[MarketplaceFavoritesRepository: getUserFavoriteIds]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getUserFavorites(
      params: GetUserFavoritesRepositoryParams = {},
    ): Promise<FavoritesRepositoryResult<FavoritesListResponse>> {
      try {
        const parsed = parseCursor(params.cursor);
        const cursorCreatedAt =
          params.cursorCreatedAt ?? parsed.cursorCreatedAt;
        const cursorListingId =
          params.cursorListingId ?? parsed.cursorListingId;
        const limit = params.limit ?? 20;

        const { data, error } = await callMarketplaceRpc(
          service,
          "get_user_favorites",
          {
            p_cursor_created_at: cursorCreatedAt,
            p_cursor_listing_id: cursorListingId,
            p_limit: limit,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "RPC did not return an array",
          };
        }

        const items: FavoriteItemDTO[] = [];
        for (const rawItem of data) {
          const item = mapRawFavoriteRowToDTO(rawItem);
          if (!item) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Favorite record does not match FavoriteItemDTO schema",
            };
          }
          items.push(item);
        }

        let nextCursor: string | null = null;
        if (items.length === limit && items.length > 0) {
          const last = items[items.length - 1];
          nextCursor = Buffer.from(
            JSON.stringify({ createdAt: last.favoritedAt, id: last.id }),
          ).toString("base64url");
        }

        return {
          ok: true,
          value: {
            items,
            nextCursor,
          },
        };
      } catch (err) {
        console.error(
          "[MarketplaceFavoritesRepository: getUserFavorites]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export type MarketplaceFavoritesRepository = ReturnType<
  typeof createMarketplaceFavoritesRepository
>;
