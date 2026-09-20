import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSessionsHandler } from "../../../apps/web/src/app/api/identity/sessions/route.ts";
import { createCurrentSessionHandler } from "../../../apps/web/src/app/api/identity/sessions/current/route.ts";
import { AUTH_COOKIE_NAME } from "../../../apps/web/src/modules/identity/server/access.ts";

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

function deleteRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
  });
}

describe("session route integration (POST /api/identity/sessions)", () => {
  const validCredentials = {
    email: "user@example.test",
    password: "Password123!",
  };

  it("authenticates valid credentials, sets 30-day HttpOnly cookie, and returns safe returnTo", async () => {
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "authenticated" as const,
        redirectTo: "/account",
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=authenticated-session`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=2592000"); // 30 days in seconds

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("authenticated");
    expect(json.data.returnTo).toBe("/account");
    expect(typeof json.correlationId).toBe("string");
    expect(mockService.signIn).toHaveBeenCalledWith(
      validCredentials,
      expect.objectContaining({
        trustedClientIp: "127.0.0.1",
        correlationId: json.correlationId,
      }),
    );
  });

  it("passes safe returnTo through sign-in", async () => {
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "authenticated" as const,
        redirectTo: "/listings/create",
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/sessions`, {
      ...validCredentials,
      returnTo: "/listings/create",
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.returnTo).toBe("/listings/create");
  });

  it("returns 401 UNAUTHENTICATED on invalid credentials without user enumeration", async () => {
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "denied" as const,
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("UNAUTHENTICATED");
    expect(json.fieldErrors).toBeUndefined();
  });

  it("returns 400 INVALID_INPUT when validation fails with fieldErrors", async () => {
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: { email: ["Invalid email address"] },
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/sessions`, {
      email: "not-an-email",
      password: "pass",
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toEqual({ email: ["Invalid email address"] });
  });

  it("returns 429 RATE_LIMITED with Retry-After header when rate limit is exceeded", async () => {
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "rate_limited" as const,
        retryAfterSeconds: 60,
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("RATE_LIMITED");
    expect(json.retryAfterSeconds).toBe(60);
  });

  it("returns 503 DEPENDENCY_UNAVAILABLE when service is unavailable", async () => {
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("rejects sign-in without origin header with 403", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validCredentials),
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(403);
    expect(mockService.signIn).not.toHaveBeenCalled();
  });

  it("rejects sign-in from cross-origin with 403", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
      { origin: "https://attacker.example.com" },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(403);
    expect(mockService.signIn).not.toHaveBeenCalled();
  });

  it("rejects sign-in with unsupported content-type", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/sessions`, {
      method: "POST",
      headers: {
        origin: canonicalOrigin,
        "content-type": "text/plain",
      },
      body: JSON.stringify(validCredentials),
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    expect(mockService.signIn).not.toHaveBeenCalled();
  });

  it("rejects sign-in with oversized payload", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      { ...validCredentials, padding: "x".repeat(70_000) },
      { "content-length": "75000" },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    expect(mockService.signIn).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON body with 400", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/sessions`, {
      method: "POST",
      headers: {
        origin: canonicalOrigin,
        "content-type": "application/json",
      },
      body: "not json at all",
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    expect(mockService.signIn).not.toHaveBeenCalled();
  });

  it("generates valid correlationId in response", async () => {
    const inboundCorrelationId = "44444444-4444-4444-8444-444444444444";
    const mockService = {
      signIn: vi.fn(async () => ({
        status: "authenticated" as const,
        redirectTo: "/account",
      })),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
      { "x-correlation-id": inboundCorrelationId },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("rejects malformed inbound correlationId with 400", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/sessions`,
      validCredentials,
      { "x-correlation-id": "bad-id" },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_INPUT");
  });
});

describe("current session logout (DELETE /api/identity/sessions/current)", () => {
  it("clears auth cookie and calls signOutCurrent", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(async () => {}),
      signOutAll: vi.fn(),
    };
    const handler = createCurrentSessionHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = deleteRequest(
      `${canonicalOrigin}/api/identity/sessions/current`,
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "signed_out" });
    expect(mockService.signOutCurrent).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-origin DELETE with 403", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createCurrentSessionHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = deleteRequest(
      `${canonicalOrigin}/api/identity/sessions/current`,
      { origin: "https://evil.example.com" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    expect(mockService.signOutCurrent).not.toHaveBeenCalled();
  });

  it("handles internal service errors gracefully and still clears cookie", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(async () => {
        throw new Error("Supabase auth error");
      }),
      signOutAll: vi.fn(),
    };
    const handler = createCurrentSessionHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = deleteRequest(
      `${canonicalOrigin}/api/identity/sessions/current`,
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("Max-Age=0");
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

describe("all sessions logout (DELETE /api/identity/sessions)", () => {
  it("clears auth cookie and returns signed_out", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(async () => {}),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = deleteRequest(`${canonicalOrigin}/api/identity/sessions`);

    const res = await handler.DELETE(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
    expect(cookie).toContain("Max-Age=0");

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({ status: "signed_out" });
  });

  it("rejects cross-origin DELETE with 403", async () => {
    const mockService = {
      signIn: vi.fn(),
      signOutCurrent: vi.fn(),
      signOutAll: vi.fn(),
    };
    const handler = createSessionsHandler(
      mockService as never,
      canonicalOrigin,
    );
    const req = deleteRequest(`${canonicalOrigin}/api/identity/sessions`, {
      origin: "https://evil.example.com",
    });

    const res = await handler.DELETE(req);
    expect(res.status).toBe(403);
    expect(mockService.signOutAll).not.toHaveBeenCalled();
  });
});
