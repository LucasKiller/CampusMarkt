import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPublicProfileHandler } from "../../../apps/web/src/app/api/identity/profiles/[publicId]/route.ts";
import { createOwnerProfileHandler } from "../../../apps/web/src/app/api/identity/me/profile/route.ts";
import type { PublicProfile } from "@campusmarkt/types";

const canonicalOrigin = "https://markt.example.test";
const validPublicId = "11111111-2222-4333-8444-555555555555";
const sampleProfile: PublicProfile = {
  publicId: validPublicId,
  displayName: "Ada Lovelace",
  joinedMonth: "2026-09",
  avatarUrl: null,
};

function getRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "GET",
    headers: {
      origin: canonicalOrigin,
      ...headers,
    },
  });
}

function patchRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("public profile route integration (GET /api/identity/profiles/[publicId])", () => {
  it("returns 200 with PublicProfile for existing profile", async () => {
    const mockService = {
      getPublicProfile: vi.fn(async () => ({
        status: "found" as const,
        profile: sampleProfile,
      })),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const handler = createPublicProfileHandler(mockService as never);
    const req = getRequest(
      `${canonicalOrigin}/api/identity/profiles/${validPublicId}`,
    );

    const res = await handler(req, { params: { publicId: validPublicId } });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual(sampleProfile);
    expect(mockService.getPublicProfile).toHaveBeenCalledWith(validPublicId);
  });

  it("returns 404 NOT_FOUND for non-existent public profile", async () => {
    const mockService = {
      getPublicProfile: vi.fn(async () => ({
        status: "not_found" as const,
      })),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const handler = createPublicProfileHandler(mockService as never);
    const req = getRequest(
      `${canonicalOrigin}/api/identity/profiles/${validPublicId}`,
    );

    const res = await handler(req, { params: { publicId: validPublicId } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns 404 NOT_FOUND for malformed non-UUID public ID", async () => {
    const mockService = {
      getPublicProfile: vi.fn(async () => ({
        status: "not_found" as const,
      })),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const handler = createPublicProfileHandler(mockService as never);
    const req = getRequest(
      `${canonicalOrigin}/api/identity/profiles/not-a-uuid`,
    );

    const res = await handler(req, { params: { publicId: "not-a-uuid" } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns 503 DEPENDENCY_UNAVAILABLE on service failure", async () => {
    const mockService = {
      getPublicProfile: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const handler = createPublicProfileHandler(mockService as never);
    const req = getRequest(
      `${canonicalOrigin}/api/identity/profiles/${validPublicId}`,
    );

    const res = await handler(req, { params: { publicId: validPublicId } });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });
});

describe("owner profile route integration (/api/identity/me/profile)", () => {
  const activeIdentity = {
    authUserId: "auth-1234",
    sessionId: "sess-1234",
    emailConfirmed: true,
    profileComplete: true,
    consentComplete: true,
  };

  it("returns 200 with PublicProfile for authenticated owner (GET)", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(async () => ({
        status: "found" as const,
        profile: sampleProfile,
      })),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = getRequest(`${canonicalOrigin}/api/identity/me/profile`);

    const res = await handler.GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual(sampleProfile);
    expect(mockService.getOwnerProfile).toHaveBeenCalledWith(
      activeIdentity.authUserId,
    );
  });

  it("returns 401 UNAUTHENTICATED for unauthenticated GET request", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => {
        throw new Error("No session");
      }),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = getRequest(`${canonicalOrigin}/api/identity/me/profile`);

    const res = await handler.GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("UNAUTHENTICATED");
  });

  it("updates display name for authenticated owner (PATCH)", async () => {
    const updatedProfile: PublicProfile = {
      ...sampleProfile,
      displayName: "Grace Hopper",
    };
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(async () => ({
        status: "updated" as const,
        profile: updatedProfile,
      })),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(`${canonicalOrigin}/api/identity/me/profile`, {
      displayName: "Grace Hopper",
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual({
      status: "updated",
      profile: updatedProfile,
    });
    expect(mockService.updateDisplayName).toHaveBeenCalledWith(
      activeIdentity.authUserId,
      "Grace Hopper",
    );
  });

  it("returns 400 INVALID_INPUT for short display name", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: {
          displayName: ["Display name must contain 2 to 50 characters."],
        },
      })),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(`${canonicalOrigin}/api/identity/me/profile`, {
      displayName: "A",
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.fieldErrors).toEqual({
      displayName: ["Display name must contain 2 to 50 characters."],
    });
  });

  it("returns 400 INVALID_INPUT for display name with control characters or markup", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(async () => ({
        status: "invalid" as const,
        fieldErrors: {
          displayName: [
            "Enter a display name without control characters or markup.",
          ],
        },
      })),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(`${canonicalOrigin}/api/identity/me/profile`, {
      displayName: "<script>alert(1)</script>",
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_INPUT");
  });

  it("returns 401 UNAUTHENTICATED on PATCH when unauthenticated", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => {
        throw new Error("No session");
      }),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(`${canonicalOrigin}/api/identity/me/profile`, {
      displayName: "New Name",
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("UNAUTHENTICATED");
    expect(mockService.updateDisplayName).not.toHaveBeenCalled();
  });

  it("rejects PATCH without origin header with 403", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/me/profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "New Name" }),
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(403);
    expect(mockService.updateDisplayName).not.toHaveBeenCalled();
  });

  it("rejects PATCH from cross-origin with 403", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(
      `${canonicalOrigin}/api/identity/me/profile`,
      { displayName: "New Name" },
      { origin: "https://evil.example.com" },
    );

    const res = await handler.PATCH(req);
    expect(res.status).toBe(403);
    expect(mockService.updateDisplayName).not.toHaveBeenCalled();
  });

  it("returns 503 DEPENDENCY_UNAVAILABLE on service failure (PATCH)", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(async () => ({
        status: "unavailable" as const,
      })),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(`${canonicalOrigin}/api/identity/me/profile`, {
      displayName: "New Name",
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("rejects non-JSON content type on PATCH with 400", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = new Request(`${canonicalOrigin}/api/identity/me/profile`, {
      method: "PATCH",
      headers: {
        origin: canonicalOrigin,
        "content-type": "text/plain",
      },
      body: JSON.stringify({ displayName: "New Name" }),
    });

    const res = await handler.PATCH(req);
    expect(res.status).toBe(400);
    expect(mockService.updateDisplayName).not.toHaveBeenCalled();
  });

  it("rejects oversized payload on PATCH with 400", async () => {
    const mockService = {
      getPublicProfile: vi.fn(),
      getOwnerProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    };
    const mockDal = {
      requireActiveIdentity: vi.fn(async () => activeIdentity),
    };
    const handler = createOwnerProfileHandler(
      mockService as never,
      (() => mockDal) as never,
      canonicalOrigin,
    );
    const req = patchRequest(
      `${canonicalOrigin}/api/identity/me/profile`,
      { displayName: "New Name", padding: "x".repeat(70_000) },
      { "content-length": "75000" },
    );

    const res = await handler.PATCH(req);
    expect(res.status).toBe(400);
    expect(mockService.updateDisplayName).not.toHaveBeenCalled();
  });
});
