import { describe, expect, it } from "vitest";
import {
  findSupportedUniversityByDomain,
  getSupportedUniversity,
  isUniversityVerificationActive,
  SUPPORTED_UNIVERSITIES,
  UNIVERSITY_POLICY_SECONDS,
  UNIVERSITY_VERIFICATION_VALIDITY_MONTHS,
  universityTokenExpiresAt,
  universityVerificationExpiresAt,
} from "./university.ts";

describe("university verification domain policy", () => {
  it("defines supported universities allowlist and domain mappings for TU Braunschweig", () => {
    expect(SUPPORTED_UNIVERSITIES).toHaveLength(1);
    const tuBs = SUPPORTED_UNIVERSITIES[0];
    expect(tuBs.id).toBe("tu-braunschweig");
    expect(tuBs.name).toBe("TU Braunschweig");
    expect(tuBs.badgeLabel).toBe("TU Braunschweig");
    expect(tuBs.acceptedDomains).toContain("tu-braunschweig.de");
    expect(tuBs.acceptedDomains).toContain("tu-bs.de");
  });

  it("finds supported university by exact or case-insensitive/trimmed domain", () => {
    expect(findSupportedUniversityByDomain("tu-braunschweig.de")?.id).toBe(
      "tu-braunschweig",
    );
    expect(findSupportedUniversityByDomain("tu-bs.de")?.id).toBe(
      "tu-braunschweig",
    );
    expect(findSupportedUniversityByDomain("  TU-BRAUNSCHWEIG.DE  ")?.id).toBe(
      "tu-braunschweig",
    );
    expect(findSupportedUniversityByDomain("TU-BS.DE")?.id).toBe(
      "tu-braunschweig",
    );
    expect(findSupportedUniversityByDomain("gmail.com")).toBeUndefined();
    expect(findSupportedUniversityByDomain("uni-hannover.de")).toBeUndefined();
  });

  it("gets supported university by id", () => {
    expect(getSupportedUniversity("tu-braunschweig")?.name).toBe(
      "TU Braunschweig",
    );
    expect(getSupportedUniversity("other")).toBeUndefined();
  });

  it("defines a 24-hour token TTL and twelve-calendar-month verification validity", () => {
    expect(UNIVERSITY_POLICY_SECONDS.tokenTtl).toBe(24 * 60 * 60);
    expect(UNIVERSITY_VERIFICATION_VALIDITY_MONTHS).toBe(12);
  });

  it("calculates token expiration at issuedAt + 24 hours", () => {
    const issuedAt = new Date("2026-09-21T10:00:00.000Z");
    const expiresAt = universityTokenExpiresAt(issuedAt);
    expect(expiresAt.toISOString()).toBe("2026-09-22T10:00:00.000Z");
  });

  it("calculates verification expiration at confirmedAt + twelve calendar months", () => {
    const confirmedAt = new Date("2026-09-21T10:00:00.000Z");
    const expiresAt = universityVerificationExpiresAt(confirmedAt);
    expect(expiresAt.toISOString()).toBe("2027-09-21T10:00:00.000Z");
  });

  it("clamps leap-day confirmation to the last day of the target month", () => {
    const confirmedAt = new Date("2024-02-29T23:15:30.123Z");
    const expiresAt = universityVerificationExpiresAt(confirmedAt);
    expect(expiresAt.toISOString()).toBe("2025-02-28T23:15:30.123Z");
  });

  it("preserves invalid date behavior without throwing", () => {
    expect(
      Number.isNaN(
        universityVerificationExpiresAt(new Date(Number.NaN)).getTime(),
      ),
    ).toBe(true);
  });

  describe("isUniversityVerificationActive", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");
    const future = new Date("2026-09-22T12:00:00.000Z");
    const past = new Date("2026-09-20T12:00:00.000Z");

    it("evaluates true when status is verified and now is strictly before expiresAt", () => {
      expect(
        isUniversityVerificationActive(
          { status: "verified", expiresAt: future },
          now,
        ),
      ).toBe(true);
      expect(
        isUniversityVerificationActive(
          { status: "verified", expiresAt: future.toISOString() },
          now,
        ),
      ).toBe(true);
    });

    it("evaluates false when status is not verified", () => {
      expect(
        isUniversityVerificationActive(
          { status: "pending", expiresAt: future },
          now,
        ),
      ).toBe(false);
      expect(
        isUniversityVerificationActive(
          { status: "revoked", expiresAt: future },
          now,
        ),
      ).toBe(false);
      expect(
        isUniversityVerificationActive(
          { status: "other", expiresAt: future },
          now,
        ),
      ).toBe(false);
    });

    it("evaluates false at or after the expiration timestamp boundary", () => {
      expect(
        isUniversityVerificationActive(
          { status: "verified", expiresAt: now },
          now,
        ),
      ).toBe(false);
      expect(
        isUniversityVerificationActive(
          { status: "verified", expiresAt: past },
          now,
        ),
      ).toBe(false);
    });

    it("evaluates false for nullish verification, null expiresAt, or invalid date string", () => {
      expect(isUniversityVerificationActive(null, now)).toBe(false);
      expect(isUniversityVerificationActive(undefined, now)).toBe(false);
      expect(
        isUniversityVerificationActive(
          { status: "verified", expiresAt: null },
          now,
        ),
      ).toBe(false);
      expect(
        isUniversityVerificationActive(
          { status: "verified", expiresAt: "invalid-date" },
          now,
        ),
      ).toBe(false);
    });
  });
});
