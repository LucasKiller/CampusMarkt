import "server-only";

import { createHmac } from "node:crypto";

const EVENT_TYPES = [
  "registration",
  "confirmation_resend",
  "email_confirmation",
  "sign_in",
  "logout",
  "logout_all",
  "password_recovery",
  "password_reset",
  "account_deletion",
] as const;

const OUTCOMES = [
  "allowed",
  "denied",
  "succeeded",
  "failed",
  "unavailable",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

type RepositoryResult =
  { ok: true; value: unknown } | { ok: false; code?: string };

type SecurityRepository = {
  consumeRateLimits(input: {
    action: string;
    subjectHash: string;
    ipHash: string;
  }): Promise<RepositoryResult>;
  appendSecurityEvent(input: {
    authUserId: string | null;
    subjectHash: string | null;
    ipHash: string | null;
    eventType: string;
    outcome: string;
    correlationId: string;
  }): Promise<RepositoryResult>;
};

type AuditInput = {
  authUserId: string | null;
  subjectHash: string | null;
  ipHash: string | null;
  eventType: string;
  outcome: string;
  correlationId: string;
};

type EnforceInput = {
  action: EventType;
  normalizedIdentity: string;
  trustedClientIp: string;
  correlationId: string;
};

const BYTEA_SHA256 = /^\\x[0-9a-f]{64}$/u;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function includes<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.includes(value);
}

function validNullableHash(value: string | null) {
  return value === null || BYTEA_SHA256.test(value);
}

function parseDecision(value: unknown) {
  if (!isRecord(value) || typeof value.allowed !== "boolean") return null;
  if (value.allowed) return { allowed: true as const };
  if (
    typeof value.retry_after_seconds !== "number" ||
    !Number.isFinite(value.retry_after_seconds)
  ) {
    return null;
  }
  return {
    allowed: false as const,
    retryAfterSeconds: Math.max(
      1,
      Math.min(3_600, Math.ceil(value.retry_after_seconds)),
    ),
  };
}

export function createIdentitySecurity({
  pepper,
  repository,
}: {
  pepper: string;
  repository: SecurityRepository;
}) {
  function fingerprint(kind: "identity" | "ip", value: string) {
    return `\\x${createHmac("sha256", pepper)
      .update(`campusmarkt:${kind}:`)
      .update(value)
      .digest("hex")}`;
  }

  function fingerprintIdentity(identity: string) {
    return fingerprint("identity", identity.trim().toLowerCase());
  }

  function fingerprintClientIp(input: {
    trustedClientIp: string;
    headers?: Readonly<Record<string, string>>;
  }) {
    return fingerprint("ip", input.trustedClientIp.trim());
  }

  async function audit(input: AuditInput) {
    if (
      !includes(EVENT_TYPES, input.eventType) ||
      !includes(OUTCOMES, input.outcome) ||
      !validNullableHash(input.subjectHash) ||
      !validNullableHash(input.ipHash) ||
      !UUID.test(input.correlationId) ||
      (input.authUserId !== null && !UUID.test(input.authUserId))
    ) {
      return { status: "rejected" as const };
    }

    try {
      const result = await repository.appendSecurityEvent({
        authUserId: input.authUserId,
        subjectHash: input.subjectHash,
        ipHash: input.ipHash,
        eventType: input.eventType,
        outcome: input.outcome,
        correlationId: input.correlationId,
      });
      return result.ok
        ? ({ status: "recorded" } as const)
        : ({ status: "unavailable" } as const);
    } catch {
      return { status: "unavailable" as const };
    }
  }

  async function enforce<T>(input: EnforceInput, operation: () => Promise<T>) {
    const subjectHash = fingerprintIdentity(input.normalizedIdentity);
    const ipHash = fingerprintClientIp({
      trustedClientIp: input.trustedClientIp,
    });
    let result: RepositoryResult;

    try {
      result = await repository.consumeRateLimits({
        action: input.action,
        subjectHash,
        ipHash,
      });
    } catch {
      await audit({
        authUserId: null,
        subjectHash,
        ipHash,
        eventType: input.action,
        outcome: "unavailable",
        correlationId: input.correlationId,
      });
      return { status: "unavailable" as const };
    }

    const decision = result.ok ? parseDecision(result.value) : null;
    if (!decision) {
      await audit({
        authUserId: null,
        subjectHash,
        ipHash,
        eventType: input.action,
        outcome: "unavailable",
        correlationId: input.correlationId,
      });
      return { status: "unavailable" as const };
    }

    if (!decision.allowed) {
      await audit({
        authUserId: null,
        subjectHash,
        ipHash,
        eventType: input.action,
        outcome: "denied",
        correlationId: input.correlationId,
      });
      return {
        status: "rate_limited" as const,
        retryAfterSeconds: decision.retryAfterSeconds,
      };
    }

    await audit({
      authUserId: null,
      subjectHash,
      ipHash,
      eventType: input.action,
      outcome: "allowed",
      correlationId: input.correlationId,
    });
    return { status: "allowed" as const, value: await operation() };
  }

  return { audit, enforce, fingerprintClientIp, fingerprintIdentity };
}

export type IdentitySecurity = ReturnType<typeof createIdentitySecurity>;
