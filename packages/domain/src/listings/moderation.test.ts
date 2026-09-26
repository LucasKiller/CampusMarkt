import { describe, expect, it } from "vitest";

import {
  AccountSuspendedError,
  ListingRemovedError,
  UnauthorizedModeratorError,
  assertAccountNotSuspended,
  assertCanModerate,
  assertListingNotRemoved,
  canEditOrRelistListing,
  canModerate,
  isListingPubliclyDiscoverable,
  isListingRemoved,
  resolveReservationCascadeOnListingRemoval,
  resolveReservationCascadeOnUserSuspension,
} from "./moderation.ts";

describe("moderation domain invariants and helpers", () => {
  describe("moderator authorization assertions", () => {
    it("canModerate returns true only for boolean true", () => {
      expect(canModerate(true)).toBe(true);
      expect(canModerate(false)).toBe(false);
      expect(canModerate(null)).toBe(false);
      expect(canModerate(undefined)).toBe(false);
      expect(canModerate("true")).toBe(false);
      expect(canModerate(1)).toBe(false);
    });

    it("assertCanModerate passes when isModerator is true", () => {
      expect(() => assertCanModerate(true)).not.toThrow();
    });

    it("assertCanModerate throws UnauthorizedModeratorError when isModerator is false or falsy", () => {
      expect(() => assertCanModerate(false)).toThrow(
        UnauthorizedModeratorError,
      );
      expect(() => assertCanModerate(null)).toThrow(UnauthorizedModeratorError);
      expect(() => assertCanModerate(undefined)).toThrow(
        UnauthorizedModeratorError,
      );
    });
  });

  describe("account suspension assertions", () => {
    it("assertAccountNotSuspended passes when not suspended", () => {
      expect(() => assertAccountNotSuspended(false)).not.toThrow();
      expect(() => assertAccountNotSuspended(null)).not.toThrow();
      expect(() => assertAccountNotSuspended(undefined)).not.toThrow();
    });

    it("assertAccountNotSuspended throws AccountSuspendedError when suspended", () => {
      expect(() => assertAccountNotSuspended(true)).toThrow(
        AccountSuspendedError,
      );
    });
  });

  describe("listing removed invariants (Marketplace Invariant 9)", () => {
    it("isListingRemoved recognizes removed status", () => {
      expect(isListingRemoved("removed")).toBe(true);
      expect(isListingRemoved("active")).toBe(false);
      expect(isListingRemoved("reserved")).toBe(false);
      expect(isListingRemoved("sold")).toBe(false);
      expect(isListingRemoved("archived")).toBe(false);
      expect(isListingRemoved(null)).toBe(false);
    });

    it("assertListingNotRemoved throws for removed status", () => {
      expect(() => assertListingNotRemoved("removed")).toThrow(
        ListingRemovedError,
      );
      expect(() => assertListingNotRemoved("active")).not.toThrow();
    });

    it("canEditOrRelistListing returns false for removed listings", () => {
      expect(canEditOrRelistListing("removed")).toBe(false);
      expect(canEditOrRelistListing("active")).toBe(true);
      expect(canEditOrRelistListing("archived")).toBe(true);
    });

    it("isListingPubliclyDiscoverable excludes removed and archived listings", () => {
      expect(isListingPubliclyDiscoverable("active")).toBe(true);
      expect(isListingPubliclyDiscoverable("reserved")).toBe(true);
      expect(isListingPubliclyDiscoverable("sold")).toBe(true);
      expect(isListingPubliclyDiscoverable("removed")).toBe(false);
      expect(isListingPubliclyDiscoverable("archived")).toBe(false);
      expect(isListingPubliclyDiscoverable(null)).toBe(false);
    });
  });

  describe("reservation cascades", () => {
    it("cancels active reservation on listing removal with moderation_removal reason", () => {
      const result = resolveReservationCascadeOnListingRemoval("active");
      expect(result.shouldCancel).toBe(true);
      expect(result.cancellationReason).toBe("moderation_removal");
    });

    it("does not cancel inactive reservations on listing removal", () => {
      expect(
        resolveReservationCascadeOnListingRemoval("completed").shouldCancel,
      ).toBe(false);
      expect(
        resolveReservationCascadeOnListingRemoval("cancelled").shouldCancel,
      ).toBe(false);
    });

    it("cancels active reservation on user suspension with moderation_suspension reason", () => {
      const result = resolveReservationCascadeOnUserSuspension("active");
      expect(result.shouldCancel).toBe(true);
      expect(result.cancellationReason).toBe("moderation_suspension");
    });

    it("does not cancel inactive reservations on user suspension", () => {
      expect(
        resolveReservationCascadeOnUserSuspension("completed").shouldCancel,
      ).toBe(false);
      expect(resolveReservationCascadeOnUserSuspension(null).shouldCancel).toBe(
        false,
      );
    });
  });
});
