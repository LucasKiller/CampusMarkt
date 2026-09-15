import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createIdentityRepository,
  type IdentityRpcClient,
} from "../../../apps/web/src/modules/identity/infrastructure/supabase/repository/index.ts";

const identity = {
  authUserId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
};

function client(data: unknown = { accepted: true }, error: unknown = null) {
  const calls: Array<{ functionName: string; arguments_: object | undefined }> =
    [];
  const rpc: IdentityRpcClient["rpc"] = async (functionName, arguments_) => {
    calls.push({ functionName, arguments_ });
    return { data, error };
  };
  return { calls, rpc };
}

function repository(data?: unknown, error?: unknown) {
  const user = client(data, error);
  const service = client(data, error);
  return {
    repository: createIdentityRepository({ user, service }),
    service,
    user,
  };
}

describe("identity RPC repository", () => {
  it.each([
    ["isCurrentSessionActive", "current_session_is_active"],
    ["getCurrentIdentityStatus", "current_identity_status"],
  ] as const)("uses the user client for %s", async (method, functionName) => {
    const test = repository([{ active: true }]);

    await test.repository[method]();

    expect(test.user.calls).toEqual([{ functionName, arguments_: undefined }]);
    expect(test.service.calls).toEqual([]);
  });

  it("uses the user client and allowlists a public profile", async () => {
    const test = repository([
      {
        public_id: "33333333-3333-4333-8333-333333333333",
        display_name: "Ada",
        joined_month: "2026-09",
        avatar_url: null,
      },
    ]);

    await expect(
      test.repository.readPublicProfile("33333333-3333-4333-8333-333333333333"),
    ).resolves.toEqual({
      ok: true,
      value: {
        publicId: "33333333-3333-4333-8333-333333333333",
        displayName: "Ada",
        joinedMonth: "2026-09",
        avatarUrl: null,
      },
    });
    expect(test.user.calls[0]).toEqual({
      functionName: "get_public_profile",
      arguments_: { p_public_id: "33333333-3333-4333-8333-333333333333" },
    });
    expect(test.service.calls).toEqual([]);
  });

  it("maps an absent public profile to null", async () => {
    const test = repository([]);

    await expect(
      test.repository.readPublicProfile("33333333-3333-4333-8333-333333333333"),
    ).resolves.toEqual({ ok: true, value: null });
  });

  it("rejects a public profile containing a private field", async () => {
    const test = repository([
      {
        public_id: "33333333-3333-4333-8333-333333333333",
        display_name: "Ada",
        joined_month: "2026-09",
        avatar_url: null,
        email: "private@example.test",
      },
    ]);

    await expect(
      test.repository.readPublicProfile("33333333-3333-4333-8333-333333333333"),
    ).resolves.toEqual({ ok: false, code: "INVALID_PROVIDER_RESPONSE" });
  });

  it.each([
    [
      "consumeRateLimits",
      [
        {
          action: "sign_in",
          subjectHash: "a".repeat(64),
          ipHash: "b".repeat(64),
        },
      ],
      "consume_rate_limits",
      {
        p_action: "sign_in",
        p_subject_hash: "a".repeat(64),
        p_ip_hash: "b".repeat(64),
      },
    ],
    [
      "issueActionToken",
      [
        {
          authUserId: identity.authUserId,
          purpose: "email_confirmation",
          tokenHash: "\\x01",
        },
      ],
      "issue_action_token",
      {
        p_auth_user_id: identity.authUserId,
        p_purpose: "email_confirmation",
        p_token_hash: "\\x01",
      },
    ],
    [
      "stageActionToken",
      [{ purpose: "password_recovery", tokenHash: "\\x02" }],
      "stage_action_token",
      { p_purpose: "password_recovery", p_token_hash: "\\x02" },
    ],
    [
      "consumeActionToken",
      [{ purpose: "password_recovery", tokenHash: "\\x03" }],
      "consume_action_token",
      { p_purpose: "password_recovery", p_token_hash: "\\x03" },
    ],
    [
      "recordPasswordAssurance",
      [identity],
      "record_password_assurance",
      { p_auth_user_id: identity.authUserId, p_session_id: identity.sessionId },
    ],
    [
      "updateDisplayName",
      [identity, "Ada Lovelace"],
      "update_display_name",
      {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
        p_display_name: "Ada Lovelace",
      },
    ],
    [
      "swapAvatar",
      [identity, 2, "profiles/public/3-file.webp"],
      "swap_avatar",
      {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
        p_expected_version: 2,
        p_candidate_key: "profiles/public/3-file.webp",
      },
    ],
    [
      "removeAvatar",
      [identity],
      "remove_avatar",
      { p_auth_user_id: identity.authUserId, p_session_id: identity.sessionId },
    ],
    [
      "requestDeletion",
      [identity],
      "request_deletion",
      { p_auth_user_id: identity.authUserId, p_session_id: identity.sessionId },
    ],
    [
      "revokeUserSessions",
      [identity.authUserId],
      "revoke_user_sessions",
      { p_auth_user_id: identity.authUserId },
    ],
    [
      "synchronizeConfirmation",
      [identity.authUserId],
      "synchronize_confirmation",
      { p_auth_user_id: identity.authUserId },
    ],
    [
      "repairAuthProjection",
      [identity.authUserId],
      "repair_auth_projection",
      { p_auth_user_id: identity.authUserId },
    ],
  ] as const)(
    "uses the service client and exact RPC arguments for %s",
    async (method, arguments_, functionName, expectedArguments) => {
      const test = repository([{ accepted: true }]);

      const result = await (
        test.repository[method] as (
          ...values: readonly unknown[]
        ) => Promise<unknown>
      )(...arguments_);

      expect(result).toEqual({ ok: true, value: { accepted: true } });
      expect(test.service.calls).toEqual([
        { functionName, arguments_: expectedArguments },
      ]);
      expect(test.user.calls).toEqual([]);
    },
  );

  it("appends only the bounded audit payload through the service client", async () => {
    const test = repository(null);
    const event = {
      authUserId: identity.authUserId,
      subjectHash: "a".repeat(64),
      ipHash: "b".repeat(64),
      eventType: "sign_in",
      outcome: "denied",
      correlationId: "44444444-4444-4444-8444-444444444444",
    };

    await expect(test.repository.appendSecurityEvent(event)).resolves.toEqual({
      ok: true,
      value: null,
    });
    expect(test.service.calls).toEqual([
      {
        functionName: "append_security_event",
        arguments_: {
          p_auth_user_id: event.authUserId,
          p_subject_hash: event.subjectHash,
          p_ip_hash: event.ipHash,
          p_event_type: event.eventType,
          p_outcome: event.outcome,
          p_correlation_id: event.correlationId,
        },
      },
    ]);
  });

  it("maps provider failures to one stable result without leaking details", async () => {
    const test = repository(null, {
      message: "SQL included private@example.test and secret-key",
    });

    const result = await test.repository.consumeRateLimits({
      action: "sign_in",
      subjectHash: "a".repeat(64),
      ipHash: "b".repeat(64),
    });

    expect(result).toEqual({ ok: false, code: "DEPENDENCY_UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("private@example.test");
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });
});
