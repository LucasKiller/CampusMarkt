import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createBlockUserHandler,
  createGetBlockedUsersHandler,
} from "../../../apps/web/src/app/api/marketplace/blocks/route.ts";
import { createUnblockUserHandler } from "../../../apps/web/src/app/api/marketplace/blocks/[id]/route.ts";
import type { MarketplaceSafetyService } from "../../../apps/web/src/modules/safety/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const userId = "11111111-1111-4111-8111-111111111111";
const blockedUserId = "22222222-2222-4222-8222-222222222222";

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
}

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId: userId },
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

describe("GET /api/marketplace/blocks (T12)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      getBlockedUsers: vi.fn(),
    };

    const handler = createGetBlockedUsersHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = new Request(
      "https://markt.example.test/api/marketplace/blocks",
      {
        method: "GET",
        headers: { origin: canonicalOrigin },
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 200 with blocked users list", async () => {
    const items = [
      {
        id: "55555555-5555-4555-8555-555555555555",
        blockedId: blockedUserId,
        blockedName: "Blocked User",
        avatarUrl: null,
        createdAt: "2026-09-25T12:00:00.000Z",
      },
    ];

    const mockService: Partial<MarketplaceSafetyService> = {
      getBlockedUsers: vi.fn().mockResolvedValue({
        status: "success",
        data: { items },
      }),
    };

    const handler = createGetBlockedUsersHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = new Request(
      "https://markt.example.test/api/marketplace/blocks",
      {
        method: "GET",
        headers: { origin: canonicalOrigin },
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].blockedId).toBe(blockedUserId);
  });
});

describe("POST /api/marketplace/blocks (T12)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      blockUser: vi.fn(),
    };

    const handler = createBlockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/blocks",
      { blockedId: blockedUserId },
    );

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 on CSRF mismatch", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      blockUser: vi.fn(),
    };

    const handler = createBlockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/blocks",
      { blockedId: blockedUserId },
      { origin: "https://evil.site" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 on self-blocking", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      blockUser: vi.fn().mockResolvedValue({
        status: "cannot_block_self",
        message: "Users cannot block themselves.",
      }),
    };

    const handler = createBlockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/blocks",
      { blockedId: userId },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns 429 when rate limited", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      blockUser: vi.fn().mockResolvedValue({
        status: "rate_limited",
        retryAfterSeconds: 30,
      }),
    };

    const handler = createBlockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/blocks",
      { blockedId: blockedUserId },
    );

    const res = await handler(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("RATE_LIMITED");
  });

  it("returns 201 on successful block", async () => {
    const blockData = {
      blockId: "55555555-5555-4555-8555-555555555555",
      blockedId: blockedUserId,
      createdAt: "2026-09-25T12:00:00.000Z",
    };

    const mockService: Partial<MarketplaceSafetyService> = {
      blockUser: vi.fn().mockResolvedValue({
        status: "success",
        data: blockData,
      }),
    };

    const handler = createBlockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/blocks",
      { blockedId: blockedUserId },
    );

    const res = await handler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.blockId).toBe(blockData.blockId);
  });
});

describe("DELETE /api/marketplace/blocks/[id] (T12)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      unblockUser: vi.fn(),
    };

    const handler = createUnblockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "DELETE",
      `https://markt.example.test/api/marketplace/blocks/${blockedUserId}`,
    );

    const res = await handler(req, { params: { id: blockedUserId } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 on CSRF mismatch", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      unblockUser: vi.fn(),
    };

    const handler = createUnblockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "DELETE",
      `https://markt.example.test/api/marketplace/blocks/${blockedUserId}`,
      undefined,
      { origin: "https://evil.site" },
    );

    const res = await handler(req, { params: { id: blockedUserId } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 on invalid UUID", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      unblockUser: vi.fn().mockResolvedValue({
        status: "invalid",
        fieldErrors: { blockedId: ["Invalid UUID."] },
      }),
    };

    const handler = createUnblockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "DELETE",
      `https://markt.example.test/api/marketplace/blocks/invalid-id`,
    );

    const res = await handler(req, { params: { id: "invalid-id" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns 200 on successful unblock", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      unblockUser: vi.fn().mockResolvedValue({
        status: "success",
        data: { unblockedId: blockedUserId, success: true },
      }),
    };

    const handler = createUnblockUserHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "DELETE",
      `https://markt.example.test/api/marketplace/blocks/${blockedUserId}`,
    );

    const res = await handler(req, { params: { id: blockedUserId } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.unblockedId).toBe(blockedUserId);
    expect(body.data.success).toBe(true);
  });
});
