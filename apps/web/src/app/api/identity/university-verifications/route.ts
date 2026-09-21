import { handleIdentityJsonMutation } from "../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../modules/identity/server/access";
import {
  getUniversityVerificationService,
  type UniversityVerificationService,
} from "../../../../modules/identity/server/university";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

function extractTrustedClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

export function createUniversityVerificationHandler(
  service?: UniversityVerificationService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedService = service ?? getUniversityVerificationService(origin);
    const dal = getDal(origin);

    return handleIdentityJsonMutation(
      request,
      { canonicalOrigin: origin },
      async (body, { correlationId }) => {
        let identity;
        try {
          identity = await dal.requireActiveIdentity();
        } catch {
          return {
            ok: false,
            code: "UNAUTHENTICATED",
          };
        }

        const institutionalEmail =
          typeof body.institutionalEmail === "string"
            ? body.institutionalEmail
            : "";

        const trustedClientIp = extractTrustedClientIp(request);
        const result = await resolvedService.initiateVerification(
          identity.authUserId,
          { institutionalEmail },
          { trustedClientIp, correlationId },
        );

        if (result.status === "invalid_input") {
          return {
            ok: false,
            code: "INVALID_INPUT",
            fieldErrors: result.fieldErrors,
          };
        }

        if (result.status === "rate_limited") {
          return {
            ok: false,
            code: "RATE_LIMITED",
            retryAfterSeconds: result.retryAfterSeconds,
          };
        }

        if (result.status === "conflict") {
          return {
            ok: false,
            code: "CONFLICT",
          };
        }

        if (result.status === "account_unavailable") {
          return {
            ok: false,
            code: "FORBIDDEN",
          };
        }

        if (result.status === "unavailable") {
          return {
            ok: false,
            code: "DEPENDENCY_UNAVAILABLE",
          };
        }

        return {
          ok: true,
          data: { status: "accepted" },
          status: 202,
        };
      },
    );
  };
}

export const POST = createUniversityVerificationHandler();
