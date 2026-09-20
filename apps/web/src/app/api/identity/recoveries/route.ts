import { handleIdentityJsonMutation } from "../../../../modules/identity/http/index";
import { getAccessService } from "../../../../modules/identity/server/access";

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

export function createRecoveryHandler(
  service?: ReturnType<typeof getAccessService>,
  canonicalOrigin?: string,
) {
  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedService = service ?? getAccessService(origin);

    return handleIdentityJsonMutation(
      request,
      { canonicalOrigin: origin },
      async (body, { correlationId }) => {
        const trustedClientIp = extractTrustedClientIp(request);
        const email =
          typeof body.email === "string" ? body.email.trim() : body.email;

        const result = await resolvedService.requestRecovery(email, {
          trustedClientIp,
          correlationId,
        });

        if (result.status === "invalid") {
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
        if (result.status === "unavailable") {
          return {
            ok: false,
            code: "DEPENDENCY_UNAVAILABLE",
          };
        }

        return {
          ok: true,
          data: { status: "accepted" as const },
          status: 202,
        };
      },
    );
  };
}

export const POST = createRecoveryHandler();
