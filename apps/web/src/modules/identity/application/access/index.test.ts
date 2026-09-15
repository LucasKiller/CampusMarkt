import { describe, expect, it, vi } from "vitest";

import { createAccessService } from "./index";

const authUserId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const correlationId = "33333333-3333-4333-8333-333333333333";
const context = { trustedClientIp: "203.0.113.8", correlationId };
const credentials = {
  email: "person@example.test",
  password: "long-password",
  returnTo: "/account/security",
};
type PortResult = { ok: boolean; value?: unknown; code?: string };

function dependencies() {
  const security = {
    fingerprintIdentity: vi.fn(() => "a".repeat(64)),
    enforce: vi.fn(async <T>(_input: unknown, operation: () => Promise<T>) => {
      void _input;
      return { status: "allowed" as const, value: await operation() };
    }),
  };
  const auth = {
    signInWithPassword: vi.fn(
      async (_email: string, _password: string): Promise<PortResult> => {
        void _email;
        void _password;
        return {
          ok: true,
          value: { authUserId, sessionId, accessToken: "secret", issuedAt: 99 },
        };
      },
    ),
    signOutCurrent: vi.fn(async (): Promise<PortResult> => ({
      ok: true,
      value: null,
    })),
    signOutAll: vi.fn(async (): Promise<PortResult> => ({
      ok: true,
      value: null,
    })),
    updatePassword: vi.fn(
      async (_authUserId: string, _password: string): Promise<PortResult> => {
        void _authUserId;
        void _password;
        return { ok: true, value: null };
      },
    ),
  };
  const session = {
    requireActiveIdentity: vi.fn(async () => ({ authUserId, sessionId })),
    requireRecentAuthentication: vi.fn(async () => ({
      authUserId,
      sessionId,
    })),
    safeReturnPath: vi.fn((value: unknown) =>
      typeof value === "string" && value.startsWith("/") ? value : "/account",
    ),
  };
  const repository = {
    recordPasswordAssurance: vi.fn(
      async (_input: unknown): Promise<PortResult> => {
        void _input;
        return { ok: true, value: null };
      },
    ),
    revokeUserSessions: vi.fn(
      async (_authUserId: string): Promise<PortResult> => {
        void _authUserId;
        return { ok: true, value: 2 };
      },
    ),
    findRecoveryByEmailKey: vi.fn(
      async (_emailKey: string): Promise<PortResult> => {
        void _emailKey;
        return { ok: true, value: null };
      },
    ),
    requestDeletion: vi.fn(async (_identity: unknown): Promise<PortResult> => {
      void _identity;
      return { ok: true, value: { changed: true } };
    }),
  };
  const actionLinks = {
    issue: vi.fn(
      async (
        _input: unknown,
      ): Promise<{ status: "accepted" | "unavailable" }> => {
        void _input;
        return { status: "accepted" };
      },
    ),
    consume: vi.fn(
      async (
        _input: unknown,
      ): Promise<
        | { status: "consumed"; authUserId: string }
        | { status: "invalid_link" | "unavailable" }
      > => {
        void _input;
        return { status: "consumed", authUserId };
      },
    ),
  };
  const clearSession = vi.fn(async () => undefined);
  return {
    security,
    auth,
    session,
    repository,
    actionLinks,
    clearSession,
  };
}

describe("access sign-in", () => {
  it("rejects invalid credentials before rate limiting", async () => {
    const ports = dependencies();
    await expect(
      createAccessService(ports).signIn(
        { ...credentials, password: "short" },
        context,
      ),
    ).resolves.toMatchObject({ status: "invalid" });
    expect(ports.security.enforce).not.toHaveBeenCalled();
  });

  it("runs the limiter before Auth", async () => {
    const ports = dependencies();
    ports.security.enforce.mockImplementation(async (_input, operation) => {
      void _input;
      expect(ports.auth.signInWithPassword).not.toHaveBeenCalled();
      return { status: "allowed", value: await operation() };
    });
    await createAccessService(ports).signIn(credentials, context);
    expect(ports.security.enforce).toHaveBeenCalledWith(
      expect.objectContaining({ action: "sign_in" }),
      expect.any(Function),
    );
  });

  it("does no credential work after rate denial", async () => {
    const ports = dependencies();
    ports.security.enforce.mockResolvedValue({
      status: "rate_limited",
      retryAfterSeconds: 44,
    } as never);
    await expect(
      createAccessService(ports).signIn(credentials, context),
    ).resolves.toEqual({ status: "rate_limited", retryAfterSeconds: 44 });
    expect(ports.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each(["INVALID_CREDENTIALS", "UNCONFIRMED", "DISABLED"])(
    "maps %s to the same denied result",
    async (code) => {
      const ports = dependencies();
      ports.auth.signInWithPassword.mockResolvedValue({
        ok: false,
        code,
      });
      await expect(
        createAccessService(ports).signIn(credentials, context),
      ).resolves.toEqual({ status: "denied" });
    },
  );

  it("maps deletion-pending DAL denial to the same denied result", async () => {
    const ports = dependencies();
    ports.session.requireActiveIdentity.mockRejectedValue(
      new Error("ACCESS_DENIED"),
    );
    await expect(
      createAccessService(ports).signIn(credentials, context),
    ).resolves.toEqual({ status: "denied" });
    expect(ports.auth.signOutCurrent).toHaveBeenCalled();
    expect(ports.clearSession).toHaveBeenCalled();
  });

  it("records password assurance for the actual returned session", async () => {
    const ports = dependencies();
    await createAccessService(ports).signIn(credentials, context);
    expect(ports.repository.recordPasswordAssurance).toHaveBeenCalledWith({
      authUserId,
      sessionId,
    });
  });

  it("fails closed and signs out when assurance cannot be recorded", async () => {
    const ports = dependencies();
    ports.repository.recordPasswordAssurance.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    await expect(
      createAccessService(ports).signIn(credentials, context),
    ).resolves.toEqual({ status: "unavailable" });
    expect(ports.auth.signOutCurrent).toHaveBeenCalled();
    expect(ports.clearSession).toHaveBeenCalled();
  });

  it("returns the DAL-validated local destination", async () => {
    const ports = dependencies();
    await expect(
      createAccessService(ports).signIn(credentials, context),
    ).resolves.toEqual({
      status: "signed_in",
      redirectTo: "/account/security",
    });
    expect(ports.session.safeReturnPath).toHaveBeenCalledWith(
      "/account/security",
    );
  });
});

describe("access logout and reauthentication", () => {
  it("logs out only the current provider session and clears local cookies", async () => {
    const ports = dependencies();
    await expect(createAccessService(ports).signOutCurrent()).resolves.toEqual({
      status: "signed_out",
    });
    expect(ports.auth.signOutCurrent).toHaveBeenCalledTimes(1);
    expect(ports.repository.revokeUserSessions).not.toHaveBeenCalled();
    expect(ports.auth.signOutAll).not.toHaveBeenCalled();
    expect(ports.clearSession).toHaveBeenCalledTimes(1);
  });

  it("clears local cookies even when current sign-out fails", async () => {
    const ports = dependencies();
    ports.auth.signOutCurrent.mockResolvedValue({ ok: false, code: "FAILED" });
    await expect(createAccessService(ports).signOutCurrent()).resolves.toEqual({
      status: "unavailable",
    });
    expect(ports.clearSession).toHaveBeenCalledTimes(1);
  });

  it("revokes backing sessions before provider global logout", async () => {
    const ports = dependencies();
    await createAccessService(ports).signOutAll({ authUserId, sessionId });
    expect(
      ports.repository.revokeUserSessions.mock.invocationCallOrder[0],
    ).toBeLessThan(ports.auth.signOutAll.mock.invocationCallOrder[0] ?? 0);
    expect(ports.clearSession).toHaveBeenCalled();
  });

  it("does not report global logout success when revocation fails", async () => {
    const ports = dependencies();
    ports.repository.revokeUserSessions.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    await expect(
      createAccessService(ports).signOutAll({ authUserId, sessionId }),
    ).resolves.toEqual({ status: "unavailable" });
    expect(ports.auth.signOutAll).not.toHaveBeenCalled();
    expect(ports.clearSession).toHaveBeenCalled();
  });

  it("reauthentication records assurance for the new actual session", async () => {
    const ports = dependencies();
    const newSessionId = "44444444-4444-4444-8444-444444444444";
    ports.auth.signInWithPassword.mockResolvedValue({
      ok: true,
      value: { authUserId, sessionId: newSessionId },
    });
    await createAccessService(ports).reauthenticate(
      { authUserId, sessionId },
      { email: "person@example.test", password: "long-password" },
    );
    expect(ports.repository.recordPasswordAssurance).toHaveBeenCalledWith({
      authUserId,
      sessionId: newSessionId,
    });
  });

  it("rejects reauthentication when Auth returns another user", async () => {
    const ports = dependencies();
    ports.auth.signInWithPassword.mockResolvedValue({
      ok: true,
      value: { authUserId: sessionId, sessionId },
    });
    await expect(
      createAccessService(ports).reauthenticate(
        { authUserId, sessionId },
        { email: "person@example.test", password: "long-password" },
      ),
    ).resolves.toEqual({ status: "denied" });
    expect(ports.repository.recordPasswordAssurance).not.toHaveBeenCalled();
  });
});

describe("access recovery", () => {
  it("rejects malformed recovery email before the limiter", async () => {
    const ports = dependencies();
    await expect(
      createAccessService(ports).requestRecovery("bad", context),
    ).resolves.toMatchObject({ status: "invalid" });
    expect(ports.security.enforce).not.toHaveBeenCalled();
  });

  it("does not query or email after recovery rate denial", async () => {
    const ports = dependencies();
    ports.security.enforce.mockResolvedValue({
      status: "rate_limited",
      retryAfterSeconds: 60,
    } as never);
    await createAccessService(ports).requestRecovery(
      "person@example.test",
      context,
    );
    expect(ports.repository.findRecoveryByEmailKey).not.toHaveBeenCalled();
    expect(ports.actionLinks.issue).not.toHaveBeenCalled();
  });

  it.each([null, { state: "deletion_pending", authUserId }])(
    "returns accepted without email for private state %j",
    async (value) => {
      const ports = dependencies();
      ports.repository.findRecoveryByEmailKey.mockResolvedValue({
        ok: true,
        value,
      });
      await expect(
        createAccessService(ports).requestRecovery(
          "person@example.test",
          context,
        ),
      ).resolves.toEqual({ status: "accepted" });
      expect(ports.actionLinks.issue).not.toHaveBeenCalled();
    },
  );

  it("emails only an active confirmed recovery identity", async () => {
    const ports = dependencies();
    ports.repository.findRecoveryByEmailKey.mockResolvedValue({
      ok: true,
      value: { state: "active_confirmed", authUserId },
    });
    await createAccessService(ports).requestRecovery(
      "person@example.test",
      context,
    );
    expect(ports.actionLinks.issue).toHaveBeenCalledWith({
      authUserId,
      recipient: "person@example.test",
      purpose: "password_recovery",
    });
  });

  it("keeps SMTP failure enumeration-safe", async () => {
    const ports = dependencies();
    ports.repository.findRecoveryByEmailKey.mockResolvedValue({
      ok: true,
      value: { state: "active_confirmed", authUserId },
    });
    ports.actionLinks.issue.mockResolvedValue({ status: "unavailable" });
    await expect(
      createAccessService(ports).requestRecovery(
        "person@example.test",
        context,
      ),
    ).resolves.toEqual({ status: "accepted" });
  });

  it("rejects an invalid password before token consumption", async () => {
    const ports = dependencies();
    await expect(
      createAccessService(ports).resetPassword("raw-token", "short"),
    ).resolves.toMatchObject({ status: "invalid" });
    expect(ports.actionLinks.consume).not.toHaveBeenCalled();
  });

  it("changes nothing for an invalid or already-used token", async () => {
    const ports = dependencies();
    ports.actionLinks.consume.mockResolvedValue({ status: "invalid_link" });
    await expect(
      createAccessService(ports).resetPassword("raw-token", "long-password"),
    ).resolves.toEqual({ status: "invalid_link" });
    expect(ports.repository.revokeUserSessions).not.toHaveBeenCalled();
    expect(ports.auth.updatePassword).not.toHaveBeenCalled();
  });

  it("revokes every old session before updating the password", async () => {
    const ports = dependencies();
    await createAccessService(ports).resetPassword(
      "raw-token",
      "long-password",
    );
    expect(
      ports.repository.revokeUserSessions.mock.invocationCallOrder[0],
    ).toBeLessThan(ports.auth.updatePassword.mock.invocationCallOrder[0] ?? 0);
  });

  it("does not update the password when revocation fails", async () => {
    const ports = dependencies();
    ports.repository.revokeUserSessions.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    await expect(
      createAccessService(ports).resetPassword("raw-token", "long-password"),
    ).resolves.toEqual({ status: "unavailable" });
    expect(ports.auth.updatePassword).not.toHaveBeenCalled();
  });

  it("maps password provider failure without exposing details", async () => {
    const ports = dependencies();
    ports.auth.updatePassword.mockRejectedValue(
      new Error("provider credential detail"),
    );
    const result = await createAccessService(ports).resetPassword(
      "raw-token",
      "long-password",
    );
    expect(result).toEqual({ status: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("provider credential");
  });

  it("updates once and clears local state after valid recovery", async () => {
    const ports = dependencies();
    const service = createAccessService(ports);
    await expect(
      service.resetPassword("raw-token", "long-password"),
    ).resolves.toEqual({ status: "password_updated" });
    expect(ports.auth.updatePassword).toHaveBeenCalledTimes(1);
    expect(ports.clearSession).toHaveBeenCalled();
  });
});

describe("access deletion", () => {
  it("requires recent password assurance before changing state", async () => {
    const ports = dependencies();
    ports.session.requireRecentAuthentication.mockRejectedValue(
      new Error("RECENT_AUTHENTICATION_REQUIRED"),
    );
    await expect(createAccessService(ports).requestDeletion()).resolves.toEqual(
      { status: "recent_authentication_required" },
    );
    expect(ports.repository.requestDeletion).not.toHaveBeenCalled();
  });

  it("makes deletion state authoritative before session revocation", async () => {
    const ports = dependencies();
    await createAccessService(ports).requestDeletion();
    expect(
      ports.repository.requestDeletion.mock.invocationCallOrder[0],
    ).toBeLessThan(
      ports.repository.revokeUserSessions.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("does not revoke sessions when deletion state was not persisted", async () => {
    const ports = dependencies();
    ports.repository.requestDeletion.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });
    await expect(createAccessService(ports).requestDeletion()).resolves.toEqual(
      { status: "unavailable" },
    );
    expect(ports.repository.revokeUserSessions).not.toHaveBeenCalled();
  });

  it("clears local state after deletion makes every session unauthorized", async () => {
    const ports = dependencies();
    await expect(createAccessService(ports).requestDeletion()).resolves.toEqual(
      { status: "deletion_pending" },
    );
    expect(ports.repository.revokeUserSessions).toHaveBeenCalledWith(
      authUserId,
    );
    expect(ports.auth.signOutAll).toHaveBeenCalled();
    expect(ports.clearSession).toHaveBeenCalled();
  });
});
