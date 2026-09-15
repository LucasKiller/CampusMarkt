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

export function createIdentityRepository({ user, service }: RepositoryClients) {
  return {
    isCurrentSessionActive: () => call(user, "current_session_is_active"),
    getCurrentIdentityStatus: () => call(user, "current_identity_status"),

    async readPublicProfile(publicId: string) {
      const result = await call(user, "get_public_profile", {
        p_public_id: publicId,
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
        p_action: input.action,
        p_subject_hash: input.subjectHash,
        p_ip_hash: input.ipHash,
      });
    },

    issueActionToken(input: ActionTokenInput) {
      return call(service, "issue_action_token", {
        p_auth_user_id: input.authUserId,
        p_purpose: input.purpose,
        p_token_hash: input.tokenHash,
      });
    },

    stageActionToken(input: TokenLookup) {
      return call(service, "stage_action_token", {
        p_purpose: input.purpose,
        p_token_hash: input.tokenHash,
      });
    },

    consumeActionToken(input: TokenLookup) {
      return call(service, "consume_action_token", {
        p_purpose: input.purpose,
        p_token_hash: input.tokenHash,
      });
    },

    recordPasswordAssurance(identity: ServerIdentity) {
      return call(service, "record_password_assurance", {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
      });
    },

    updateDisplayName(identity: ServerIdentity, displayName: string) {
      return call(service, "update_display_name", {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
        p_display_name: displayName,
      });
    },

    swapAvatar(
      identity: ServerIdentity,
      expectedVersion: number,
      candidateKey: string,
    ) {
      return call(service, "swap_avatar", {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
        p_expected_version: expectedVersion,
        p_candidate_key: candidateKey,
      });
    },

    removeAvatar(identity: ServerIdentity) {
      return call(service, "remove_avatar", {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
      });
    },

    requestDeletion(identity: ServerIdentity) {
      return call(service, "request_deletion", {
        p_auth_user_id: identity.authUserId,
        p_session_id: identity.sessionId,
      });
    },

    revokeUserSessions(authUserId: string) {
      return call(service, "revoke_user_sessions", {
        p_auth_user_id: authUserId,
      });
    },

    synchronizeConfirmation(authUserId: string) {
      return call(service, "synchronize_confirmation", {
        p_auth_user_id: authUserId,
      });
    },

    repairAuthProjection(authUserId: string) {
      return call(service, "repair_auth_projection", {
        p_auth_user_id: authUserId,
      });
    },

    appendSecurityEvent(event: SecurityEvent) {
      return call(service, "append_security_event", {
        p_auth_user_id: event.authUserId,
        p_subject_hash: event.subjectHash,
        p_ip_hash: event.ipHash,
        p_event_type: event.eventType,
        p_outcome: event.outcome,
        p_correlation_id: event.correlationId,
      });
    },
  };
}

export type IdentityRepository = ReturnType<typeof createIdentityRepository>;
