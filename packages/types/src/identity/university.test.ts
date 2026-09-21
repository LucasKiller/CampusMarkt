import { describe, expect, it } from "vitest";
import { isPublicProfile } from "./index.ts";
import {
  isConfirmUniversityVerificationRequest,
  isConfirmUniversityVerificationResponse,
  isInitiateUniversityVerificationRequest,
  isUniversityBadge,
  isUniversityVerificationStatusResponse,
} from "./university.ts";

describe("university verification transport contracts and badge types", () => {
  describe("isUniversityBadge", () => {
    it("accepts valid university badge", () => {
      expect(
        isUniversityBadge({
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
        }),
      ).toBe(true);
    });

    it("rejects unexpected fields in university badge", () => {
      expect(
        isUniversityBadge({
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          extraField: true,
        }),
      ).toBe(false);
    });

    it("rejects missing fields or non-string values", () => {
      expect(isUniversityBadge({ universityId: "tu-braunschweig" })).toBe(
        false,
      );
      expect(isUniversityBadge({ badgeLabel: "TU Braunschweig" })).toBe(false);
      expect(isUniversityBadge({ universityId: "", badgeLabel: "TU" })).toBe(
        false,
      );
      expect(isUniversityBadge(null)).toBe(false);
    });
  });

  describe("isInitiateUniversityVerificationRequest", () => {
    it("accepts valid initiation request", () => {
      expect(
        isInitiateUniversityVerificationRequest({
          institutionalEmail: "student@tu-braunschweig.de",
        }),
      ).toBe(true);
    });

    it("rejects unexpected fields in initiation request", () => {
      expect(
        isInitiateUniversityVerificationRequest({
          institutionalEmail: "student@tu-braunschweig.de",
          role: "admin",
        }),
      ).toBe(false);
    });

    it("rejects empty or non-string institutionalEmail", () => {
      expect(
        isInitiateUniversityVerificationRequest({
          institutionalEmail: "   ",
        }),
      ).toBe(false);
      expect(isInitiateUniversityVerificationRequest({})).toBe(false);
    });
  });

  describe("isConfirmUniversityVerificationRequest", () => {
    it("accepts valid confirmation request", () => {
      expect(
        isConfirmUniversityVerificationRequest({
          token: "abcdef123456",
        }),
      ).toBe(true);
    });

    it("rejects unexpected fields in confirmation request", () => {
      expect(
        isConfirmUniversityVerificationRequest({
          token: "abcdef123456",
          extra: 123,
        }),
      ).toBe(false);
    });

    it("rejects empty or missing token", () => {
      expect(isConfirmUniversityVerificationRequest({ token: "" })).toBe(false);
      expect(isConfirmUniversityVerificationRequest({})).toBe(false);
    });
  });

  describe("isConfirmUniversityVerificationResponse", () => {
    it("accepts valid confirmation response", () => {
      expect(
        isConfirmUniversityVerificationResponse({
          status: "verified",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2027-03-21T10:00:00.000Z",
        }),
      ).toBe(true);
    });

    it("rejects unexpected fields in confirmation response", () => {
      expect(
        isConfirmUniversityVerificationResponse({
          status: "verified",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2027-03-21T10:00:00.000Z",
          internalHash: "12345",
        }),
      ).toBe(false);
    });

    it("rejects invalid status or malformed ISO date", () => {
      expect(
        isConfirmUniversityVerificationResponse({
          status: "pending",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2027-03-21T10:00:00.000Z",
        }),
      ).toBe(false);
      expect(
        isConfirmUniversityVerificationResponse({
          status: "verified",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "not-a-date",
        }),
      ).toBe(false);
    });
  });

  describe("isUniversityVerificationStatusResponse", () => {
    it("accepts verified status response", () => {
      expect(
        isUniversityVerificationStatusResponse({
          status: "verified",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2027-03-21T10:00:00.000Z",
          daysRemaining: 180,
        }),
      ).toBe(true);
    });

    it("accepts none status response with null values", () => {
      expect(
        isUniversityVerificationStatusResponse({
          status: "none",
          universityId: null,
          badgeLabel: null,
          expiresAt: null,
          daysRemaining: null,
        }),
      ).toBe(true);
    });

    it("rejects unexpected fields in status response", () => {
      expect(
        isUniversityVerificationStatusResponse({
          status: "none",
          universityId: null,
          badgeLabel: null,
          expiresAt: null,
          daysRemaining: null,
          plaintextEmail: "secret@tu-bs.de",
        }),
      ).toBe(false);
    });

    it("rejects negative daysRemaining", () => {
      expect(
        isUniversityVerificationStatusResponse({
          status: "expired",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2026-09-01T10:00:00.000Z",
          daysRemaining: -5,
        }),
      ).toBe(false);
    });
  });

  describe("PublicProfile with universityBadge", () => {
    const validBaseProfile = {
      publicId: "00000000-0000-4000-8000-000000000001",
      displayName: "Alice",
      joinedMonth: "2026-09",
      avatarUrl: "/media/avatars/00000000-0000-4000-8000-000000000001/1.webp",
    };

    it("accepts public profile without universityBadge", () => {
      expect(isPublicProfile(validBaseProfile)).toBe(true);
    });

    it("accepts public profile with valid universityBadge", () => {
      expect(
        isPublicProfile({
          ...validBaseProfile,
          universityBadge: {
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          },
        }),
      ).toBe(true);
    });

    it("accepts public profile with null universityBadge", () => {
      expect(
        isPublicProfile({
          ...validBaseProfile,
          universityBadge: null,
        }),
      ).toBe(true);
    });

    it("rejects public profile with invalid universityBadge", () => {
      expect(
        isPublicProfile({
          ...validBaseProfile,
          universityBadge: {
            invalidKey: "tu-braunschweig",
          },
        }),
      ).toBe(false);
    });
  });
});
