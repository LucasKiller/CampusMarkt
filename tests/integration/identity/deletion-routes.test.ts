import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createReauthenticationHandler } from "../../../apps/web/src/app/api/identity/me/reauthentication/route.ts";
import { createAccountDeletionHandler } from "../../../apps/web/src/app/api/identity/me/deletion/route.ts";
import { AUTH_COOKIE_NAME } from "../../../apps/web/src/modules/identity/server/access.ts";
import {
  REFRESH_COOKIE_NAME,
  parseRefreshCookie,
} from "../../../apps/web/src/modules/identity/session-cookie.ts";

const canonicalOrigin = "https://markt.example.test";

const testIdentity = {
  authUserId: "11111111-2222-3333-4444-555555555555",
  sessionId: "66666666-7777-8888-9999-000000000000",
  emailConfirmed: true,
  profileComplete: true,
  consentComplete: true,
};

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

function createMockDal(identity: typeof testIdentity | null = testIdentity) {
  return () => ({
    requireActiveIdentity: vi.fn(async () => {
      if (!identity) {
        throw new Error("UNAUTHENTICATED");
      }
      return identity;
    }),
    getOptionalIdentity: vi.fn(async () => identity),
    requireParticipatingIdentity: vi.fn(async () => {
      if (!identity) throw new Error("UNAUTHENTICATED");
      return { ...identity, participating: true as const };
    }),
    requireRecentAuthentication: vi.fn(async () => {
      if (!identity) throw new Error("UNAUTHENTICATED");
      return identity;
    }),
    safeReturnPath: vi.fn((val: unknown) =>
      typeof val === "string" ? val : "/account",
    ),
  });
}

describe("reauthentication route integration (POST /api/identity/me/reauthentication)", () => {
  const validCredentials = {
    email: "user@example.test",
    password: "Password123!",
  };

  it("replaces both cookies with the real reauthenticated session", async () => {
    const mockService = {
      reauthenticate: vi.fn(
        async (
          _identity: unknown,
          _command: unknown,
          onSessionEstablished: (tokens: {
            accessToken: string;
            refreshToken: string;
          }) => void,
        ) => {
          onSessionEstablished({
            accessToken: "new-access",
            refreshToken: "new-refresh",
          });
          return { status: "reauthenticated" as const };
        },
      ),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=new-access`);
    expect(cookie).toContain(`${REFRESH_COOKIE_NAME}=`);
    const refreshCookie = res.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(
      parseRefreshCookie(refreshCookie?.split(";")[0]?.split("=")[1]),
    ).toEqual({
      refreshToken: "new-refresh",
      issuedAt: expect.any(Number),
    });
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("reauthenticated");
    expect(typeof json.correlationId).toBe("string");
    expect(mockService.reauthenticate).toHaveBeenCalledWith(
      testIdentity,
      validCredentials,
      expect.any(Function),
    );
  });

  it("fails closed if reauthentication returns success without a token pair", async () => {
    const mockService = {
      reauthenticate: vi.fn(async () => ({
        status: "reauthenticated" as const,
      })),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const res = await handler.POST(
      postRequest(
        `${canonicalOrigin}/api/identity/me/reauthentication`,
        validCredentials,
      ),
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
    const mockService = {
      reauthenticate: vi.fn(),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(null) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("UNAUTHENTICATED");
    expect(mockService.reauthenticate).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests with 403 FORBIDDEN", async () => {
    const mockService = {
      reauthenticate: vi.fn(),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      validCredentials,
      { origin: "https://evil.example.com" },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("FORBIDDEN");
    expect(mockService.reauthenticate).not.toHaveBeenCalled();
  });

  it("rejects non-JSON content type with 400 INVALID_INPUT", async () => {
    const mockService = {
      reauthenticate: vi.fn(),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = new Request(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          origin: canonicalOrigin,
        },
        body: "email=user@example.test",
      },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(mockService.reauthenticate).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON body with 400 INVALID_INPUT", async () => {
    const mockService = {
      reauthenticate: vi.fn(),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = new Request(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
        },
        body: "{ broken json",
      },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("rejects invalid email or short password with 400 INVALID_INPUT and field errors", async () => {
    const mockService = {
      reauthenticate: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: {
          email: ["Enter a valid email address."],
          password: ["Password must contain 10 to 128 characters."],
        },
      })),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      {
        email: "bad-email",
        password: "short",
      },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toHaveProperty("email");
    expect(json.fieldErrors).toHaveProperty("password");
  });

  it("handles denied credentials with 401 UNAUTHENTICATED", async () => {
    const mockService = {
      reauthenticate: vi.fn(async () => ({
        status: "denied" as const,
      })),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("UNAUTHENTICATED");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("handles dependency failure with 503 DEPENDENCY_UNAVAILABLE", async () => {
    const mockService = {
      reauthenticate: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects request bodies exceeding size limit with 400 INVALID_INPUT", async () => {
    const mockService = {
      reauthenticate: vi.fn(),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const oversizedBody = {
      email: "user@example.test",
      password: "Password123!",
      padding: "x".repeat(70 * 1024),
    };
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      oversizedBody,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("sets no-store cache control headers", async () => {
    const mockService = {
      reauthenticate: vi.fn(async () => ({
        status: "reauthenticated" as const,
      })),
    };
    const handler = createReauthenticationHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/reauthentication`,
      validCredentials,
    );

    const res = await handler.POST(req);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
  });
});

describe("account deletion route integration (POST /api/identity/me/deletion)", () => {
  const validDeletionPayload = {
    confirmation: "DELETE",
  };

  it("succeeds on valid confirmation, clears auth cookie, and returns deletion_pending", async () => {
    const mockService = {
      requestDeletion: vi.fn(async () => ({
        status: "deletion_pending" as const,
      })),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
    expect(cookie).toContain(`${REFRESH_COOKIE_NAME}=;`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("deletion_pending");
    expect(typeof json.correlationId).toBe("string");
    expect(mockService.requestDeletion).toHaveBeenCalledTimes(1);
  });

  it("handles reauthentication_required without clearing auth cookie", async () => {
    const mockService = {
      requestDeletion: vi.fn(async () => ({
        status: "recent_authentication_required" as const,
      })),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("reauthentication_required");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects unauthenticated requests with 401 UNAUTHENTICATED", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(null) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("UNAUTHENTICATED");
    expect(mockService.requestDeletion).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests with 403 FORBIDDEN", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
      { origin: "https://evil.example.com" },
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("FORBIDDEN");
    expect(mockService.requestDeletion).not.toHaveBeenCalled();
  });

  it("rejects non-JSON content type with 400 INVALID_INPUT", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/me/deletion`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: canonicalOrigin,
      },
      body: "confirmation=DELETE",
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(mockService.requestDeletion).not.toHaveBeenCalled();
  });

  it("rejects invalid confirmation text with 400 INVALID_INPUT", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/me/deletion`, {
      confirmation: "delete",
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toHaveProperty("confirmation");
    expect(mockService.requestDeletion).not.toHaveBeenCalled();
  });

  it("rejects missing confirmation property with 400 INVALID_INPUT", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/me/deletion`, {});

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toHaveProperty("confirmation");
  });

  it("rejects non-object request body with 400 INVALID_INPUT", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      "not-an-object",
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("handles dependency unavailable failure with 503 and clears cookie", async () => {
    const mockService = {
      requestDeletion: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
  });

  it("handles service exception gracefully with 503 and clears cookie", async () => {
    const mockService = {
      requestDeletion: vi.fn(async () => {
        throw new Error("Fatal DB error");
      }),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
    );

    const res = await handler.POST(req);
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");

    const cookie = res.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=;`);
  });

  it("rejects oversized request payload with 400 INVALID_INPUT", async () => {
    const mockService = {
      requestDeletion: vi.fn(),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(`${canonicalOrigin}/api/identity/me/deletion`, {
      confirmation: "DELETE",
      padding: "x".repeat(70 * 1024),
    });

    const res = await handler.POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("sets no-store cache control headers", async () => {
    const mockService = {
      requestDeletion: vi.fn(async () => ({
        status: "deletion_pending" as const,
      })),
    };
    const handler = createAccountDeletionHandler(
      mockService as never,
      createMockDal(testIdentity) as never,
      canonicalOrigin,
    );
    const req = postRequest(
      `${canonicalOrigin}/api/identity/me/deletion`,
      validDeletionPayload,
    );

    const res = await handler.POST(req);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
  });
});
