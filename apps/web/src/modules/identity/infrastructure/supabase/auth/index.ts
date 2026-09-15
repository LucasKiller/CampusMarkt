import "server-only";

import { Buffer } from "node:buffer";

type ProviderResult = { data: unknown; error: unknown };

type UserAuthClient = {
  auth: {
    signInWithPassword(input: {
      email: string;
      password: string;
    }): Promise<ProviderResult>;
    refreshSession(input: { refresh_token: string }): Promise<ProviderResult>;
    signOut(input: { scope: "local" | "global" }): Promise<ProviderResult>;
  };
};

type AdminAuthClient = {
  auth: {
    admin: {
      createUser(input: Record<string, unknown>): Promise<ProviderResult>;
      updateUserById(
        authUserId: string,
        attributes: Record<string, unknown>,
      ): Promise<ProviderResult>;
      deleteUser(
        authUserId: string,
        shouldSoftDelete: boolean,
      ): Promise<ProviderResult>;
    };
  };
};

type GatewayClients = {
  userClient: UserAuthClient;
  adminClient: AdminAuthClient;
};

type Bootstrap = {
  displayName: string;
  emailKey: string;
  termsVersion: string;
  privacyVersion: string;
  adultDeclared: true;
  acceptedAt: string;
};

type CreateUserInput = {
  email: string;
  password: string;
  bootstrap: Bootstrap;
};

type AuthFailureCode =
  | "DUPLICATE"
  | "INVALID_CREDENTIALS"
  | "UNCONFIRMED"
  | "DISABLED"
  | "EXPIRED"
  | "REVOKED"
  | "NOT_FOUND"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type AuthGatewayResult<T> =
  { ok: true; value: T } | { ok: false; code: AuthFailureCode };

type BoundedSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  authUserId: string;
  sessionId: string;
};

const PROVIDER_CODES: Record<string, AuthFailureCode> = {
  user_already_exists: "DUPLICATE",
  email_exists: "DUPLICATE",
  invalid_credentials: "INVALID_CREDENTIALS",
  email_not_confirmed: "UNCONFIRMED",
  user_banned: "DISABLED",
  refresh_token_not_found: "REVOKED",
  session_not_found: "REVOKED",
  user_not_found: "NOT_FOUND",
  otp_expired: "EXPIRED",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function providerFailure(error: unknown): AuthGatewayResult<never> {
  const code =
    isRecord(error) && typeof error.code === "string"
      ? PROVIDER_CODES[error.code]
      : undefined;
  return { ok: false, code: code ?? "DEPENDENCY_UNAVAILABLE" };
}

function sessionId(accessToken: string) {
  try {
    const segment = accessToken.split(".")[1];
    if (!segment) return undefined;
    const payload: unknown = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf8"),
    );
    return isRecord(payload) && typeof payload.session_id === "string"
      ? payload.session_id
      : undefined;
  } catch {
    return undefined;
  }
}

function boundedSession(data: unknown): BoundedSession | undefined {
  if (!isRecord(data) || !isRecord(data.session)) return undefined;
  const session = data.session;
  if (
    typeof session.access_token !== "string" ||
    typeof session.refresh_token !== "string" ||
    typeof session.expires_at !== "number" ||
    !isRecord(session.user) ||
    typeof session.user.id !== "string"
  ) {
    return undefined;
  }
  const currentSessionId = sessionId(session.access_token);
  if (!currentSessionId) return undefined;

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    authUserId: session.user.id,
    sessionId: currentSessionId,
  };
}

async function boundedVoid(
  operation: () => Promise<ProviderResult>,
  idempotentCodes: readonly string[] = [],
): Promise<AuthGatewayResult<null>> {
  try {
    const { error } = await operation();
    if (error) {
      const code =
        isRecord(error) && typeof error.code === "string" ? error.code : "";
      if (!idempotentCodes.includes(code)) return providerFailure(error);
    }
    return { ok: true, value: null };
  } catch {
    return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
  }
}

export function createSupabaseAuthGateway({
  userClient,
  adminClient,
}: GatewayClients) {
  async function sessionOperation(
    operation: () => Promise<ProviderResult>,
  ): Promise<AuthGatewayResult<BoundedSession>> {
    try {
      const { data, error } = await operation();
      if (error) return providerFailure(error);
      const session = boundedSession(data);
      return session
        ? { ok: true, value: session }
        : { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
    } catch {
      return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
    }
  }

  return {
    async createUnconfirmedUser(input: CreateUserInput) {
      try {
        const { data, error } = await adminClient.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: false,
          user_metadata: {
            adult_declared: input.bootstrap.adultDeclared,
            accepted_at: input.bootstrap.acceptedAt,
            display_name: input.bootstrap.displayName,
            email_key: input.bootstrap.emailKey,
            privacy_version: input.bootstrap.privacyVersion,
            terms_version: input.bootstrap.termsVersion,
          },
        });
        if (error) return providerFailure(error);
        if (
          !isRecord(data) ||
          !isRecord(data.user) ||
          typeof data.user.id !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE" as const,
          };
        }
        return {
          ok: true,
          value: { authUserId: data.user.id },
        } as const;
      } catch {
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" as const };
      }
    },

    signInWithPassword(email: string, password: string) {
      return sessionOperation(() =>
        userClient.auth.signInWithPassword({ email, password }),
      );
    },

    refreshSession(refreshToken: string) {
      return sessionOperation(() =>
        userClient.auth.refreshSession({ refresh_token: refreshToken }),
      );
    },

    confirmEmail(authUserId: string) {
      return boundedVoid(() =>
        adminClient.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
        }),
      );
    },

    updatePassword(authUserId: string, password: string) {
      return boundedVoid(() =>
        adminClient.auth.admin.updateUserById(authUserId, { password }),
      );
    },

    signOutCurrent() {
      return boundedVoid(
        () => userClient.auth.signOut({ scope: "local" }),
        ["session_not_found", "refresh_token_not_found"],
      );
    },

    signOutAll() {
      return boundedVoid(
        () => userClient.auth.signOut({ scope: "global" }),
        ["session_not_found", "refresh_token_not_found"],
      );
    },

    deleteUser(authUserId: string) {
      return boundedVoid(
        () => adminClient.auth.admin.deleteUser(authUserId, false),
        ["user_not_found", "session_not_found"],
      );
    },
  };
}

export type SupabaseAuthGateway = ReturnType<typeof createSupabaseAuthGateway>;
