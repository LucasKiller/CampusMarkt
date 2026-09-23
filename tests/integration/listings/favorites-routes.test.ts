import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFavoriteIdsHandler } from "../../../apps/web/src/app/api/marketplace/favorites/ids/route.ts";
import { createToggleFavoriteHandler } from "../../../apps/web/src/app/api/marketplace/favorites/[id]/route.ts";
import { createGetFavoritesHandler } from "../../../apps/web/src/app/api/marketplace/favorites/route.ts";
import type { MarketplaceFavoritesService } from "../../../apps/web/src/modules/listings/server/index.ts";
import type { FavoriteItemDTO } from "@campusmarkt/types";

const canonicalOrigin = "https://markt.example.test";
const authUserId = "11111111-1111-4111-8111-111111111111";
const listingId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
}

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId },
) {
  return () =>
    ({
      async requireActiveIdentity() {
        if (!activeIdentity) {
          throw new Error("UNAUTHENTICATED");
        }
        return activeIdentity;
      },
    }) as never;
}

describe("favorites routes integration (T11)", () => {
  describe("GET /api/marketplace/favorites/ids", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        getUserFavoriteIds: vi.fn(),
      };

      const handler = createFavoriteIdsHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/favorites/ids`,
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("UNAUTHENTICATED");
      expect(mockService.getUserFavoriteIds).not.toHaveBeenCalled();
    });

    it("returns 200 with favorite IDs on success", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        getUserFavoriteIds: vi.fn(async () => ({
          status: "success" as const,
          data: { ids: [listingId] },
        })),
      };

      const handler = createFavoriteIdsHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/favorites/ids`,
      );
      const res = await handler(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual({ ids: [listingId] });
      expect(mockService.getUserFavoriteIds).toHaveBeenCalledWith(
        authUserId,
        expect.any(Object),
      );
    });

    it("returns 503 on service dependency error", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        getUserFavoriteIds: vi.fn(async () => ({
          status: "unavailable" as const,
        })),
      };

      const handler = createFavoriteIdsHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/favorites/ids`,
      );
      const res = await handler(req);

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("DEPENDENCY_UNAVAILABLE");
    });
  });

  describe("POST /api/marketplace/favorites/[id]", () => {
    it("returns 403 when origin header is missing or mismatched (CSRF guard)", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      // Missing origin
      const reqNoOrigin = new Request(
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
        {
          method: "POST",
        },
      );
      const resNoOrigin = await handler(reqNoOrigin, {
        params: { id: listingId },
      });
      expect(resNoOrigin.status).toBe(403);

      // Untrusted origin
      const reqBadOrigin = new Request(
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
        {
          method: "POST",
          headers: { origin: "https://evil.attacker.test" },
        },
      );
      const resBadOrigin = await handler(reqBadOrigin, {
        params: { id: listingId },
      });
      expect(resBadOrigin.status).toBe(403);
      expect(mockService.toggleFavorite).not.toHaveBeenCalled();
    });

    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
      );
      const res = await handler(req, { params: { id: listingId } });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("UNAUTHENTICATED");
      expect(mockService.toggleFavorite).not.toHaveBeenCalled();
    });

    it("returns 400 when listing ID parameter is invalid", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(async () => ({
          status: "invalid" as const,
          fieldErrors: { listingId: ["Listing ID must be a valid UUID."] },
        })),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/favorites/bad-id`,
      );
      const res = await handler(req, { params: { id: "bad-id" } });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INVALID_INPUT");
    });

    it("returns 400 when attempting to favorite own listing", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(async () => ({
          status: "cannot_favorite_own_listing" as const,
          message: "Users cannot favorite their own listings.",
        })),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
      );
      const res = await handler(req, { params: { id: listingId } });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INVALID_INPUT");
      expect(body.fieldErrors?._form).toContain(
        "Users cannot favorite their own listings.",
      );
    });

    it("returns 404 when listing does not exist or is archived", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(async () => ({
          status: "not_found" as const,
        })),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
      );
      const res = await handler(req, { params: { id: listingId } });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("NOT_FOUND");
    });

    it("returns 429 with retry-after header when rate limited", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(async () => ({
          status: "rate_limited" as const,
          retryAfterSeconds: 30,
        })),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
      );
      const res = await handler(req, { params: { id: listingId } });

      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("30");
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("RATE_LIMITED");
      expect(body.retryAfterSeconds).toBe(30);
    });

    it("returns 200 with toggle response on successful toggle", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        toggleFavorite: vi.fn(async () => ({
          status: "success" as const,
          data: { isFavorited: true, listingId },
        })),
      };

      const handler = createToggleFavoriteHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/favorites/${listingId}`,
      );
      const res = await handler(req, { params: { id: listingId } });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual({ isFavorited: true, listingId });
      expect(mockService.toggleFavorite).toHaveBeenCalledWith(
        authUserId,
        listingId,
        expect.any(Object),
      );
    });
  });

  describe("GET /api/marketplace/favorites (T12)", () => {
    const sampleFavoriteItem: FavoriteItemDTO = {
      id: listingId,
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
        publicId: "22222222-2222-4222-8222-222222222222",
        displayName: "TU Student",
        avatarUrl: "/media/avatars/1/1.webp",
        universityBadge: {
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
        },
      },
      favoritedAt: "2026-09-23T13:00:00.000Z",
    };

    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        getUserFavorites: vi.fn(),
      };

      const handler = createGetFavoritesHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/favorites`,
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("UNAUTHENTICATED");
      expect(mockService.getUserFavorites).not.toHaveBeenCalled();
    });

    it("returns 400 when pagination query is invalid", async () => {
      const mockService: Partial<MarketplaceFavoritesService> = {
        getUserFavorites: vi.fn(async () => ({
          status: "invalid" as const,
          fieldErrors: {
            limit: ["Limit must be an integer between 1 and 50."],
          },
        })),
      };

      const handler = createGetFavoritesHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/favorites?limit=999`,
      );
      const res = await handler(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.code).toBe("INVALID_INPUT");
    });

    it("returns 200 with paginated saved items and handles status representation", async () => {
      const reservedItem: FavoriteItemDTO = {
        ...sampleFavoriteItem,
        id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
        status: "reserved",
      };
      const soldItem: FavoriteItemDTO = {
        ...sampleFavoriteItem,
        id: "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa",
        status: "sold",
      };

      const mockService: Partial<MarketplaceFavoritesService> = {
        getUserFavorites: vi.fn(async () => ({
          status: "success" as const,
          data: {
            items: [sampleFavoriteItem, reservedItem, soldItem],
            nextCursor: "next-cursor-token",
          },
        })),
      };

      const handler = createGetFavoritesHandler(
        mockService as MarketplaceFavoritesService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/marketplace/favorites?cursor=prev-token&limit=10`,
      );
      const res = await handler(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.items).toHaveLength(3);
      expect(body.data.items.map((i: FavoriteItemDTO) => i.status)).toEqual([
        "active",
        "reserved",
        "sold",
      ]);
      expect(body.data.nextCursor).toBe("next-cursor-token");
      expect(mockService.getUserFavorites).toHaveBeenCalledWith(
        authUserId,
        { cursor: "prev-token", limit: "10" },
        expect.any(Object),
      );
    });
  });
});
