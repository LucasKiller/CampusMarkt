import "server-only";

export interface IdentityRpcClient {
  rpc(
    functionName: string,
    arguments_?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
  schema?(schema: string): unknown;
  from?(table: string): unknown;
}

export type UniversityRepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code:
        | "CONFLICT"
        | "ACCOUNT_UNAVAILABLE"
        | "INVALID_INPUT"
        | "INVALID_OR_EXPIRED_TOKEN"
        | "DEPENDENCY_UNAVAILABLE"
        | "INVALID_PROVIDER_RESPONSE";
    };

export interface InitiateVerificationInput {
  authUserId: string;
  universityId: string;
  emailHash: string;
  tokenHash: string;
}

export interface ConfirmVerificationInput {
  tokenHash: string;
}

export interface ConfirmedVerificationRecord {
  authUserId: string;
  universityId: string;
  status: string;
  expiresAt: string;
}

export interface UniversityVerificationRecord {
  status: "pending" | "verified" | "revoked";
  universityId: string;
  expiresAt: string | null;
  tokenExpiresAt: string | null;
}

function normalizeBytea(hash: string): string {
  return hash.startsWith("\\x") ? hash : `\\x${hash}`;
}

function firstRow(data: unknown): unknown {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function callRpc(
  client: IdentityRpcClient,
  functionName: string,
  arguments_?: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  const target =
    typeof (
      client as unknown as { schema?: (schema: string) => IdentityRpcClient }
    ).schema === "function"
      ? (
          client as unknown as {
            schema: (schema: string) => IdentityRpcClient;
          }
        ).schema("identity_api")
      : client;

  return target.rpc(functionName, arguments_);
}

export interface UniversityVerificationEmailInput {
  actionUrl: string;
  universityName?: string;
}

export interface UniversityVerificationEmail {
  subject: string;
  text: string;
}

export function renderUniversityVerificationEmail(
  input: UniversityVerificationEmailInput,
): UniversityVerificationEmail {
  const universityName = input.universityName ?? "TU Braunschweig";
  const subject = `Verify your ${universityName} affiliation on CampusMarkt`;
  const text = [
    `Hello,`,
    ``,
    `Please click the link below to verify your affiliation with ${universityName} on CampusMarkt:`,
    ``,
    input.actionUrl,
    ``,
    `This verification link expires in 24 hours.`,
    ``,
    `If you did not request this verification, you can safely ignore this email.`,
  ].join("\n");

  return {
    subject,
    text,
  };
}

export function createUniversityRepository(clients: {
  service: IdentityRpcClient;
  user?: IdentityRpcClient;
}) {
  const { service } = clients;

  return {
    async initiateUniversityVerification(
      input: InitiateVerificationInput,
    ): Promise<UniversityRepositoryResult<void>> {
      try {
        const { error } = await callRpc(
          service,
          "initiate_university_verification",
          {
            requested_auth_user_id: input.authUserId,
            requested_university_id: input.universityId,
            requested_email_hash: input.emailHash,
            requested_token_hash: normalizeBytea(input.tokenHash),
          },
        );

        if (error) {
          const err = error as { code?: string; message?: string };
          if (
            err.code === "23505" ||
            err.message?.includes("already verified")
          ) {
            return { ok: false, code: "CONFLICT" };
          }
          if (
            err.code === "28000" ||
            err.code === "P0002" ||
            err.message?.includes("account is unavailable")
          ) {
            return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
          }
          if (
            err.code === "22023" ||
            err.message?.includes("invalid university verification input")
          ) {
            return { ok: false, code: "INVALID_INPUT" };
          }
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        }

        return { ok: true, value: undefined };
      } catch (err) {
        console.error("[RPC Exception: initiate_university_verification]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async confirmUniversityVerification(
      input: ConfirmVerificationInput,
    ): Promise<UniversityRepositoryResult<ConfirmedVerificationRecord>> {
      try {
        const { data, error } = await callRpc(
          service,
          "confirm_university_verification",
          {
            requested_token_hash: normalizeBytea(input.tokenHash),
          },
        );

        if (error) {
          const err = error as { code?: string; message?: string };
          if (
            err.code === "23505" ||
            err.message?.includes("already verified")
          ) {
            return { ok: false, code: "CONFLICT" };
          }
          if (
            err.code === "28000" ||
            err.message?.includes("account is unavailable")
          ) {
            return { ok: false, code: "ACCOUNT_UNAVAILABLE" };
          }
          if (
            err.code === "22023" ||
            err.code === "P0002" ||
            err.message?.includes("invalid or expired") ||
            err.message?.includes("expired")
          ) {
            return { ok: false, code: "INVALID_OR_EXPIRED_TOKEN" };
          }
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        }

        const row = firstRow(data);
        if (!isRecord(row)) {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        if (
          typeof row.auth_user_id !== "string" ||
          typeof row.university_id !== "string" ||
          typeof row.status !== "string" ||
          typeof row.expires_at !== "string"
        ) {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return {
          ok: true,
          value: {
            authUserId: row.auth_user_id,
            universityId: row.university_id,
            status: row.status,
            expiresAt: row.expires_at,
          },
        };
      } catch (err) {
        console.error("[RPC Exception: confirm_university_verification]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async disconnectUniversityVerification(
      authUserId: string,
    ): Promise<UniversityRepositoryResult<void>> {
      try {
        const { error } = await callRpc(
          service,
          "disconnect_university_verification",
          {
            requested_auth_user_id: authUserId,
          },
        );

        if (error) {
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        }

        return { ok: true, value: undefined };
      } catch (err) {
        console.error(
          "[RPC Exception: disconnect_university_verification]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getVerificationRecord(
      authUserId: string,
    ): Promise<
      UniversityRepositoryResult<UniversityVerificationRecord | null>
    > {
      try {
        const { data, error } = await callRpc(
          service,
          "get_university_verification_record",
          {
            requested_auth_user_id: authUserId,
          },
        );

        if (error) {
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        }

        const row = firstRow(data);
        if (!row || !isRecord(row)) {
          return { ok: true, value: null };
        }

        if (
          !["pending", "verified", "revoked"].includes(String(row.status)) ||
          typeof row.university_id !== "string" ||
          (row.expires_at !== null && typeof row.expires_at !== "string") ||
          (row.token_expires_at !== null &&
            typeof row.token_expires_at !== "string")
        ) {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return {
          ok: true,
          value: {
            status: row.status as "pending" | "verified" | "revoked",
            universityId: row.university_id as string,
            expiresAt: (row.expires_at as string) ?? null,
            tokenExpiresAt: (row.token_expires_at as string) ?? null,
          },
        };
      } catch (err) {
        console.error("[Repository Exception: getVerificationRecord]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export type UniversityRepository = ReturnType<
  typeof createUniversityRepository
>;
