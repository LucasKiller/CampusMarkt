import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  resolveCookieSession: vi.fn(),
  createUserTokenSupabaseClient: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  userRpc: vi.fn(),
  adminRpc: vi.fn(),
}));

vi.mock("../../identity/server/access", () => ({
  resolveCookieSession: mocks.resolveCookieSession,
}));
vi.mock("../../identity/infrastructure/environment", () => ({
  getIdentityInfrastructureConfig: () => ({
    supabaseInternalUrl: "http://127.0.0.1:54321",
    supabaseServiceRoleKey: "test-service-key",
    supabasePublishableKey: "test-publishable-key",
  }),
}));
vi.mock("../../identity/infrastructure/supabase/client/index", () => ({
  createUserTokenSupabaseClient: mocks.createUserTokenSupabaseClient,
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));
vi.mock("../../identity/infrastructure/supabase/repository/index", () => ({
  createIdentityRepository: () => ({ consumeRateLimits: vi.fn() }),
}));

import { getMarketplaceMessagingService } from "./index";

describe("user-scoped messaging service (INBOX-01)", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCookieSession.mockResolvedValue({
      ok: true,
      value: { authUserId: userId, token: "user-access-token" },
    });
    mocks.userRpc.mockResolvedValue({ data: [], error: null });
    mocks.adminRpc.mockResolvedValue({ data: [], error: null });
    mocks.createUserTokenSupabaseClient.mockReturnValue({
      schema: () => ({ rpc: mocks.userRpc }),
    });
    mocks.createAdminSupabaseClient.mockReturnValue({
      schema: () => ({ rpc: mocks.adminRpc }),
    });
  });

  it("runs inbox RPC as the request user and never as service role", async () => {
    const service = await getMarketplaceMessagingService(userId);
    expect(service).not.toBeNull();

    const result = await service!.getUserConversations(userId);

    expect(result).toEqual({ status: "success", data: [] });
    expect(mocks.createUserTokenSupabaseClient).toHaveBeenCalledWith(
      "user-access-token",
      expect.any(Object),
    );
    expect(mocks.userRpc).toHaveBeenCalledWith("get_user_conversations", {});
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });

  it("rejects a missing or mismatched session", async () => {
    mocks.resolveCookieSession.mockResolvedValueOnce({ ok: false });
    expect(await getMarketplaceMessagingService(userId)).toBeNull();

    mocks.resolveCookieSession.mockResolvedValueOnce({
      ok: true,
      value: { authUserId: "another-user", token: "other-token" },
    });
    expect(await getMarketplaceMessagingService(userId)).toBeNull();
    expect(mocks.createUserTokenSupabaseClient).not.toHaveBeenCalled();
  });
});
