import { describe, expect, it } from "vitest";

import {
  validateCompletedHistoryQuery,
  validateCompletePickupInput,
  validateReservationId,
} from "./pickup.ts";

describe("pickup validation schemas", () => {
  describe("validateReservationId", () => {
    it("accepts valid UUID", () => {
      const validUuid = "11111111-2222-3333-4444-555555555555";
      const result = validateReservationId(validUuid);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(validUuid);
      }
    });

    it("rejects invalid reservation id formats", () => {
      expect(validateReservationId("not-a-uuid").ok).toBe(false);
      expect(validateReservationId("").ok).toBe(false);
      expect(validateReservationId(null).ok).toBe(false);
      expect(validateReservationId(12345).ok).toBe(false);
    });
  });

  describe("validateCompletePickupInput", () => {
    it("accepts empty object and defaults completionNote to null", () => {
      const result = validateCompletePickupInput({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.completionNote).toBeNull();
      }
    });

    it("accepts valid completion note under 500 characters", () => {
      const note = "Met at Mensa 1, paid in cash, everything was fine.";
      const result = validateCompletePickupInput({ completionNote: note });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.completionNote).toBe(note);
      }
    });

    it("rejects completion note exceeding 500 characters", () => {
      const longNote = "a".repeat(501);
      const result = validateCompletePickupInput({ completionNote: longNote });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.completionNote).toBeDefined();
      }
    });

    it("rejects non-string completion note", () => {
      const result = validateCompletePickupInput({ completionNote: 12345 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.completionNote).toBeDefined();
      }
    });

    it("rejects non-object input", () => {
      expect(validateCompletePickupInput(null).ok).toBe(false);
      expect(validateCompletePickupInput("string").ok).toBe(false);
      expect(validateCompletePickupInput([1, 2]).ok).toBe(false);
    });

    it("rejects unknown fields in payload", () => {
      const result = validateCompletePickupInput({
        completionNote: "valid note",
        unexpectedKey: true,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors._form).toBeDefined();
      }
    });
  });

  describe("validateCompletedHistoryQuery", () => {
    it("accepts empty query and provides sensible defaults", () => {
      const result = validateCompletedHistoryQuery({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.limit).toBe(50);
        expect(result.value.cursor).toBeUndefined();
      }
    });

    it("accepts valid limit and cursor", () => {
      const result = validateCompletedHistoryQuery({
        limit: 25,
        cursor: "2026-09-25T10:00:00.000Z",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.limit).toBe(25);
        expect(result.value.cursor).toBe("2026-09-25T10:00:00.000Z");
      }
    });

    it("rejects invalid limit", () => {
      expect(validateCompletedHistoryQuery({ limit: -5 }).ok).toBe(false);
      expect(validateCompletedHistoryQuery({ limit: 101 }).ok).toBe(false);
      expect(validateCompletedHistoryQuery({ limit: "invalid" }).ok).toBe(
        false,
      );
    });
  });
});
