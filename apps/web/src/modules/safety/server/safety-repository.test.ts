import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createMarketplaceSafetyRepository,
  type MarketplaceRpcClient,
} from "./safety-repository";

describe("MarketplaceSafetyRepository", () => {
  const validReportRequest = {
    targetType: "listing" as const,
    targetId: "11111111-1111-4111-8111-111111111111",
    reason: "prohibited_content" as const,
    details: "Prohibited item listed.",
  };

  const validReportResponse = {
    reportId: "99999999-9999-4999-8999-999999999999",
    status: "pending",
    createdAt: "2026-09-25T12:00:00.000Z",
  };

  it("submits a report and returns ReportConfirmationDTO", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: validReportResponse,
      error: null,
    });
    const mockClient: MarketplaceRpcClient = { rpc: mockRpc };
    const repo = createMarketplaceSafetyRepository(mockClient);

    const res = await repo.submitReport(validReportRequest);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.reportId).toBe(validReportResponse.reportId);
      expect(res.value.status).toBe("pending");
      expect(res.value.createdAt).toBe(validReportResponse.createdAt);
    }
    expect(mockRpc).toHaveBeenCalledWith("submit_report", {
      p_target_type: "listing",
      p_target_id: "11111111-1111-4111-8111-111111111111",
      p_reason: "prohibited_content",
      p_details: "Prohibited item listed.",
    });
  });

  it("maps CANNOT_REPORT_SELF database error", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "CANNOT_REPORT_SELF" },
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.submitReport(validReportRequest);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("CANNOT_REPORT_SELF");
    }
  });

  it("maps REPORT_ALREADY_PENDING database error", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0004", message: "REPORT_ALREADY_PENDING" },
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.submitReport(validReportRequest);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("REPORT_ALREADY_PENDING");
    }
  });

  it("blocks a user and returns BlockUserResponse", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        blockId: "77777777-7777-4777-8777-777777777777",
        blockedId: "22222222-2222-4222-8222-222222222222",
        createdAt: "2026-09-25T12:00:00.000Z",
      },
      error: null,
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.blockUser({
      blockedId: "22222222-2222-4222-8222-222222222222",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.blockId).toBe("77777777-7777-4777-8777-777777777777");
      expect(res.value.blockedId).toBe("22222222-2222-4222-8222-222222222222");
    }
    expect(mockRpc).toHaveBeenCalledWith("block_user", {
      p_blocked_id: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("maps CANNOT_BLOCK_SELF database error", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "CANNOT_BLOCK_SELF" },
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.blockUser({
      blockedId: "11111111-1111-4111-8111-111111111111",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("CANNOT_BLOCK_SELF");
    }
  });

  it("unblocks a user and returns UnblockUserResponse", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        unblockedId: "22222222-2222-4222-8222-222222222222",
        success: true,
      },
      error: null,
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.unblockUser("22222222-2222-4222-8222-222222222222");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.unblockedId).toBe(
        "22222222-2222-4222-8222-222222222222",
      );
      expect(res.value.success).toBe(true);
    }
    expect(mockRpc).toHaveBeenCalledWith("unblock_user", {
      p_blocked_id: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("retrieves blocked users list and returns UserBlockDTO[]", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          blockedId: "22222222-2222-4222-8222-222222222222",
          blockedName: "Bad Actor",
          avatarUrl: null,
          createdAt: "2026-09-25T12:00:00.000Z",
        },
      ],
      error: null,
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.getBlockedUsers();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0].blockedName).toBe("Bad Actor");
      expect(res.value[0].blockedId).toBe(
        "22222222-2222-4222-8222-222222222222",
      );
    }
  });

  it("handles empty blocked users list correctly", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.getBlockedUsers();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toEqual([]);
    }
  });

  it("returns INVALID_PROVIDER_RESPONSE on corrupted RPC data", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: "not a valid array",
      error: null,
    });
    const repo = createMarketplaceSafetyRepository({ rpc: mockRpc });

    const res = await repo.getBlockedUsers();

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("INVALID_PROVIDER_RESPONSE");
    }
  });
});
