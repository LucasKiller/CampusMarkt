import { describe, expect, it } from "vitest";

import {
  isFavoriteItemDTO,
  isFavoritesListResponse,
  isFavoriteToggleResponse,
  isUserFavoriteIdsResponse,
  type FavoriteItemDTO,
  type FavoriteToggleResponse,
  type UserFavoriteIdsResponse,
} from "./favorites.ts";

describe("favorites types and predicates", () => {
  const validSeller = {
    publicId: "12345678-1234-1234-1234-123456789abc",
    displayName: "Jane Doe",
    avatarUrl: "/media/avatars/123/1.webp",
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  };

  const validItem: FavoriteItemDTO = {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    listingType: "SELL",
    title: "Calculus Textbook",
    priceCents: 1500,
    category: "books_studies",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-20T10:00:00.000Z",
    coverImage: "/media/listings/cover.jpg",
    seller: validSeller,
    favoritedAt: "2026-09-21T12:00:00.000Z",
  };

  const validToggle: FavoriteToggleResponse = {
    isFavorited: true,
    listingId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  };

  const validIdsResponse: UserFavoriteIdsResponse = {
    ids: [
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "12345678-1234-1234-1234-123456789abc",
    ],
  };

  describe("isFavoriteToggleResponse", () => {
    it("accepts valid toggle response", () => {
      expect(isFavoriteToggleResponse(validToggle)).toBe(true);
      expect(
        isFavoriteToggleResponse({
          isFavorited: false,
          listingId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        }),
      ).toBe(true);
    });

    it("rejects non-object or null", () => {
      expect(isFavoriteToggleResponse(null)).toBe(false);
      expect(isFavoriteToggleResponse("string")).toBe(false);
      expect(isFavoriteToggleResponse(123)).toBe(false);
    });

    it("rejects invalid listingId", () => {
      expect(
        isFavoriteToggleResponse({
          isFavorited: true,
          listingId: "not-a-uuid",
        }),
      ).toBe(false);
    });

    it("rejects non-boolean isFavorited", () => {
      expect(
        isFavoriteToggleResponse({
          isFavorited: "yes",
          listingId: validToggle.listingId,
        }),
      ).toBe(false);
    });

    it("rejects extra keys", () => {
      expect(
        isFavoriteToggleResponse({
          ...validToggle,
          extra: true,
        }),
      ).toBe(false);
    });
  });

  describe("isUserFavoriteIdsResponse", () => {
    it("accepts valid IDs response", () => {
      expect(isUserFavoriteIdsResponse(validIdsResponse)).toBe(true);
      expect(isUserFavoriteIdsResponse({ ids: [] })).toBe(true);
    });

    it("rejects non-object or null", () => {
      expect(isUserFavoriteIdsResponse(null)).toBe(false);
      expect(isUserFavoriteIdsResponse([])).toBe(false);
    });

    it("rejects invalid UUID in ids array", () => {
      expect(isUserFavoriteIdsResponse({ ids: ["invalid-uuid"] })).toBe(false);
    });

    it("rejects extra keys", () => {
      expect(
        isUserFavoriteIdsResponse({
          ...validIdsResponse,
          extra: 123,
        }),
      ).toBe(false);
    });
  });

  describe("isFavoriteItemDTO", () => {
    it("accepts valid favorite item with active status", () => {
      expect(isFavoriteItemDTO(validItem)).toBe(true);
    });

    it("accepts valid favorite item with reserved or sold status", () => {
      expect(isFavoriteItemDTO({ ...validItem, status: "reserved" })).toBe(
        true,
      );
      expect(isFavoriteItemDTO({ ...validItem, status: "sold" })).toBe(true);
    });

    it("rejects archived status", () => {
      expect(
        isFavoriteItemDTO({
          ...validItem,
          status: "archived" as unknown as FavoriteItemDTO["status"],
        }),
      ).toBe(false);
    });

    it("accepts null priceCents and null coverImage", () => {
      expect(
        isFavoriteItemDTO({
          ...validItem,
          priceCents: null,
          coverImage: null,
        }),
      ).toBe(true);
    });

    it("rejects invalid id or non-ISO dates", () => {
      expect(isFavoriteItemDTO({ ...validItem, id: "invalid-uuid" })).toBe(
        false,
      );
      expect(isFavoriteItemDTO({ ...validItem, createdAt: "not-a-date" })).toBe(
        false,
      );
      expect(
        isFavoriteItemDTO({ ...validItem, favoritedAt: "not-a-date" }),
      ).toBe(false);
    });

    it("rejects empty title", () => {
      expect(isFavoriteItemDTO({ ...validItem, title: "   " })).toBe(false);
    });

    it("rejects extra keys", () => {
      expect(
        isFavoriteItemDTO({
          ...validItem,
          unknownField: "foo",
        }),
      ).toBe(false);
    });

    it("rejects invalid seller", () => {
      expect(
        isFavoriteItemDTO({
          ...validItem,
          seller: { ...validSeller, publicId: "bad-id" },
        }),
      ).toBe(false);
    });
  });

  describe("isFavoritesListResponse", () => {
    it("accepts valid list response", () => {
      expect(
        isFavoritesListResponse({
          items: [validItem],
          nextCursor: "2026-09-20T10:00:00.000Z",
        }),
      ).toBe(true);

      expect(
        isFavoritesListResponse({
          items: [],
          nextCursor: null,
        }),
      ).toBe(true);
    });

    it("rejects invalid items in list response", () => {
      expect(
        isFavoritesListResponse({
          items: [{ invalid: "item" }],
          nextCursor: null,
        }),
      ).toBe(false);
    });
  });
});
