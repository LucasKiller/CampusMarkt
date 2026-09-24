import type {
  GetMessagesQuery,
  GetOrCreateConversationRequest,
  SendMessageRequest,
} from "@campusmarkt/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidIsoDate(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function isValidCursorOrUuid(value: string): boolean {
  return isValidIsoDate(value) || UUID_PATTERN.test(value.trim());
}

export type MessagingValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errors: string[];
      fieldErrors: Record<string, string[]>;
    };

const SEND_MESSAGE_FIELDS = new Set(["content"]);

export function validateSendMessageInput(
  input: unknown,
): MessagingValidationResult<SendMessageRequest> {
  if (!isRecord(input)) {
    const msg = "Message payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !SEND_MESSAGE_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  if (typeof input.content !== "string") {
    fieldErrors.content = ["Message content must be a string."];
  } else {
    const trimmed = input.content.trim();
    if (trimmed.length === 0) {
      fieldErrors.content = ["Message content cannot be empty."];
    } else if (input.content.length > 2000 || trimmed.length > 2000) {
      fieldErrors.content = ["Message content cannot exceed 2000 characters."];
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      content: (input.content as string).trim(),
    },
  };
}

const ALLOWED_MESSAGES_QUERY_KEYS = new Set([
  "before",
  "after",
  "limit",
  "cursor",
]);

export interface ValidatedGetMessagesQuery extends GetMessagesQuery {
  limit: number;
}

export function validateGetMessagesQuery(
  input: unknown,
): MessagingValidationResult<ValidatedGetMessagesQuery> {
  if (!isRecord(input)) {
    const msg = "Query parameters must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !ALLOWED_MESSAGES_QUERY_KEYS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Query parameters contain unknown fields."];
  }

  let before: string | undefined;
  if (
    input.before !== undefined &&
    input.before !== null &&
    input.before !== ""
  ) {
    if (
      typeof input.before !== "string" ||
      !isValidCursorOrUuid(input.before)
    ) {
      fieldErrors.before = [
        "Before parameter must be a valid ISO timestamp or UUID.",
      ];
    } else {
      before = input.before.trim();
    }
  }

  let after: string | undefined;
  if (input.after !== undefined && input.after !== null && input.after !== "") {
    if (typeof input.after !== "string" || !isValidCursorOrUuid(input.after)) {
      fieldErrors.after = [
        "After parameter must be a valid ISO timestamp or UUID.",
      ];
    } else {
      after = input.after.trim();
    }
  }

  if (
    input.cursor !== undefined &&
    input.cursor !== null &&
    input.cursor !== ""
  ) {
    if (
      typeof input.cursor !== "string" ||
      !isValidCursorOrUuid(input.cursor)
    ) {
      fieldErrors.cursor = [
        "Cursor parameter must be a valid ISO timestamp or UUID.",
      ];
    } else if (before === undefined) {
      before = input.cursor.trim();
    }
  }

  let limit = 50;
  if (input.limit !== undefined && input.limit !== null && input.limit !== "") {
    let parsedLimit: number;
    if (typeof input.limit === "number") {
      parsedLimit = input.limit;
    } else if (typeof input.limit === "string") {
      parsedLimit = Number.parseInt(input.limit, 10);
    } else {
      parsedLimit = Number.NaN;
    }

    if (
      Number.isNaN(parsedLimit) ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      fieldErrors.limit = ["Limit must be an integer between 1 and 100."];
    } else {
      limit = parsedLimit;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      before,
      after,
      limit,
    },
  };
}

const GET_OR_CREATE_FIELDS = new Set(["listingId"]);

export function validateGetOrCreateConversationInput(
  input: unknown,
): MessagingValidationResult<GetOrCreateConversationRequest> {
  if (!isRecord(input)) {
    const msg = "Payload must be an object.";
    return {
      ok: false,
      errors: [msg],
      fieldErrors: { _form: [msg] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (k) => !GET_OR_CREATE_FIELDS.has(k),
  );
  if (unknownFields.length > 0) {
    fieldErrors._form = ["Payload contains unknown fields."];
  }

  if (
    typeof input.listingId !== "string" ||
    !UUID_PATTERN.test(input.listingId.trim())
  ) {
    fieldErrors.listingId = ["Listing ID must be a valid UUID."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      errors: Object.values(fieldErrors).flat(),
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      listingId: (input.listingId as string).trim().toLowerCase(),
    },
  };
}

export function validateConversationIdParam(
  input: unknown,
): MessagingValidationResult<string> {
  let candidate: unknown = input;

  if (isRecord(input)) {
    candidate = input.conversationId ?? input.id;
  }

  if (typeof candidate !== "string" || !UUID_PATTERN.test(candidate.trim())) {
    const errorMsg = "Conversation ID must be a valid UUID.";
    return {
      ok: false,
      errors: [errorMsg],
      fieldErrors: { conversationId: [errorMsg] },
    };
  }

  return {
    ok: true,
    value: candidate.trim().toLowerCase(),
  };
}
