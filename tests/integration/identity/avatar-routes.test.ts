import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PublicProfile } from "@campusmarkt/types";
import { createAvatarRouteHandler } from "../../../apps/web/src/app/api/identity/me/avatar/route.ts";

const canonicalOrigin = "https://markt.example.test";
const validPublicId = "11111111-2222-4333-8444-555555555555";
const validAuthUserId = "018f47a0-1234-7abc-8def-0123456789ab";

const initialProfile: PublicProfile = {
  publicId: validPublicId,
  displayName: "Ada Lovelace",
  joinedMonth: "2026-09",
  avatarUrl: `/media/avatars/${validPublicId}/1.webp`,
};

function createMockDal(authenticated = true) {
  return () =>
    ({
      requireActiveIdentity: async () => {
        if (!authenticated) {
          throw new Error("UNAUTHENTICATED");
        }
        return {
          authUserId: validAuthUserId,
          sessionId: "test-session-id",
        };
      },
    }) as never;
}

function createMockProfileService(
  profile: PublicProfile | null = initialProfile,
) {
  return {
    getOwnerProfile: vi.fn(async () => {
      if (!profile) {
        return { status: "not_found" as const };
      }
      return { status: "found" as const, profile };
    }),
    getPublicProfile: vi.fn(),
    updateDisplayName: vi.fn(),
  } as never;
}

function createMockAvatarService(overrides?: {
  replaceStatus?: "success" | "conflict" | "invalid" | "unavailable";
  removeStatus?: "removed" | "unavailable";
  newUrl?: string;
}) {
  return {
    replaceAvatar: vi.fn(async () => {
      const status = overrides?.replaceStatus ?? "success";
      if (status === "success") {
        return {
          status: "success" as const,
          avatarVersion: 2,
          avatarUrl:
            overrides?.newUrl ?? `/media/avatars/${validPublicId}/2.webp`,
        };
      }
      if (status === "conflict") {
        return { status: "conflict" as const };
      }
      if (status === "invalid") {
        return {
          status: "invalid" as const,
          code: "AVATAR_UNSUPPORTED_FORMAT" as const,
        };
      }
      return { status: "unavailable" as const };
    }),
    removeAvatar: vi.fn(async () => {
      const status = overrides?.removeStatus ?? "removed";
      if (status === "removed") {
        return { status: "removed" as const };
      }
      return { status: "unavailable" as const };
    }),
    getAvatarMedia: vi.fn(),
  } as never;
}

function buildMultipartRequest(
  options: {
    origin?: string;
    file?: Blob;
    crop?: string;
    expectedVersion?: string;
    contentType?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const formData = new FormData();
  if (options.file !== undefined) {
    formData.append("file", options.file, "avatar.png");
  } else {
    formData.append(
      "file",
      new Blob(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        {
          type: "image/png",
        },
      ),
      "avatar.png",
    );
  }

  if (options.crop !== undefined) {
    formData.append("crop", options.crop);
  } else {
    formData.append("crop", JSON.stringify({ x: 0, y: 0, size: 1 }));
  }

  if (options.expectedVersion !== undefined) {
    formData.append("expectedVersion", options.expectedVersion);
  } else {
    formData.append("expectedVersion", "1");
  }

  const headers: Record<string, string> = {
    origin: options.origin ?? canonicalOrigin,
    ...options.headers,
  };

  return new Request("https://markt.example.test/api/identity/me/avatar", {
    method: "POST",
    headers,
    body: formData,
  });
}

describe("Avatar route integration (POST / DELETE /api/identity/me/avatar)", () => {
  describe("POST /api/identity/me/avatar", () => {
    it("rejects request without origin header with 403 FORBIDDEN", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = new Request(
        "https://markt.example.test/api/identity/me/avatar",
        {
          method: "POST",
          body: new FormData(),
        },
      );

      const res = await handler.POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("rejects untrusted cross-origin request with 403 FORBIDDEN", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({
        origin: "https://evil.attacker.test",
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("rejects non-multipart content-type with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = new Request(
        "https://markt.example.test/api/identity/me/avatar",
        {
          method: "POST",
          headers: {
            origin: canonicalOrigin,
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
    });

    it("rejects oversized payload via Content-Length header with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({
        headers: {
          "content-length": (7 * 1024 * 1024).toString(), // > 6MB limit
        },
      });

      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
    });

    it("rejects unauthenticated request with 401 UNAUTHENTICATED", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(false), // unauthenticated
        canonicalOrigin,
      );

      const req = buildMultipartRequest();
      const res = await handler.POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHENTICATED");
    });

    it("rejects empty / missing file with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({ file: new Blob([]) }); // empty blob
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.file).toBeDefined();
    });

    it("rejects file exceeding 5 MB with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const largeBlob = new Blob([new Uint8Array(5 * 1024 * 1024 + 100)]);
      const req = buildMultipartRequest({ file: largeBlob });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.file).toBeDefined();
    });

    it("rejects malformed / invalid crop input with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({ crop: "{ invalid-json }" });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.crop).toBeDefined();
    });

    it("rejects out-of-bounds crop values with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({
        crop: JSON.stringify({ x: 0.9, y: 0.9, size: 0.5 }), // x + size > 1
      });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.crop).toBeDefined();
    });

    it("rejects non-numeric expectedVersion with 400 INVALID_INPUT", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({ expectedVersion: "abc" });
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
      expect(json.fieldErrors?.expectedVersion).toBeDefined();
    });

    it("rejects unsupported format when avatarService returns invalid", async () => {
      const avatarService = createMockAvatarService({
        replaceStatus: "invalid",
      });
      const handler = createAvatarRouteHandler(
        avatarService,
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest();
      const res = await handler.POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_INPUT");
    });

    it("returns 409 CONFLICT on CAS race version mismatch", async () => {
      const avatarService = createMockAvatarService({
        replaceStatus: "conflict",
      });
      const handler = createAvatarRouteHandler(
        avatarService,
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({ expectedVersion: "0" });
      const res = await handler.POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe("CONFLICT");
    });

    it("returns 503 DEPENDENCY_UNAVAILABLE on storage failure", async () => {
      const avatarService = createMockAvatarService({
        replaceStatus: "unavailable",
      });
      const handler = createAvatarRouteHandler(
        avatarService,
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest();
      const res = await handler.POST(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
    });

    it("successfully uploads avatar and returns 200 with updated profile", async () => {
      const avatarService = createMockAvatarService({
        replaceStatus: "success",
        newUrl: `/media/avatars/${validPublicId}/2.webp`,
      });
      const handler = createAvatarRouteHandler(
        avatarService,
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildMultipartRequest({ expectedVersion: "1" });
      const res = await handler.POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.status).toBe("updated");
      expect(json.data.profile.avatarUrl).toBe(
        `/media/avatars/${validPublicId}/2.webp`,
      );
    });
  });

  describe("DELETE /api/identity/me/avatar", () => {
    function buildDeleteRequest(origin = canonicalOrigin) {
      return new Request("https://markt.example.test/api/identity/me/avatar", {
        method: "DELETE",
        headers: { origin },
      });
    }

    it("rejects missing origin header with 403 FORBIDDEN", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = new Request(
        "https://markt.example.test/api/identity/me/avatar",
        {
          method: "DELETE",
        },
      );

      const res = await handler.DELETE(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("rejects mismatched origin with 403 FORBIDDEN", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildDeleteRequest("https://attacker.example.com");
      const res = await handler.DELETE(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated request with 401 UNAUTHENTICATED", async () => {
      const handler = createAvatarRouteHandler(
        createMockAvatarService(),
        createMockProfileService(),
        createMockDal(false),
        canonicalOrigin,
      );

      const req = buildDeleteRequest();
      const res = await handler.DELETE(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHENTICATED");
    });

    it("returns 503 DEPENDENCY_UNAVAILABLE when avatar removal RPC fails", async () => {
      const avatarService = createMockAvatarService({
        removeStatus: "unavailable",
      });
      const handler = createAvatarRouteHandler(
        avatarService,
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildDeleteRequest();
      const res = await handler.DELETE(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("DEPENDENCY_UNAVAILABLE");
    });

    it("successfully removes avatar and returns 200 with updated profile (avatarUrl: null)", async () => {
      const avatarService = createMockAvatarService({
        removeStatus: "removed",
      });
      const handler = createAvatarRouteHandler(
        avatarService,
        createMockProfileService(),
        createMockDal(),
        canonicalOrigin,
      );

      const req = buildDeleteRequest();
      const res = await handler.DELETE(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.status).toBe("updated");
      expect(json.data.profile.avatarUrl).toBeNull();
    });
  });
});
