import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createConfirmationResendHandler } from "../../../apps/web/src/app/api/identity/confirmation-resends/route.ts";
import { createConfirmationHandler } from "../../../apps/web/src/app/api/identity/confirmations/route.ts";
import { createRegistrationHandler } from "../../../apps/web/src/app/api/identity/registrations/route.ts";
import { createActionStagingHandler } from "../../../apps/web/src/app/auth/action/[purpose]/route.ts";

const canonicalOrigin = "https://markt.example.test";

function postRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function getRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "GET",
    headers,
  });
}

describe("registration and confirmation route integration", () => {
  const validRegistrationBody = {
    email: "person@example.test",
    password: "secure-password-123",
    displayName: "Jane Doe",
    adultDeclared: true,
    termsVersion: "terms-2026-09",
    privacyVersion: "privacy-2026-09",
  };

  it("accepts valid registration and returns 202 generic response", async () => {
    const mockService = {
      register: vi.fn(async () => ({ status: "accepted" as const })),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/registrations`,
      validRegistrationBody,
    );

    const res = await handler(req);
    expect(res.status).toBe(202);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "accepted" });
    expect(typeof json.correlationId).toBe("string");
    expect(mockService.register).toHaveBeenCalledWith(
      validRegistrationBody,
      expect.objectContaining({
        trustedClientIp: "127.0.0.1",
        correlationId: json.correlationId,
      }),
    );
  });

  it("rejects registration without origin header with 403", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/registrations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validRegistrationBody),
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.register).not.toHaveBeenCalled();
  });

  it("rejects registration from cross-origin with 403", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/registrations`,
      validRegistrationBody,
      { origin: "https://evil.example.com" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.register).not.toHaveBeenCalled();
  });

  it("rejects registration with unsupported content-type", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/registrations`, {
      method: "POST",
      headers: {
        origin: canonicalOrigin,
        "content-type": "text/plain",
      },
      body: JSON.stringify(validRegistrationBody),
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(mockService.register).not.toHaveBeenCalled();
  });

  it("rejects registration with oversized payload", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/registrations`,
      { ...validRegistrationBody, padding: "x".repeat(70_000) },
      { "content-length": "75000" },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(mockService.register).not.toHaveBeenCalled();
  });

  it("returns 400 with field errors and never echoes password on invalid input", async () => {
    const mockService = {
      register: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: {
          email: ["Enter a valid email address."],
          password: ["Password must contain 10 to 128 characters."],
        },
      })),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/registrations`, {
      ...validRegistrationBody,
      password: "short",
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toEqual({
      email: ["Enter a valid email address."],
      password: ["Password must contain 10 to 128 characters."],
    });
    expect(JSON.stringify(json)).not.toContain("short");
  });

  it("returns identical generic accepted response for duplicate registration", async () => {
    const mockService = {
      register: vi.fn(async () => ({ status: "accepted" as const })),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/registrations`,
      validRegistrationBody,
    );

    const res = await handler(req);
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "accepted" });
  });

  it("returns 429 with Retry-After when registration rate limit is reached", async () => {
    const mockService = {
      register: vi.fn(async () => ({
        status: "rate_limited" as const,
        retryAfterSeconds: 3600,
      })),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/registrations`,
      validRegistrationBody,
    );

    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("RATE_LIMITED");
    expect(json.retryAfterSeconds).toBe(3600);
  });

  it("returns 503 when registration dependency is unavailable", async () => {
    const mockService = {
      register: vi.fn(async () => ({ status: "unavailable" as const })),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createRegistrationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/registrations`,
      validRegistrationBody,
    );

    const res = await handler(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("accepts confirmation resend and returns generic accepted response", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(async () => ({ status: "accepted" as const })),
      confirmEmail: vi.fn(),
    };
    const handler = createConfirmationResendHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmation-resends`,
      { email: "user@example.test" },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "accepted" });
    expect(mockService.resendConfirmation).toHaveBeenCalledWith(
      "user@example.test",
      expect.objectContaining({ correlationId: json.correlationId }),
    );
  });

  it("returns 400 when confirmation resend email is invalid", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: { email: ["Enter a valid email address."] },
      })),
      confirmEmail: vi.fn(),
    };
    const handler = createConfirmationResendHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmation-resends`,
      { email: "not-an-email" },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.fieldErrors).toEqual({
      email: ["Enter a valid email address."],
    });
  });

  it("returns 429 when confirmation resend exceeds rate limit", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(async () => ({
        status: "rate_limited" as const,
        retryAfterSeconds: 1200,
      })),
      confirmEmail: vi.fn(),
    };
    const handler = createConfirmationResendHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmation-resends`,
      { email: "user@example.test" },
    );

    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("1200");
  });

  it("stages valid confirmation token and redirects to tokenless destination with action cookie", async () => {
    const mockActionLinks = {
      stage: vi.fn(async () => ({
        status: "staged" as const,
        redirectTo: "/auth/confirm",
        cookie: {
          name: "campusmarkt-action-email_confirmation",
          value: "test-valid-raw-token",
          options: {
            httpOnly: true as const,
            maxAge: 300,
            path: "/" as const,
            sameSite: "strict" as const,
            secure: false,
          },
        },
        headers: { "Referrer-Policy": "no-referrer" } as const,
      })),
      issue: vi.fn(),
      consume: vi.fn(),
    };
    const handler = createActionStagingHandler(mockActionLinks as never);
    const req = getRequest(
      `${canonicalOrigin}/auth/action/email_confirmation?token=test-valid-raw-token`,
    );

    const res = await handler(req, {
      params: Promise.resolve({ purpose: "email_confirmation" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/auth/confirm");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("campusmarkt-action-email_confirmation=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(mockActionLinks.stage).toHaveBeenCalledWith(
      "test-valid-raw-token",
      "email_confirmation",
    );
  });

  it("redirects without cookie when staging link lacks a token", async () => {
    const mockActionLinks = {
      stage: vi.fn(),
      issue: vi.fn(),
      consume: vi.fn(),
    };
    const handler = createActionStagingHandler(mockActionLinks as never);
    const req = getRequest(`${canonicalOrigin}/auth/action/email_confirmation`);

    const res = await handler(req, {
      params: Promise.resolve({ purpose: "email_confirmation" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(
      "/auth/confirm?status=invalid_link",
    );
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(mockActionLinks.stage).not.toHaveBeenCalled();
  });

  it("redirects without cookie when token staging is invalid or expired", async () => {
    const mockActionLinks = {
      stage: vi.fn(async () => ({
        status: "invalid_link" as const,
        redirectTo: "/auth/confirm",
        headers: { "Referrer-Policy": "no-referrer" } as const,
      })),
      issue: vi.fn(),
      consume: vi.fn(),
    };
    const handler = createActionStagingHandler(mockActionLinks as never);
    const req = getRequest(
      `${canonicalOrigin}/auth/action/email_confirmation?token=expired-token`,
    );

    const res = await handler(req, {
      params: Promise.resolve({ purpose: "email_confirmation" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(
      "/auth/confirm?status=invalid_link",
    );
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("consumes staged action cookie on POST /api/identity/confirmations and confirms email", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(async () => ({ status: "confirmed" as const })),
    };
    const handler = createConfirmationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmations`,
      {},
      { cookie: "campusmarkt-action-email_confirmation=staged-token-value" },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "confirmed" });
    expect(mockService.confirmEmail).toHaveBeenCalledWith("staged-token-value");
    // Cookie is cleared after consumption
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("campusmarkt-action-email_confirmation=;");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("returns invalid_link and clears cookie when no token is present in confirmations request", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(),
    };
    const handler = createConfirmationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmations`,
      {},
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "invalid_link" });
    expect(mockService.confirmEmail).not.toHaveBeenCalled();
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("campusmarkt-action-email_confirmation=;");
  });

  it("returns invalid_link when confirmation token is expired or already consumed", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(async () => ({ status: "invalid_link" as const })),
    };
    const handler = createConfirmationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmations`,
      {},
      { cookie: "campusmarkt-action-email_confirmation=already-used-token" },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "invalid_link" });
    expect(mockService.confirmEmail).toHaveBeenCalledWith("already-used-token");
  });

  it("returns 503 when confirmation dependency fails", async () => {
    const mockService = {
      register: vi.fn(),
      resendConfirmation: vi.fn(),
      confirmEmail: vi.fn(async () => ({ status: "unavailable" as const })),
    };
    const handler = createConfirmationHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/confirmations`,
      {},
      { cookie: "campusmarkt-action-email_confirmation=valid-token" },
    );

    const res = await handler(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });
});
