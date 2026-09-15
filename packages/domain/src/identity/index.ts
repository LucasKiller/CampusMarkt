const SECOND_MS = 1_000;

export const IDENTITY_POLICY_SECONDS = {
  confirmation: 24 * 60 * 60,
  recovery: 30 * 60,
  session: 30 * 24 * 60 * 60,
  recentAuthentication: 10 * 60,
  avatarCleanup: 24 * 60 * 60,
  deletionPurge: 30 * 24 * 60 * 60,
} as const;

export type IdentityState =
  | "active_unconfirmed"
  | "active_confirmed"
  | "deletion_pending"
  | "missing"
  | "revoked"
  | "expired";

export type IdentityCommand = "confirm_email" | "request_deletion";

export type TransitionResult =
  | {
      ok: true;
      changed: boolean;
      state: "active_confirmed" | "deletion_pending";
    }
  | { ok: false; state: IdentityState; reason: "invalid_transition" };

export type AvatarFallback =
  { kind: "initials"; value: string } | { kind: "neutral" };

export function canParticipate(
  state: IdentityState,
  emailConfirmed: boolean,
): boolean {
  return state === "active_confirmed" && emailConfirmed;
}

export function transitionIdentity(
  current: IdentityState,
  command: IdentityCommand,
): TransitionResult {
  if (command === "confirm_email") {
    if (current === "active_unconfirmed") {
      return { ok: true, changed: true, state: "active_confirmed" };
    }

    if (current === "active_confirmed") {
      return { ok: true, changed: false, state: current };
    }
  }

  if (command === "request_deletion") {
    if (current === "active_confirmed") {
      return { ok: true, changed: true, state: "deletion_pending" };
    }

    if (current === "deletion_pending") {
      return { ok: true, changed: false, state: current };
    }
  }

  return { ok: false, state: current, reason: "invalid_transition" };
}

function addSeconds(value: Date, seconds: number): Date {
  return new Date(value.getTime() + seconds * SECOND_MS);
}

export function confirmationExpiresAt(issuedAt: Date): Date {
  return addSeconds(issuedAt, IDENTITY_POLICY_SECONDS.confirmation);
}

export function recoveryExpiresAt(issuedAt: Date): Date {
  return addSeconds(issuedAt, IDENTITY_POLICY_SECONDS.recovery);
}

export function sessionExpiresAt(issuedAt: Date): Date {
  return addSeconds(issuedAt, IDENTITY_POLICY_SECONDS.session);
}

export function purgeDueAt(requestedAt: Date): Date {
  return addSeconds(requestedAt, IDENTITY_POLICY_SECONDS.deletionPurge);
}

export function avatarCleanupDueAt(completedAt: Date): Date {
  return addSeconds(completedAt, IDENTITY_POLICY_SECONDS.avatarCleanup);
}

export function isWithinRecentAuthentication(
  passwordVerifiedAt: Date,
  now: Date,
): boolean {
  const age = now.getTime() - passwordVerifiedAt.getTime();

  return (
    age >= 0 && age <= IDENTITY_POLICY_SECONDS.recentAuthentication * SECOND_MS
  );
}

export function isBeforeExpiry(now: Date, expiresAt: Date): boolean {
  return now.getTime() < expiresAt.getTime();
}

export function isSessionWithinLifetime(issuedAt: Date, now: Date): boolean {
  return (
    now.getTime() >= issuedAt.getTime() &&
    isBeforeExpiry(now, sessionExpiresAt(issuedAt))
  );
}

export function avatarFallback(displayName: string): AvatarFallback {
  const initials = displayName
    .trim()
    .split(/\s+/u)
    .map((part) =>
      Array.from(part).find((character) => /[\p{L}\p{N}]/u.test(character)),
    )
    .filter((character): character is string => character !== undefined)
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase();

  return initials.length > 0
    ? { kind: "initials", value: initials }
    : { kind: "neutral" };
}
