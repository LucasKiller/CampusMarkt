import {
  isApiFailure,
  isApiSuccess,
  isPublicProfile,
  type ApiEnvelope,
  type DeletionResult,
  type GenericAcceptedResult,
  type ProfileMutationResult,
  type PublicProfile,
  type SessionResult,
} from "@campusmarkt/types";

export interface RegistrationRequest {
  email: string;
  password: string;
  displayName: string;
  adultDeclared: true;
  termsVersion: string;
  privacyVersion: string;
}

export interface SignInRequest {
  email: string;
  password: string;
  returnTo?: string;
}

export interface RecoveryRequest {
  email: string;
}

export interface ProfileUpdateRequest {
  displayName: string;
}

export interface DeletionRequest {
  confirmation: "DELETE";
}

export interface IdentityApiClient {
  register(
    command: RegistrationRequest,
  ): Promise<ApiEnvelope<GenericAcceptedResult>>;
  signIn(command: SignInRequest): Promise<ApiEnvelope<SessionResult>>;
  requestRecovery(
    command: RecoveryRequest,
  ): Promise<ApiEnvelope<GenericAcceptedResult>>;
  getPublicProfile(publicId: string): Promise<ApiEnvelope<PublicProfile>>;
  updateProfile(
    command: ProfileUpdateRequest,
  ): Promise<ApiEnvelope<ProfileMutationResult>>;
  requestDeletion(
    command: DeletionRequest,
  ): Promise<ApiEnvelope<DeletionResult>>;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type DataParser<T> = (value: unknown) => value is T;

export class IdentityApiClientError extends Error {
  constructor(readonly code: "INVALID_RESPONSE") {
    super(code);
    this.name = "IdentityApiClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function isGenericAcceptedResult(
  value: unknown,
): value is GenericAcceptedResult {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["status"]) &&
    value.status === "accepted"
  );
}

function isSessionResult(value: unknown): value is SessionResult {
  if (!isRecord(value) || typeof value.status !== "string") return false;

  if (value.status === "signed_out") {
    return hasExactKeys(value, ["status"]);
  }

  return (
    value.status === "authenticated" &&
    hasExactKeys(value, ["status", "returnTo", "expiresAt"]) &&
    typeof value.returnTo === "string" &&
    typeof value.expiresAt === "string"
  );
}

function isProfileMutationResult(
  value: unknown,
): value is ProfileMutationResult {
  if (!isRecord(value) || typeof value.status !== "string") return false;

  if (value.status === "conflict") {
    return hasExactKeys(value, ["status"]);
  }

  return (
    value.status === "updated" &&
    hasExactKeys(value, ["status", "profile"]) &&
    isPublicProfile(value.profile)
  );
}

function isDeletionResult(value: unknown): value is DeletionResult {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["status"]) &&
    (value.status === "deletion_pending" ||
      value.status === "reauthentication_required")
  );
}

async function parseResponse<T>(
  response: Response,
  parseData: DataParser<T>,
): Promise<ApiEnvelope<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new IdentityApiClientError("INVALID_RESPONSE");
  }

  if (isApiFailure(body)) return body;
  if (isApiSuccess(body) && parseData(body.data)) {
    return { ok: true, data: body.data, correlationId: body.correlationId };
  }

  throw new IdentityApiClientError("INVALID_RESPONSE");
}

function jsonRequest(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function createIdentityApiClient(fetcher: Fetcher): IdentityApiClient {
  return {
    async register(command) {
      const response = await fetcher(
        "/api/identity/registrations",
        jsonRequest("POST", command),
      );
      return parseResponse(response, isGenericAcceptedResult);
    },
    async signIn(command) {
      const response = await fetcher(
        "/api/identity/sessions",
        jsonRequest("POST", command),
      );
      return parseResponse(response, isSessionResult);
    },
    async requestRecovery(command) {
      const response = await fetcher(
        "/api/identity/recoveries",
        jsonRequest("POST", command),
      );
      return parseResponse(response, isGenericAcceptedResult);
    },
    async getPublicProfile(publicId) {
      const response = await fetcher(
        `/api/identity/profiles/${encodeURIComponent(publicId)}`,
        { method: "GET", credentials: "same-origin" },
      );
      return parseResponse(response, isPublicProfile);
    },
    async updateProfile(command) {
      const response = await fetcher(
        "/api/identity/me/profile",
        jsonRequest("PATCH", command),
      );
      return parseResponse(response, isProfileMutationResult);
    },
    async requestDeletion(command) {
      const response = await fetcher(
        "/api/identity/me/deletion",
        jsonRequest("POST", command),
      );
      return parseResponse(response, isDeletionResult);
    },
  };
}
