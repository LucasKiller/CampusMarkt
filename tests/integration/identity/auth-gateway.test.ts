import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSupabaseAuthGateway } from "../../../apps/web/src/modules/identity/infrastructure/supabase/auth/index.ts";

function accessToken(sessionId = "22222222-2222-4222-8222-222222222222") {
  const payload = Buffer.from(
    JSON.stringify({ session_id: sessionId }),
  ).toString("base64url");
  return `header.${payload}.signature`;
}

function clients(
  result: { data: unknown; error: unknown } = { data: {}, error: null },
) {
  const userClient = {
    auth: {
      signInWithPassword: vi.fn(async () => result),
      refreshSession: vi.fn(async () => result),
      signOut: vi.fn(async () => result),
    },
  };
  const adminClient = {
    auth: {
      admin: {
        createUser: vi.fn(async () => result),
        updateUserById: vi.fn(async () => result),
        deleteUser: vi.fn(async () => result),
      },
    },
  };
  return { adminClient, userClient };
}

describe("Supabase Auth gateway", () => {
  it("creates one unconfirmed user with validated bootstrap metadata", async () => {
    const test = clients({
      data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });
    const gateway = createSupabaseAuthGateway(test);

    await expect(
      gateway.createUnconfirmedUser({
        email: "person@example.test",
        password: "correct horse battery staple",
        bootstrap: {
          displayName: "Ada",
          emailKey: "a".repeat(64),
          termsVersion: "terms-1",
          privacyVersion: "privacy-1",
          adultDeclared: true,
          acceptedAt: "2026-09-15T18:00:00.000Z",
        },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { authUserId: "11111111-1111-4111-8111-111111111111" },
    });
    expect(test.adminClient.auth.admin.createUser).toHaveBeenCalledWith({
      email: "person@example.test",
      password: "correct horse battery staple",
      email_confirm: false,
      user_metadata: {
        adult_declared: true,
        accepted_at: "2026-09-15T18:00:00.000Z",
        display_name: "Ada",
        email_key: "a".repeat(64),
        privacy_version: "privacy-1",
        terms_version: "terms-1",
      },
    });
  });

  it.each([
    [
      "confirmEmail",
      ["11111111-1111-4111-8111-111111111111"],
      { email_confirm: true },
    ],
    [
      "updatePassword",
      ["11111111-1111-4111-8111-111111111111", "new-password"],
      { password: "new-password" },
    ],
  ] as const)(
    "updates an Auth user through %s",
    async (method, arguments_, attributes) => {
      const test = clients({
        data: { user: { id: arguments_[0] } },
        error: null,
      });
      const gateway = createSupabaseAuthGateway(test);

      const result = await (
        gateway[method] as (...values: readonly string[]) => Promise<unknown>
      )(...arguments_);

      expect(result).toEqual({ ok: true, value: null });
      expect(test.adminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        arguments_[0],
        attributes,
      );
    },
  );

  it("returns only the bounded session after password sign-in", async () => {
    const test = clients({
      data: {
        session: {
          access_token: accessToken(),
          refresh_token: "refresh-token",
          expires_at: 1_800_000_000,
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "private@example.test",
          },
        },
      },
      error: null,
    });

    await expect(
      createSupabaseAuthGateway(test).signInWithPassword(
        "person@example.test",
        "password-value",
      ),
    ).resolves.toEqual({
      ok: true,
      value: {
        accessToken: accessToken(),
        refreshToken: "refresh-token",
        expiresAt: 1_800_000_000,
        authUserId: "11111111-1111-4111-8111-111111111111",
        sessionId: "22222222-2222-4222-8222-222222222222",
      },
    });
    expect(test.userClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.test",
      password: "password-value",
    });
  });

  it("rotates a session using only its refresh token", async () => {
    const test = clients({
      data: {
        session: {
          access_token: accessToken(),
          refresh_token: "rotated-refresh",
          expires_at: 1_800_000_000,
          user: { id: "11111111-1111-4111-8111-111111111111" },
        },
      },
      error: null,
    });

    const result =
      await createSupabaseAuthGateway(test).refreshSession("old-refresh");

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({ refreshToken: "rotated-refresh" }),
      }),
    );
    expect(test.userClient.auth.refreshSession).toHaveBeenCalledWith({
      refresh_token: "old-refresh",
    });
  });

  it.each([
    ["signOutCurrent", "local"],
    ["signOutAll", "global"],
  ] as const)("uses the explicit %s sign-out scope", async (method, scope) => {
    const test = clients({ data: {}, error: null });

    await expect(createSupabaseAuthGateway(test)[method]()).resolves.toEqual({
      ok: true,
      value: null,
    });
    expect(test.userClient.auth.signOut).toHaveBeenCalledWith({ scope });
  });

  it("deletes an Auth user permanently through the admin client", async () => {
    const test = clients({ data: { user: null }, error: null });

    await expect(
      createSupabaseAuthGateway(test).deleteUser(
        "11111111-1111-4111-8111-111111111111",
      ),
    ).resolves.toEqual({ ok: true, value: null });
    expect(test.adminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      false,
    );
  });

  it.each([
    ["user_already_exists", "DUPLICATE"],
    ["invalid_credentials", "INVALID_CREDENTIALS"],
    ["email_not_confirmed", "UNCONFIRMED"],
    ["user_banned", "DISABLED"],
    ["refresh_token_not_found", "REVOKED"],
    ["session_not_found", "REVOKED"],
  ] as const)(
    "maps provider code %s to %s",
    async (providerCode, expectedCode) => {
      const test = clients({
        data: {},
        error: { code: providerCode, message: "private detail" },
      });

      await expect(
        createSupabaseAuthGateway(test).signInWithPassword(
          "person@example.test",
          "password",
        ),
      ).resolves.toEqual({ ok: false, code: expectedCode });
    },
  );

  it.each(["user_not_found", "session_not_found"])(
    "treats %s as success for retry-safe deletion",
    async (providerCode) => {
      const test = clients({ data: {}, error: { code: providerCode } });

      await expect(
        createSupabaseAuthGateway(test).deleteUser(
          "11111111-1111-4111-8111-111111111111",
        ),
      ).resolves.toEqual({ ok: true, value: null });
    },
  );

  it.each(["signOutCurrent", "signOutAll"] as const)(
    "treats a missing session as success when retrying %s",
    async (method) => {
      const test = clients({
        data: {},
        error: { code: "session_not_found", message: "raw provider detail" },
      });

      await expect(createSupabaseAuthGateway(test)[method]()).resolves.toEqual({
        ok: true,
        value: null,
      });
    },
  );

  it("maps unknown provider failures without returning raw details", async () => {
    const test = clients({
      data: {},
      error: { code: "unknown", message: "private@example.test secret-key" },
    });

    const result = await createSupabaseAuthGateway(test).signInWithPassword(
      "person@example.test",
      "password",
    );

    expect(result).toEqual({ ok: false, code: "DEPENDENCY_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private@example.test");
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });
});
