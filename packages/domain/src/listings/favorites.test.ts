import { describe, expect, it } from "vitest";

import {
  addFavoriteId,
  assertCanFavorite,
  canFavorite,
  isListingFavorited,
  reconcileOptimisticFavorite,
  removeFavoriteId,
  revertOptimisticFavorite,
  SelfFavoriteError,
  toggleFavoriteId,
} from "./favorites.ts";

describe("favorites domain utilities and invariants", () => {
  const userA = "11111111-1111-1111-1111-111111111111";
  const userB = "22222222-2222-2222-2222-222222222222";
  const listing1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const listing2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  describe("self-favorite invariant", () => {
    it("allows favoriting when buyer is not the seller", () => {
      expect(canFavorite(userA, userB)).toBe(true);
      expect(() => assertCanFavorite(userA, userB)).not.toThrow();
    });

    it("prohibits favoriting own listing", () => {
      expect(canFavorite(userA, userA)).toBe(false);
      expect(() => assertCanFavorite(userA, userA)).toThrow(SelfFavoriteError);
    });

    it("prohibits favoriting own listing with different casing", () => {
      expect(canFavorite(userA.toLowerCase(), userA.toUpperCase())).toBe(false);
      expect(() =>
        assertCanFavorite(userA.toLowerCase(), userA.toUpperCase()),
      ).toThrow(SelfFavoriteError);
    });

    it("rejects empty IDs", () => {
      expect(canFavorite("", userB)).toBe(false);
      expect(() => assertCanFavorite("", userB)).toThrow();
    });
  });

  describe("isListingFavorited", () => {
    it("checks presence in Set and Array with case insensitivity", () => {
      const set = new Set([listing1.toLowerCase()]);
      expect(isListingFavorited(set, listing1.toUpperCase())).toBe(true);
      expect(isListingFavorited(set, listing2)).toBe(false);

      const arr = [listing1.toUpperCase()];
      expect(isListingFavorited(arr, listing1.toLowerCase())).toBe(true);
      expect(isListingFavorited(arr, listing2)).toBe(false);
    });

    it("returns false for empty listing ID", () => {
      expect(isListingFavorited(new Set([listing1]), "")).toBe(false);
    });
  });

  describe("addFavoriteId and removeFavoriteId", () => {
    it("adds favorite ID without duplicates", () => {
      const initial = new Set<string>();
      const next = addFavoriteId(initial, listing1);
      expect(next.has(listing1)).toBe(true);
      expect(next.size).toBe(1);

      const again = addFavoriteId(next, listing1.toUpperCase());
      expect(again.size).toBe(1);
    });

    it("removes target favorite ID", () => {
      const initial = new Set([listing1, listing2]);
      const next = removeFavoriteId(initial, listing1);
      expect(next.has(listing1)).toBe(false);
      expect(next.has(listing2)).toBe(true);
      expect(next.size).toBe(1);
    });
  });

  describe("toggleFavoriteId", () => {
    it("toggles favorite state from false to true", () => {
      const initial = new Set<string>();
      const result = toggleFavoriteId(initial, listing1);
      expect(result.isFavorited).toBe(true);
      expect(result.nextIds.has(listing1)).toBe(true);
    });

    it("toggles favorite state from true to false", () => {
      const initial = new Set([listing1]);
      const result = toggleFavoriteId(initial, listing1);
      expect(result.isFavorited).toBe(false);
      expect(result.nextIds.has(listing1)).toBe(false);
    });
  });

  describe("reconcileOptimisticFavorite and revertOptimisticFavorite", () => {
    it("reconciles true by ensuring ID is in set", () => {
      const reconciled = reconcileOptimisticFavorite([], listing1, true);
      expect(reconciled.has(listing1)).toBe(true);
    });

    it("reconciles false by ensuring ID is removed", () => {
      const reconciled = reconcileOptimisticFavorite(
        [listing1, listing2],
        listing1,
        false,
      );
      expect(reconciled.has(listing1)).toBe(false);
      expect(reconciled.has(listing2)).toBe(true);
    });

    it("reverts optimistic state to previous state", () => {
      const revertedBackToFavorited = revertOptimisticFavorite(
        [],
        listing1,
        true,
      );
      expect(revertedBackToFavorited.has(listing1)).toBe(true);

      const revertedBackToUnfavorited = revertOptimisticFavorite(
        [listing1],
        listing1,
        false,
      );
      expect(revertedBackToUnfavorited.has(listing1)).toBe(false);
    });
  });
});
