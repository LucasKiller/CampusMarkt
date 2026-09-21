import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createUniversityVerificationHandler } from "../../../apps/web/src/app/api/identity/university-verifications/route.ts";
import { createUniversityConfirmationHandler } from "../../../apps/web/src/app/api/identity/university-verifications/confirm/route.ts";
import { createUniversityVerificationMeHandler } from "../../../apps/web/src/app/api/identity/me/university-verification/route.ts";

const canonicalOrigin = "https://markt.example.test";
const authUserId = "11111111-1111-4111-8111-111111111111";

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

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId },
) {
  return () =>
    ({
      async requireActiveIdentity() {
        if (!activeIdentity) {
          throw new Error("UNAUTHENTICATED");
        }
        return activeIdentity;
      },
    }) as never;
}

describe("university verification routes integration", () => {
  describe("POST /api/identity/university-verifications (initiation)", () => {
    const validBody = {
      institutionalEmail: "student@tu-braunschweig.de",
    };

    it("returns 202 when initiation is accepted", async () => {
      const mockService = {
        initiateVerification: vi.fn(async () => ({
          status: "accepted" as const,
        })),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications`,
        validBody,
      );

      const res = await handler(req);
      expect(res.status).toBe(202);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({ status: "accepted" });
      expect(typeof json.correlationId).toBe("string");
      expect(mockService.initiateVerification).toHaveBeenCalledWith(
        authUserId,
        { institutionalEmail: "student@tu-braunschweig.de" },
        expect.objectContaining({
          trustedClientIp: "127.0.0.1",
          correlationId: json.correlationId,
        }),
      );
    });

    it("rejects unauthenticated requests with 401", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications`,
        validBody,
      );

      const res = await handler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHENTICATED");
      expect(mockService.initiateVerification).not.toHaveBeenCalled();
    });

    it("rejects request without origin header with 403", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/identity/university-verifications`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(validBody),
        },
      );

      const res = await handler(req);
      expect(res.status).toBe(403);
      expect(mockService.initiateVerification).not.toHaveBeenCalled();
    });

    it("rejects invalid institutional email with 400 and fieldErrors", async () => {
      const mockService = {
        initiateVerification: vi.fn(async () => ({
          status: "invalid_input" as const,
          fieldErrors: {
            institutionalEmail: [
              "Enter an email address from a supported university.",
            ],
          },
        })),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications`,
        { institutionalEmail: "student@gmail.com" },
      );

      const res = await handler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors).toBeDefined();
    });

    it("rejects rate-limited requests with 429 and Retry-After header", async () => {
      const mockService = {
        initiateVerification: vi.fn(async () => ({
          status: "rate_limited" as const,
          retryAfterSeconds: 1200,
        })),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications`,
        validBody,
      );

      const res = await handler(req);
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("1200");
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("RATE_LIMITED");
      expect(json.retryAfterSeconds).toBe(1200);
    });

    it("rejects duplicate active verification with 409 conflict", async () => {
      const mockService = {
        initiateVerification: vi.fn(async () => ({
          status: "conflict" as const,
        })),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications`,
        validBody,
      );

      const res = await handler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("CONFLICT");
    });

    it("returns 503 on dependency unavailability", async () => {
      const mockService = {
        initiateVerification: vi.fn(async () => ({
          status: "unavailable" as const,
        })),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications`,
        validBody,
      );

      const res = await handler(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
    });
  });

  describe("POST /api/identity/university-verifications/confirm (confirmation)", () => {
    it("returns 200 with verified badge details on success", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(async () => ({
          status: "verified" as const,
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2027-03-21T10:00:00.000Z",
        })),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityConfirmationHandler(
        mockService as never,
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications/confirm`,
        { token: "test-token-123" },
      );

      const res = await handler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({
        status: "verified",
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
        expiresAt: "2027-03-21T10:00:00.000Z",
      });
      expect(mockService.confirmVerification).toHaveBeenCalledWith(
        "test-token-123",
        expect.objectContaining({
          trustedClientIp: "127.0.0.1",
        }),
      );
    });

    it("confirms using action cookie and clears the cookie", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(async () => ({
          status: "verified" as const,
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt: "2027-03-21T10:00:00.000Z",
        })),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityConfirmationHandler(
        mockService as never,
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications/confirm`,
        {},
        {
          cookie: "campusmarkt-action-university_verification=cookie-token-abc",
        },
      );

      const res = await handler(req);
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain(
        "campusmarkt-action-university_verification=;",
      );
      expect(mockService.confirmVerification).toHaveBeenCalledWith(
        "cookie-token-abc",
        expect.any(Object),
      );
    });

    it("returns invalid_link status when token is missing", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityConfirmationHandler(
        mockService as never,
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications/confirm`,
        { token: "   " },
      );

      const res = await handler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({ status: "invalid_link" });
      expect(mockService.confirmVerification).not.toHaveBeenCalled();
    });

    it("returns invalid_link when service reports token invalid or expired", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(async () => ({
          status: "invalid_link" as const,
        })),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityConfirmationHandler(
        mockService as never,
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications/confirm`,
        { token: "expired-token" },
      );

      const res = await handler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({ status: "invalid_link" });
    });

    it("returns 409 on confirmation collision", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(async () => ({
          status: "conflict" as const,
        })),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityConfirmationHandler(
        mockService as never,
        canonicalOrigin,
      );

      const req = postRequest(
        `${canonicalOrigin}/api/identity/university-verifications/confirm`,
        { token: "colliding-token" },
      );

      const res = await handler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/identity/me/university-verification", () => {
    it("returns status for authenticated user", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(async () => ({
          ok: true as const,
          value: {
            status: "verified" as const,
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
            expiresAt: "2027-03-21T10:00:00.000Z",
            daysRemaining: 180,
          },
        })),
      };

      const handler = createUniversityVerificationMeHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/identity/me/university-verification`,
        {
          method: "GET",
          headers: { origin: canonicalOrigin },
        },
      );

      const res = await handler.GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({
        status: "verified",
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
        expiresAt: "2027-03-21T10:00:00.000Z",
        daysRemaining: 180,
      });
      expect(mockService.getVerificationStatus).toHaveBeenCalledWith(
        authUserId,
      );
    });

    it("rejects unauthenticated request with 401", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationMeHandler(
        mockService as never,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/identity/me/university-verification`,
        { method: "GET" },
      );

      const res = await handler.GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("DELETE /api/identity/me/university-verification", () => {
    it("disconnects verification for authenticated owner", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(async () => ({
          status: "disconnected" as const,
        })),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationMeHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/identity/me/university-verification`,
        {
          method: "DELETE",
          headers: { origin: canonicalOrigin },
        },
      );

      const res = await handler.DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({ status: "disconnected" });
      expect(mockService.disconnectVerification).toHaveBeenCalledWith(
        authUserId,
        expect.objectContaining({
          trustedClientIp: "127.0.0.1",
        }),
      );
    });

    it("rejects DELETE without origin with 403", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationMeHandler(
        mockService as never,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/identity/me/university-verification`,
        { method: "DELETE" },
      );

      const res = await handler.DELETE(req);
      expect(res.status).toBe(403);
      expect(mockService.disconnectVerification).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated DELETE with 401", async () => {
      const mockService = {
        initiateVerification: vi.fn(),
        confirmVerification: vi.fn(),
        disconnectVerification: vi.fn(),
        getVerificationStatus: vi.fn(),
      };

      const handler = createUniversityVerificationMeHandler(
        mockService as never,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/identity/me/university-verification`,
        {
          method: "DELETE",
          headers: { origin: canonicalOrigin },
        },
      );

      const res = await handler.DELETE(req);
      expect(res.status).toBe(401);
      expect(mockService.disconnectVerification).not.toHaveBeenCalled();
    });
  });
});
