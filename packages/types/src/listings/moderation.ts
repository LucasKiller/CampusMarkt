import {
  REPORT_STATUSES,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from "./safety.ts";
import { isReportTargetType } from "./safety.ts";

export const MODERATION_ACTION_TYPES = [
  "dismiss_report",
  "remove_listing",
  "suspend_user",
] as const;

export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number];

export interface ModerationQueueItemDTO {
  id: string;
  reporterId?: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason | string;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  listingTitle?: string;
  listingStatus?: string;
  userName?: string;
}

export interface ModerationActionDTO {
  id: string;
  moderatorId: string;
  reportId?: string | null;
  actionType: ModerationActionType;
  targetType: ReportTargetType | string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface ExecuteModerationActionRequest {
  reportId?: string;
  actionType: ModerationActionType;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export interface ExecuteModerationActionResponse {
  success: boolean;
  status: string;
}

export interface ModerationStatusDTO {
  isModerator: boolean;
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

export function isModerationActionType(
  value: unknown,
): value is ModerationActionType {
  return (
    typeof value === "string" &&
    MODERATION_ACTION_TYPES.includes(value as ModerationActionType)
  );
}

export function isModerationQueueItemDTO(
  value: unknown,
): value is ModerationQueueItemDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["id", "targetType", "targetId", "reason", "status", "createdAt"],
      ["reporterId", "details", "listingTitle", "listingStatus", "userName"],
    )
  ) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    !isReportTargetType(value.targetType) ||
    typeof value.targetId !== "string" ||
    !UUID_PATTERN.test(value.targetId) ||
    typeof value.reason !== "string" ||
    value.reason.trim().length === 0 ||
    typeof value.status !== "string" ||
    !REPORT_STATUSES.includes(value.status as ReportStatus) ||
    !isValidIsoDate(value.createdAt)
  ) {
    return false;
  }

  if (
    value.reporterId !== undefined &&
    (typeof value.reporterId !== "string" ||
      !UUID_PATTERN.test(value.reporterId))
  ) {
    return false;
  }

  if (value.details !== undefined && typeof value.details !== "string") {
    return false;
  }
  if (
    value.listingTitle !== undefined &&
    typeof value.listingTitle !== "string"
  ) {
    return false;
  }
  if (
    value.listingStatus !== undefined &&
    typeof value.listingStatus !== "string"
  ) {
    return false;
  }
  if (value.userName !== undefined && typeof value.userName !== "string") {
    return false;
  }

  return true;
}

export function isModerationActionDTO(
  value: unknown,
): value is ModerationActionDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "id",
        "moderatorId",
        "actionType",
        "targetType",
        "targetId",
        "reason",
        "createdAt",
      ],
      ["reportId"],
    )
  ) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.moderatorId !== "string" ||
    !UUID_PATTERN.test(value.moderatorId) ||
    !isModerationActionType(value.actionType) ||
    typeof value.targetType !== "string" ||
    value.targetType.length === 0 ||
    typeof value.targetId !== "string" ||
    !UUID_PATTERN.test(value.targetId) ||
    typeof value.reason !== "string" ||
    value.reason.trim().length === 0 ||
    !isValidIsoDate(value.createdAt)
  ) {
    return false;
  }

  if (value.reportId !== undefined && value.reportId !== null) {
    if (
      typeof value.reportId !== "string" ||
      !UUID_PATTERN.test(value.reportId)
    ) {
      return false;
    }
  }

  return true;
}

export function isExecuteModerationActionRequest(
  value: unknown,
): value is ExecuteModerationActionRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["actionType", "targetType", "targetId", "reason"],
      ["reportId"],
    )
  ) {
    return false;
  }

  if (
    !isModerationActionType(value.actionType) ||
    !isReportTargetType(value.targetType) ||
    typeof value.targetId !== "string" ||
    !UUID_PATTERN.test(value.targetId) ||
    typeof value.reason !== "string" ||
    value.reason.trim().length === 0 ||
    value.reason.length > 1000
  ) {
    return false;
  }

  if (value.reportId !== undefined && value.reportId !== null) {
    if (
      typeof value.reportId !== "string" ||
      !UUID_PATTERN.test(value.reportId)
    ) {
      return false;
    }
  }

  return true;
}

export function isModerationStatusDTO(
  value: unknown,
): value is ModerationStatusDTO {
  if (!isRecord(value) || !hasExactKeys(value, ["isModerator"])) {
    return false;
  }
  return typeof value.isModerator === "boolean";
}
