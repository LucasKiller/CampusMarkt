import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSubmitReportHandler } from "../../../apps/web/src/app/api/marketplace/reports/route.ts";
import type { MarketplaceSafetyService } from "../../../apps/web/src/modules/safety/server/index.ts";

const canonicalOrigin = "https://markt.example.test";
const userId = "11111111-1111-4111-8111-111111111111";
const listingId = "22222222-2222-4222-8222-222222222222";

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

describe("POST /api/marketplace/reports (T11)", () => {
  it("returns 401 when unauthenticated", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn(),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(null),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "listing",
        targetId: listingId,
        reason: "prohibited_content",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 on CSRF origin mismatch", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn(),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "listing",
        targetId: listingId,
        reason: "prohibited_content",
      },
      { origin: "https://evil.attacker.com" },
    );

    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 on invalid input payload", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn().mockResolvedValue({
        status: "invalid",
        fieldErrors: { targetType: ["Invalid target type."] },
      }),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "invalid_type",
        targetId: listingId,
        reason: "prohibited_content",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when self-reporting is attempted", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn().mockResolvedValue({
        status: "cannot_report_self",
        message: "Users cannot report their own account or listing.",
      }),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "user",
        targetId: userId,
        reason: "harassment_or_abuse",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("INVALID_INPUT");
  });

  it("returns 409 when duplicate pending report exists", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn().mockResolvedValue({
        status: "conflict",
        message: "A pending report already exists for this target.",
      }),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "listing",
        targetId: listingId,
        reason: "prohibited_content",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("CONFLICT");
  });

  it("returns 429 when rate limited", async () => {
    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn().mockResolvedValue({
        status: "rate_limited",
        retryAfterSeconds: 45,
      }),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "listing",
        targetId: listingId,
        reason: "prohibited_content",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.code).toBe("RATE_LIMITED");
  });

  it("returns 201 on successful report submission", async () => {
    const receipt = {
      reportId: "99999999-9999-4999-8999-999999999999",
      status: "pending" as const,
      createdAt: "2026-09-25T12:00:00.000Z",
    };

    const mockService: Partial<MarketplaceSafetyService> = {
      submitReport: vi.fn().mockResolvedValue({
        status: "success",
        data: receipt,
      }),
    };

    const handler = createSubmitReportHandler(
      mockService as MarketplaceSafetyService,
      mockSessionDal(),
      canonicalOrigin,
    );

    const req = jsonRequest(
      "POST",
      "https://markt.example.test/api/marketplace/reports",
      {
        targetType: "listing",
        targetId: listingId,
        reason: "prohibited_content",
        details: "Item violating guidelines.",
      },
    );

    const res = await handler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.reportId).toBe(receipt.reportId);
    expect(body.data.status).toBe("pending");
  });
});
