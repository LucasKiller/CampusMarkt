import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMarketplaceFavoritesRepository } from "./favorites-repository";
import type { MarketplaceRpcClient } from "./repository";
import type { FavoriteItemDTO } from "@campusmarkt/types";

function mockRpcClient(data: unknown = null, error: unknown = null) {
  const calls: Array<{
    functionName: string;
    arguments_?: Record<string, unknown>;
  }> = [];
  const rpc: MarketplaceRpcClient["rpc"] = async (functionName, arguments_) => {
    calls.push({ functionName, arguments_ });
    return { data, error };
  };
  return { calls, rpc };
}

describe("MarketplaceFavoritesRepository", () => {
  const validListingId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const validSellerId = "11111111-2222-4333-8444-555555555555";

  const sampleRawRow = {
    listing_id: validListingId,
    listing_type: "SELL",
    title: "Vintage Oak Desk",
    price_cents: 4500,
    category: "furniture",
    pickup_area: "innenstadt",
    condition: "GOOD",
    status: "active",
    created_at: "2026-09-23T12:00:00.000Z",
    cover_image: "media/listings/cover1.webp",
    seller_id: validSellerId,
    seller_display_name: "TU Student",
    seller_avatar_url: "/media/avatars/1/1.webp",
    seller_verified: true,
    seller_institution: "tu-braunschweig",
    favorited_at: "2026-09-23T13:00:00.000Z",
  };

  const expectedItemDTO: FavoriteItemDTO = {
    id: validListingId,
    listingType: "SELL",
    title: "Vintage Oak Desk",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T12:00:00.000Z",
    coverImage: "media/listings/cover1.webp",
    seller: {
      publicId: validSellerId,
      displayName: "TU Student",
      avatarUrl: "/media/avatars/1/1.webp",
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
    favoritedAt: "2026-09-23T13:00:00.000Z",
  };

  describe("toggleFavorite", () => {
    it("calls toggle_favorite RPC and returns response on success", async () => {
      const toggleData = { isFavorited: true, listingId: validListingId };
      const client = mockRpcClient(toggleData);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.toggleFavorite(validListingId);

      expect(result).toEqual({ ok: true, value: toggleData });
      expect(client.calls).toEqual([
        {
          functionName: "toggle_favorite",
          arguments_: { p_listing_id: validListingId },
        },
      ]);
    });

    it("maps UNAUTHENTICATED error", async () => {
      const client = mockRpcClient(null, {
        code: "P0001",
        message: "UNAUTHENTICATED",
      });
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.toggleFavorite(validListingId);

      expect(result).toEqual({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "UNAUTHENTICATED",
      });
    });

    it("maps LISTING_NOT_FOUND error", async () => {
      const client = mockRpcClient(null, {
        code: "P0002",
        message: "LISTING_NOT_FOUND",
      });
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.toggleFavorite(validListingId);

      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "LISTING_NOT_FOUND",
      });
    });

    it("maps CANNOT_FAVORITE_OWN_LISTING error", async () => {
      const client = mockRpcClient(null, {
        code: "P0003",
        message: "CANNOT_FAVORITE_OWN_LISTING",
      });
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.toggleFavorite(validListingId);

      expect(result).toEqual({
        ok: false,
        code: "CANNOT_FAVORITE_OWN_LISTING",
        message: "CANNOT_FAVORITE_OWN_LISTING",
      });
    });

    it("maps unexpected error to DEPENDENCY_UNAVAILABLE", async () => {
      const client = mockRpcClient(null, {
        code: "XX000",
        message: "DB crashed",
      });
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.toggleFavorite(validListingId);

      expect(result).toEqual({
        ok: false,
        code: "DEPENDENCY_UNAVAILABLE",
        message: "DB crashed",
      });
    });

    it("returns INVALID_PROVIDER_RESPONSE on malformed data", async () => {
      const client = mockRpcClient({ unexpected: "structure" });
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.toggleFavorite(validListingId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });
  });

  describe("getUserFavoriteIds", () => {
    it("calls get_user_favorite_ids RPC and returns ID array", async () => {
      const ids = [validListingId];
      const client = mockRpcClient(ids);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.getUserFavoriteIds();

      expect(result).toEqual({ ok: true, value: ids });
      expect(client.calls).toEqual([
        {
          functionName: "get_user_favorite_ids",
          arguments_: undefined,
        },
      ]);
    });

    it("returns empty array when user has no favorites", async () => {
      const client = mockRpcClient([]);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.getUserFavoriteIds();

      expect(result).toEqual({ ok: true, value: [] });
    });

    it("returns INVALID_PROVIDER_RESPONSE when returned data is not array", async () => {
      const client = mockRpcClient("not an array");
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.getUserFavoriteIds();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });
  });

  describe("getUserFavorites", () => {
    it("calls get_user_favorites RPC and maps raw rows to typed FavoriteItemDTO", async () => {
      const client = mockRpcClient([sampleRawRow]);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.getUserFavorites({ limit: 10 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.items).toEqual([expectedItemDTO]);
        expect(result.value.nextCursor).toBeNull();
      }

      expect(client.calls).toEqual([
        {
          functionName: "get_user_favorites",
          arguments_: {
            p_cursor_created_at: null,
            p_cursor_listing_id: null,
            p_limit: 10,
          },
        },
      ]);
    });

    it("computes nextCursor when item count matches limit", async () => {
      const client = mockRpcClient([sampleRawRow]);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.getUserFavorites({ limit: 1 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.nextCursor).not.toBeNull();
        const decoded = JSON.parse(
          Buffer.from(result.value.nextCursor!, "base64url").toString("utf-8"),
        );
        expect(decoded).toEqual({
          createdAt: expectedItemDTO.favoritedAt,
          id: expectedItemDTO.id,
        });
      }
    });

    it("parses base64url cursor correctly", async () => {
      const cursorPayload = {
        createdAt: "2026-09-23T10:00:00.000Z",
        id: validListingId,
      };
      const cursor = Buffer.from(JSON.stringify(cursorPayload)).toString(
        "base64url",
      );

      const client = mockRpcClient([]);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      await repo.getUserFavorites({ cursor, limit: 5 });

      expect(client.calls).toEqual([
        {
          functionName: "get_user_favorites",
          arguments_: {
            p_cursor_created_at: "2026-09-23T10:00:00.000Z",
            p_cursor_listing_id: validListingId,
            p_limit: 5,
          },
        },
      ]);
    });

    it("returns INVALID_PROVIDER_RESPONSE if a row cannot be mapped to FavoriteItemDTO", async () => {
      const invalidRow = { ...sampleRawRow, title: "   " }; // empty title fails schema
      const client = mockRpcClient([invalidRow]);
      const repo = createMarketplaceFavoritesRepository({ service: client });

      const result = await repo.getUserFavorites();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });
  });
});
