export const REPORT_REASONS = [
  "prohibited_content",
  "fraud_or_scam",
  "harassment_or_abuse",
  "unsupported_content",
  "privacy_violation",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGET_TYPES = ["listing", "user"] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = [
  "pending",
  "reviewed",
  "dismissed",
  "actioned",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export interface ReportConfirmationDTO {
  reportId: string;
  status: "pending";
  createdAt: string;
}

export interface UserBlockDTO {
  id: string;
  blockedId: string;
  blockedName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface BlockUserRequest {
  blockedId: string;
}

export interface BlockUserResponse {
  blockId: string;
  blockedId: string;
  createdAt: string;
}

export interface UnblockUserResponse {
  unblockedId: string;
  success: boolean;
}

export interface BlockedUsersListResponse {
  items: UserBlockDTO[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

export function isReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" && REPORT_REASONS.includes(value as ReportReason)
  );
}

export function isReportTargetType(value: unknown): value is ReportTargetType {
  return (
    typeof value === "string" &&
    REPORT_TARGET_TYPES.includes(value as ReportTargetType)
  );
}

export function isCreateReportRequest(
  value: unknown,
): value is CreateReportRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["targetType", "targetId", "reason"], ["details"])
  ) {
    return false;
  }

  if (
    !isReportTargetType(value.targetType) ||
    typeof value.targetId !== "string" ||
    !UUID_PATTERN.test(value.targetId) ||
    !isReportReason(value.reason)
  ) {
    return false;
  }

  if (value.details !== undefined && typeof value.details !== "string") {
    return false;
  }

  return true;
}

export function isReportConfirmationDTO(
  value: unknown,
): value is ReportConfirmationDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["reportId", "status", "createdAt"])
  ) {
    return false;
  }

  return (
    typeof value.reportId === "string" &&
    UUID_PATTERN.test(value.reportId) &&
    value.status === "pending" &&
    isValidIsoDate(value.createdAt)
  );
}

export function isUserBlockDTO(value: unknown): value is UserBlockDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["id", "blockedId", "blockedName", "createdAt"],
      ["avatarUrl"],
    )
  ) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.blockedId !== "string" ||
    !UUID_PATTERN.test(value.blockedId) ||
    typeof value.blockedName !== "string" ||
    value.blockedName.trim().length === 0 ||
    !isValidIsoDate(value.createdAt)
  ) {
    return false;
  }

  if (
    value.avatarUrl !== undefined &&
    value.avatarUrl !== null &&
    typeof value.avatarUrl !== "string"
  ) {
    return false;
  }

  return true;
}

export function isBlockUserRequest(value: unknown): value is BlockUserRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["blockedId"])) {
    return false;
  }

  return (
    typeof value.blockedId === "string" && UUID_PATTERN.test(value.blockedId)
  );
}
