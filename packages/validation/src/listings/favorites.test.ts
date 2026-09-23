import { describe, expect, it } from "vitest";

import {
  validateFavoritesPaginationQuery,
  validateListingIdParam,
} from "./favorites.ts";

describe("favorites validation schemas", () => {
  describe("validateListingIdParam", () => {
    const validUuid = "12345678-1234-4234-8234-123456789abc";

    it("accepts valid UUID string", () => {
      const res = validateListingIdParam(validUuid);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe(validUuid.toLowerCase());
        expect(res.listingId).toBe(validUuid.toLowerCase());
      }
    });

    it("accepts valid UUID with leading/trailing whitespace and uppercase", () => {
      const res = validateListingIdParam(`  ${validUuid.toUpperCase()}  `);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe(validUuid.toLowerCase());
      }
    });

    it("accepts object with id or listingId", () => {
      const res1 = validateListingIdParam({ id: validUuid });
      expect(res1.ok).toBe(true);
      if (res1.ok) {
        expect(res1.value).toBe(validUuid);
      }

      const res2 = validateListingIdParam({ listingId: validUuid });
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.value).toBe(validUuid);
      }
    });

    it("rejects invalid UUID string", () => {
      const res = validateListingIdParam("not-a-uuid");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0]).toContain("Listing ID must be a valid UUID.");
        expect(res.fieldErrors.listingId).toBeDefined();
      }
    });

    it("rejects non-string non-object inputs", () => {
      expect(validateListingIdParam(null).ok).toBe(false);
      expect(validateListingIdParam(undefined).ok).toBe(false);
      expect(validateListingIdParam(12345).ok).toBe(false);
    });
  });

  describe("validateFavoritesPaginationQuery", () => {
    it("validates empty query object with default limit 20", () => {
      const res = validateFavoritesPaginationQuery({});
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.limit).toBe(20);
        expect(res.value.cursor).toBeUndefined();
      }
    });

    it("accepts explicit limit within bounds 1-50", () => {
      const low = validateFavoritesPaginationQuery({ limit: 1 });
      expect(low.ok).toBe(true);
      if (low.ok) expect(low.value.limit).toBe(1);

      const mid = validateFavoritesPaginationQuery({ limit: 25 });
      expect(mid.ok).toBe(true);
      if (mid.ok) expect(mid.value.limit).toBe(25);

      const high = validateFavoritesPaginationQuery({ limit: 50 });
      expect(high.ok).toBe(true);
      if (high.ok) expect(high.value.limit).toBe(50);

      const strLimit = validateFavoritesPaginationQuery({ limit: "30" });
      expect(strLimit.ok).toBe(true);
      if (strLimit.ok) expect(strLimit.value.limit).toBe(30);
    });

    it("rejects limit below 1 or above 50 or non-integer", () => {
      expect(validateFavoritesPaginationQuery({ limit: 0 }).ok).toBe(false);
      expect(validateFavoritesPaginationQuery({ limit: -5 }).ok).toBe(false);
      expect(validateFavoritesPaginationQuery({ limit: 51 }).ok).toBe(false);
      expect(validateFavoritesPaginationQuery({ limit: 100 }).ok).toBe(false);
      expect(validateFavoritesPaginationQuery({ limit: 10.5 }).ok).toBe(false);
      expect(validateFavoritesPaginationQuery({ limit: "abc" }).ok).toBe(false);
    });

    it("accepts valid ISO 8601 cursor", () => {
      const cursor = "2026-09-23T10:00:00.000Z";
      const res = validateFavoritesPaginationQuery({ cursor });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.cursor).toBe(cursor);
      }
    });

    it("accepts valid base64url encoded cursor", () => {
      const payload = JSON.stringify({
        createdAt: "2026-09-23T10:00:00.000Z",
        id: "12345678-1234-4234-8234-123456789abc",
      });
      const encoded = Buffer.from(payload, "utf-8").toString("base64url");
      const res = validateFavoritesPaginationQuery({ cursor: encoded });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.cursor).toBe(encoded);
      }
    });

    it("rejects invalid cursor format", () => {
      const res = validateFavoritesPaginationQuery({ cursor: "not-a-date" });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.cursor).toBeDefined();
      }
    });

    it("rejects non-object query", () => {
      expect(validateFavoritesPaginationQuery(null).ok).toBe(false);
      expect(validateFavoritesPaginationQuery("string").ok).toBe(false);
    });

    it("rejects unknown query fields", () => {
      const res = validateFavoritesPaginationQuery({
        limit: 10,
        unknownField: "foo",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });
  });
});
