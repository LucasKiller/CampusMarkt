import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createExecuteModerationActionHandler } from "../../../apps/web/src/app/api/moderation/actions/route.ts";
import { createGetModerationAuditLogHandler } from "../../../apps/web/src/app/api/moderation/audit/route.ts";
import type { MarketplaceModerationService } from "../../../apps/web/src/modules/moderation/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const moderatorId = "11111111-1111-4111-8111-111111111111";
const regularUserId = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
const listingId = "44444444-4444-4444-8444-444444444444";
const targetUserId = "55555555-5555-4555-8555-555555555555";
const auditId = "66666666-6666-4666-8666-666666666666";

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

describe("POST /api/moderation/actions (T12)", () => {
  it("returns 403 on CSRF origin mismatch", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn(),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Unfounded",
      },
      { origin: "https://attacker.example.org" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn(),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Unfounded",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when user is not a moderator", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn().mockResolvedValue({
        status: "forbidden",
        message: "User is not authorized as a marketplace moderator.",
      }),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: regularUserId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Unfounded",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid action payload", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn().mockResolvedValue({
        status: "invalid",
        fieldErrors: {
          reason: ["A justification note is mandatory for moderation actions."],
        },
      }),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("executes dismiss_report successfully", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn().mockResolvedValue({
        status: "success",
        data: { success: true, status: "dismissed" },
      }),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Unfounded complaint",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("dismissed");
  });

  it("executes remove_listing successfully", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn().mockResolvedValue({
        status: "success",
        data: { success: true, status: "removed" },
      }),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "remove_listing",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Violates campus policy",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("removed");
  });

  it("executes suspend_user successfully", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn().mockResolvedValue({
        status: "success",
        data: { success: true, status: "suspended" },
      }),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "suspend_user",
        targetType: "user",
        targetId: targetUserId,
        reportId,
        reason: "Account suspended for scams",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("suspended");
  });

  it("returns 409 CONFLICT when report is already resolved", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      executeModerationAction: vi.fn().mockResolvedValue({
        status: "conflict",
        message: "REPORT_ALREADY_RESOLVED",
      }),
    };

    const handler = createExecuteModerationActionHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/moderation/actions",
      {
        actionType: "dismiss_report",
        targetType: "listing",
        targetId: listingId,
        reportId,
        reason: "Duplicate triage",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("CONFLICT");
  });
});

describe("GET /api/moderation/audit (T12)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      getAuditLog: vi.fn(),
    };

    const handler = createGetModerationAuditLogHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = new Request("https://markt.example.test/api/moderation/audit", {
      method: "GET",
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when user is not a moderator", async () => {
    const mockService: Partial<MarketplaceModerationService> = {
      getAuditLog: vi.fn().mockResolvedValue({
        status: "forbidden",
      }),
    };

    const handler = createGetModerationAuditLogHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: regularUserId }),
      canonicalOrigin,
    );

    const req = new Request("https://markt.example.test/api/moderation/audit", {
      method: "GET",
    });

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 200 with audit entries for authorized moderator", async () => {
    const mockAuditAction = {
      id: auditId,
      moderatorId,
      reportId,
      actionType: "remove_listing" as const,
      targetType: "listing",
      targetId: listingId,
      reason: "Policy violation",
      createdAt: "2026-09-26T02:00:00.000Z",
    };

    const mockService: Partial<MarketplaceModerationService> = {
      getAuditLog: vi.fn().mockResolvedValue({
        status: "success",
        data: [mockAuditAction],
      }),
    };

    const handler = createGetModerationAuditLogHandler(
      mockService as MarketplaceModerationService,
      mockSessionDal({ authUserId: moderatorId }),
      canonicalOrigin,
    );

    const req = new Request(
      "https://markt.example.test/api/moderation/audit?limit=20&offset=0",
      {
        method: "GET",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.auditLog).toHaveLength(1);
    expect(body.data.auditLog[0].id).toBe(auditId);
    expect(mockService.getAuditLog).toHaveBeenCalledWith(moderatorId, {
      limit: 20,
      offset: 0,
    });
  });
});
