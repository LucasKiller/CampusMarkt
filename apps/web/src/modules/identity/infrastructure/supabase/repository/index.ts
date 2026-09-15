import "server-only";

import type { PublicProfile } from "@campusmarkt/types";

export interface IdentityRpcClient {
  rpc(
    functionName: string,
    arguments_?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

export type ServerIdentity = {
  authUserId: string;
  sessionId: string;
};

export type IdentityRepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "DEPENDENCY_UNAVAILABLE" | "INVALID_PROVIDER_RESPONSE";
    };

type RepositoryClients = {
  user: IdentityRpcClient;
  service: IdentityRpcClient;
};

type RateLimitInput = {
  action: string;
  subjectHash: string;
  ipHash: string;
};

type ActionTokenInput = {
  authUserId: string;
  purpose: string;
  tokenHash: string;
};

type TokenLookup = Omit<ActionTokenInput, "authUserId">;

type AssuranceLookup = ServerIdentity & {
  maxAgeSeconds: number;
};

type SecurityEvent = {
  authUserId: string | null;
  subjectHash: string | null;
  ipHash: string | null;
  eventType: string;
  outcome: string;
  correlationId: string;
};

function firstRow(data: unknown) {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

async function call(
  client: IdentityRpcClient,
  functionName: string,
  arguments_?: Record<string, unknown>,
): Promise<IdentityRepositoryResult<unknown>> {
  try {
    const { data, error } = await client.rpc(functionName, arguments_);
    if (error) {
      return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
    }
    return { ok: true, value: firstRow(data) };
  } catch {
    return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePublicProfile(value: unknown): PublicProfile | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const expected = ["avatar_url", "display_name", "joined_month", "public_id"];
  if (Object.keys(value).sort().join("|") !== expected.join("|")) {
    return undefined;
  }

  if (
    typeof value.public_id !== "string" ||
    typeof value.display_name !== "string" ||
    typeof value.joined_month !== "string" ||
    (value.avatar_url !== null && typeof value.avatar_url !== "string")
  ) {
    return undefined;
  }

  return {
    publicId: value.public_id,
    displayName: value.display_name,
    joinedMonth: value.joined_month,
    avatarUrl: value.avatar_url,
  };
}

function parseAccountLookup(value: unknown) {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join("|") !== "auth_user_id|state" ||
    typeof value.auth_user_id !== "string" ||
    !["active_confirmed", "active_unconfirmed"].includes(String(value.state))
  ) {
    return undefined;
  }
  return { authUserId: value.auth_user_id, state: value.state as string };
}

function parseAvatarCleanupJob(value: unknown) {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    (value.auth_user_id !== null && typeof value.auth_user_id !== "string") ||
    typeof value.object_key !== "string" ||
    typeof value.attempts !== "number" ||
    typeof value.delete_by !== "string" ||
    typeof value.lease_until !== "string" ||
    value.state !== "processing" ||
    typeof value.worker_id !== "string"
  ) {
    return undefined;
  }
  return {
    id: value.id,
    authUserId: value.auth_user_id,
    objectKey: value.object_key,
    attempts: value.attempts,
    deleteBy: value.delete_by,
    leaseUntil: value.lease_until,
    state: value.state,
    workerId: value.worker_id,
  };
}

function parseDeletionJob(value: unknown) {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.auth_user_id !== "string" ||
    typeof value.attempts !== "number" ||
    typeof value.requested_at !== "string" ||
    typeof value.purge_due_at !== "string" ||
    typeof value.lease_until !== "string" ||
    value.state !== "processing" ||
    typeof value.worker_id !== "string"
  ) {
    return undefined;
  }
  return {
    authUserId: value.auth_user_id,
    attempts: value.attempts,
    requestedAt: value.requested_at,
    purgeDueAt: value.purge_due_at,
    leaseUntil: value.lease_until,
    state: value.state,
    workerId: value.worker_id,
  };
}

async function callAndParse<T>(
  client: IdentityRpcClient,
  functionName: string,
  arguments_: Record<string, unknown>,
  parser: (value: unknown) => T | undefined,
): Promise<IdentityRepositoryResult<T>> {
  const result = await call(client, functionName, arguments_);
  if (!result.ok) {
    return result;
  }
  const value = parser(result.value);
  return value === undefined
    ? { ok: false, code: "INVALID_PROVIDER_RESPONSE" }
    : { ok: true, value };
}

export function createIdentityRepository({ user, service }: RepositoryClients) {
  return {
    isCurrentSessionActive: () => call(user, "current_session_is_active"),
    getCurrentIdentityStatus: () => call(user, "current_identity_status"),

    async readPublicProfile(publicId: string) {
      const result = await call(user, "get_public_profile", {
        requested_public_id: publicId,
      });
      if (!result.ok) {
        return result;
      }
      const value = parsePublicProfile(result.value);
      return value === undefined
        ? ({ ok: false, code: "INVALID_PROVIDER_RESPONSE" } as const)
        : ({ ok: true, value } as const);
    },

    consumeRateLimits(input: RateLimitInput) {
      return call(service, "consume_rate_limits", {
        requested_action: input.action,
        requested_subject_hash: input.subjectHash,
        requested_ip_hash: input.ipHash,
      });
    },

    issueActionToken(input: ActionTokenInput) {
      return call(service, "issue_action_token", {
        requested_auth_user_id: input.authUserId,
        requested_purpose: input.purpose,
        requested_token_hash: input.tokenHash,
      });
    },

    stageActionToken(input: TokenLookup) {
      return call(service, "stage_action_token", {
        requested_purpose: input.purpose,
        requested_token_hash: input.tokenHash,
      });
    },

    consumeActionToken(input: TokenLookup) {
      return call(service, "consume_action_token", {
        requested_purpose: input.purpose,
        requested_token_hash: input.tokenHash,
      });
    },

    invalidateActionToken(input: TokenLookup) {
      return call(service, "invalidate_action_token", {
        requested_purpose: input.purpose,
        requested_token_hash: input.tokenHash,
      });
    },

    recordPasswordAssurance(identity: ServerIdentity) {
      return call(service, "record_password_assurance", {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
      });
    },

    updateDisplayName(displayName: string) {
      return call(user, "update_display_name", {
        requested_display_name: displayName,
      });
    },

    swapAvatar(
      identity: ServerIdentity,
      expectedVersion: number,
      candidateKey: string,
    ) {
      return call(service, "swap_avatar", {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
        expected_avatar_version: expectedVersion,
        candidate_object_key: candidateKey,
      });
    },

    removeAvatar(identity: ServerIdentity) {
      return call(service, "remove_avatar", {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
      });
    },

    requestDeletion(identity: ServerIdentity) {
      return call(service, "request_deletion", {
        requested_auth_user_id: identity.authUserId,
        requested_session_id: identity.sessionId,
      });
    },

    revokeUserSessions(authUserId: string) {
      return call(service, "revoke_user_sessions", {
        requested_auth_user_id: authUserId,
      });
    },

    synchronizeConfirmation(authUserId: string) {
      return call(service, "synchronize_confirmation", {
        requested_auth_user_id: authUserId,
      });
    },

    repairAuthProjection(authUserId: string) {
      return call(service, "repair_auth_projection", {
        requested_auth_user_id: authUserId,
      });
    },

    findRegistrationByEmailKey(emailKey: string) {
      return callAndParse(
        service,
        "find_registration_by_email_key",
        { requested_email_key: emailKey },
        parseAccountLookup,
      );
    },

    findRecoveryByEmailKey(emailKey: string) {
      return callAndParse(
        service,
        "find_recovery_by_email_key",
        { requested_email_key: emailKey },
        parseAccountLookup,
      );
    },

    isPasswordAssuranceRecent(input: AssuranceLookup) {
      return call(service, "password_assurance_is_recent", {
        requested_auth_user_id: input.authUserId,
        requested_session_id: input.sessionId,
        requested_max_age_seconds: input.maxAgeSeconds,
      });
    },

    claimAvatarCleanupJob(workerId: string, leaseSeconds: number) {
      return callAndParse(
        service,
        "claim_avatar_cleanup_job",
        {
          requested_worker_id: workerId,
          requested_lease_seconds: leaseSeconds,
        },
        parseAvatarCleanupJob,
      );
    },

    completeAvatarCleanupJob(jobId: number) {
      return call(service, "complete_avatar_cleanup_job", {
        requested_job_id: jobId,
      });
    },

    retryAvatarCleanupJob(
      jobId: number,
      errorCode: string,
      nextAttemptAt: string,
    ) {
      return call(service, "retry_avatar_cleanup_job", {
        requested_job_id: jobId,
        requested_error_code: errorCode,
        requested_next_attempt_at: nextAttemptAt,
      });
    },

    claimDeletionJob(workerId: string, leaseSeconds: number) {
      return callAndParse(
        service,
        "claim_deletion_job",
        {
          requested_worker_id: workerId,
          requested_lease_seconds: leaseSeconds,
        },
        parseDeletionJob,
      );
    },

    completeDeletionJob(authUserId: string) {
      return call(service, "complete_deletion_job", {
        requested_auth_user_id: authUserId,
      });
    },

    retryDeletionJob(
      authUserId: string,
      errorCode: string,
      nextAttemptAt: string,
    ) {
      return call(service, "retry_deletion_job", {
        requested_auth_user_id: authUserId,
        requested_error_code: errorCode,
        requested_next_attempt_at: nextAttemptAt,
      });
    },

    pruneExpiredActionTokens() {
      return call(service, "prune_expired_action_tokens");
    },

    appendSecurityEvent(event: SecurityEvent) {
      return call(service, "append_security_event", {
        requested_auth_user_id: event.authUserId,
        requested_subject_hash: event.subjectHash,
        requested_ip_hash: event.ipHash,
        requested_event_type: event.eventType,
        requested_outcome: event.outcome,
        requested_correlation_id: event.correlationId,
      });
    },
  };
}

export type IdentityRepository = ReturnType<typeof createIdentityRepository>;
