import "server-only";

import { parseLocalReturnPath } from "@campusmarkt/validation";

type PortResult = { ok: boolean; value?: unknown; code?: string };

type SessionAuth = {
  resolveSession(): Promise<PortResult>;
};

type SessionRepository = {
  isCurrentSessionActive(): Promise<PortResult>;
  getCurrentIdentityStatus(): Promise<PortResult>;
  isPasswordAssuranceRecent(input: {
    authUserId: string;
    sessionId: string;
    maxAgeSeconds: number;
  }): Promise<PortResult>;
};

type AuthenticatedIdentity = {
  authUserId: string;
  sessionId: string;
  emailConfirmed: boolean;
  profileComplete: boolean;
  consentComplete: boolean;
};

type AuthorizationCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACCESS_DENIED"
  | "PARTICIPATION_REQUIRED"
  | "RECENT_AUTHENTICATION_REQUIRED"
  | "DEPENDENCY_UNAVAILABLE";

export class IdentityAuthorizationError extends Error {
  readonly code: AuthorizationCode;

  constructor(code: AuthorizationCode) {
    super(code);
    this.name = "IdentityAuthorizationError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAuthSession(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.authUserId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt)
  ) {
    return null;
  }
  return {
    authUserId: value.authUserId,
    sessionId: value.sessionId,
    expiresAt: value.expiresAt,
  };
}

function parseIdentityStatus(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.auth_user_id !== "string" ||
    typeof value.is_active !== "boolean" ||
    typeof value.email_confirmed !== "boolean" ||
    typeof value.profile_complete !== "boolean" ||
    typeof value.consent_complete !== "boolean"
  ) {
    return null;
  }
  return {
    authUserId: value.auth_user_id,
    isActive: value.is_active,
    emailConfirmed: value.email_confirmed,
    profileComplete: value.profile_complete,
    consentComplete: value.consent_complete,
  };
}

export function createIdentitySessionDal({
  auth,
  repository,
  clearSession,
  canonicalOrigin,
  now = () => new Date(),
}: {
  auth: SessionAuth;
  repository: SessionRepository;
  clearSession: () => Promise<void> | void;
  canonicalOrigin: string;
  now?: () => Date;
}) {
  async function clearInvalidSession() {
    try {
      await clearSession();
    } catch {
      // Authorization remains denied even if response cookie mutation is absent.
    }
  }

  async function getOptionalIdentity(): Promise<AuthenticatedIdentity | null> {
    let authResult: PortResult;
    try {
      authResult = await auth.resolveSession();
    } catch {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }

    if (!authResult.ok) {
      if (authResult.code === "NO_SESSION") return null;
      if (
        authResult.code === "MALFORMED" ||
        authResult.code === "EXPIRED" ||
        authResult.code === "REVOKED"
      ) {
        await clearInvalidSession();
        return null;
      }
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }

    const session = parseAuthSession(authResult.value);
    if (!session || session.expiresAt <= now().getTime() / 1_000) {
      await clearInvalidSession();
      return null;
    }

    let activeResult: PortResult;
    try {
      activeResult = await repository.isCurrentSessionActive();
    } catch {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }
    if (!activeResult.ok) {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }
    if (typeof activeResult.value !== "boolean" || !activeResult.value) {
      await clearInvalidSession();
      return null;
    }

    let statusResult: PortResult;
    try {
      statusResult = await repository.getCurrentIdentityStatus();
    } catch {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }
    if (!statusResult.ok) {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }
    const status = parseIdentityStatus(statusResult.value);
    if (!status || status.authUserId !== session.authUserId) {
      throw new IdentityAuthorizationError("ACCESS_DENIED");
    }

    return {
      authUserId: session.authUserId,
      sessionId: session.sessionId,
      emailConfirmed: status.emailConfirmed,
      profileComplete: status.profileComplete,
      consentComplete: status.consentComplete,
      ...(status.isActive ? {} : { inactive: true }),
    } as AuthenticatedIdentity & { inactive?: true };
  }

  async function requireActiveIdentity() {
    const identity = await getOptionalIdentity();
    if (!identity) {
      throw new IdentityAuthorizationError("AUTHENTICATION_REQUIRED");
    }
    if ("inactive" in identity || !identity.emailConfirmed) {
      throw new IdentityAuthorizationError("ACCESS_DENIED");
    }
    return identity;
  }

  async function requireParticipatingIdentity() {
    const identity = await requireActiveIdentity();
    if (!identity.profileComplete || !identity.consentComplete) {
      throw new IdentityAuthorizationError("PARTICIPATION_REQUIRED");
    }
    return { ...identity, participating: true as const };
  }

  async function requireRecentAuthentication(maxAgeSeconds = 600) {
    const identity = await requireActiveIdentity();
    const boundedMaxAge = Math.max(1, Math.min(600, Math.floor(maxAgeSeconds)));
    let result: PortResult;
    try {
      result = await repository.isPasswordAssuranceRecent({
        authUserId: identity.authUserId,
        sessionId: identity.sessionId,
        maxAgeSeconds: boundedMaxAge,
      });
    } catch {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }
    if (!result.ok || typeof result.value !== "boolean") {
      throw new IdentityAuthorizationError("DEPENDENCY_UNAVAILABLE");
    }
    if (!result.value) {
      throw new IdentityAuthorizationError("RECENT_AUTHENTICATION_REQUIRED");
    }
    return identity;
  }

  return {
    getOptionalIdentity,
    requireActiveIdentity,
    requireParticipatingIdentity,
    requireRecentAuthentication,
    safeReturnPath(value: unknown) {
      return parseLocalReturnPath(value, canonicalOrigin, "/account");
    },
  };
}

export type IdentitySessionDal = ReturnType<typeof createIdentitySessionDal>;
