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
      arguments_: {
        requested_public_id: "33333333-3333-4333-8333-333333333333",
      },
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
        requested_action: "sign_in",
        requested_subject_hash: "a".repeat(64),
        requested_ip_hash: "b".repeat(64),
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
        requested_auth_user_id: identity.authUserId,
        requested_purpose: "email_confirmation",
        requested_token_hash: "\\x01",
      },
    ],
    [
      "stageActionToken",
      [{ purpose: "password_recovery", tokenHash: "\\x02" }],
      "stage_action_token",
      {
        requested_purpose: "password_recovery",
        requested_token_hash: "\\x02",
      },
    ],
    [
      "consumeActionToken",
      [{ purpose: "password_recovery", tokenHash: "\\x03" }],
      "consume_action_token",
      {
        requested_purpose: "password_recovery",
        requested_token_hash: "\\x03",
      },
    ],
    [
      "invalidateActionToken",
      [{ purpose: "email_confirmation", tokenHash: "\\x04" }],
      "invalidate_action_token",
      {
        requested_purpose: "email_confirmation",
        requested_token_hash: "\\x04",
      },
    ],
    [
      "recordPasswordAssurance",
      [identity],
      "record_password_assurance",
      {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
      },
    ],
    [
      "swapAvatar",
      [identity, 2, "profiles/public/3-file.webp"],
      "swap_avatar",
      {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
        expected_avatar_version: 2,
        candidate_object_key: "profiles/public/3-file.webp",
      },
    ],
    [
      "removeAvatar",
      [identity],
      "remove_avatar",
      {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
      },
    ],
    [
      "requestDeletion",
      [identity],
      "request_deletion",
      {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
      },
    ],
    [
      "revokeUserSessions",
      [identity.authUserId],
      "revoke_user_sessions",
      { requested_auth_user_id: identity.authUserId },
    ],
    [
      "synchronizeConfirmation",
      [identity.authUserId],
      "synchronize_confirmation",
      { requested_auth_user_id: identity.authUserId },
    ],
    [
      "repairAuthProjection",
      [identity.authUserId],
      "repair_auth_projection",
      { requested_auth_user_id: identity.authUserId },
    ],
    [
      "completeAvatarCleanupJob",
      [7],
      "complete_avatar_cleanup_job",
      { requested_job_id: 7 },
    ],
    [
      "retryAvatarCleanupJob",
      [7, "storage_unavailable", "2026-09-16T12:00:00.000Z"],
      "retry_avatar_cleanup_job",
      {
        requested_job_id: 7,
        requested_error_code: "storage_unavailable",
        requested_next_attempt_at: "2026-09-16T12:00:00.000Z",
      },
    ],
    [
      "completeDeletionJob",
      [identity.authUserId],
      "complete_deletion_job",
      { requested_auth_user_id: identity.authUserId },
    ],
    [
      "retryDeletionJob",
      [identity.authUserId, "auth_unavailable", "2026-09-16T12:00:00.000Z"],
      "retry_deletion_job",
      {
        requested_auth_user_id: identity.authUserId,
        requested_error_code: "auth_unavailable",
        requested_next_attempt_at: "2026-09-16T12:00:00.000Z",
      },
    ],
    ["pruneExpiredActionTokens", [], "prune_expired_action_tokens", undefined],
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

  it("uses the user JWT for owner-scoped display-name mutation", async () => {
    const test = repository([{ changed: true, display_name: "Ada Lovelace" }]);

    await expect(
      test.repository.updateDisplayName("Ada Lovelace"),
    ).resolves.toEqual({
      ok: true,
      value: { changed: true, display_name: "Ada Lovelace" },
    });
    expect(test.user.calls).toEqual([
      {
        functionName: "update_display_name",
        arguments_: { requested_display_name: "Ada Lovelace" },
      },
    ]);
    expect(test.service.calls).toEqual([]);
  });

  it.each([
    ["findRegistrationByEmailKey", "find_registration_by_email_key"],
    ["findRecoveryByEmailKey", "find_recovery_by_email_key"],
  ] as const)("maps the bounded account lookup for %s", async (method, rpc) => {
    const test = repository([
      {
        auth_user_id: identity.authUserId,
        state:
          method === "findRegistrationByEmailKey"
            ? "active_unconfirmed"
            : "active_confirmed",
      },
    ]);

    await expect(test.repository[method]("a".repeat(64))).resolves.toEqual({
      ok: true,
      value: {
        authUserId: identity.authUserId,
        state:
          method === "findRegistrationByEmailKey"
            ? "active_unconfirmed"
            : "active_confirmed",
      },
    });
    expect(test.service.calls).toEqual([
      {
        functionName: rpc,
        arguments_: { requested_email_key: "a".repeat(64) },
      },
    ]);
    expect(test.user.calls).toEqual([]);
  });

  it("maps an absent account lookup to null", async () => {
    const test = repository([]);

    await expect(
      test.repository.findRecoveryByEmailKey("a".repeat(64)),
    ).resolves.toEqual({ ok: true, value: null });
  });

  it("rejects an account lookup containing a private field", async () => {
    const test = repository([
      {
        auth_user_id: identity.authUserId,
        state: "active_confirmed",
        email: "private@example.test",
      },
    ]);

    await expect(
      test.repository.findRecoveryByEmailKey("a".repeat(64)),
    ).resolves.toEqual({ ok: false, code: "INVALID_PROVIDER_RESPONSE" });
  });

  it("maps recent password assurance through the service-only RPC", async () => {
    const test = repository(true);

    await expect(
      test.repository.isPasswordAssuranceRecent({
        ...identity,
        maxAgeSeconds: 600,
      }),
    ).resolves.toEqual({ ok: true, value: true });
    expect(test.service.calls).toEqual([
      {
        functionName: "password_assurance_is_recent",
        arguments_: {
          requested_auth_user_id: identity.authUserId,
          requested_session_id: identity.sessionId,
          requested_max_age_seconds: 600,
        },
      },
    ]);
  });

  it("maps a claimed avatar cleanup job to the worker DTO", async () => {
    const test = repository([
      {
        id: 7,
        auth_user_id: identity.authUserId,
        object_key: "profiles/public/3-file.webp",
        attempts: 2,
        delete_by: "2026-09-16T12:00:00.000Z",
        lease_until: "2026-09-15T12:05:00.000Z",
        state: "processing",
        worker_id: "worker_1",
      },
    ]);

    await expect(
      test.repository.claimAvatarCleanupJob("worker_1", 300),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: 7,
        authUserId: identity.authUserId,
        objectKey: "profiles/public/3-file.webp",
        attempts: 2,
        deleteBy: "2026-09-16T12:00:00.000Z",
        leaseUntil: "2026-09-15T12:05:00.000Z",
        state: "processing",
        workerId: "worker_1",
      },
    });
    expect(test.service.calls).toEqual([
      {
        functionName: "claim_avatar_cleanup_job",
        arguments_: {
          requested_worker_id: "worker_1",
          requested_lease_seconds: 300,
        },
      },
    ]);
  });

  it("maps a claimed deletion job to the worker DTO", async () => {
    const test = repository([
      {
        auth_user_id: identity.authUserId,
        attempts: 1,
        requested_at: "2026-09-15T12:00:00.000Z",
        purge_due_at: "2026-10-15T12:00:00.000Z",
        lease_until: "2026-09-15T12:05:00.000Z",
        state: "processing",
        worker_id: "worker_1",
      },
    ]);

    await expect(
      test.repository.claimDeletionJob("worker_1", 300),
    ).resolves.toEqual({
      ok: true,
      value: {
        authUserId: identity.authUserId,
        attempts: 1,
        requestedAt: "2026-09-15T12:00:00.000Z",
        purgeDueAt: "2026-10-15T12:00:00.000Z",
        leaseUntil: "2026-09-15T12:05:00.000Z",
        state: "processing",
        workerId: "worker_1",
      },
    });
    expect(test.service.calls).toEqual([
      {
        functionName: "claim_deletion_job",
        arguments_: {
          requested_worker_id: "worker_1",
          requested_lease_seconds: 300,
        },
      },
    ]);
  });

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
          requested_auth_user_id: event.authUserId,
          requested_subject_hash: event.subjectHash,
          requested_ip_hash: event.ipHash,
          requested_event_type: event.eventType,
          requested_outcome: event.outcome,
          requested_correlation_id: event.correlationId,
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
