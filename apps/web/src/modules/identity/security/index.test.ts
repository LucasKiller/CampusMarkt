import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createIdentitySecurity } from "./index";

const correlationId = "11111111-1111-4111-8111-111111111111";

function dependencies() {
  const repository = {
    consumeRateLimits: vi.fn(async (_input: unknown) => {
      void _input;
      return {
        ok: true as const,
        value: { allowed: true, retry_after_seconds: 0 },
      };
    }),
    appendSecurityEvent: vi.fn(async (_input: unknown) => {
      void _input;
      return { ok: true as const, value: null };
    }),
  };
  return { pepper: "p".repeat(48), repository };
}

describe("identity request fingerprints", () => {
  it("normalizes identity whitespace and case before fingerprinting", () => {
    const service = createIdentitySecurity(dependencies());
    expect(service.fingerprintIdentity(" Person@Example.TEST ")).toBe(
      service.fingerprintIdentity("person@example.test"),
    );
  });

  it("returns a PostgreSQL bytea HMAC-SHA-256 identity hash", () => {
    expect(
      createIdentitySecurity(dependencies()).fingerprintIdentity(
        "person@example.test",
      ),
    ).toMatch(/^\\x[0-9a-f]{64}$/u);
  });

  it("does not include the raw email in the identity hash", () => {
    const email = "person@example.test";
    expect(
      createIdentitySecurity(dependencies()).fingerprintIdentity(email),
    ).not.toContain(email);
  });

  it("is deterministic for the same normalized identity", () => {
    const service = createIdentitySecurity(dependencies());
    expect(service.fingerprintIdentity("person@example.test")).toBe(
      service.fingerprintIdentity("person@example.test"),
    );
  });

  it("separates different normalized identities", () => {
    const service = createIdentitySecurity(dependencies());
    expect(service.fingerprintIdentity("first@example.test")).not.toBe(
      service.fingerprintIdentity("second@example.test"),
    );
  });

  it("returns a PostgreSQL bytea HMAC without the raw trusted IP", () => {
    const ip = "203.0.113.8";
    const hash = createIdentitySecurity(dependencies()).fingerprintClientIp({
      trustedClientIp: ip,
    });
    expect(hash).toMatch(/^\\x[0-9a-f]{64}$/u);
    expect(hash).not.toContain(ip);
  });

  it("ignores spoofed forwarding headers when selecting the trusted IP", () => {
    const service = createIdentitySecurity(dependencies());
    const expected = service.fingerprintClientIp({
      trustedClientIp: "203.0.113.8",
    });
    expect(
      service.fingerprintClientIp({
        trustedClientIp: "203.0.113.8",
        headers: {
          forwarded: "for=198.51.100.4",
          "x-forwarded-for": "198.51.100.5",
          "x-real-ip": "198.51.100.6",
        },
      }),
    ).toBe(expected);
  });

  it("separates hashes produced with different server peppers", () => {
    const first = createIdentitySecurity(dependencies());
    const second = createIdentitySecurity({
      ...dependencies(),
      pepper: "q".repeat(48),
    });
    expect(first.fingerprintIdentity("person@example.test")).not.toBe(
      second.fingerprintIdentity("person@example.test"),
    );
  });
});

describe("identity abuse boundary", () => {
  it("persists only subject and IP hashes when consuming limits", async () => {
    const ports = dependencies();
    const service = createIdentitySecurity(ports);

    await service.enforce(
      {
        action: "sign_in",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      vi.fn(async () => "allowed"),
    );

    const persisted = JSON.stringify(
      ports.repository.consumeRateLimits.mock.calls,
    );
    expect(persisted).toMatch(/\\\\x[0-9a-f]{64}/u);
    expect(persisted).not.toContain("person@example.test");
    expect(persisted).not.toContain("203.0.113.8");
  });

  it("runs the protected dependency exactly once after an allowed decision", async () => {
    const operation = vi.fn(async () => "completed");
    const result = await createIdentitySecurity(dependencies()).enforce(
      {
        action: "registration",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      operation,
    );
    expect(result).toEqual({ status: "allowed", value: "completed" });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("does not invoke Auth, SMTP, or account work after denial", async () => {
    const ports = dependencies();
    ports.repository.consumeRateLimits.mockResolvedValue({
      ok: true,
      value: { allowed: false, retry_after_seconds: 701 },
    });
    const operation = vi.fn(async () => "must-not-run");

    const result = await createIdentitySecurity(ports).enforce(
      {
        action: "password_recovery",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      operation,
    );

    expect(result).toEqual({ status: "rate_limited", retryAfterSeconds: 701 });
    expect(operation).not.toHaveBeenCalled();
  });

  it("returns the longest retry selected by the atomic dual limiter", async () => {
    const ports = dependencies();
    ports.repository.consumeRateLimits.mockResolvedValue({
      ok: true,
      value: { allowed: false, retry_after_seconds: 3_599 },
    });
    const result = await createIdentitySecurity(ports).enforce(
      {
        action: "confirmation_resend",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      vi.fn(),
    );
    expect(result).toEqual({
      status: "rate_limited",
      retryAfterSeconds: 3_599,
    });
  });

  it("bounds a non-positive provider retry to one second", async () => {
    const ports = dependencies();
    ports.repository.consumeRateLimits.mockResolvedValue({
      ok: true,
      value: { allowed: false, retry_after_seconds: 0 },
    });
    const result = await createIdentitySecurity(ports).enforce(
      {
        action: "sign_in",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      vi.fn(),
    );
    expect(result).toEqual({ status: "rate_limited", retryAfterSeconds: 1 });
  });

  it("fails closed without protected work when the limiter is unavailable", async () => {
    const ports = dependencies();
    ports.repository.consumeRateLimits.mockRejectedValue(
      new Error("database credential and raw email"),
    );
    const operation = vi.fn();
    const result = await createIdentitySecurity(ports).enforce(
      {
        action: "sign_in",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      operation,
    );
    expect(result).toEqual({ status: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("database credential");
    expect(operation).not.toHaveBeenCalled();
  });

  it("fails closed on a malformed limiter response", async () => {
    const ports = dependencies();
    ports.repository.consumeRateLimits.mockResolvedValue({
      ok: true,
      value: { allowed: "yes", retry_after_seconds: "later" },
    } as never);
    const operation = vi.fn();
    await expect(
      createIdentitySecurity(ports).enforce(
        {
          action: "sign_in",
          normalizedIdentity: "person@example.test",
          trustedClientIp: "203.0.113.8",
          correlationId,
        },
        operation,
      ),
    ).resolves.toEqual({ status: "unavailable" });
    expect(operation).not.toHaveBeenCalled();
  });

  it("records a redacted denied decision", async () => {
    const ports = dependencies();
    ports.repository.consumeRateLimits.mockResolvedValue({
      ok: true,
      value: { allowed: false, retry_after_seconds: 12 },
    });
    await createIdentitySecurity(ports).enforce(
      {
        action: "registration",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      vi.fn(),
    );
    expect(ports.repository.appendSecurityEvent).toHaveBeenCalledWith({
      authUserId: null,
      correlationId,
      eventType: "registration",
      ipHash: expect.stringMatching(/^\\x[0-9a-f]{64}$/u),
      outcome: "denied",
      subjectHash: expect.stringMatching(/^\\x[0-9a-f]{64}$/u),
    });
  });
});

describe("identity security audit allowlist", () => {
  it("accepts an allowlisted event and outcome", async () => {
    const ports = dependencies();
    await expect(
      createIdentitySecurity(ports).audit({
        authUserId: null,
        subjectHash: null,
        ipHash: null,
        eventType: "logout_all",
        outcome: "succeeded",
        correlationId,
      }),
    ).resolves.toEqual({ status: "recorded" });
  });

  it("rejects arbitrary provider text as an event type", async () => {
    const ports = dependencies();
    const result = await createIdentitySecurity(ports).audit({
      authUserId: null,
      subjectHash: null,
      ipHash: null,
      eventType: "SMTP password invalid for person@example.test",
      outcome: "failed",
      correlationId,
    });
    expect(result).toEqual({ status: "rejected" });
    expect(ports.repository.appendSecurityEvent).not.toHaveBeenCalled();
  });

  it("rejects an outcome outside the allowlist", async () => {
    const ports = dependencies();
    await expect(
      createIdentitySecurity(ports).audit({
        authUserId: null,
        subjectHash: null,
        ipHash: null,
        eventType: "sign_in",
        outcome: "password=secret token=raw",
        correlationId,
      }),
    ).resolves.toEqual({ status: "rejected" });
    expect(ports.repository.appendSecurityEvent).not.toHaveBeenCalled();
  });

  it("drops passwords, tokens, emails, keys, images, and provider fields", async () => {
    const ports = dependencies();
    await createIdentitySecurity(ports).audit({
      authUserId: null,
      subjectHash: null,
      ipHash: null,
      eventType: "password_recovery",
      outcome: "failed",
      correlationId,
      password: "secret",
      token: "raw-token",
      email: "person@example.test",
      secretKey: "key",
      image: "raw-image",
      providerText: "smtp detail",
    } as never);
    const persisted = JSON.stringify(
      ports.repository.appendSecurityEvent.mock.calls,
    );
    expect(persisted).not.toMatch(
      /secret|raw-token|person@example|raw-image|smtp detail/u,
    );
  });

  it("rejects a raw email or IP supplied where a fingerprint belongs", async () => {
    const ports = dependencies();
    await expect(
      createIdentitySecurity(ports).audit({
        authUserId: null,
        subjectHash: "person@example.test",
        ipHash: "203.0.113.8",
        eventType: "sign_in",
        outcome: "failed",
        correlationId,
      }),
    ).resolves.toEqual({ status: "rejected" });
    expect(ports.repository.appendSecurityEvent).not.toHaveBeenCalled();
  });

  it("rejects an untrusted correlation identifier", async () => {
    const ports = dependencies();
    await expect(
      createIdentitySecurity(ports).audit({
        authUserId: null,
        subjectHash: null,
        ipHash: null,
        eventType: "sign_in",
        outcome: "failed",
        correlationId: "inbound\nheader",
      }),
    ).resolves.toEqual({ status: "rejected" });
    expect(ports.repository.appendSecurityEvent).not.toHaveBeenCalled();
  });
});
