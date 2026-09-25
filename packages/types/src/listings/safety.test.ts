import { describe, expect, it } from "vitest";

import {
  isBlockUserRequest,
  isCreateReportRequest,
  isReportConfirmationDTO,
  isReportReason,
  isReportTargetType,
  isUserBlockDTO,
  type BlockUserRequest,
  type CreateReportRequest,
  type ReportConfirmationDTO,
  type UserBlockDTO,
} from "./safety.ts";

describe("safety types and predicates", () => {
  const validReportRequest: CreateReportRequest = {
    targetType: "listing",
    targetId: "11111111-1111-1111-1111-111111111111",
    reason: "prohibited_content",
    details: "Suspicious weapon listed",
  };

  const validConfirmation: ReportConfirmationDTO = {
    reportId: "22222222-2222-2222-2222-222222222222",
    status: "pending",
    createdAt: "2026-09-25T12:00:00.000Z",
  };

  const validUserBlock: UserBlockDTO = {
    id: "33333333-3333-3333-3333-333333333333",
    blockedId: "44444444-4444-4444-4444-444444444444",
    blockedName: "Spammer Account",
    avatarUrl: "/media/avatars/44444444-4444-4444-4444-444444444444/1.webp",
    createdAt: "2026-09-25T12:00:00.000Z",
  };

  const validBlockRequest: BlockUserRequest = {
    blockedId: "44444444-4444-4444-4444-444444444444",
  };

  describe("isReportReason", () => {
    it("accepts valid report reasons", () => {
      expect(isReportReason("prohibited_content")).toBe(true);
      expect(isReportReason("fraud_or_scam")).toBe(true);
      expect(isReportReason("harassment_or_abuse")).toBe(true);
      expect(isReportReason("unsupported_content")).toBe(true);
      expect(isReportReason("privacy_violation")).toBe(true);
      expect(isReportReason("other")).toBe(true);
    });

    it("rejects unknown strings or non-strings", () => {
      expect(isReportReason("illegal_drugs")).toBe(false);
      expect(isReportReason(null)).toBe(false);
      expect(isReportReason(123)).toBe(false);
    });
  });

  describe("isReportTargetType", () => {
    it("accepts listing and user", () => {
      expect(isReportTargetType("listing")).toBe(true);
      expect(isReportTargetType("user")).toBe(true);
    });

    it("rejects unknown target types", () => {
      expect(isReportTargetType("message")).toBe(false);
      expect(isReportTargetType("conversation")).toBe(false);
      expect(isReportTargetType(null)).toBe(false);
    });
  });

  describe("isCreateReportRequest", () => {
    it("accepts valid report request with details", () => {
      expect(isCreateReportRequest(validReportRequest)).toBe(true);
    });

    it("accepts valid report request without details", () => {
      const noDetails: CreateReportRequest = {
        targetType: validReportRequest.targetType,
        targetId: validReportRequest.targetId,
        reason: validReportRequest.reason,
      };
      expect(isCreateReportRequest(noDetails)).toBe(true);
    });

    it("rejects non-object or missing required fields", () => {
      expect(isCreateReportRequest(null)).toBe(false);
      expect(isCreateReportRequest({})).toBe(false);
      expect(
        isCreateReportRequest({
          targetType: "listing",
          targetId: "invalid-uuid",
          reason: "other",
        }),
      ).toBe(false);
      expect(
        isCreateReportRequest({
          ...validReportRequest,
          reason: "invalid_reason",
        }),
      ).toBe(false);
    });

    it("rejects extraneous keys", () => {
      expect(
        isCreateReportRequest({
          ...validReportRequest,
          extraField: "not allowed",
        }),
      ).toBe(false);
    });
  });

  describe("isReportConfirmationDTO", () => {
    it("accepts valid confirmation receipt", () => {
      expect(isReportConfirmationDTO(validConfirmation)).toBe(true);
    });

    it("rejects invalid UUID or invalid status or invalid date", () => {
      expect(
        isReportConfirmationDTO({ ...validConfirmation, reportId: "bad" }),
      ).toBe(false);
      expect(
        isReportConfirmationDTO({ ...validConfirmation, status: "reviewed" }),
      ).toBe(false);
      expect(
        isReportConfirmationDTO({
          ...validConfirmation,
          createdAt: "bad-date",
        }),
      ).toBe(false);
    });

    it("rejects extraneous keys", () => {
      expect(
        isReportConfirmationDTO({ ...validConfirmation, extra: 123 }),
      ).toBe(false);
    });
  });

  describe("isUserBlockDTO", () => {
    it("accepts valid user block dto with avatarUrl", () => {
      expect(isUserBlockDTO(validUserBlock)).toBe(true);
    });

    it("accepts valid user block dto without avatarUrl or with null", () => {
      const noAvatar: UserBlockDTO = {
        id: validUserBlock.id,
        blockedId: validUserBlock.blockedId,
        blockedName: validUserBlock.blockedName,
        createdAt: validUserBlock.createdAt,
      };
      expect(isUserBlockDTO(noAvatar)).toBe(true);
      expect(isUserBlockDTO({ ...noAvatar, avatarUrl: null })).toBe(true);
    });

    it("rejects missing blockedName or blank blockedName", () => {
      expect(isUserBlockDTO({ ...validUserBlock, blockedName: "   " })).toBe(
        false,
      );
    });

    it("rejects invalid UUIDs", () => {
      expect(isUserBlockDTO({ ...validUserBlock, id: "invalid" })).toBe(false);
      expect(isUserBlockDTO({ ...validUserBlock, blockedId: "invalid" })).toBe(
        false,
      );
    });
  });

  describe("isBlockUserRequest", () => {
    it("accepts valid block user request", () => {
      expect(isBlockUserRequest(validBlockRequest)).toBe(true);
    });

    it("rejects invalid UUID or extra fields", () => {
      expect(isBlockUserRequest({ blockedId: "not-uuid" })).toBe(false);
      expect(isBlockUserRequest({ ...validBlockRequest, extra: true })).toBe(
        false,
      );
    });
  });
});
