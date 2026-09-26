import { describe, expect, it } from "vitest";

import {
  isExecuteModerationActionRequest,
  isModerationActionDTO,
  isModerationActionType,
  isModerationQueueItemDTO,
  isModerationStatusDTO,
  type ExecuteModerationActionRequest,
  type ModerationActionDTO,
  type ModerationQueueItemDTO,
  type ModerationStatusDTO,
} from "./moderation.ts";

describe("moderation types and predicates", () => {
  const validQueueItem: ModerationQueueItemDTO = {
    id: "11111111-1111-1111-1111-111111111111",
    reporterId: "22222222-2222-2222-2222-222222222222",
    targetType: "listing",
    targetId: "33333333-3333-3333-3333-333333333333",
    reason: "prohibited_content",
    details: "Suspicious item listed on campus",
    status: "pending",
    createdAt: "2026-09-26T10:00:00.000Z",
    listingTitle: "Illegal exam answers",
    listingStatus: "active",
    userName: "Suspicious Student",
  };

  const validActionDTO: ModerationActionDTO = {
    id: "44444444-4444-4444-4444-444444444444",
    moderatorId: "55555555-5555-5555-5555-555555555555",
    reportId: "11111111-1111-1111-1111-111111111111",
    actionType: "remove_listing",
    targetType: "listing",
    targetId: "33333333-3333-3333-3333-333333333333",
    reason: "Confirmed policy violation: exam cheating material.",
    createdAt: "2026-09-26T10:15:00.000Z",
  };

  const validExecuteRequest: ExecuteModerationActionRequest = {
    reportId: "11111111-1111-1111-1111-111111111111",
    actionType: "dismiss_report",
    targetType: "listing",
    targetId: "33333333-3333-3333-3333-333333333333",
    reason: "Unfounded report; item complies with marketplace policy.",
  };

  const validStatusDTO: ModerationStatusDTO = {
    isModerator: true,
  };

  describe("isModerationActionType", () => {
    it("accepts valid moderation action types", () => {
      expect(isModerationActionType("dismiss_report")).toBe(true);
      expect(isModerationActionType("remove_listing")).toBe(true);
      expect(isModerationActionType("suspend_user")).toBe(true);
    });

    it("rejects invalid or unknown action types", () => {
      expect(isModerationActionType("ban_ip")).toBe(false);
      expect(isModerationActionType("warn_user")).toBe(false);
      expect(isModerationActionType(null)).toBe(false);
      expect(isModerationActionType(42)).toBe(false);
    });
  });

  describe("isModerationQueueItemDTO", () => {
    it("accepts valid queue item with all fields", () => {
      expect(isModerationQueueItemDTO(validQueueItem)).toBe(true);
    });

    it("accepts valid queue item without optional fields", () => {
      const minimalQueueItem: ModerationQueueItemDTO = {
        id: validQueueItem.id,
        targetType: validQueueItem.targetType,
        targetId: validQueueItem.targetId,
        reason: validQueueItem.reason,
        status: validQueueItem.status,
        createdAt: validQueueItem.createdAt,
      };
      expect(isModerationQueueItemDTO(minimalQueueItem)).toBe(true);
    });

    it("rejects invalid UUID or invalid status", () => {
      expect(
        isModerationQueueItemDTO({ ...validQueueItem, id: "invalid-uuid" }),
      ).toBe(false);
      expect(
        isModerationQueueItemDTO({
          ...validQueueItem,
          targetId: "not-a-uuid",
        }),
      ).toBe(false);
      expect(
        isModerationQueueItemDTO({
          ...validQueueItem,
          status:
            "unknown_status" as unknown as ModerationQueueItemDTO["status"],
        }),
      ).toBe(false);
    });

    it("rejects invalid date or extraneous keys", () => {
      expect(
        isModerationQueueItemDTO({
          ...validQueueItem,
          createdAt: "not-a-date",
        }),
      ).toBe(false);
      expect(
        isModerationQueueItemDTO({
          ...validQueueItem,
          unexpectedField: true,
        }),
      ).toBe(false);
    });
  });

  describe("isModerationActionDTO", () => {
    it("accepts valid action DTO with reportId", () => {
      expect(isModerationActionDTO(validActionDTO)).toBe(true);
    });

    it("accepts valid action DTO without reportId or with null reportId", () => {
      const noReportId = { ...validActionDTO };
      delete noReportId.reportId;
      expect(isModerationActionDTO(noReportId)).toBe(true);
      expect(isModerationActionDTO({ ...validActionDTO, reportId: null })).toBe(
        true,
      );
    });

    it("rejects invalid UUIDs or empty reason", () => {
      expect(isModerationActionDTO({ ...validActionDTO, id: "invalid" })).toBe(
        false,
      );
      expect(
        isModerationActionDTO({
          ...validActionDTO,
          moderatorId: "invalid",
        }),
      ).toBe(false);
      expect(isModerationActionDTO({ ...validActionDTO, reason: "   " })).toBe(
        false,
      );
    });

    it("rejects extraneous keys", () => {
      expect(
        isModerationActionDTO({ ...validActionDTO, extra: "not-allowed" }),
      ).toBe(false);
    });
  });

  describe("isExecuteModerationActionRequest", () => {
    it("accepts valid execute moderation action request", () => {
      expect(isExecuteModerationActionRequest(validExecuteRequest)).toBe(true);
    });

    it("accepts request without reportId", () => {
      const noReport = { ...validExecuteRequest };
      delete noReport.reportId;
      expect(isExecuteModerationActionRequest(noReport)).toBe(true);
    });

    it("rejects reason that is blank or exceeds 1000 characters", () => {
      expect(
        isExecuteModerationActionRequest({
          ...validExecuteRequest,
          reason: "   ",
        }),
      ).toBe(false);
      expect(
        isExecuteModerationActionRequest({
          ...validExecuteRequest,
          reason: "a".repeat(1001),
        }),
      ).toBe(false);
    });

    it("rejects invalid target type or invalid action type", () => {
      expect(
        isExecuteModerationActionRequest({
          ...validExecuteRequest,
          actionType:
            "invalid_action" as unknown as ExecuteModerationActionRequest["actionType"],
        }),
      ).toBe(false);
      expect(
        isExecuteModerationActionRequest({
          ...validExecuteRequest,
          targetType:
            "unsupported" as unknown as ExecuteModerationActionRequest["targetType"],
        }),
      ).toBe(false);
    });

    it("rejects non-object or extraneous keys", () => {
      expect(isExecuteModerationActionRequest(null)).toBe(false);
      expect(
        isExecuteModerationActionRequest({
          ...validExecuteRequest,
          extraField: "denied",
        }),
      ).toBe(false);
    });
  });

  describe("isModerationStatusDTO", () => {
    it("accepts valid moderation status DTO", () => {
      expect(isModerationStatusDTO(validStatusDTO)).toBe(true);
      expect(isModerationStatusDTO({ isModerator: false })).toBe(true);
    });

    it("rejects invalid boolean or extraneous keys", () => {
      expect(
        isModerationStatusDTO({ isModerator: "true" as unknown as boolean }),
      ).toBe(false);
      expect(isModerationStatusDTO({ isModerator: true, extra: true })).toBe(
        false,
      );
    });
  });
});
