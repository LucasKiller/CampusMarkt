import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGetModerationQueueHandler } from "../../../apps/web/src/app/api/moderation/queue/route.ts";
import { createGetModerationStatusHandler } from "../../../apps/web/src/app/api/moderation/status/route.ts";
import type { MarketplaceModerationService } from "../../../apps/web/src/modules/moderation/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const moderatorId = "11111111-1111-4111-8111-111111111111";
const regularUserId = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
const listingId = "44444444-4444-4444-8444-444444444444";

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId: moderatorId },
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

describe("GET /api/moderation/queue (T11)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      getModerationQueue: vi.fn(),
    };

    const handler = createGetModerationQueueHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = new Request("https://markt.example.test/api/moderation/queue", {
      method: "GET",
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 FORBIDDEN when caller is not a moderator", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      getModerationQueue: vi.fn().mockResolvedValue({
        status: "forbidden",
        message: "User is not authorized as a marketplace moderator.",
      }),
    };

    const handler = createGetModerationQueueHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: regularUserId }),
      canonicalOrigin,
    );

    const req = new Request("https://markt.example.test/api/moderation/queue", {
      method: "GET",
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 200 with pending reports for authorized moderator", async () => {
    const mockQueueItem = {
      id: reportId,
      targetType: "listing" as const,
      targetId: listingId,
      reason: "prohibited_content",
      status: "pending" as const,
      createdAt: "2026-09-26T01:00:00.000Z",
      listingTitle: "Suspicious item",
    };

    const mockService: Partial<MarketplaceModerationService> = {
      getModerationQueue: vi.fn().mockResolvedValue({
        status: "success",
        data: [mockQueueItem],
      }),
    };

    const handler = createGetModerationQueueHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = new Request("https://markt.example.test/api/moderation/queue", {
      method: "GET",
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.queue).toHaveLength(1);
    expect(body.data.queue[0].id).toBe(reportId);
  });
});

describe("GET /api/moderation/status (T11)", () => {
  it("returns isModerator: false when unauthenticated", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      checkModeratorStatus: vi.fn(),
    };

    const handler = createGetModerationStatusHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = new Request(
      "https://markt.example.test/api/moderation/status",
      {
        method: "GET",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.isModerator).toBe(false);
  });

  it("returns isModerator: false for non-moderator authenticated user", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      checkModeratorStatus: vi.fn().mockResolvedValue({ isModerator: false }),
    };

    const handler = createGetModerationStatusHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: regularUserId }),
      canonicalOrigin,
    );

    const req = new Request(
      "https://markt.example.test/api/moderation/status",
      {
        method: "GET",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.isModerator).toBe(false);
  });

  it("returns isModerator: true for authorized moderator", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      checkModeratorStatus: vi.fn().mockResolvedValue({ isModerator: true }),
    };

    const handler = createGetModerationStatusHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = new Request(
      "https://markt.example.test/api/moderation/status",
      {
        method: "GET",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.isModerator).toBe(true);
  });
});
