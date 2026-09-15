export const IDENTITY_API_FAILURE_CODES = [
  "INVALID_INPUT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
  "CONFLICT",
] as const;

export type IdentityApiFailureCode =
  (typeof IDENTITY_API_FAILURE_CODES)[number];

export type FieldErrors = Record<string, string[]>;

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  correlationId: string;
}

export interface ApiFailure {
  ok: false;
  code: IdentityApiFailureCode;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
  correlationId: string;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface PublicProfile {
  publicId: string;
  displayName: string;
  joinedMonth: string;
  avatarUrl: string | null;
}

export interface GenericAcceptedResult {
  status: "accepted";
}

export type ConfirmationResult =
  { status: "confirmed" } | { status: "invalid_link" };

export type SessionResult =
  | {
      status: "authenticated";
      returnTo: string;
      expiresAt: string;
    }
  | { status: "signed_out" };

export type ProfileMutationResult =
  { status: "updated"; profile: PublicProfile } | { status: "conflict" };

export type DeletionResult =
  { status: "deletion_pending" } | { status: "reauthentication_required" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const JOINED_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/u;
const AVATAR_URL_PATTERN = /^\/media\/avatars\/[0-9a-f-]{36}\/[1-9]\d*\.webp$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);

  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isCorrelationId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (messages) =>
        Array.isArray(messages) &&
        messages.length > 0 &&
        messages.every((message) => typeof message === "string"),
    )
  );
}

export function isPublicProfile(value: unknown): value is PublicProfile {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "publicId",
      "displayName",
      "joinedMonth",
      "avatarUrl",
    ])
  ) {
    return false;
  }

  return (
    typeof value.publicId === "string" &&
    UUID_PATTERN.test(value.publicId) &&
    typeof value.displayName === "string" &&
    typeof value.joinedMonth === "string" &&
    JOINED_MONTH_PATTERN.test(value.joinedMonth) &&
    (value.avatarUrl === null ||
      (typeof value.avatarUrl === "string" &&
        AVATAR_URL_PATTERN.test(value.avatarUrl)))
  );
}

export function isApiSuccess(value: unknown): value is ApiSuccess<unknown> {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["ok", "data", "correlationId"]) &&
    value.ok === true &&
    isCorrelationId(value.correlationId)
  );
}

export function isApiFailure(value: unknown): value is ApiFailure {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["ok", "code", "correlationId"],
      ["fieldErrors", "retryAfterSeconds"],
    ) ||
    value.ok !== false ||
    typeof value.code !== "string" ||
    !IDENTITY_API_FAILURE_CODES.includes(
      value.code as IdentityApiFailureCode,
    ) ||
    !isCorrelationId(value.correlationId)
  ) {
    return false;
  }

  if (value.fieldErrors !== undefined && !isFieldErrors(value.fieldErrors)) {
    return false;
  }

  return (
    value.retryAfterSeconds === undefined ||
    (typeof value.retryAfterSeconds === "number" &&
      Number.isInteger(value.retryAfterSeconds) &&
      value.retryAfterSeconds > 0)
  );
}
