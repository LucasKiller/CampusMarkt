import { describe, expect, it, vi } from "vitest";

import {
  createMarketplaceFavoritesService,
  type FavoritesRepositoryPort,
  type FavoritesSecurityAudit,
  type FavoritesTelemetryEvent,
} from "./favorites";
import type { FavoriteItemDTO } from "@campusmarkt/types";

describe("MarketplaceFavoritesService", () => {
  const validUserId = "11111111-1111-4111-8111-111111111111";
  const validListingId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const validSellerId = "22222222-2222-4222-8222-222222222222";

  const sampleItemDTO: FavoriteItemDTO = {
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

  function createMockRepo(
    overrides: Partial<FavoritesRepositoryPort> = {},
  ): FavoritesRepositoryPort {
    return {
      toggleFavorite: vi.fn(async (listingId: string) => ({
        ok: true as const,
        value: { isFavorited: true, listingId },
      })),
      getUserFavoriteIds: vi.fn(async () => ({
        ok: true as const,
        value: [validListingId],
      })),
      getUserFavorites: vi.fn(async () => ({
        ok: true as const,
        value: {
          items: [sampleItemDTO],
          nextCursor: null,
        },
      })),
      ...overrides,
    };
  }

  describe("toggleFavorite", () => {
    it("rejects unauthenticated caller", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.toggleFavorite("", validListingId);

      expect(result).toEqual({ status: "unauthenticated" });
      expect(repo.toggleFavorite).not.toHaveBeenCalled();
    });

    it("validates listing ID parameter and rejects invalid UUID syntax", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.toggleFavorite(validUserId, "invalid-uuid");

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.fieldErrors?.listingId).toBeDefined();
      }
      expect(repo.toggleFavorite).not.toHaveBeenCalled();
    });

    it("enforces rate limiting and records telemetry on limit exceeded", async () => {
      const repo = createMockRepo();
      const telemetryEvents: FavoritesTelemetryEvent[] = [];
      const security: FavoritesSecurityAudit = {
        checkRateLimit: vi.fn(async () => ({
          allowed: false,
          retryAfterSeconds: 45,
        })),
        recordTelemetry: vi.fn(async (event) => {
          telemetryEvents.push(event);
        }),
      };
      const service = createMarketplaceFavoritesService({
        repository: repo,
        security,
      });

      const result = await service.toggleFavorite(validUserId, validListingId);

      expect(result).toEqual({
        status: "rate_limited",
        retryAfterSeconds: 45,
      });
      expect(security.checkRateLimit).toHaveBeenCalledWith(
        validUserId,
        "toggle_favorite",
      );
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0]?.metadata?.outcome).toBe("rate_limited");
      expect(repo.toggleFavorite).not.toHaveBeenCalled();
    });

    it("handles CANNOT_FAVORITE_OWN_LISTING repository error", async () => {
      const repo = createMockRepo({
        toggleFavorite: vi.fn(async () => ({
          ok: false as const,
          code: "CANNOT_FAVORITE_OWN_LISTING" as const,
        })),
      });
      const telemetryEvents: FavoritesTelemetryEvent[] = [];
      const security: FavoritesSecurityAudit = {
        recordTelemetry: vi.fn(async (event) => {
          telemetryEvents.push(event);
        }),
      };
      const service = createMarketplaceFavoritesService({
        repository: repo,
        security,
      });

      const result = await service.toggleFavorite(validUserId, validListingId);

      expect(result).toEqual({
        status: "cannot_favorite_own_listing",
        message: "Users cannot favorite their own listings.",
      });
      expect(telemetryEvents[0]?.metadata?.outcome).toBe(
        "cannot_favorite_own_listing",
      );
    });

    it("handles NOT_FOUND repository error", async () => {
      const repo = createMockRepo({
        toggleFavorite: vi.fn(async () => ({
          ok: false as const,
          code: "NOT_FOUND" as const,
          message: "Listing not found or archived.",
        })),
      });
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.toggleFavorite(validUserId, validListingId);

      expect(result).toEqual({
        status: "not_found",
        message: "Listing not found or archived.",
      });
    });

    it("toggles favorite successfully and records telemetry", async () => {
      const repo = createMockRepo({
        toggleFavorite: vi.fn(async () => ({
          ok: true as const,
          value: { isFavorited: true, listingId: validListingId },
        })),
      });
      const telemetryEvents: FavoritesTelemetryEvent[] = [];
      const security: FavoritesSecurityAudit = {
        checkRateLimit: vi.fn(async () => ({ allowed: true })),
        recordTelemetry: vi.fn(async (event) => {
          telemetryEvents.push(event);
        }),
      };
      const service = createMarketplaceFavoritesService({
        repository: repo,
        security,
      });

      const result = await service.toggleFavorite(validUserId, validListingId, {
        correlationId: "corr-123",
      });

      expect(result).toEqual({
        status: "success",
        data: { isFavorited: true, listingId: validListingId },
      });
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0]?.eventType).toBe("favorite.toggled");
      expect(telemetryEvents[0]?.correlationId).toBe("corr-123");
    });
  });

  describe("getUserFavoriteIds", () => {
    it("rejects unauthenticated caller", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.getUserFavoriteIds("");

      expect(result).toEqual({ status: "unauthenticated" });
      expect(repo.getUserFavoriteIds).not.toHaveBeenCalled();
    });

    it("returns active favorite IDs", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.getUserFavoriteIds(validUserId);

      expect(result).toEqual({
        status: "success",
        data: { ids: [validListingId] },
      });
    });

    it("handles repository failure gracefully", async () => {
      const repo = createMockRepo({
        getUserFavoriteIds: vi.fn(async () => ({
          ok: false as const,
          code: "DEPENDENCY_UNAVAILABLE" as const,
        })),
      });
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.getUserFavoriteIds(validUserId);

      expect(result).toEqual({ status: "unavailable" });
    });
  });

  describe("getUserFavorites", () => {
    it("rejects unauthenticated caller", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.getUserFavorites("");

      expect(result).toEqual({ status: "unauthenticated" });
      expect(repo.getUserFavorites).not.toHaveBeenCalled();
    });

    it("rejects invalid pagination parameters", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.getUserFavorites(validUserId, {
        limit: 100,
      });

      expect(result.status).toBe("invalid");
      expect(repo.getUserFavorites).not.toHaveBeenCalled();
    });

    it("returns paginated favorite items on success", async () => {
      const repo = createMockRepo();
      const service = createMarketplaceFavoritesService({ repository: repo });

      const result = await service.getUserFavorites(validUserId, { limit: 10 });

      expect(result).toEqual({
        status: "success",
        data: {
          items: [sampleItemDTO],
          nextCursor: null,
        },
      });
      expect(repo.getUserFavorites).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 10,
      });
    });
  });
});
