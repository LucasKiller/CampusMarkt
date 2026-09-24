import { describe, expect, it } from "vitest";

import {
  validateConversationIdParam,
  validateGetMessagesQuery,
  validateGetOrCreateConversationInput,
  validateSendMessageInput,
} from "./messaging.ts";

describe("messaging validation schemas", () => {
  describe("validateSendMessageInput", () => {
    it("accepts valid message content and trims whitespace", () => {
      const result = validateSendMessageInput({
        content: "  Hallo, steht der Artikel noch zur Abholung bereit?  ",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.content).toBe(
          "Hallo, steht der Artikel noch zur Abholung bereit?",
        );
      }
    });

    it("accepts message of exactly 2000 characters", () => {
      const content = "a".repeat(2000);
      const result = validateSendMessageInput({ content });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.content.length).toBe(2000);
      }
    });

    it("rejects non-object payloads", () => {
      expect(validateSendMessageInput(null).ok).toBe(false);
      expect(validateSendMessageInput("text").ok).toBe(false);
      expect(validateSendMessageInput([1, 2, 3]).ok).toBe(false);
    });

    it("rejects non-string content", () => {
      const result = validateSendMessageInput({ content: 123 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.content).toBeDefined();
      }
    });

    it("rejects empty or whitespace-only content", () => {
      const emptyResult = validateSendMessageInput({ content: "" });
      expect(emptyResult.ok).toBe(false);
      if (!emptyResult.ok) {
        expect(emptyResult.fieldErrors.content).toContain(
          "Message content cannot be empty.",
        );
      }

      const whitespaceResult = validateSendMessageInput({
        content: "   \n\t  ",
      });
      expect(whitespaceResult.ok).toBe(false);
      if (!whitespaceResult.ok) {
        expect(whitespaceResult.fieldErrors.content).toContain(
          "Message content cannot be empty.",
        );
      }
    });

    it("rejects content exceeding 2000 characters", () => {
      const result = validateSendMessageInput({ content: "x".repeat(2001) });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.content).toContain(
          "Message content cannot exceed 2000 characters.",
        );
      }
    });

    it("rejects payloads with unknown fields", () => {
      const result = validateSendMessageInput({
        content: "Hi",
        extraField: "hack",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors._form).toBeDefined();
      }
    });
  });

  describe("validateGetMessagesQuery", () => {
    it("accepts empty query and applies default limit of 50", () => {
      const result = validateGetMessagesQuery({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.limit).toBe(50);
        expect(result.value.before).toBeUndefined();
        expect(result.value.after).toBeUndefined();
      }
    });

    it("accepts valid ISO timestamp for before and after", () => {
      const result = validateGetMessagesQuery({
        before: "2026-09-24T20:00:00.000Z",
        after: "2026-09-24T19:00:00.000Z",
        limit: 25,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.before).toBe("2026-09-24T20:00:00.000Z");
        expect(result.value.after).toBe("2026-09-24T19:00:00.000Z");
        expect(result.value.limit).toBe(25);
      }
    });

    it("accepts UUID cursor for before/after", () => {
      const result = validateGetMessagesQuery({
        before: "11111111-1111-1111-1111-111111111111",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.before).toBe(
          "11111111-1111-1111-1111-111111111111",
        );
      }
    });

    it("parses string limit", () => {
      const result = validateGetMessagesQuery({ limit: "30" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.limit).toBe(30);
      }
    });

    it("rejects limits less than 1 or greater than 100", () => {
      expect(validateGetMessagesQuery({ limit: 0 }).ok).toBe(false);
      expect(validateGetMessagesQuery({ limit: -5 }).ok).toBe(false);
      expect(validateGetMessagesQuery({ limit: 101 }).ok).toBe(false);
      expect(validateGetMessagesQuery({ limit: "not-a-number" }).ok).toBe(
        false,
      );
    });

    it("rejects malformed before/after timestamps or IDs", () => {
      const result = validateGetMessagesQuery({
        before: "invalid-timestamp",
        after: "not-valid",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.before).toBeDefined();
        expect(result.fieldErrors.after).toBeDefined();
      }
    });

    it("rejects non-object query input", () => {
      expect(validateGetMessagesQuery(null).ok).toBe(false);
      expect(validateGetMessagesQuery("query").ok).toBe(false);
    });

    it("rejects unknown query fields", () => {
      const result = validateGetMessagesQuery({
        unsupported: "foo",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors._form).toBeDefined();
      }
    });
  });

  describe("validateGetOrCreateConversationInput", () => {
    it("accepts valid listingId UUID", () => {
      const result = validateGetOrCreateConversationInput({
        listingId: "11111111-1111-1111-1111-111111111111",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.listingId).toBe(
          "11111111-1111-1111-1111-111111111111",
        );
      }
    });

    it("rejects invalid listingId UUID", () => {
      const result = validateGetOrCreateConversationInput({
        listingId: "bad-uuid",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.listingId).toBeDefined();
      }
    });

    it("rejects non-object or unknown fields", () => {
      expect(validateGetOrCreateConversationInput(null).ok).toBe(false);
      const withExtra = validateGetOrCreateConversationInput({
        listingId: "11111111-1111-1111-1111-111111111111",
        other: 1,
      });
      expect(withExtra.ok).toBe(false);
    });
  });

  describe("validateConversationIdParam", () => {
    it("accepts direct UUID string", () => {
      const result = validateConversationIdParam(
        "11111111-1111-1111-1111-111111111111",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("11111111-1111-1111-1111-111111111111");
      }
    });

    it("accepts route params object", () => {
      const result = validateConversationIdParam({
        id: "11111111-1111-1111-1111-111111111111",
      });
      expect(result.ok).toBe(true);
    });

    it("rejects non-UUID candidate", () => {
      const result = validateConversationIdParam("invalid-id");
      expect(result.ok).toBe(false);
    });
  });
});
