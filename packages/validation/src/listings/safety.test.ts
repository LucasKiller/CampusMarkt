import { describe, expect, it } from "vitest";

import {
  validateBlockedUserId,
  validateBlockUserInput,
  validateCreateReportInput,
  validateReportTargetId,
} from "./safety.ts";

describe("safety input validation", () => {
  const validReport = {
    targetType: "listing",
    targetId: "11111111-1111-1111-1111-111111111111",
    reason: "prohibited_content",
    details: "Contains prohibited alcohol product.",
  };

  const validBlock = {
    blockedId: "22222222-2222-2222-2222-222222222222",
  };

  describe("validateReportTargetId", () => {
    it("accepts valid UUID", () => {
      const res = validateReportTargetId(
        "11111111-1111-1111-1111-111111111111",
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe("11111111-1111-1111-1111-111111111111");
      }
    });

    it("rejects non-UUID", () => {
      const res = validateReportTargetId("not-a-uuid");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetId).toBeDefined();
      }
    });
  });

  describe("validateBlockedUserId", () => {
    it("accepts valid UUID", () => {
      const res = validateBlockedUserId("22222222-2222-2222-2222-222222222222");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe("22222222-2222-2222-2222-222222222222");
      }
    });

    it("rejects non-UUID", () => {
      const res = validateBlockedUserId("abc");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.blockedId).toBeDefined();
      }
    });
  });

  describe("validateCreateReportInput", () => {
    it("accepts valid report submission with details", () => {
      const res = validateCreateReportInput(validReport);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.targetType).toBe("listing");
        expect(res.value.reason).toBe("prohibited_content");
        expect(res.value.details).toBe("Contains prohibited alcohol product.");
      }
    });

    it("accepts valid report submission without details", () => {
      const res = validateCreateReportInput({
        targetType: "user",
        targetId: "11111111-1111-1111-1111-111111111111",
        reason: "harassment_or_abuse",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.targetType).toBe("user");
        expect(res.value.details).toBeUndefined();
      }
    });

    it("rejects non-object payload", () => {
      const res = validateCreateReportInput("not an object");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects unknown fields", () => {
      const res = validateCreateReportInput({
        ...validReport,
        extraField: "hacker",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects invalid targetType", () => {
      const res = validateCreateReportInput({
        ...validReport,
        targetType: "chat_thread",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetType).toBeDefined();
      }
    });

    it("rejects invalid targetId", () => {
      const res = validateCreateReportInput({
        ...validReport,
        targetId: "not-a-uuid",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetId).toBeDefined();
      }
    });

    it("rejects invalid reason", () => {
      const res = validateCreateReportInput({
        ...validReport,
        reason: "just_dislike",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.reason).toBeDefined();
      }
    });

    it("rejects details exceeding 1000 characters", () => {
      const res = validateCreateReportInput({
        ...validReport,
        details: "a".repeat(1001),
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.details).toBeDefined();
      }
    });

    it("accepts details with exactly 1000 characters", () => {
      const res = validateCreateReportInput({
        ...validReport,
        details: "a".repeat(1000),
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.details?.length).toBe(1000);
      }
    });
  });

  describe("validateBlockUserInput", () => {
    it("accepts valid block input", () => {
      const res = validateBlockUserInput(validBlock);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.blockedId).toBe(
          "22222222-2222-2222-2222-222222222222",
        );
      }
    });

    it("rejects non-object payload", () => {
      const res = validateBlockUserInput(null);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects unknown fields in block input", () => {
      const res = validateBlockUserInput({
        ...validBlock,
        reason: "spam",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects invalid blockedId", () => {
      const res = validateBlockUserInput({
        blockedId: "invalid-uuid",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.blockedId).toBeDefined();
      }
    });
  });
});
