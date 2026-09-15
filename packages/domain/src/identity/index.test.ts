import { describe, expect, it } from "vitest";

import {
  IDENTITY_POLICY_SECONDS,
  avatarCleanupDueAt,
  avatarFallback,
  canParticipate,
  confirmationExpiresAt,
  isBeforeExpiry,
  isSessionWithinLifetime,
  isWithinRecentAuthentication,
  purgeDueAt,
  recoveryExpiresAt,
  sessionExpiresAt,
  transitionIdentity,
} from "./index.js";

const ISSUED_AT = new Date("2026-09-15T10:00:00.000Z");

describe("identity participation policy", () => {
  it("allows a confirmed active identity with a confirmed email", () => {
    expect(canParticipate("active_confirmed", true)).toBe(true);
  });

  it.each([
    "active_unconfirmed",
    "deletion_pending",
    "missing",
    "revoked",
    "expired",
  ] as const)("fails closed for the %s identity state", (state) => {
    expect(canParticipate(state, true)).toBe(false);
  });

  it("fails closed when the account state and email confirmation disagree", () => {
    expect(canParticipate("active_confirmed", false)).toBe(false);
  });
});

describe("identity lifecycle transitions", () => {
  it("confirms an unconfirmed account once", () => {
    expect(transitionIdentity("active_unconfirmed", "confirm_email")).toEqual({
      ok: true,
      changed: true,
      state: "active_confirmed",
    });
  });

  it("treats a repeated confirmation transition as an unchanged success", () => {
    expect(transitionIdentity("active_confirmed", "confirm_email")).toEqual({
      ok: true,
      changed: false,
      state: "active_confirmed",
    });
  });

  it("moves a confirmed account to deletion pending once", () => {
    expect(transitionIdentity("active_confirmed", "request_deletion")).toEqual({
      ok: true,
      changed: true,
      state: "deletion_pending",
    });
  });

  it("treats a repeated deletion request as an unchanged success", () => {
    expect(transitionIdentity("deletion_pending", "request_deletion")).toEqual({
      ok: true,
      changed: false,
      state: "deletion_pending",
    });
  });

  it.each(["active_unconfirmed", "missing", "revoked", "expired"] as const)(
    "rejects deletion from the %s identity state",
    (state) => {
      expect(transitionIdentity(state, "request_deletion")).toEqual({
        ok: false,
        state,
        reason: "invalid_transition",
      });
    },
  );

  it.each(["deletion_pending", "missing", "revoked", "expired"] as const)(
    "rejects confirmation from the %s identity state",
    (state) => {
      expect(transitionIdentity(state, "confirm_email")).toEqual({
        ok: false,
        state,
        reason: "invalid_transition",
      });
    },
  );
});

describe("identity time policies", () => {
  it("sets confirmation expiry to exactly 24 hours", () => {
    expect(confirmationExpiresAt(ISSUED_AT).toISOString()).toBe(
      "2026-09-16T10:00:00.000Z",
    );
    expect(IDENTITY_POLICY_SECONDS.confirmation).toBe(24 * 60 * 60);
  });

  it("sets recovery expiry to exactly 30 minutes", () => {
    expect(recoveryExpiresAt(ISSUED_AT).toISOString()).toBe(
      "2026-09-15T10:30:00.000Z",
    );
    expect(IDENTITY_POLICY_SECONDS.recovery).toBe(30 * 60);
  });

  it("sets session expiry to exactly 30 days", () => {
    expect(sessionExpiresAt(ISSUED_AT).toISOString()).toBe(
      "2026-10-15T10:00:00.000Z",
    );
    expect(IDENTITY_POLICY_SECONDS.session).toBe(30 * 24 * 60 * 60);
  });

  it("sets deletion purge due time to exactly 30 days", () => {
    expect(purgeDueAt(ISSUED_AT).toISOString()).toBe(
      "2026-10-15T10:00:00.000Z",
    );
    expect(IDENTITY_POLICY_SECONDS.deletionPurge).toBe(30 * 24 * 60 * 60);
  });

  it("sets avatar cleanup due time to exactly 24 hours", () => {
    expect(avatarCleanupDueAt(ISSUED_AT).toISOString()).toBe(
      "2026-09-16T10:00:00.000Z",
    );
    expect(IDENTITY_POLICY_SECONDS.avatarCleanup).toBe(24 * 60 * 60);
  });

  it("accepts recent authentication exactly at the ten-minute boundary", () => {
    expect(
      isWithinRecentAuthentication(
        ISSUED_AT,
        new Date("2026-09-15T10:10:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects authentication older than ten minutes and future timestamps", () => {
    expect(
      isWithinRecentAuthentication(
        ISSUED_AT,
        new Date("2026-09-15T10:10:00.001Z"),
      ),
    ).toBe(false);
    expect(
      isWithinRecentAuthentication(
        new Date("2026-09-15T10:00:00.001Z"),
        ISSUED_AT,
      ),
    ).toBe(false);
  });

  it("treats a credential as expired exactly at its expiry instant", () => {
    const expiresAt = recoveryExpiresAt(ISSUED_AT);

    expect(isBeforeExpiry(new Date(expiresAt.getTime() - 1), expiresAt)).toBe(
      true,
    );
    expect(isBeforeExpiry(expiresAt, expiresAt)).toBe(false);
  });

  it("keeps a session active before but not at its 30-day boundary", () => {
    const expiresAt = sessionExpiresAt(ISSUED_AT);

    expect(
      isSessionWithinLifetime(ISSUED_AT, new Date(expiresAt.getTime() - 1)),
    ).toBe(true);
    expect(isSessionWithinLifetime(ISSUED_AT, expiresAt)).toBe(false);
  });
});

describe("avatar fallback policy", () => {
  it("derives deterministic initials from printable name words", () => {
    expect(avatarFallback("  Ada   Lovelace ")).toEqual({
      kind: "initials",
      value: "AL",
    });
    expect(avatarFallback("Émile")).toEqual({
      kind: "initials",
      value: "É",
    });
  });

  it("uses the neutral fallback when no printable initial exists", () => {
    expect(avatarFallback("😀 !!!")).toEqual({ kind: "neutral" });
    expect(avatarFallback("   ")).toEqual({ kind: "neutral" });
  });
});
