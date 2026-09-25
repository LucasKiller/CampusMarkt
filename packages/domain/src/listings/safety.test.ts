import { describe, expect, it } from "vitest";

import {
  assertCanBlock,
  assertCanReport,
  canBlock,
  canReport,
  DuplicatePendingReportError,
  SelfBlockError,
  SelfReportError,
  UserBlockedInteractionError,
} from "./safety.ts";

describe("safety domain invariants and helpers", () => {
  const userA = "11111111-1111-1111-1111-111111111111";
  const userB = "22222222-2222-2222-2222-222222222222";

  describe("canReport and assertCanReport", () => {
    it("allows reporting a different user or listing", () => {
      expect(canReport(userA, userB)).toBe(true);
      expect(() => assertCanReport(userA, userB)).not.toThrow();
    });

    it("rejects self-reporting", () => {
      expect(canReport(userA, userA)).toBe(false);
      expect(canReport(userA, userA.toUpperCase())).toBe(false);
      expect(() => assertCanReport(userA, userA)).toThrow(SelfReportError);
    });

    it("throws when reporterId or targetId is empty", () => {
      expect(canReport("", userB)).toBe(false);
      expect(canReport(userA, "")).toBe(false);
      expect(() => assertCanReport("", userB)).toThrow();
      expect(() => assertCanReport(userA, "")).toThrow();
    });
  });

  describe("canBlock and assertCanBlock", () => {
    it("allows blocking a different user", () => {
      expect(canBlock(userA, userB)).toBe(true);
      expect(() => assertCanBlock(userA, userB)).not.toThrow();
    });

    it("rejects self-blocking", () => {
      expect(canBlock(userA, userA)).toBe(false);
      expect(canBlock(userA, userA.toUpperCase())).toBe(false);
      expect(() => assertCanBlock(userA, userA)).toThrow(SelfBlockError);
    });

    it("throws when blockerId or blockedId is empty", () => {
      expect(canBlock("", userB)).toBe(false);
      expect(canBlock(userA, "")).toBe(false);
      expect(() => assertCanBlock("", userB)).toThrow();
      expect(() => assertCanBlock(userA, "")).toThrow();
    });
  });

  describe("domain error types", () => {
    it("instantiates SelfReportError with correct code", () => {
      const err = new SelfReportError();
      expect(err.code).toBe("CANNOT_REPORT_SELF");
      expect(err.name).toBe("SelfReportError");
    });

    it("instantiates SelfBlockError with correct code", () => {
      const err = new SelfBlockError();
      expect(err.code).toBe("CANNOT_BLOCK_SELF");
      expect(err.name).toBe("SelfBlockError");
    });

    it("instantiates DuplicatePendingReportError with correct code", () => {
      const err = new DuplicatePendingReportError();
      expect(err.code).toBe("REPORT_ALREADY_PENDING");
      expect(err.name).toBe("DuplicatePendingReportError");
    });

    it("instantiates UserBlockedInteractionError with correct code", () => {
      const err = new UserBlockedInteractionError();
      expect(err.code).toBe("USER_BLOCKED");
      expect(err.name).toBe("UserBlockedInteractionError");
    });
  });
});
