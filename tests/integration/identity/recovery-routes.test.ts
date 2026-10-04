import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRecoveryHandler } from "../../../apps/web/src/app/api/identity/recoveries/route.ts";
import { createPasswordResetHandler } from "../../../apps/web/src/app/api/identity/password-resets/route.ts";
import { AUTH_COOKIE_NAME } from "../../../apps/web/src/modules/identity/server/access.ts";
import { REFRESH_COOKIE_NAME } from "../../../apps/web/src/modules/identity/session-cookie.ts";

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

describe("recovery request route integration (POST /api/identity/recoveries)", () => {
  const validEmail = "user@example.test";

  it("returns 202 accepted generic response for valid email", async () => {
    const mockService = {
      requestRecovery: vi.fn(async () => ({ status: "accepted" as const })),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/recoveries`, {
      email: validEmail,
    });

    const res = await handler(req);
    expect(res.status).toBe(202);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "accepted" });
    expect(typeof json.correlationId).toBe("string");
    expect(mockService.requestRecovery).toHaveBeenCalledWith(
      validEmail,
      expect.objectContaining({
        trustedClientIp: "127.0.0.1",
        correlationId: json.correlationId,
      }),
    );
  });

  it("returns indistinguishable 202 accepted response for non-existent email (no enumeration)", async () => {
    const mockService = {
      requestRecovery: vi.fn(async () => ({ status: "accepted" as const })),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/recoveries`, {
      email: "unknown@example.test",
    });

    const res = await handler(req);
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "accepted" });
  });

  it("returns 400 INVALID_INPUT with fieldErrors for invalid email", async () => {
    const mockService = {
      requestRecovery: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: { email: ["Invalid email format"] },
      })),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/recoveries`, {
      email: "bad-email",
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toEqual({ email: ["Invalid email format"] });
  });

  it("returns 429 RATE_LIMITED with Retry-After header when rate limit is exceeded", async () => {
    const mockService = {
      requestRecovery: vi.fn(async () => ({
        status: "rate_limited" as const,
        retryAfterSeconds: 120,
      })),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/recoveries`, {
      email: validEmail,
    });

    const res = await handler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("RATE_LIMITED");
    expect(json.retryAfterSeconds).toBe(120);
  });

  it("returns 503 DEPENDENCY_UNAVAILABLE on service failure", async () => {
    const mockService = {
      requestRecovery: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/recoveries`, {
      email: validEmail,
    });

    const res = await handler(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("rejects recovery request without origin header with 403", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/recoveries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: validEmail }),
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.requestRecovery).not.toHaveBeenCalled();
  });

  it("rejects recovery request from cross-origin with 403", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/recoveries`,
      { email: validEmail },
      { origin: "https://evil.example.com" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.requestRecovery).not.toHaveBeenCalled();
  });

  it("rejects non-JSON content type with 400", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/recoveries`, {
      method: "POST",
      headers: {
        origin: canonicalOrigin,
        "content-type": "text/plain",
      },
      body: JSON.stringify({ email: validEmail }),
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(mockService.requestRecovery).not.toHaveBeenCalled();
  });

  it("rejects oversized payload with 400", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createRecoveryHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/recoveries`,
      { email: validEmail, padding: "x".repeat(70_000) },
      { "content-length": "75000" },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(mockService.requestRecovery).not.toHaveBeenCalled();
  });
});

describe("password reset route integration (POST /api/identity/password-resets)", () => {
  const validToken = "valid-action-token-123456";
  const validPassword = "new-secure-password-123!";

  it("resets password from staged action cookie, returns 200, and clears cookies", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(async () => ({
        status: "password_updated" as const,
      })),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/password-resets`,
      { password: validPassword },
      {
        cookie: `campusmarkt-action-password_recovery=${validToken}`,
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const setCookies = res.headers.getSetCookie();
    expect(
      setCookies.some(
        (c) =>
          c.includes("campusmarkt-action-password_recovery=") &&
          c.includes("Max-Age=0"),
      ),
    ).toBe(true);
    expect(
      setCookies.some(
        (c) => c.includes(`${AUTH_COOKIE_NAME}=`) && c.includes("Max-Age=0"),
      ),
    ).toBe(true);
    expect(
      setCookies.some(
        (c) => c.includes(`${REFRESH_COOKIE_NAME}=`) && c.includes("Max-Age=0"),
      ),
    ).toBe(true);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "password_updated" });
    expect(mockService.resetPassword).toHaveBeenCalledWith(
      validToken,
      validPassword,
    );
  });

  it("resets password from body token fallback", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(async () => ({
        status: "password_updated" as const,
      })),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/password-resets`, {
      password: validPassword,
      token: validToken,
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "password_updated" });
    expect(mockService.resetPassword).toHaveBeenCalledWith(
      validToken,
      validPassword,
    );
  });

  it("returns status invalid_link when no token is present", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/password-resets`, {
      password: validPassword,
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "invalid_link" });
    expect(mockService.resetPassword).not.toHaveBeenCalled();
  });

  it("returns status invalid_link when service rejects token", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(async () => ({
        status: "invalid_link" as const,
      })),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/password-resets`,
      { password: validPassword },
      {
        cookie: `campusmarkt-action-password_recovery=${validToken}`,
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "invalid_link" });
  });

  it("returns 400 INVALID_INPUT with fieldErrors for invalid password", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: {
          password: ["Password must contain 10 to 128 characters."],
        },
      })),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/password-resets`,
      { password: "short" },
      {
        cookie: `campusmarkt-action-password_recovery=${validToken}`,
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toEqual({
      password: ["Password must contain 10 to 128 characters."],
    });
  });

  it("returns 503 DEPENDENCY_UNAVAILABLE on service failure", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/password-resets`,
      { password: validPassword },
      {
        cookie: `campusmarkt-action-password_recovery=${validToken}`,
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("rejects password reset without origin header with 403", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/password-resets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: validPassword }),
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.resetPassword).not.toHaveBeenCalled();
  });

  it("rejects password reset from cross-origin with 403", async () => {
    const mockService = {
      requestRecovery: vi.fn(),
      resetPassword: vi.fn(),
    };
    const handler = createPasswordResetHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/password-resets`,
      { password: validPassword },
      { origin: "https://evil.example.com" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.resetPassword).not.toHaveBeenCalled();
  });
});
