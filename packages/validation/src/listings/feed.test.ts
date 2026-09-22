import { describe, expect, it } from "vitest";

import {
  decodeCursor,
  encodeCursor,
  validateFeedFilterParams,
} from "./feed.ts";

describe("encodeCursor and decodeCursor", () => {
  const validCursor = {
    createdAt: "2026-09-23T10:00:00.000Z",
    id: "12345678-1234-1234-1234-123456789abc",
  };

  it("encodes and decodes valid cursor round-trip", () => {
    const encoded = encodeCursor(validCursor);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");

    const decoded = decodeCursor(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value).toEqual(validCursor);
    }
  });

  it("rejects invalid cursor during encoding", () => {
    expect(() =>
      encodeCursor({
        createdAt: "invalid-date",
        id: "12345678-1234-1234-1234-123456789abc",
      }),
    ).toThrow(TypeError);

    expect(() =>
      encodeCursor({
        createdAt: "2026-09-23T10:00:00.000Z",
        id: "not-a-uuid",
      }),
    ).toThrow(TypeError);
  });

  it("rejects empty or non-string input to decodeCursor", () => {
    expect(decodeCursor("")).toEqual({
      ok: false,
      errors: ["Cursor must be a non-empty string."],
    });
    // @ts-expect-error test invalid type
    expect(decodeCursor(null)).toEqual({
      ok: false,
      errors: ["Cursor must be a non-empty string."],
    });
  });

  it("rejects malformed base64 or non-JSON", () => {
    const result = decodeCursor("!!!not-base64!!!");
    expect(result.ok).toBe(false);
  });

  it("rejects JSON that is not an object with exact keys", () => {
    const jsonWithoutId = Buffer.from(
      JSON.stringify({ createdAt: "2026-09-23T10:00:00.000Z" }),
      "utf-8",
    ).toString("base64url");
    expect(decodeCursor(jsonWithoutId).ok).toBe(false);

    const jsonWithExtra = Buffer.from(
      JSON.stringify({
        ...validCursor,
        email: "test@example.com",
      }),
      "utf-8",
    ).toString("base64url");
    expect(decodeCursor(jsonWithExtra).ok).toBe(false);
  });

  it("rejects invalid UUID or invalid ISO timestamp in cursor", () => {
    const badId = Buffer.from(
      JSON.stringify({
        createdAt: "2026-09-23T10:00:00.000Z",
        id: "invalid-uuid",
      }),
      "utf-8",
    ).toString("base64url");
    expect(decodeCursor(badId)).toEqual({
      ok: false,
      errors: ["Cursor id must be a valid UUID."],
    });

    const badDate = Buffer.from(
      JSON.stringify({
        createdAt: "2026-99-99T99:99:99Z",
        id: "12345678-1234-1234-1234-123456789abc",
      }),
      "utf-8",
    ).toString("base64url");
    expect(decodeCursor(badDate)).toEqual({
      ok: false,
      errors: ["Cursor createdAt must be a valid ISO 8601 timestamp."],
    });
  });
});

describe("validateFeedFilterParams", () => {
  const validCursor = encodeCursor({
    createdAt: "2026-09-23T10:00:00.000Z",
    id: "12345678-1234-1234-1234-123456789abc",
  });

  it("accepts empty object and defaults limit to 20", () => {
    const result = validateFeedFilterParams({});
    expect(result).toEqual({
      ok: true,
      value: { limit: 20 },
    });
  });

  it("accepts valid full filter params", () => {
    const result = validateFeedFilterParams({
      cursor: validCursor,
      category: "furniture",
      pickupArea: "innenstadt",
      listingType: "SELL",
      limit: 30,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        cursor: validCursor,
        category: "furniture",
        pickupArea: "innenstadt",
        listingType: "SELL",
        limit: 30,
      },
    });
  });

  it("clamps limit between 1 and 50", () => {
    const low = validateFeedFilterParams({ limit: 0 });
    expect(low.ok && low.value.limit).toBe(1);

    const high = validateFeedFilterParams({ limit: 100 });
    expect(high.ok && high.value.limit).toBe(50);

    const stringLimit = validateFeedFilterParams({ limit: "15" });
    expect(stringLimit.ok && stringLimit.value.limit).toBe(15);
  });

  it("rejects non-integer limit", () => {
    const result = validateFeedFilterParams({ limit: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.limit).toBeDefined();
    }
  });

  it("rejects invalid category, pickupArea, or listingType", () => {
    const result = validateFeedFilterParams({
      category: "automobiles",
      pickupArea: "hamburg",
      listingType: "RENT",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.category).toBeDefined();
      expect(result.fieldErrors.pickupArea).toBeDefined();
      expect(result.fieldErrors.listingType).toBeDefined();
    }
  });

  it("rejects invalid or malformed cursor string in params", () => {
    const result = validateFeedFilterParams({
      cursor: "not-a-valid-cursor",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.cursor).toBeDefined();
    }
  });

  it("rejects unknown parameters and non-object input", () => {
    expect(validateFeedFilterParams(null)).toEqual({
      ok: false,
      fieldErrors: { _form: ["Filter parameters must be an object."] },
    });

    const unknown = validateFeedFilterParams({
      search: "desk",
      sort: "price",
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.fieldErrors._form).toBeDefined();
    }
  });
});
