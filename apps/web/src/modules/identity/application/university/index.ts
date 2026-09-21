import { Buffer } from "node:buffer";
import {
  getSupportedUniversity,
  isUniversityVerificationActive,
} from "@campusmarkt/domain";
import type {
  ConfirmUniversityVerificationResponse,
  FieldErrors,
  UniversityVerificationStatusResponse,
} from "@campusmarkt/types";
import { validateInstitutionalEmail } from "@campusmarkt/validation";

import {
  renderUniversityVerificationEmail,
  type ConfirmedVerificationRecord,
  type UniversityRepository,
  type UniversityVerificationRecord,
} from "../../infrastructure/supabase/repository/university";

export type RequestContext = {
  trustedClientIp: string;
  correlationId: string;
};

export type UniversitySecurity = {
  fingerprintIdentity(identity: string): string;
  fingerprintClientIp(input: {
    trustedClientIp: string;
    headers?: Readonly<Record<string, string>>;
  }): string;
  enforce<T>(
    input: {
      action: "confirmation_resend";
      normalizedIdentity: string;
      trustedClientIp: string;
      correlationId: string;
    },
    operation: () => Promise<T>,
  ): Promise<
    | { status: "allowed"; value: T }
    | { status: "rate_limited"; retryAfterSeconds: number }
    | { status: "unavailable" }
  >;
  audit?(input: {
    authUserId: string | null;
    subjectHash: string | null;
    ipHash: string | null;
    eventType: string;
    outcome: string;
    correlationId: string;
  }): Promise<unknown>;
};

export type UniversityMailer = {
  send(mail: {
    recipient: string;
    subject: string;
    text: string;
    url: string;
  }): Promise<{ ok: boolean; code?: string }>;
};

export type UniversityVerificationDependencies = {
  security: UniversitySecurity;
  repository: UniversityRepository;
  mailer: UniversityMailer;
  origin: string;
  random?: (length: number) => Uint8Array;
  digest?: (value: Uint8Array) => Promise<Uint8Array>;
  now?: () => Date;
};

function defaultRandom(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

async function defaultDigest(value: Uint8Array): Promise<Uint8Array> {
  const input = new Uint8Array(value.byteLength);
  input.set(value);
  return new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", input.buffer),
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createUniversityVerificationService({
  security,
  repository,
  mailer,
  origin,
  random = defaultRandom,
  digest = defaultDigest,
  now = () => new Date(),
}: UniversityVerificationDependencies) {
  async function computeTokenHash(rawToken: string): Promise<string> {
    const buffer = await digest(new TextEncoder().encode(rawToken));
    return Buffer.from(buffer).toString("hex");
  }

  return {
    async initiateVerification(
      authUserId: string,
      input: { institutionalEmail: string },
      context: RequestContext,
    ): Promise<
      | { status: "accepted" }
      | { status: "invalid_input"; fieldErrors: FieldErrors }
      | { status: "conflict" }
      | { status: "rate_limited"; retryAfterSeconds: number }
      | { status: "account_unavailable" }
      | { status: "unavailable" }
    > {
      const validated = validateInstitutionalEmail(input.institutionalEmail);
      if (!validated.ok) {
        return {
          status: "invalid_input",
          fieldErrors: validated.fieldErrors,
        };
      }

      const normalizedEmail = validated.value.email;
      const universityId = validated.value.universityId;
      const emailHash = security.fingerprintIdentity(normalizedEmail);
      const ipHash = security.fingerprintClientIp({
        trustedClientIp: context.trustedClientIp,
      });

      const rateLimitResult = await security.enforce(
        {
          action: "confirmation_resend",
          normalizedIdentity: authUserId,
          trustedClientIp: context.trustedClientIp,
          correlationId: context.correlationId,
        },
        async () => {
          let rawToken: string;
          let tokenHash: string;

          try {
            rawToken = Buffer.from(random(32)).toString("base64url");
            tokenHash = await computeTokenHash(rawToken);
          } catch {
            return { outcome: "unavailable" as const };
          }

          const repoResult = await repository.initiateUniversityVerification({
            authUserId,
            universityId,
            emailHash,
            tokenHash,
          });

          if (!repoResult.ok) {
            if (repoResult.code === "CONFLICT") {
              return { outcome: "conflict" as const };
            }
            if (repoResult.code === "ACCOUNT_UNAVAILABLE") {
              return { outcome: "account_unavailable" as const };
            }
            return { outcome: "unavailable" as const };
          }

          const actionUrl = `${origin}/auth/action/university_verification?token=${rawToken}`;
          const uniDefinition = getSupportedUniversity(universityId);
          const emailContent = renderUniversityVerificationEmail({
            actionUrl,
            universityName: uniDefinition?.name,
          });

          const delivery = await mailer.send({
            recipient: normalizedEmail,
            subject: emailContent.subject,
            text: emailContent.text,
            url: actionUrl,
          });

          if (!delivery.ok) {
            if (security.audit) {
              await security.audit({
                authUserId,
                subjectHash: emailHash,
                ipHash,
                eventType: "confirmation_resend",
                outcome: "dependency_failure",
                correlationId: context.correlationId,
              });
            }
            return { outcome: "unavailable" as const };
          }

          if (security.audit) {
            await security.audit({
              authUserId,
              subjectHash: emailHash,
              ipHash,
              eventType: "confirmation_resend",
              outcome: "accepted",
              correlationId: context.correlationId,
            });
          }

          return { outcome: "accepted" as const };
        },
      );

      if (rateLimitResult.status === "rate_limited") {
        return {
          status: "rate_limited",
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        };
      }

      if (rateLimitResult.status !== "allowed") {
        return { status: "unavailable" };
      }

      const outcome = rateLimitResult.value.outcome;
      if (outcome === "conflict") {
        return { status: "conflict" };
      }
      if (outcome === "account_unavailable") {
        return { status: "account_unavailable" };
      }
      if (outcome === "unavailable") {
        return { status: "unavailable" };
      }

      return { status: "accepted" };
    },

    async confirmVerification(
      rawToken: string,
      context: RequestContext,
    ): Promise<
      | ({
          status: "verified";
        } & ConfirmUniversityVerificationResponse)
      | { status: "conflict" }
      | { status: "invalid_link" }
      | { status: "account_unavailable" }
      | { status: "unavailable" }
    > {
      const trimmedToken = rawToken.trim();
      if (!trimmedToken) {
        return { status: "invalid_link" };
      }

      let tokenHash: string;
      try {
        tokenHash = await computeTokenHash(trimmedToken);
      } catch {
        return { status: "invalid_link" };
      }

      const repoResult = await repository.confirmUniversityVerification({
        tokenHash,
      });

      const ipHash = security.fingerprintClientIp({
        trustedClientIp: context.trustedClientIp,
      });

      if (!repoResult.ok) {
        if (repoResult.code === "CONFLICT") {
          if (security.audit) {
            await security.audit({
              authUserId: null,
              subjectHash: null,
              ipHash,
              eventType: "confirmation",
              outcome: "conflict",
              correlationId: context.correlationId,
            });
          }
          return { status: "conflict" };
        }

        if (repoResult.code === "ACCOUNT_UNAVAILABLE") {
          if (security.audit) {
            await security.audit({
              authUserId: null,
              subjectHash: null,
              ipHash,
              eventType: "confirmation",
              outcome: "denied",
              correlationId: context.correlationId,
            });
          }
          return { status: "account_unavailable" };
        }

        if (repoResult.code === "INVALID_OR_EXPIRED_TOKEN") {
          if (security.audit) {
            await security.audit({
              authUserId: null,
              subjectHash: null,
              ipHash,
              eventType: "confirmation",
              outcome: "invalid",
              correlationId: context.correlationId,
            });
          }
          return { status: "invalid_link" };
        }

        return { status: "unavailable" };
      }

      const record: ConfirmedVerificationRecord = repoResult.value;
      const uni = getSupportedUniversity(record.universityId);
      const badgeLabel = uni?.badgeLabel ?? "TU Braunschweig";

      if (security.audit) {
        await security.audit({
          authUserId: record.authUserId,
          subjectHash: null,
          ipHash,
          eventType: "confirmation",
          outcome: "succeeded",
          correlationId: context.correlationId,
        });
      }

      return {
        status: "verified",
        universityId: record.universityId,
        badgeLabel,
        expiresAt: record.expiresAt,
      };
    },

    async disconnectVerification(
      authUserId: string,
      context: RequestContext,
    ): Promise<{ status: "disconnected" } | { status: "unavailable" }> {
      const repoResult =
        await repository.disconnectUniversityVerification(authUserId);

      const ipHash = security.fingerprintClientIp({
        trustedClientIp: context.trustedClientIp,
      });

      if (!repoResult.ok) {
        return { status: "unavailable" };
      }

      if (security.audit) {
        await security.audit({
          authUserId,
          subjectHash: null,
          ipHash,
          eventType: "confirmation",
          outcome: "succeeded",
          correlationId: context.correlationId,
        });
      }

      return { status: "disconnected" };
    },

    async getVerificationStatus(
      authUserId: string,
    ): Promise<
      | { ok: true; value: UniversityVerificationStatusResponse }
      | { ok: false; code: "DEPENDENCY_UNAVAILABLE" }
    > {
      const repoResult = await repository.getVerificationRecord(authUserId);
      if (!repoResult.ok) {
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }

      const record: UniversityVerificationRecord | null = repoResult.value;
      if (!record) {
        return {
          ok: true,
          value: {
            status: "none",
            universityId: null,
            badgeLabel: null,
            expiresAt: null,
            daysRemaining: null,
          },
        };
      }

      const currentTime = now();
      if (record.status === "pending") {
        return {
          ok: true,
          value: {
            status: "pending",
            universityId: record.universityId,
            badgeLabel: null,
            expiresAt: null,
            daysRemaining: null,
          },
        };
      }

      if (record.status === "verified") {
        const isActive = isUniversityVerificationActive(record, currentTime);
        if (isActive && record.expiresAt) {
          const expiryDate = new Date(record.expiresAt);
          const daysRemaining = Math.max(
            0,
            Math.ceil(
              (expiryDate.getTime() - currentTime.getTime()) / MS_PER_DAY,
            ),
          );
          const uni = getSupportedUniversity(record.universityId);
          return {
            ok: true,
            value: {
              status: "verified",
              universityId: record.universityId,
              badgeLabel: uni?.badgeLabel ?? "TU Braunschweig",
              expiresAt: record.expiresAt,
              daysRemaining,
            },
          };
        }

        return {
          ok: true,
          value: {
            status: "expired",
            universityId: record.universityId,
            badgeLabel: null,
            expiresAt: record.expiresAt,
            daysRemaining: 0,
          },
        };
      }

      return {
        ok: true,
        value: {
          status: "none",
          universityId: null,
          badgeLabel: null,
          expiresAt: null,
          daysRemaining: null,
        },
      };
    },
  };
}

export type UniversityVerificationService = ReturnType<
  typeof createUniversityVerificationService
>;
