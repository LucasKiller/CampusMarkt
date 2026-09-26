import { describe, expect, it } from "vitest";

import {
  validateExecuteModerationActionInput,
  validateModerationTargetId,
  validateModeratorActionReason,
  validateReportId,
} from "./moderation.ts";

describe("moderation input validation", () => {
  const validDismiss = {
    reportId: "11111111-1111-1111-1111-111111111111",
    actionType: "dismiss_report",
    targetType: "listing",
    targetId: "22222222-2222-2222-2222-222222222222",
    reason: "Report reviewed and found to be compliant with marketplace terms.",
  };

  const validRemoveListing = {
    reportId: "11111111-1111-1111-1111-111111111111",
    actionType: "remove_listing",
    targetType: "listing",
    targetId: "22222222-2222-2222-2222-222222222222",
    reason: "Item is prohibited (weapon / unauthorized chemical).",
  };

  const validSuspendUser = {
    reportId: "33333333-3333-3333-3333-333333333333",
    actionType: "suspend_user",
    targetType: "user",
    targetId: "44444444-4444-4444-4444-444444444444",
    reason: "Confirmed payment fraud behavior.",
  };

  describe("validateModeratorActionReason", () => {
    it("accepts valid justification note", () => {
      const res = validateModeratorActionReason("Legitimate reason");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe("Legitimate reason");
      }
    });

    it("rejects non-string values", () => {
      const res = validateModeratorActionReason(12345);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.reason).toBeDefined();
      }
    });

    it("rejects empty or whitespace-only reason", () => {
      const res = validateModeratorActionReason("   ");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.reason).toBeDefined();
      }
    });

    it("rejects reason exceeding 1000 characters", () => {
      const res = validateModeratorActionReason("a".repeat(1001));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.reason).toBeDefined();
      }
    });

    it("accepts reason with exactly 1000 characters", () => {
      const res = validateModeratorActionReason("a".repeat(1000));
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.length).toBe(1000);
      }
    });
  });

  describe("validateModerationTargetId", () => {
    it("accepts valid UUID and normalizes to lower case", () => {
      const res = validateModerationTargetId(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe("22222222-2222-2222-2222-222222222222");
      }
    });

    it("rejects non-UUID", () => {
      const res = validateModerationTargetId("not-a-valid-uuid");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetId).toBeDefined();
      }
    });
  });

  describe("validateReportId", () => {
    it("accepts valid UUID", () => {
      const res = validateReportId("11111111-1111-1111-1111-111111111111");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe("11111111-1111-1111-1111-111111111111");
      }
    });

    it("rejects non-UUID", () => {
      const res = validateReportId("not-uuid");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.reportId).toBeDefined();
      }
    });
  });

  describe("validateExecuteModerationActionInput", () => {
    it("accepts valid dismiss report action", () => {
      const res = validateExecuteModerationActionInput(validDismiss);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.actionType).toBe("dismiss_report");
        expect(res.value.reportId).toBe("11111111-1111-1111-1111-111111111111");
        expect(res.value.targetId).toBe("22222222-2222-2222-2222-222222222222");
      }
    });

    it("accepts valid remove listing action without reportId", () => {
      const noReport = {
        actionType: "remove_listing",
        targetType: "listing",
        targetId: "22222222-2222-2222-2222-222222222222",
        reason: "Proactive moderator removal.",
      };
      const res = validateExecuteModerationActionInput(noReport);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.reportId).toBeUndefined();
        expect(res.value.actionType).toBe("remove_listing");
      }
    });

    it("accepts valid suspend user action", () => {
      const res = validateExecuteModerationActionInput(validSuspendUser);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.actionType).toBe("suspend_user");
        expect(res.value.targetType).toBe("user");
      }
    });

    it("rejects remove_listing if targetType is user", () => {
      const res = validateExecuteModerationActionInput({
        ...validRemoveListing,
        targetType: "user",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetType).toBeDefined();
      }
    });

    it("rejects suspend_user if targetType is listing", () => {
      const res = validateExecuteModerationActionInput({
        ...validSuspendUser,
        targetType: "listing",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetType).toBeDefined();
      }
    });

    it("rejects non-object payload", () => {
      const res = validateExecuteModerationActionInput(null);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects payload with unknown fields", () => {
      const res = validateExecuteModerationActionInput({
        ...validDismiss,
        hackedField: "injected",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors._form).toBeDefined();
      }
    });

    it("rejects invalid targetId UUID or invalid reportId UUID", () => {
      const res = validateExecuteModerationActionInput({
        ...validDismiss,
        targetId: "invalid",
        reportId: "invalid",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors.targetId).toBeDefined();
        expect(res.fieldErrors.reportId).toBeDefined();
      }
    });

    it("rejects empty reason or reason exceeding 1000 characters", () => {
      const resEmpty = validateExecuteModerationActionInput({
        ...validDismiss,
        reason: "  ",
      });
      expect(resEmpty.ok).toBe(false);

      const resTooLong = validateExecuteModerationActionInput({
        ...validDismiss,
        reason: "x".repeat(1001),
      });
      expect(resTooLong.ok).toBe(false);
    });
  });
});
