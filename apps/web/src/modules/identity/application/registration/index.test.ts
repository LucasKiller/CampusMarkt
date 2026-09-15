import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRegistrationService } from "./index";

type PortResult = { ok: boolean; value?: unknown; code?: string };

const authUserId = "11111111-1111-4111-8111-111111111111";
const correlationId = "22222222-2222-4222-8222-222222222222";
const context = { trustedClientIp: "203.0.113.8", correlationId };
const command = {
  email: " Person@Example.TEST ",
  password: "long-password",
  displayName: " Person ",
  adultDeclared: true,
  termsVersion: "terms-v1",
  privacyVersion: "privacy-v1",
};

function dependencies() {
  const security = {
    fingerprintIdentity: vi.fn(() => "a".repeat(64)),
    enforce: vi.fn(async <T>(_input: unknown, operation: () => Promise<T>) => {
      void _input;
      return { status: "allowed" as const, value: await operation() };
    }),
  };
  const auth = {
    createUnconfirmedUser: vi.fn(
      async (_input: unknown): Promise<PortResult> => {
        void _input;
        return { ok: true as const, value: { authUserId } };
      },
    ),
    confirmEmail: vi.fn(async (_authUserId: string): Promise<PortResult> => {
      void _authUserId;
      return { ok: true as const, value: null };
    }),
    signInWithPassword: vi.fn(),
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
  const repository = {
    findRegistrationByEmailKey: vi.fn(
      async (_emailKey: string): Promise<PortResult> => {
        void _emailKey;
        return { ok: true as const, value: null };
      },
    ),
    synchronizeConfirmation: vi.fn(
      async (_authUserId: string): Promise<PortResult> => {
        void _authUserId;
        return { ok: true as const, value: { synchronized: true } };
      },
    ),
    repairAuthProjection: vi.fn(
      async (_authUserId: string): Promise<PortResult> => {
        void _authUserId;
        return { ok: true as const, value: { repaired: true } };
      },
    ),
  };
  return {
    security,
    auth,
    actionLinks,
    repository,
    policies: { termsVersion: "terms-v1", privacyVersion: "privacy-v1" },
    now: () => new Date("2026-09-15T12:00:00.000Z"),
  };
}

describe("registration service", () => {
  it("rejects invalid fields before the limiter or Auth", async () => {
    const ports = dependencies();
    const result = await createRegistrationService(ports).register(
      { ...command, password: "short" },
      context,
    );
    expect(result).toMatchObject({ status: "invalid" });
    expect(ports.security.enforce).not.toHaveBeenCalled();
    expect(ports.auth.createUnconfirmedUser).not.toHaveBeenCalled();
  });

  it("runs the rate boundary before Auth mutation", async () => {
    const ports = dependencies();
    ports.security.enforce.mockImplementation(async (_input, operation) => {
      void _input;
      expect(ports.auth.createUnconfirmedUser).not.toHaveBeenCalled();
      return { status: "allowed", value: await operation() };
    });
    await createRegistrationService(ports).register(command, context);
    expect(ports.security.enforce).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "registration",
        normalizedIdentity: "person@example.test",
      }),
      expect.any(Function),
    );
  });

  it("returns rate limiting without Auth or SMTP work", async () => {
    const ports = dependencies();
    ports.security.enforce.mockResolvedValue({
      status: "rate_limited",
      retryAfterSeconds: 91,
    } as never);
    const result = await createRegistrationService(ports).register(
      command,
      context,
    );
    expect(result).toEqual({ status: "rate_limited", retryAfterSeconds: 91 });
    expect(ports.auth.createUnconfirmedUser).not.toHaveBeenCalled();
    expect(ports.actionLinks.issue).not.toHaveBeenCalled();
  });

  it("maps limiter outage to a bounded unavailable result", async () => {
    const ports = dependencies();
    ports.security.enforce.mockResolvedValue({
      status: "unavailable",
    } as never);
    await expect(
      createRegistrationService(ports).register(command, context),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("creates one unconfirmed identity with normalized bootstrap data", async () => {
    const ports = dependencies();
    await createRegistrationService(ports).register(command, context);
    expect(ports.security.fingerprintIdentity).toHaveBeenCalledWith(
      "person@example.test",
    );
    expect(ports.auth.createUnconfirmedUser).toHaveBeenCalledWith({
      email: "Person@Example.TEST",
      password: "long-password",
      bootstrap: {
        acceptedAt: "2026-09-15T12:00:00.000Z",
        adultDeclared: true,
        displayName: "Person",
        emailKey: "a".repeat(64),
        privacyVersion: "privacy-v1",
        termsVersion: "terms-v1",
      },
    });
  });

  it("issues one confirmation link after successful creation", async () => {
    const ports = dependencies();
    await createRegistrationService(ports).register(command, context);
    expect(ports.actionLinks.issue).toHaveBeenCalledWith({
      authUserId,
      recipient: "Person@Example.TEST",
      purpose: "email_confirmation",
    });
  });

  it.each(["DUPLICATE", "DISABLED", "DEPENDENCY_UNAVAILABLE"])(
    "returns the same accepted result for enumeration-sensitive Auth state %s",
    async (code) => {
      const ports = dependencies();
      ports.auth.createUnconfirmedUser.mockResolvedValue({
        ok: false,
        code,
      } as never);
      await expect(
        createRegistrationService(ports).register(command, context),
      ).resolves.toEqual({ status: "accepted" });
      expect(ports.actionLinks.issue).not.toHaveBeenCalled();
    },
  );

  it("keeps the accepted response when confirmation delivery fails", async () => {
    const ports = dependencies();
    ports.actionLinks.issue.mockResolvedValue({ status: "unavailable" });
    await expect(
      createRegistrationService(ports).register(command, context),
    ).resolves.toEqual({ status: "accepted" });
  });

  it("does not duplicate a link when a retry observes the existing identity", async () => {
    const ports = dependencies();
    ports.auth.createUnconfirmedUser
      .mockResolvedValueOnce({ ok: true, value: { authUserId } })
      .mockResolvedValueOnce({ ok: false, code: "DUPLICATE" } as never);
    const service = createRegistrationService(ports);
    await service.register(command, context);
    await service.register(command, context);
    expect(ports.auth.createUnconfirmedUser).toHaveBeenCalledTimes(2);
    expect(ports.actionLinks.issue).toHaveBeenCalledTimes(1);
  });

  it("preserves one successful creation under concurrent duplicate outcomes", async () => {
    const ports = dependencies();
    let calls = 0;
    ports.auth.createUnconfirmedUser.mockImplementation(async () => {
      calls += 1;
      return calls === 1
        ? { ok: true, value: { authUserId } }
        : ({ ok: false, code: "DUPLICATE" } as never);
    });
    const service = createRegistrationService(ports);
    await Promise.all([
      service.register(command, context),
      service.register(command, context),
    ]);
    expect(ports.actionLinks.issue).toHaveBeenCalledTimes(1);
  });
});

describe("confirmation resend service", () => {
  it("rejects an invalid email before rate limiting", async () => {
    const ports = dependencies();
    await expect(
      createRegistrationService(ports).resendConfirmation("bad", context),
    ).resolves.toMatchObject({ status: "invalid" });
    expect(ports.security.enforce).not.toHaveBeenCalled();
  });

  it("does not look up an account after resend rate denial", async () => {
    const ports = dependencies();
    ports.security.enforce.mockResolvedValue({
      status: "rate_limited",
      retryAfterSeconds: 22,
    } as never);
    await createRegistrationService(ports).resendConfirmation(
      "person@example.test",
      context,
    );
    expect(ports.repository.findRegistrationByEmailKey).not.toHaveBeenCalled();
  });

  it.each([null, { state: "active_confirmed", authUserId }])(
    "returns accepted without delivery for non-actionable state %j",
    async (value) => {
      const ports = dependencies();
      ports.repository.findRegistrationByEmailKey.mockResolvedValue({
        ok: true,
        value,
      });
      await expect(
        createRegistrationService(ports).resendConfirmation(
          "person@example.test",
          context,
        ),
      ).resolves.toEqual({ status: "accepted" });
      expect(ports.actionLinks.issue).not.toHaveBeenCalled();
    },
  );

  it("treats deletion-pending lookup exactly like absence", async () => {
    const ports = dependencies();
    ports.repository.findRegistrationByEmailKey.mockResolvedValue({
      ok: true,
      value: { state: "deletion_pending", authUserId },
    });
    await expect(
      createRegistrationService(ports).resendConfirmation(
        "person@example.test",
        context,
      ),
    ).resolves.toEqual({ status: "accepted" });
    expect(ports.actionLinks.issue).not.toHaveBeenCalled();
  });

  it("issues a link only for an active unconfirmed identity", async () => {
    const ports = dependencies();
    ports.repository.findRegistrationByEmailKey.mockResolvedValue({
      ok: true,
      value: {
        state: "active_unconfirmed",
        authUserId,
        recipient: "person@example.test",
      },
    });
    await createRegistrationService(ports).resendConfirmation(
      "person@example.test",
      context,
    );
    expect(ports.actionLinks.issue).toHaveBeenCalledWith({
      authUserId,
      recipient: "person@example.test",
      purpose: "email_confirmation",
    });
  });
});

describe("email confirmation service", () => {
  it("rejects an invalid, used, expired, or wrong-purpose token", async () => {
    const ports = dependencies();
    ports.actionLinks.consume.mockResolvedValue({
      status: "invalid_link",
    } as never);
    await expect(
      createRegistrationService(ports).confirmEmail("raw-token"),
    ).resolves.toEqual({ status: "invalid_link" });
    expect(ports.auth.confirmEmail).not.toHaveBeenCalled();
  });

  it("consumes the confirmation token before changing Auth", async () => {
    const ports = dependencies();
    await createRegistrationService(ports).confirmEmail("raw-token");
    expect(ports.actionLinks.consume).toHaveBeenCalledWith({
      purpose: "email_confirmation",
      rawToken: "raw-token",
    });
    expect(ports.actionLinks.consume.mock.invocationCallOrder[0]).toBeLessThan(
      ports.auth.confirmEmail.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("does not auto-sign-in after confirmation", async () => {
    const ports = dependencies();
    await createRegistrationService(ports).confirmEmail("raw-token");
    expect(ports.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns unavailable without application sync when Auth confirmation fails", async () => {
    const ports = dependencies();
    ports.auth.confirmEmail.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    } as never);
    await expect(
      createRegistrationService(ports).confirmEmail("raw-token"),
    ).resolves.toEqual({ status: "unavailable" });
    expect(ports.repository.synchronizeConfirmation).not.toHaveBeenCalled();
  });

  it("synchronizes the confirmed Auth identity", async () => {
    const ports = dependencies();
    await expect(
      createRegistrationService(ports).confirmEmail("raw-token"),
    ).resolves.toEqual({ status: "confirmed" });
    expect(ports.repository.synchronizeConfirmation).toHaveBeenCalledWith(
      authUserId,
    );
  });

  it("repairs a missing projection and retries synchronization", async () => {
    const ports = dependencies();
    ports.repository.synchronizeConfirmation
      .mockResolvedValueOnce({ ok: false, code: "MISSING_PROJECTION" } as never)
      .mockResolvedValueOnce({ ok: true, value: { synchronized: true } });
    await expect(
      createRegistrationService(ports).confirmEmail("raw-token"),
    ).resolves.toEqual({ status: "confirmed" });
    expect(ports.repository.repairAuthProjection).toHaveBeenCalledWith(
      authUserId,
    );
    expect(ports.repository.synchronizeConfirmation).toHaveBeenCalledTimes(2);
  });

  it("fails safely when projection repair cannot complete", async () => {
    const ports = dependencies();
    ports.repository.synchronizeConfirmation.mockResolvedValue({
      ok: false,
      code: "MISSING_PROJECTION",
    } as never);
    ports.repository.repairAuthProjection.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    } as never);
    await expect(
      createRegistrationService(ports).confirmEmail("raw-token"),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("applies only one Auth transition across concurrent callbacks", async () => {
    const ports = dependencies();
    ports.actionLinks.consume
      .mockResolvedValueOnce({ status: "consumed", authUserId })
      .mockResolvedValueOnce({ status: "invalid_link" } as never);
    const service = createRegistrationService(ports);
    const results = await Promise.all([
      service.confirmEmail("raw-token"),
      service.confirmEmail("raw-token"),
    ]);
    expect(results).toContainEqual({ status: "confirmed" });
    expect(results).toContainEqual({ status: "invalid_link" });
    expect(ports.auth.confirmEmail).toHaveBeenCalledTimes(1);
  });
});
