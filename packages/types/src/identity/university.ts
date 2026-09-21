export interface UniversityBadge {
  universityId: string;
  badgeLabel: string;
}

export interface InitiateUniversityVerificationRequest {
  institutionalEmail: string;
}

export interface InitiateUniversityVerificationResponse {
  status: "accepted";
}

export interface ConfirmUniversityVerificationRequest {
  token: string;
}

export interface ConfirmUniversityVerificationResponse {
  status: "verified";
  universityId: string;
  badgeLabel: string;
  expiresAt: string;
}

export type UniversityVerificationAccountStatus =
  "none" | "pending" | "verified" | "expired";

export interface UniversityVerificationStatusResponse {
  status: UniversityVerificationAccountStatus;
  universityId: string | null;
  badgeLabel: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
}

export interface DisconnectUniversityVerificationResponse {
  status: "disconnected";
}

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

export function isUniversityBadge(value: unknown): value is UniversityBadge {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["universityId", "badgeLabel"])
  ) {
    return false;
  }
  return (
    typeof value.universityId === "string" &&
    value.universityId.length > 0 &&
    typeof value.badgeLabel === "string" &&
    value.badgeLabel.length > 0
  );
}

export function isInitiateUniversityVerificationRequest(
  value: unknown,
): value is InitiateUniversityVerificationRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["institutionalEmail"])) {
    return false;
  }
  return (
    typeof value.institutionalEmail === "string" &&
    value.institutionalEmail.trim().length > 0
  );
}

export function isConfirmUniversityVerificationRequest(
  value: unknown,
): value is ConfirmUniversityVerificationRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["token"])) {
    return false;
  }
  return typeof value.token === "string" && value.token.trim().length > 0;
}

export function isConfirmUniversityVerificationResponse(
  value: unknown,
): value is ConfirmUniversityVerificationResponse {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["status", "universityId", "badgeLabel", "expiresAt"])
  ) {
    return false;
  }
  if (value.status !== "verified") {
    return false;
  }
  if (
    typeof value.universityId !== "string" ||
    value.universityId.length === 0 ||
    typeof value.badgeLabel !== "string" ||
    value.badgeLabel.length === 0 ||
    typeof value.expiresAt !== "string"
  ) {
    return false;
  }
  return !Number.isNaN(new Date(value.expiresAt).getTime());
}

export function isUniversityVerificationStatusResponse(
  value: unknown,
): value is UniversityVerificationStatusResponse {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "status",
      "universityId",
      "badgeLabel",
      "expiresAt",
      "daysRemaining",
    ])
  ) {
    return false;
  }

  const validStatuses: readonly UniversityVerificationAccountStatus[] = [
    "none",
    "pending",
    "verified",
    "expired",
  ];
  if (
    typeof value.status !== "string" ||
    !validStatuses.includes(value.status as UniversityVerificationAccountStatus)
  ) {
    return false;
  }

  const validUniId =
    value.universityId === null ||
    (typeof value.universityId === "string" && value.universityId.length > 0);
  const validBadgeLabel =
    value.badgeLabel === null ||
    (typeof value.badgeLabel === "string" && value.badgeLabel.length > 0);
  const validExpiresAt =
    value.expiresAt === null ||
    (typeof value.expiresAt === "string" &&
      !Number.isNaN(new Date(value.expiresAt).getTime()));
  const validDaysRemaining =
    value.daysRemaining === null ||
    (typeof value.daysRemaining === "number" &&
      Number.isInteger(value.daysRemaining) &&
      value.daysRemaining >= 0);

  return Boolean(
    validUniId && validBadgeLabel && validExpiresAt && validDaysRemaining,
  );
}
