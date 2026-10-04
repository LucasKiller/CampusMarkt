import type {
  ApiFailure,
  ApiSuccess,
  FieldErrors,
  IdentityApiFailureCode,
} from "@campusmarkt/types";

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 64 * 1024;
export const ACTION_COOKIE_MAX_AGE_SECONDS = 5 * 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ACTION_COOKIE_NAME_PATTERN =
  /^campusmarkt-action-(email_confirmation|password_recovery|university_verification)$/u;

const FAILURE_STATUS: Record<IdentityApiFailureCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  DEPENDENCY_UNAVAILABLE: 503,
  CONFLICT: 409,
};

export class IdentityHttpBoundaryError extends Error {
  readonly code: IdentityApiFailureCode;

  constructor(code: IdentityApiFailureCode) {
    super("Identity HTTP boundary rejected the request.");
    this.name = "IdentityHttpBoundaryError";
    this.code = code;
  }
}

type HttpContextOptions = {
  randomUUID?: () => string;
};

export type IdentityHttpContext = {
  correlationId: string;
  inboundCorrelationId?: string;
};

export function createIdentityHttpContext(
  request: Request,
  {
    randomUUID = () => globalThis.crypto.randomUUID(),
  }: HttpContextOptions = {},
): IdentityHttpContext {
  const correlationId = randomUUID();
  if (!UUID_PATTERN.test(correlationId)) {
    throw new IdentityHttpBoundaryError("DEPENDENCY_UNAVAILABLE");
  }

  const inboundCorrelationId = request.headers.get("x-correlation-id");
  if (
    inboundCorrelationId !== null &&
    !UUID_PATTERN.test(inboundCorrelationId)
  ) {
    throw new IdentityHttpBoundaryError("INVALID_INPUT");
  }

  return inboundCorrelationId === null
    ? { correlationId }
    : { correlationId, inboundCorrelationId };
}

type MutationRequestOptions = {
  canonicalOrigin: string;
  allowedContentTypes?: readonly string[];
  maxBodyBytes?: number;
};

export type MutationRequestDecision =
  { ok: true } | { ok: false; code: "FORBIDDEN" | "INVALID_INPUT" };

function mediaType(contentType: string) {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function validateMutationRequest(
  request: Request,
  {
    canonicalOrigin,
    allowedContentTypes = ["application/json"],
    maxBodyBytes = DEFAULT_JSON_BODY_LIMIT_BYTES,
  }: MutationRequestOptions,
): MutationRequestDecision {
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(canonicalOrigin).origin;
  } catch {
    return { ok: false, code: "FORBIDDEN" };
  }

  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin === null) return { ok: false, code: "FORBIDDEN" };

  try {
    if (
      new URL(suppliedOrigin).origin !== expectedOrigin ||
      suppliedOrigin !== expectedOrigin
    ) {
      return { ok: false, code: "FORBIDDEN" };
    }
  } catch {
    return { ok: false, code: "FORBIDDEN" };
  }

  const contentType = request.headers.get("content-type");
  if (
    contentType === null ||
    !allowedContentTypes
      .map((value) => value.toLowerCase())
      .includes(mediaType(contentType))
  ) {
    return { ok: false, code: "INVALID_INPUT" };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > maxBodyBytes
    ) {
      return { ok: false, code: "INVALID_INPUT" };
    }
  }

  return { ok: true };
}

export async function readBoundedJson(
  request: Request,
  maxBodyBytes = DEFAULT_JSON_BODY_LIMIT_BYTES,
): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (reader === undefined)
    throw new IdentityHttpBoundaryError("INVALID_INPUT");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        await reader.cancel();
        throw new IdentityHttpBoundaryError("INVALID_INPUT");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof IdentityHttpBoundaryError) throw error;
    throw new IdentityHttpBoundaryError("INVALID_INPUT");
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new IdentityHttpBoundaryError("INVALID_INPUT");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof IdentityHttpBoundaryError) throw error;
    throw new IdentityHttpBoundaryError("INVALID_INPUT");
  }
}

function privateHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("cache-control", "no-store");
  headers.set("pragma", "no-cache");
  return headers;
}

export function createSuccessResponse<T>(
  data: T,
  correlationId: string,
  status = 200,
) {
  const payload: ApiSuccess<T> = { ok: true, data, correlationId };
  return Response.json(payload, { status, headers: privateHeaders() });
}

type FailureResponseOptions = {
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
};

export function createFailureResponse(
  code: IdentityApiFailureCode,
  correlationId: string,
  options: FailureResponseOptions = {},
) {
  const retryAfterSeconds =
    code === "RATE_LIMITED" &&
    Number.isInteger(options.retryAfterSeconds) &&
    (options.retryAfterSeconds ?? 0) > 0
      ? options.retryAfterSeconds
      : undefined;
  const fieldErrors =
    code === "INVALID_INPUT" ? options.fieldErrors : undefined;
  const payload: ApiFailure = {
    ok: false,
    code,
    ...(fieldErrors === undefined ? {} : { fieldErrors }),
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    correlationId,
  };
  const headers = privateHeaders(
    retryAfterSeconds === undefined
      ? undefined
      : { "retry-after": String(retryAfterSeconds) },
  );
  return Response.json(payload, { status: FAILURE_STATUS[code], headers });
}

export type ActionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    maxAge: number;
    path: "/";
    sameSite: "strict";
    secure: boolean;
  };
};

export function applyActionStaging(headers: Headers, cookie: ActionCookie) {
  if (
    !ACTION_COOKIE_NAME_PATTERN.test(cookie.name) ||
    !/^[A-Za-z0-9_-]+$/u.test(cookie.value) ||
    cookie.options.httpOnly !== true ||
    cookie.options.sameSite !== "strict" ||
    cookie.options.path !== "/" ||
    cookie.options.maxAge !== ACTION_COOKIE_MAX_AGE_SECONDS
  ) {
    throw new IdentityHttpBoundaryError("INVALID_INPUT");
  }

  const attributes = [
    `${cookie.name}=${cookie.value}`,
    "Path=/",
    `Max-Age=${ACTION_COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    ...(cookie.options.secure ? ["Secure"] : []),
    "SameSite=Strict",
  ];
  headers.append("set-cookie", attributes.join("; "));
  headers.set("referrer-policy", "no-referrer");
  headers.set("cache-control", "no-store");
  headers.set("pragma", "no-cache");
}

export type IdentityMutationOutcome<T = unknown> =
  | { ok: true; data: T; status?: number }
  | {
      ok: false;
      code: IdentityApiFailureCode;
      fieldErrors?: FieldErrors;
      retryAfterSeconds?: number;
    };

type JsonMutationOptions = MutationRequestOptions & HttpContextOptions;

export async function handleIdentityJsonMutation<T>(
  request: Request,
  options: JsonMutationOptions,
  useCase: (
    body: Record<string, unknown>,
    context: Pick<IdentityHttpContext, "correlationId">,
  ) => Promise<IdentityMutationOutcome<T>>,
) {
  let context: IdentityHttpContext;
  try {
    context = createIdentityHttpContext(request, options);
  } catch (error) {
    const correlationId =
      options.randomUUID?.() ?? globalThis.crypto.randomUUID();
    const code =
      error instanceof IdentityHttpBoundaryError ? error.code : "INVALID_INPUT";
    return createFailureResponse(code, correlationId);
  }

  const decision = validateMutationRequest(request, options);
  if (!decision.ok) {
    return createFailureResponse(decision.code, context.correlationId);
  }

  let body: Record<string, unknown>;
  try {
    body = await readBoundedJson(request, options.maxBodyBytes);
  } catch {
    return createFailureResponse("INVALID_INPUT", context.correlationId);
  }

  try {
    const outcome = await useCase(body, {
      correlationId: context.correlationId,
    });
    if (outcome.ok) {
      return createSuccessResponse(
        outcome.data,
        context.correlationId,
        outcome.status ?? 200,
      );
    }
    return createFailureResponse(outcome.code, context.correlationId, {
      fieldErrors: outcome.fieldErrors,
      retryAfterSeconds: outcome.retryAfterSeconds,
    });
  } catch {
    return createFailureResponse(
      "DEPENDENCY_UNAVAILABLE",
      context.correlationId,
    );
  }
}
