import type {
  BlockUserRequest,
  CreateReportRequest,
  ReportReason,
  ReportTargetType,
} from "@campusmarkt/types";
import { isReportReason, isReportTargetType } from "@campusmarkt/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_DETAILS_LENGTH = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type SafetyValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

const CREATE_REPORT_FIELDS = new Set([
  "targetType",
  "targetId",
  "reason",
  "details",
]);

export function validateReportTargetId(
  id: unknown,
): SafetyValidationResult<string> {
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

export function validateBlockedUserId(
  id: unknown,
): SafetyValidationResult<string> {
  if (typeof id !== "string" || !UUID_PATTERN.test(id.trim())) {
    const msg = "Blocked user ID must be a valid UUID.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { blockedId: [msg] },
    };
  }

  return {
    ok: true,
    value: id.trim().toLowerCase(),
  };
}

export function validateCreateReportInput(
  input: unknown,
): SafetyValidationResult<CreateReportRequest> {
  if (!isRecord(input)) {
    const msg = "Report submission payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !CREATE_REPORT_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
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

  if (!isReportReason(input.reason)) {
    fieldErrors.reason = ["Invalid report reason specified."];
  }

  let sanitizedDetails: string | undefined;
  if (input.details !== undefined && input.details !== null) {
    if (typeof input.details !== "string") {
      fieldErrors.details = ["Details must be a string."];
    } else {
      const trimmed = input.details.trim();
      const length = Array.from(trimmed).length;
      if (length > MAX_DETAILS_LENGTH) {
        fieldErrors.details = [
          `Details must not exceed ${MAX_DETAILS_LENGTH} characters.`,
        ];
      } else {
        sanitizedDetails = trimmed.length > 0 ? trimmed : undefined;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const errors = Object.values(fieldErrors).flat();
    return {
      ok: false,
      errors,
      fieldErrors,
    };
  }

  const value: CreateReportRequest = {
    targetType: input.targetType as ReportTargetType,
    targetId: (input.targetId as string).trim().toLowerCase(),
    reason: input.reason as ReportReason,
    ...(sanitizedDetails !== undefined ? { details: sanitizedDetails } : {}),
  };

  return {
    ok: true,
    value,
  };
}

const BLOCK_USER_FIELDS = new Set(["blockedId"]);

export function validateBlockUserInput(
  input: unknown,
): SafetyValidationResult<BlockUserRequest> {
  if (!isRecord(input)) {
    const msg = "Block user payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !BLOCK_USER_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  if (
    typeof input.blockedId !== "string" ||
    !UUID_PATTERN.test(input.blockedId.trim())
  ) {
    fieldErrors.blockedId = ["Blocked ID must be a valid UUID."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    const errors = Object.values(fieldErrors).flat();
    return {
      ok: false,
      errors,
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      blockedId: (input.blockedId as string).trim().toLowerCase(),
    },
  };
}
