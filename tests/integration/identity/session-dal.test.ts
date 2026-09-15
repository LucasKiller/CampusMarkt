import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  IdentityAuthorizationError,
  createIdentitySessionDal,
} from "../../../apps/web/src/modules/identity/server/session/index.ts";

const authUserId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

type PortResult = { ok: boolean; value?: unknown; code?: string };

const validStatus = {
  auth_user_id: authUserId,
  is_active: true,
  email_confirmed: true,
  profile_complete: true,
  consent_complete: true,
};

function dependencies() {
  const auth = {
    resolveSession: vi.fn(async (): Promise<PortResult> => ({
      ok: true,
      value: {
        authUserId,
        sessionId,
        expiresAt: 1_800_000_000,
        issuedAt: 1_799_999_999,
      },
    })),
  };
  const repository = {
    isCurrentSessionActive: vi.fn(async (): Promise<PortResult> => ({
      ok: true,
      value: true,
    })),
    getCurrentIdentityStatus: vi.fn(async (): Promise<PortResult> => ({
      ok: true,
      value: validStatus,
    })),
    isPasswordAssuranceRecent: vi.fn(
      async (_input: unknown): Promise<PortResult> => {
        void _input;
        return { ok: true, value: true };
      },
    ),
  };
  const clearSession = vi.fn(async () => undefined);
  return {
    auth,
    repository,
    clearSession,
    canonicalOrigin: "https://campusmarkt.example",
  };
}

describe("identity session DAL", () => {
  it("returns null when no Auth session exists", async () => {
    const ports = dependencies();
    ports.auth.resolveSession.mockResolvedValue({
      ok: false,
      code: "NO_SESSION",
    });
    await expect(
      createIdentitySessionDal(ports).getOptionalIdentity(),
    ).resolves.toBeNull();
  });

  it("returns the verified active identity", async () => {
    await expect(
      createIdentitySessionDal(dependencies()).getOptionalIdentity(),
    ).resolves.toEqual({
      authUserId,
      sessionId,
      emailConfirmed: true,
      profileComplete: true,
      consentComplete: true,
    });
  });

  it.each(["MALFORMED", "EXPIRED", "REVOKED"])(
    "clears cookie state and returns null for %s Auth state",
    async (code) => {
      const ports = dependencies();
      ports.auth.resolveSession.mockResolvedValue({ ok: false, code });
      await expect(
        createIdentitySessionDal(ports).getOptionalIdentity(),
      ).resolves.toBeNull();
      expect(ports.clearSession).toHaveBeenCalledTimes(1);
    },
  );

  it("fails closed without clearing a transient provider outage", async () => {
    const ports = dependencies();
    ports.auth.resolveSession.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    await expect(
      createIdentitySessionDal(ports).getOptionalIdentity(),
    ).rejects.toMatchObject({ code: "DEPENDENCY_UNAVAILABLE" });
    expect(ports.clearSession).not.toHaveBeenCalled();
  });

  it("rejects and clears a missing backing Auth session", async () => {
    const ports = dependencies();
    ports.repository.isCurrentSessionActive.mockResolvedValue({
      ok: true,
      value: false,
    });
    await expect(
      createIdentitySessionDal(ports).requireActiveIdentity(),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    expect(ports.clearSession).toHaveBeenCalledTimes(1);
  });

  it("rejects and clears a malformed backing-session response", async () => {
    const ports = dependencies();
    ports.repository.isCurrentSessionActive.mockResolvedValue({
      ok: true,
      value: "true",
    });
    await expect(
      createIdentitySessionDal(ports).requireActiveIdentity(),
    ).rejects.toBeInstanceOf(IdentityAuthorizationError);
    expect(ports.clearSession).toHaveBeenCalledTimes(1);
  });

  it("fails closed when identity status is unavailable", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockRejectedValue(
      new Error("provider raw details"),
    );
    const result = createIdentitySessionDal(ports).requireActiveIdentity();
    await expect(result).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
    });
  });

  it("rejects a status bound to another Auth user", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockResolvedValue({
      ok: true,
      value: { ...validStatus, auth_user_id: sessionId },
    });
    await expect(
      createIdentitySessionDal(ports).requireActiveIdentity(),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("rejects a deletion-pending or otherwise inactive identity", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockResolvedValue({
      ok: true,
      value: { ...validStatus, is_active: false },
    });
    await expect(
      createIdentitySessionDal(ports).requireActiveIdentity(),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("rejects an unconfirmed identity from private authorization", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockResolvedValue({
      ok: true,
      value: { ...validStatus, email_confirmed: false },
    });
    await expect(
      createIdentitySessionDal(ports).requireActiveIdentity(),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("allows a confirmed active identity without a profile for repair flows", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockResolvedValue({
      ok: true,
      value: { ...validStatus, profile_complete: false },
    });
    await expect(
      createIdentitySessionDal(ports).requireActiveIdentity(),
    ).resolves.toMatchObject({ authUserId, profileComplete: false });
  });

  it("rejects participation when the profile projection is missing", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockResolvedValue({
      ok: true,
      value: { ...validStatus, profile_complete: false },
    });
    await expect(
      createIdentitySessionDal(ports).requireParticipatingIdentity(),
    ).rejects.toMatchObject({ code: "PARTICIPATION_REQUIRED" });
  });

  it("rejects participation when consent is missing", async () => {
    const ports = dependencies();
    ports.repository.getCurrentIdentityStatus.mockResolvedValue({
      ok: true,
      value: { ...validStatus, consent_complete: false },
    });
    await expect(
      createIdentitySessionDal(ports).requireParticipatingIdentity(),
    ).rejects.toMatchObject({ code: "PARTICIPATION_REQUIRED" });
  });

  it("returns a fully provisioned participating identity", async () => {
    await expect(
      createIdentitySessionDal(dependencies()).requireParticipatingIdentity(),
    ).resolves.toMatchObject({ authUserId, participating: true });
  });

  it("checks recent authentication against session-bound assurance", async () => {
    const ports = dependencies();
    await createIdentitySessionDal(ports).requireRecentAuthentication();
    expect(ports.repository.isPasswordAssuranceRecent).toHaveBeenCalledWith({
      authUserId,
      sessionId,
      maxAgeSeconds: 600,
    });
  });

  it("does not treat a newly issued or refreshed JWT as password assurance", async () => {
    const ports = dependencies();
    ports.auth.resolveSession.mockResolvedValue({
      ok: true,
      value: {
        authUserId,
        sessionId,
        expiresAt: 1_800_000_000,
        issuedAt: 1_800_000_000,
      },
    });
    ports.repository.isPasswordAssuranceRecent.mockResolvedValue({
      ok: true,
      value: false,
    });
    await expect(
      createIdentitySessionDal(ports).requireRecentAuthentication(),
    ).rejects.toMatchObject({ code: "RECENT_AUTHENTICATION_REQUIRED" });
  });

  it("accepts a recent session-bound assurance", async () => {
    await expect(
      createIdentitySessionDal(dependencies()).requireRecentAuthentication(),
    ).resolves.toMatchObject({ authUserId, sessionId });
  });

  it("passes a bounded custom assurance age to the repository", async () => {
    const ports = dependencies();
    await createIdentitySessionDal(ports).requireRecentAuthentication(120);
    expect(ports.repository.isPasswordAssuranceRecent).toHaveBeenCalledWith(
      expect.objectContaining({ maxAgeSeconds: 120 }),
    );
  });

  it("preserves a validated local return destination", () => {
    expect(
      createIdentitySessionDal(dependencies()).safeReturnPath(
        "/account/profile?section=name",
      ),
    ).toBe("/account/profile?section=name");
  });

  it.each([
    "https://attacker.example/private",
    "//attacker.example/private",
    "/\\attacker.example/private",
    "/sign-in",
  ])("uses the authenticated home for unsafe return path %s", (returnTo) => {
    expect(
      createIdentitySessionDal(dependencies()).safeReturnPath(returnTo),
    ).toBe("/account");
  });

  it("does not cache authorization results across calls", async () => {
    const ports = dependencies();
    const dal = createIdentitySessionDal(ports);
    await dal.requireActiveIdentity();
    ports.repository.isCurrentSessionActive.mockResolvedValue({
      ok: true,
      value: false,
    });
    await expect(dal.requireActiveIdentity()).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(ports.auth.resolveSession).toHaveBeenCalledTimes(2);
    expect(ports.repository.isCurrentSessionActive).toHaveBeenCalledTimes(2);
  });
});
