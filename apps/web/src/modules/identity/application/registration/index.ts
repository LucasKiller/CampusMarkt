import {
  normalizePrimaryEmail,
  parseRegistration,
  type PolicyVersions,
} from "@campusmarkt/validation";

type PortResult = { ok: boolean; value?: unknown; code?: string };
type RequestContext = { trustedClientIp: string; correlationId: string };

type RegistrationSecurity = {
  fingerprintIdentity(identity: string): string;
  enforce(
    input: {
      action: "registration" | "confirmation_resend";
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

type RegistrationAuth = {
  createUnconfirmedUser(input: {
    email: string;
    password: string;
    bootstrap: {
      displayName: string;
      emailKey: string;
      termsVersion: string;
      privacyVersion: string;
      adultDeclared: true;
      acceptedAt: string;
    };
  }): Promise<PortResult>;
  confirmEmail(authUserId: string): Promise<PortResult>;
};

type RegistrationActionLinks = {
  issue(input: {
    authUserId: string;
    recipient: string;
    purpose: "email_confirmation";
  }): Promise<{ status: "accepted" | "unavailable" }>;
  consume(input: {
    purpose: "email_confirmation";
    rawToken: string;
  }): Promise<
    | { status: "consumed"; authUserId: string }
    | { status: "invalid_link" | "unavailable" }
  >;
};

type RegistrationRepository = {
  findRegistrationByEmailKey(emailKey: string): Promise<PortResult>;
  synchronizeConfirmation(authUserId: string): Promise<PortResult>;
  repairAuthProjection(authUserId: string): Promise<PortResult>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createdAuthUser(result: PortResult) {
  if (
    result.ok &&
    isRecord(result.value) &&
    typeof result.value.authUserId === "string"
  ) {
    return result.value.authUserId;
  }
  return null;
}

function unconfirmedAuthUser(result: PortResult) {
  if (
    result.ok &&
    isRecord(result.value) &&
    result.value.state === "active_unconfirmed" &&
    typeof result.value.authUserId === "string"
  ) {
    return result.value.authUserId;
  }
  return null;
}

export function createRegistrationService({
  security,
  auth,
  actionLinks,
  repository,
  policies,
  now = () => new Date(),
}: {
  security: RegistrationSecurity;
  auth: RegistrationAuth;
  actionLinks: RegistrationActionLinks;
  repository: RegistrationRepository;
  policies: PolicyVersions;
  now?: () => Date;
}) {
  return {
    async register(command: unknown, context: RequestContext) {
      const parsed = parseRegistration(command, policies);
      if (!parsed.ok) {
        return { status: "invalid" as const, fieldErrors: parsed.fieldErrors };
      }

      const boundary = await security.enforce(
        {
          action: "registration",
          normalizedIdentity: parsed.value.emailKey,
          trustedClientIp: context.trustedClientIp,
          correlationId: context.correlationId,
        },
        async () => {
          try {
            const created = await auth.createUnconfirmedUser({
              email: parsed.value.email,
              password: parsed.value.password,
              bootstrap: {
                acceptedAt: now().toISOString(),
                adultDeclared: true,
                displayName: parsed.value.displayName,
                emailKey: security.fingerprintIdentity(parsed.value.emailKey),
                privacyVersion: parsed.value.privacyVersion,
                termsVersion: parsed.value.termsVersion,
              },
            });
            const authUserId = createdAuthUser(created);
            if (!authUserId) return { status: "accepted" as const };

            await actionLinks.issue({
              authUserId,
              recipient: parsed.value.email,
              purpose: "email_confirmation",
            });
          } catch {
            // Registration remains enumeration-safe for dependency failures.
          }
          return { status: "accepted" as const };
        },
      );

      if (boundary.status === "rate_limited") return boundary;
      if (boundary.status === "unavailable") return boundary;
      return { status: "accepted" as const };
    },

    async resendConfirmation(email: unknown, context: RequestContext) {
      const parsed = normalizePrimaryEmail(email);
      if (!parsed.ok) {
        return {
          status: "invalid" as const,
          fieldErrors: { email: parsed.errors },
        };
      }

      const boundary = await security.enforce(
        {
          action: "confirmation_resend",
          normalizedIdentity: parsed.value.key,
          trustedClientIp: context.trustedClientIp,
          correlationId: context.correlationId,
        },
        async () => {
          try {
            const lookup = await repository.findRegistrationByEmailKey(
              security.fingerprintIdentity(parsed.value.key),
            );
            const authUserId = unconfirmedAuthUser(lookup);
            if (authUserId) {
              await actionLinks.issue({
                authUserId,
                recipient: parsed.value.address,
                purpose: "email_confirmation",
              });
            }
          } catch {
            // Absent, unavailable, and lifecycle states share this response.
          }
          return { status: "accepted" as const };
        },
      );

      if (boundary.status === "rate_limited") return boundary;
      if (boundary.status === "unavailable") return boundary;
      return { status: "accepted" as const };
    },

    async confirmEmail(rawToken: string) {
      let consumed: Awaited<ReturnType<RegistrationActionLinks["consume"]>>;
      try {
        consumed = await actionLinks.consume({
          purpose: "email_confirmation",
          rawToken,
        });
      } catch {
        return { status: "invalid_link" as const };
      }
      if (consumed.status !== "consumed") {
        return consumed.status === "unavailable"
          ? ({ status: "unavailable" } as const)
          : ({ status: "invalid_link" } as const);
      }

      try {
        const confirmed = await auth.confirmEmail(consumed.authUserId);
        if (!confirmed.ok) return { status: "unavailable" as const };

        const synchronized = await repository.synchronizeConfirmation(
          consumed.authUserId,
        );
        if (synchronized.ok) return { status: "confirmed" as const };

        const repaired = await repository.repairAuthProjection(
          consumed.authUserId,
        );
        if (!repaired.ok) return { status: "unavailable" as const };
        const retried = await repository.synchronizeConfirmation(
          consumed.authUserId,
        );
        return retried.ok
          ? ({ status: "confirmed" } as const)
          : ({ status: "unavailable" } as const);
      } catch {
        return { status: "unavailable" as const };
      }
    },
  };
}

export type RegistrationService = ReturnType<typeof createRegistrationService>;
