import {
  handleIdentityJsonMutation,
  createSuccessResponse,
  createFailureResponse,
  validateMutationRequest,
  createIdentityHttpContext,
} from "../../../../modules/identity/http/index";
import {
  getAccessService,
  getSessionDal,
  MAX_AUTH_COOKIE_AGE_SECONDS,
} from "../../../../modules/identity/server/access";
import {
  appendSessionCookies,
  appendClearedSessionCookies,
  type SessionTokens,
} from "../../../../modules/identity/session-cookie";

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

export function createSessionsHandler(
  service?: ReturnType<typeof getAccessService>,
  canonicalOrigin?: string,
) {
  return {
    async POST(request: Request) {
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);
      const resolvedService = service ?? getAccessService(origin);

      let sessionTokens: SessionTokens | undefined;

      const response = await handleIdentityJsonMutation(
        request,
        { canonicalOrigin: origin },
        async (body, { correlationId }) => {
          const trustedClientIp = extractTrustedClientIp(request);
          const result = await resolvedService.signIn(body, {
            trustedClientIp,
            correlationId,
            onSessionEstablished(tokens) {
              sessionTokens = tokens;
            },
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
          if (result.status === "denied") {
            return {
              ok: false,
              code: "UNAUTHENTICATED",
            };
          }
          if (result.status === "unavailable") {
            return {
              ok: false,
              code: "DEPENDENCY_UNAVAILABLE",
            };
          }
          if (!sessionTokens) {
            return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
          }

          const expiresDate = new Date(
            Date.now() + MAX_AUTH_COOKIE_AGE_SECONDS * 1000,
          );

          return {
            ok: true,
            data: {
              status: "authenticated" as const,
              returnTo: result.redirectTo,
              expiresAt: expiresDate.toISOString(),
            },
            status: 200,
          };
        },
      );

      if (response.status === 200 && sessionTokens) {
        appendSessionCookies(
          response.headers,
          sessionTokens,
          Math.floor(Date.now() / 1000),
        );
      }

      return response;
    },

    async DELETE(request: Request) {
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);
      const context = createIdentityHttpContext(request);

      const decision = validateMutationRequest(request, {
        canonicalOrigin: origin,
        allowedContentTypes: ["application/json"],
      });
      if (!decision.ok && request.headers.get("origin")) {
        const suppliedOrigin = request.headers.get("origin");
        if (suppliedOrigin !== origin) {
          return createFailureResponse("FORBIDDEN", context.correlationId);
        }
      }

      const resolvedService = service ?? getAccessService(origin);
      const sessionDal = getSessionDal(origin);

      let identity = null;
      try {
        identity = await sessionDal.getOptionalIdentity();
      } catch {
        // Ignored
      }

      if (identity) {
        await resolvedService.signOutAll(identity);
      }

      const response = createSuccessResponse(
        { status: "signed_out" as const },
        context.correlationId,
      );

      appendClearedSessionCookies(response.headers);

      return response;
    },
  };
}

const defaultHandler = createSessionsHandler();
export const POST = defaultHandler.POST;
export const DELETE = defaultHandler.DELETE;
