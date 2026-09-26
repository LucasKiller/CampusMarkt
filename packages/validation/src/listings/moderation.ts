import type {
  ExecuteModerationActionRequest,
  ModerationActionType,
  ReportTargetType,
} from "@campusmarkt/types";
import { isModerationActionType, isReportTargetType } from "@campusmarkt/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_REASON_LENGTH = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ModerationValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

const EXECUTE_ACTION_FIELDS = new Set([
  "reportId",
  "actionType",
  "targetType",
  "targetId",
  "reason",
]);

export function validateModeratorActionReason(
  reason: unknown,
): ModerationValidationResult<string> {
  if (typeof reason !== "string") {
    const msg = "Justification note must be a string.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { reason: [msg] },
    };
  }

  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    const msg = "A justification note is mandatory for moderation actions.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { reason: [msg] },
    };
  }

  const length = Array.from(trimmed).length;
  if (length > MAX_REASON_LENGTH) {
    const msg = `Justification note must not exceed ${MAX_REASON_LENGTH} characters.`;
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { reason: [msg] },
    };
  }

  return {
    ok: true,
    value: trimmed,
  };
}

export function validateModerationTargetId(
  id: unknown,
): ModerationValidationResult<string> {
  if (typeof id !== "string" || !UUID_PATTERN.test(id.trim())) {
    const msg = "Target ID must be a valid UUID.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { targetId: [msg] },
    };
  }

  return {
    ok: true,
    value: id.trim().toLowerCase(),
  };
}

export function validateReportId(
  id: unknown,
): ModerationValidationResult<string> {
  if (typeof id !== "string" || !UUID_PATTERN.test(id.trim())) {
    const msg = "Report ID must be a valid UUID.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { reportId: [msg] },
    };
  }

  return {
    ok: true,
    value: id.trim().toLowerCase(),
  };
}

export function validateExecuteModerationActionInput(
  input: unknown,
): ModerationValidationResult<ExecuteModerationActionRequest> {
  if (!isRecord(input)) {
    const msg = "Moderation action payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !EXECUTE_ACTION_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  if (!isModerationActionType(input.actionType)) {
    fieldErrors.actionType = [
      "Action type must be one of: dismiss_report, remove_listing, or suspend_user.",
    ];
  }

  if (!isReportTargetType(input.targetType)) {
    fieldErrors.targetType = [
      "Target type must be either 'listing' or 'user'.",
    ];
  }

  if (
    typeof input.targetId !== "string" ||
    !UUID_PATTERN.test(input.targetId.trim())
  ) {
    fieldErrors.targetId = ["Target ID must be a valid UUID."];
  }

  if (input.reportId !== undefined && input.reportId !== null) {
    if (
      typeof input.reportId !== "string" ||
      !UUID_PATTERN.test(input.reportId.trim())
    ) {
      fieldErrors.reportId = ["Report ID must be a valid UUID."];
    }
  }

  const reasonResult = validateModeratorActionReason(input.reason);
  if (!reasonResult.ok) {
    fieldErrors.reason = reasonResult.errors;
  }

  if (input.actionType === "remove_listing" && input.targetType !== "listing") {
    fieldErrors.targetType = [
      "Target type must be 'listing' when action is remove_listing.",
    ];
  }
  if (input.actionType === "suspend_user" && input.targetType !== "user") {
    fieldErrors.targetType = [
      "Target type must be 'user' when action is suspend_user.",
    ];
  }

  if (Object.keys(fieldErrors).length > 0) {
    const errors = Object.values(fieldErrors).flat();
    return {
      ok: false,
      errors,
      fieldErrors,
    };
  }

  const value: ExecuteModerationActionRequest = {
    actionType: input.actionType as ModerationActionType,
    targetType: input.targetType as ReportTargetType,
    targetId: (input.targetId as string).trim().toLowerCase(),
    reason: reasonResult.ok ? reasonResult.value : (input.reason as string),
    ...(input.reportId
      ? { reportId: (input.reportId as string).trim().toLowerCase() }
      : {}),
  };

  return {
    ok: true,
    value,
  };
}
