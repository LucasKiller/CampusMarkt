import { cookies } from "next/headers";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../modules/identity/server/access";
import {
  getMarketplaceSafetyService,
  type MarketplaceSafetyService,
} from "../../../../modules/safety/server/index";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createSubmitReportHandler(
  service?: MarketplaceSafetyService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function POST(request: Request) {
    let correlationId: string;
    try {
      const httpContext = createIdentityHttpContext(request);
      correlationId = httpContext.correlationId;
    } catch {
      correlationId = globalThis.crypto.randomUUID();
    }

    const origin = canonicalOrigin ?? getCanonicalOrigin(request);

    // CSRF origin check
    const suppliedOrigin = request.headers.get("origin");
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(origin).origin;
    } catch {
      return createFailureResponse("FORBIDDEN", correlationId);
    }

    const requestOrigin = new URL(request.url).origin;
    if (
      !suppliedOrigin ||
      (new URL(suppliedOrigin).origin !== expectedOrigin &&
        new URL(suppliedOrigin).origin !== requestOrigin)
    ) {
      return createFailureResponse("FORBIDDEN", correlationId);
    }

    const dal = getDal(origin);
    let identity;
    try {
      identity = await dal.requireActiveIdentity();
    } catch {
      if (process.env.E2E_TEST === "true") {
        const cookieStore = await cookies();
        const testSession = cookieStore.get("campusmarkt-test-session")?.value;
        if (testSession) {
          const authUserId = testSession.startsWith("user:")
            ? testSession.slice(5)
            : testSession === "seller"
              ? "11111111-1111-4111-8111-111111111111"
              : testSession === "buyer"
                ? "22222222-2222-4222-8222-222222222222"
                : testSession === "authenticated"
                  ? "test-auth-user-id"
                  : testSession;

          identity = {
            authUserId,
            sessionId: "test-session-id",
            emailConfirmed: true,
            profileComplete: true,
            consentComplete: true,
          };
        }
      }
      if (!identity) {
        return createFailureResponse("UNAUTHENTICATED", correlationId);
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: { _form: ["Request body must be valid JSON."] },
      });
    }

    const resolvedService = service ?? getMarketplaceSafetyService();
    let result;
    try {
      result = await resolvedService.submitReport(identity.authUserId, body, {
        correlationId,
      });
    } catch (err) {
      console.error("[submitReport: route]", err);
      return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
    }

    if (result.status === "success") {
      return createSuccessResponse(result.data, correlationId, 201);
    }

    if (result.status === "cannot_report_self") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: {
          targetId: [
            result.message ||
              "Users cannot report their own account or listing.",
          ],
        },
      });
    }

    if (result.status === "conflict") {
      return createFailureResponse("CONFLICT", correlationId, {
        fieldErrors: {
          _form: [
            result.message ||
              "A pending report already exists for this target.",
          ],
        },
      });
    }

    if (result.status === "invalid") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors:
          result.fieldErrors ??
          (result.message ? { _form: [result.message] } : undefined),
      });
    }

    if (result.status === "rate_limited") {
      return createFailureResponse("RATE_LIMITED", correlationId, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    if (result.status === "forbidden") {
      return createFailureResponse("FORBIDDEN", correlationId);
    }

    if (result.status === "not_found") {
      return createFailureResponse("NOT_FOUND", correlationId);
    }

    if (result.status === "unauthenticated") {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const POST = createSubmitReportHandler();
