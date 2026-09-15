import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createActionLinkService,
  createSmtpMailer,
} from "../../../apps/web/src/modules/identity/action-links/index.ts";

const authUserId = "11111111-1111-4111-8111-111111111111";
const randomBytes = new Uint8Array(
  Array.from({ length: 32 }, (_, index) => index),
);

function dependencies(overrides: Record<string, unknown> = {}) {
  const repository = {
    issueActionToken: vi.fn(
      async (
        _input: unknown,
      ): Promise<{
        ok: boolean;
        value?: unknown;
        code?: string;
      }> => {
        void _input;
        return { ok: true, value: null };
      },
    ),
    invalidateActionToken: vi.fn(async (_input: unknown) => {
      void _input;
      return { ok: true, value: null };
    }),
    stageActionToken: vi.fn(async (_input: unknown) => {
      void _input;
      return { ok: true, value: { valid: true } };
    }),
  };
  const mailer = {
    send: vi.fn(
      async (_mail: {
        recipient: string;
        subject: string;
        text: string;
        url: string;
      }) => {
        void _mail;
        return { ok: true };
      },
    ),
  };
  return {
    repository,
    mailer,
    origin: "https://markt.example.test",
    random: vi.fn(() => randomBytes),
    digest: vi.fn(async () => new Uint8Array(32).fill(9)),
    ...overrides,
  };
}

describe("identity action links", () => {
  it.each([
    ["email_confirmation", "/auth/action/email_confirmation", "24 hours"],
    ["password_recovery", "/auth/action/password_recovery", "30 minutes"],
  ] as const)(
    "issues a purpose-bound %s link with correct expiry copy",
    async (purpose, path, expiryCopy) => {
      const ports = dependencies();
      const service = createActionLinkService(ports);

      await expect(
        service.issue({
          authUserId,
          recipient: "person@example.test",
          purpose,
        }),
      ).resolves.toEqual({ status: "accepted" });
      expect(ports.repository.issueActionToken).toHaveBeenCalledWith({
        authUserId,
        purpose,
        tokenHash: `\\x${"09".repeat(32)}`,
      });
      expect(ports.mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: "person@example.test",
          text: expect.stringContaining(expiryCopy),
          url: expect.stringMatching(
            `^https://markt\\.example\\.test${path}\\?token=`,
          ),
        }),
      );
    },
  );

  it("uses exactly 256 random bits and a base64url token", async () => {
    const ports = dependencies();

    await createActionLinkService(ports).issue({
      authUserId,
      recipient: "person@example.test",
      purpose: "email_confirmation",
    });

    expect(ports.random).toHaveBeenCalledWith(32);
    const url = ports.mailer.send.mock.calls[0]?.[0]?.url as string;
    expect(new URL(url).searchParams.get("token")).toMatch(
      /^[A-Za-z0-9_-]{43}$/u,
    );
  });

  it("persists only the SHA-256 digest and never the raw token", async () => {
    const ports = dependencies();

    await createActionLinkService(ports).issue({
      authUserId,
      recipient: "person@example.test",
      purpose: "email_confirmation",
    });

    const persisted = JSON.stringify(
      ports.repository.issueActionToken.mock.calls,
    );
    const rawToken = new URL(
      ports.mailer.send.mock.calls[0]?.[0]?.url as string,
    ).searchParams.get("token");
    expect(persisted).toContain(`\\\\x${"09".repeat(32)}`);
    expect(persisted).not.toContain(rawToken);
  });

  it("does not send mail when token persistence fails", async () => {
    const ports = dependencies();
    ports.repository.issueActionToken.mockResolvedValue({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
    });

    await expect(
      createActionLinkService(ports).issue({
        authUserId,
        recipient: "person@example.test",
        purpose: "email_confirmation",
      }),
    ).resolves.toEqual({ status: "unavailable" });
    expect(ports.mailer.send).not.toHaveBeenCalled();
  });

  it("returns a bounded unavailable result when secure token generation fails", async () => {
    const ports = dependencies({
      digest: vi.fn(async () => {
        throw new Error("crypto provider raw detail");
      }),
    });

    const result = await createActionLinkService(ports).issue({
      authUserId,
      recipient: "person@example.test",
      purpose: "email_confirmation",
    });

    expect(result).toEqual({ status: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("crypto provider raw detail");
    expect(ports.repository.issueActionToken).not.toHaveBeenCalled();
    expect(ports.mailer.send).not.toHaveBeenCalled();
  });

  it("invalidates the issued digest when SMTP delivery fails", async () => {
    const ports = dependencies();
    ports.mailer.send.mockResolvedValue({ ok: false });

    await createActionLinkService(ports).issue({
      authUserId,
      recipient: "person@example.test",
      purpose: "password_recovery",
    });

    expect(ports.repository.invalidateActionToken).toHaveBeenCalledWith({
      purpose: "password_recovery",
      tokenHash: `\\x${"09".repeat(32)}`,
    });
  });

  it("keeps the public delivery result generic after SMTP failure", async () => {
    const ports = dependencies();
    ports.mailer.send.mockResolvedValue({ ok: false });

    await expect(
      createActionLinkService(ports).issue({
        authUserId,
        recipient: "person@example.test",
        purpose: "password_recovery",
      }),
    ).resolves.toEqual({ status: "accepted" });
  });

  it("does not leak raw dependency errors when invalidation also fails", async () => {
    const ports = dependencies();
    ports.mailer.send.mockRejectedValue(
      new Error("smtp password and raw token"),
    );
    ports.repository.invalidateActionToken.mockRejectedValue(
      new Error("database secret"),
    );

    const result = await createActionLinkService(ports).issue({
      authUserId,
      recipient: "person@example.test",
      purpose: "password_recovery",
    });

    expect(result).toEqual({ status: "accepted" });
    expect(JSON.stringify(result)).not.toContain("smtp password");
    expect(JSON.stringify(result)).not.toContain("database secret");
  });

  it.each([
    ["email_confirmation", "/auth/confirm"],
    ["password_recovery", "/reset-password"],
  ] as const)("stages %s to a tokenless page", async (purpose, redirectTo) => {
    const ports = dependencies();

    const result = await createActionLinkService(ports).stage(
      "raw-token",
      purpose,
    );

    expect(result).toEqual({
      status: "staged",
      redirectTo,
      cookie: expect.objectContaining({
        name: `campusmarkt-action-${purpose}`,
        value: "raw-token",
      }),
      headers: { "Referrer-Policy": "no-referrer" },
    });
    expect(JSON.stringify(result.redirectTo)).not.toContain("raw-token");
  });

  it("hashes the raw token before staging it in the repository", async () => {
    const ports = dependencies();

    await createActionLinkService(ports).stage(
      "raw-token",
      "email_confirmation",
    );

    expect(ports.repository.stageActionToken).toHaveBeenCalledWith({
      purpose: "email_confirmation",
      tokenHash: `\\x${"09".repeat(32)}`,
    });
  });

  it("returns no cookie for an invalid or expired token", async () => {
    const ports = dependencies();
    ports.repository.stageActionToken.mockResolvedValue({
      ok: true,
      value: { valid: false },
    });

    await expect(
      createActionLinkService(ports).stage("raw-token", "email_confirmation"),
    ).resolves.toEqual({
      status: "invalid_link",
      redirectTo: "/auth/confirm",
      headers: { "Referrer-Policy": "no-referrer" },
    });
  });

  it("uses a short-lived HttpOnly SameSite Strict action cookie", async () => {
    const result = await createActionLinkService(dependencies()).stage(
      "raw-token",
      "email_confirmation",
    );

    expect(result).toEqual(
      expect.objectContaining({
        cookie: expect.objectContaining({
          options: {
            httpOnly: true,
            maxAge: 300,
            path: "/",
            sameSite: "strict",
            secure: false,
          },
        }),
      }),
    );
  });

  it("sets Secure on action cookies in production", async () => {
    const result = await createActionLinkService({
      ...dependencies(),
      production: true,
    }).stage("raw-token", "password_recovery");

    expect(result).toEqual(
      expect.objectContaining({
        cookie: expect.objectContaining({
          options: expect.objectContaining({ secure: true }),
        }),
      }),
    );
  });

  it("maps a staging dependency failure to a bounded invalid result", async () => {
    const ports = dependencies();
    ports.repository.stageActionToken.mockRejectedValue(
      new Error("SQL raw-token"),
    );

    const result = await createActionLinkService(ports).stage(
      "raw-token",
      "email_confirmation",
    );

    expect(result).toEqual({
      status: "invalid_link",
      redirectTo: "/auth/confirm",
      headers: { "Referrer-Policy": "no-referrer" },
    });
    expect(JSON.stringify(result)).not.toContain("raw-token");
  });

  it("SMTP adapter forwards only the bounded mail fields", async () => {
    const transport = {
      sendMail: vi.fn(async () => ({ messageId: "provider-id" })),
    };
    const mailer = createSmtpMailer(transport, "no-reply@markt.example.test");

    await expect(
      mailer.send({
        recipient: "person@example.test",
        subject: "Confirm account",
        text: "Open the link",
        url: "https://markt.example.test/auth/action/email_confirmation?token=raw",
      }),
    ).resolves.toEqual({ ok: true });
    expect(transport.sendMail).toHaveBeenCalledWith({
      from: "no-reply@markt.example.test",
      to: "person@example.test",
      subject: "Confirm account",
      text: "Open the link\n\nhttps://markt.example.test/auth/action/email_confirmation?token=raw",
    });
  });

  it("SMTP adapter maps provider rejection without exposing its message", async () => {
    const transport = {
      sendMail: vi.fn(async () => {
        throw new Error("smtp credential raw detail");
      }),
    };

    const result = await createSmtpMailer(
      transport,
      "no-reply@markt.example.test",
    ).send({
      recipient: "person@example.test",
      subject: "Confirm account",
      text: "Open the link",
      url: "https://markt.example.test/action?token=raw",
    });

    expect(result).toEqual({ ok: false, code: "DELIVERY_FAILED" });
    expect(JSON.stringify(result)).not.toContain("smtp credential");
  });
});
