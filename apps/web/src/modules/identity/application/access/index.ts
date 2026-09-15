import {
  normalizePrimaryEmail,
  parseCredentials,
} from "@campusmarkt/validation";

type PortResult = { ok: boolean; value?: unknown; code?: string };
type Identity = { authUserId: string; sessionId: string };
type RequestContext = { trustedClientIp: string; correlationId: string };

type AccessSecurity = {
  fingerprintIdentity(identity: string): string;
  enforce(
    input: {
      action: "sign_in" | "recovery";
      normalizedIdentity: string;
      trustedClientIp: string;
      correlationId: string;
    },
    operation: () => Promise<unknown>,
  ): Promise<
    | { status: "allowed"; value: unknown }
    | { status: "rate_limited"; retryAfterSeconds: number }
    | { status: "unavailable" }
  >;
};

type AccessAuth = {
  signInWithPassword(email: string, password: string): Promise<PortResult>;
  signOutCurrent(): Promise<PortResult>;
  signOutAll(): Promise<PortResult>;
  updatePassword(authUserId: string, password: string): Promise<PortResult>;
};

type AccessSession = {
  requireActiveIdentity(): Promise<Identity>;
  requireRecentAuthentication(): Promise<Identity>;
  safeReturnPath(value: unknown): string;
};

type AccessRepository = {
  recordPasswordAssurance(identity: Identity): Promise<PortResult>;
  revokeUserSessions(authUserId: string): Promise<PortResult>;
  findRecoveryByEmailKey(emailKey: string): Promise<PortResult>;
  requestDeletion(identity: Identity): Promise<PortResult>;
};

type AccessActionLinks = {
  issue(input: {
    authUserId: string;
    recipient: string;
    purpose: "password_recovery";
  }): Promise<{ status: "accepted" | "unavailable" }>;
  consume(input: {
    purpose: "password_recovery";
    rawToken: string;
  }): Promise<
    | { status: "consumed"; authUserId: string }
    | { status: "invalid_link" | "unavailable" }
  >;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedSession(value: unknown): Identity | null {
  if (
    !isRecord(value) ||
    typeof value.authUserId !== "string" ||
    typeof value.sessionId !== "string"
  ) {
    return null;
  }
  return { authUserId: value.authUserId, sessionId: value.sessionId };
}

function actionableRecoveryUser(result: PortResult) {
  if (
    result.ok &&
    isRecord(result.value) &&
    result.value.state === "active_confirmed" &&
    typeof result.value.authUserId === "string"
  ) {
    return result.value.authUserId;
  }
  return null;
}

function allowedValue(value: unknown) {
  if (!isRecord(value) || typeof value.status !== "string") {
    return { status: "unavailable" as const };
  }
  if (value.status === "denied") return { status: "denied" as const };
  if (value.status === "unavailable") return { status: "unavailable" as const };
  if (value.status === "signed_in" && typeof value.redirectTo === "string") {
    return { status: "signed_in" as const, redirectTo: value.redirectTo };
  }
  return { status: "unavailable" as const };
}

export function createAccessService({
  security,
  auth,
  session,
  repository,
  actionLinks,
  clearSession,
}: {
  security: AccessSecurity;
  auth: AccessAuth;
  session: AccessSession;
  repository: AccessRepository;
  actionLinks: AccessActionLinks;
  clearSession: () => Promise<void> | void;
}) {
  async function clearLocal() {
    try {
      await clearSession();
    } catch {
      // Server-side authorization remains authoritative.
    }
  }

  async function compensateSession() {
    try {
      await auth.signOutCurrent();
    } catch {
      // The local cookie boundary is still cleared below.
    }
    await clearLocal();
  }

  return {
    async signIn(command: unknown, context: RequestContext) {
      const parsed = parseCredentials(command);
      if (!parsed.ok) {
        return { status: "invalid" as const, fieldErrors: parsed.fieldErrors };
      }
      const returnTo = isRecord(command) ? command.returnTo : undefined;
      const boundary = await security.enforce(
        {
          action: "sign_in",
          normalizedIdentity: parsed.value.emailKey,
          trustedClientIp: context.trustedClientIp,
          correlationId: context.correlationId,
        },
        async () => {
          let signedIn: PortResult;
          try {
            signedIn = await auth.signInWithPassword(
              parsed.value.email,
              parsed.value.password,
            );
          } catch {
            return { status: "unavailable" };
          }
          if (!signedIn.ok) {
            return signedIn.code === "DEPENDENCY_UNAVAILABLE"
              ? { status: "unavailable" }
              : { status: "denied" };
          }
          const actual = boundedSession(signedIn.value);
          if (!actual) {
            await compensateSession();
            return { status: "unavailable" };
          }

          try {
            const active = await session.requireActiveIdentity();
            if (
              active.authUserId !== actual.authUserId ||
              active.sessionId !== actual.sessionId
            ) {
              await compensateSession();
              return { status: "denied" };
            }
          } catch {
            await compensateSession();
            return { status: "denied" };
          }

          const assured = await repository.recordPasswordAssurance(actual);
          if (!assured.ok) {
            await compensateSession();
            return { status: "unavailable" };
          }
          return {
            status: "signed_in",
            redirectTo: session.safeReturnPath(returnTo),
          };
        },
      );
      if (boundary.status !== "allowed") return boundary;
      return allowedValue(boundary.value);
    },

    async signOutCurrent() {
      let ok: boolean;
      try {
        ok = (await auth.signOutCurrent()).ok;
      } catch {
        ok = false;
      }
      await clearLocal();
      return ok
        ? ({ status: "signed_out" } as const)
        : ({ status: "unavailable" } as const);
    },

    async signOutAll(identity: Identity) {
      try {
        const revoked = await repository.revokeUserSessions(
          identity.authUserId,
        );
        if (!revoked.ok) {
          await clearLocal();
          return { status: "unavailable" as const };
        }
        const signedOut = await auth.signOutAll();
        await clearLocal();
        return signedOut.ok
          ? ({ status: "signed_out" } as const)
          : ({ status: "unavailable" } as const);
      } catch {
        await clearLocal();
        return { status: "unavailable" as const };
      }
    },

    async reauthenticate(
      identity: Identity,
      command: { email: unknown; password: unknown },
    ) {
      const parsed = parseCredentials(command);
      if (!parsed.ok) {
        return { status: "invalid" as const, fieldErrors: parsed.fieldErrors };
      }
      try {
        const result = await auth.signInWithPassword(
          parsed.value.email,
          parsed.value.password,
        );
        const actual = result.ok ? boundedSession(result.value) : null;
        if (!actual || actual.authUserId !== identity.authUserId) {
          return { status: "denied" as const };
        }
        const assured = await repository.recordPasswordAssurance(actual);
        return assured.ok
          ? { status: "reauthenticated" as const }
          : { status: "unavailable" as const };
      } catch {
        return { status: "unavailable" as const };
      }
    },

    async requestRecovery(email: unknown, context: RequestContext) {
      const parsed = normalizePrimaryEmail(email);
      if (!parsed.ok) {
        return {
          status: "invalid" as const,
          fieldErrors: { email: parsed.errors },
        };
      }
      const boundary = await security.enforce(
        {
          action: "recovery",
          normalizedIdentity: parsed.value.key,
          trustedClientIp: context.trustedClientIp,
          correlationId: context.correlationId,
        },
        async () => {
          try {
            const lookup = await repository.findRecoveryByEmailKey(
              security.fingerprintIdentity(parsed.value.key),
            );
            const recoveryUserId = actionableRecoveryUser(lookup);
            if (recoveryUserId) {
              await actionLinks.issue({
                authUserId: recoveryUserId,
                recipient: parsed.value.address,
                purpose: "password_recovery",
              });
            }
          } catch {
            // All lookup and delivery states share the accepted response.
          }
          return { status: "accepted" };
        },
      );
      if (boundary.status !== "allowed") return boundary;
      return { status: "accepted" as const };
    },

    async resetPassword(rawToken: string, password: unknown) {
      const parsed = parseCredentials({
        email: "validation@internal.test",
        password,
      });
      if (!parsed.ok) {
        return { status: "invalid" as const, fieldErrors: parsed.fieldErrors };
      }
      try {
        const consumed = await actionLinks.consume({
          purpose: "password_recovery",
          rawToken,
        });
        if (consumed.status !== "consumed") {
          return consumed.status === "unavailable"
            ? ({ status: "unavailable" } as const)
            : ({ status: "invalid_link" } as const);
        }
        const revoked = await repository.revokeUserSessions(
          consumed.authUserId,
        );
        if (!revoked.ok) return { status: "unavailable" as const };
        const updated = await auth.updatePassword(
          consumed.authUserId,
          parsed.value.password,
        );
        if (!updated.ok) return { status: "unavailable" as const };
        await clearLocal();
        return { status: "password_updated" as const };
      } catch {
        return { status: "unavailable" as const };
      }
    },

    async requestDeletion() {
      let identity: Identity;
      try {
        identity = await session.requireRecentAuthentication();
      } catch {
        return { status: "recent_authentication_required" as const };
      }
      try {
        const requested = await repository.requestDeletion(identity);
        if (!requested.ok) return { status: "unavailable" as const };
        const revoked = await repository.revokeUserSessions(
          identity.authUserId,
        );
        if (!revoked.ok) {
          await clearLocal();
          return { status: "unavailable" as const };
        }
        await auth.signOutAll();
        await clearLocal();
        return { status: "deletion_pending" as const };
      } catch {
        await clearLocal();
        return { status: "unavailable" as const };
      }
    },
  };
}

export type AccessService = ReturnType<typeof createAccessService>;
