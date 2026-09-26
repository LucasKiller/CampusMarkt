import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMarketplaceModerationRepository } from "./moderation-repository";

describe("MarketplaceModerationRepository", () => {
  const moderatorId = "11111111-1111-4111-8111-111111111111";
  const reportId = "22222222-2222-4222-8222-222222222222";
  const listingId = "33333333-3333-4333-8333-333333333333";
  const userId = "44444444-4444-4444-8444-444444444444";
  const auditId = "55555555-5555-4555-8555-555555555555";

  it("checks moderator status with isModerator", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: true,
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.isModerator(moderatorId);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe(true);
    }
    expect(mockRpc).toHaveBeenCalledWith("is_moderator", {
      p_user_id: moderatorId,
    });
  });

  it("retrieves moderation queue and returns typed ModerationQueueItemDTO[]", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: reportId,
          reporterId: userId,
          targetType: "listing",
          targetId: listingId,
          reason: "prohibited_content",
          details: "Violates marketplace terms.",
          status: "pending",
          createdAt: "2026-09-26T01:00:00.000Z",
          listingTitle: "Suspicious item",
          listingStatus: "active",
        },
      ],
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.getModerationQueue();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0].id).toBe(reportId);
      expect(res.value[0].targetType).toBe("listing");
      expect(res.value[0].listingTitle).toBe("Suspicious item");
    }
    expect(mockRpc).toHaveBeenCalledWith("get_moderation_queue", {});
  });

  it("dismisses report and returns execution response", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, status: "dismissed" },
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.dismissReport(reportId, "Unfounded report");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.success).toBe(true);
      expect(res.value.status).toBe("dismissed");
    }
    expect(mockRpc).toHaveBeenCalledWith("dismiss_report", {
      p_report_id: reportId,
      p_reason: "Unfounded report",
    });
  });

  it("removes listing and returns execution response", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, status: "removed" },
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.removeListing(
      listingId,
      "Violates item policy",
      reportId,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.success).toBe(true);
      expect(res.value.status).toBe("removed");
    }
    expect(mockRpc).toHaveBeenCalledWith("remove_listing_moderator", {
      p_report_id: reportId,
      p_listing_id: listingId,
      p_reason: "Violates item policy",
    });
  });

  it("suspends user and returns execution response", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, status: "suspended" },
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.suspendUser(
      userId,
      "Repeated policy violations",
      reportId,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.success).toBe(true);
      expect(res.value.status).toBe("suspended");
    }
    expect(mockRpc).toHaveBeenCalledWith("suspend_user_moderator", {
      p_report_id: reportId,
      p_user_id: userId,
      p_reason: "Repeated policy violations",
    });
  });

  it("retrieves audit log and returns typed ModerationActionDTO[]", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: auditId,
          moderatorId,
          reportId,
          actionType: "remove_listing",
          targetType: "listing",
          targetId: listingId,
          reason: "Violates terms",
          createdAt: "2026-09-26T02:00:00.000Z",
        },
      ],
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.getAuditLog(50, 0);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0].id).toBe(auditId);
      expect(res.value[0].actionType).toBe("remove_listing");
    }
    expect(mockRpc).toHaveBeenCalledWith("get_moderation_audit_log", {
      p_limit: 50,
      p_offset: 0,
    });
  });

  it("maps FORBIDDEN error for unauthorized callers", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "FORBIDDEN" },
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.getModerationQueue();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("FORBIDDEN");
    }
  });

  it("maps REPORT_ALREADY_RESOLVED to CONFLICT", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0003", message: "REPORT_ALREADY_RESOLVED" },
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.dismissReport(reportId, "Duplicate triage");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("CONFLICT");
    }
  });

  it("maps REPORT_NOT_FOUND to NOT_FOUND", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "REPORT_NOT_FOUND" },
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.dismissReport(reportId, "Triage note");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("NOT_FOUND");
    }
  });

  it("handles corrupted provider response", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: "invalid array string",
      error: null,
    });
    const repo = createMarketplaceModerationRepository({ rpc: mockRpc });

    const res = await repo.getModerationQueue();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("INVALID_PROVIDER_RESPONSE");
    }
  });
});
