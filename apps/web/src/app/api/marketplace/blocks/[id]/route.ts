import { cookies } from "next/headers";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  getMarketplaceSafetyService,
  type MarketplaceSafetyService,
} from "../../../../../modules/safety/server/index";

type RouteParams = {
  id: string;
};

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createUnblockUserHandler(
  service?: MarketplaceSafetyService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function DELETE(
    request: Request,
    context: { params: Promise<RouteParams> | RouteParams },
  ) {
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

    const params = await context.params;
    const blockedId = params.id;

    const resolvedService = service ?? getMarketplaceSafetyService();
    let result;
    try {
      result = await resolvedService.unblockUser(
        identity.authUserId,
        blockedId,
        { correlationId },
      );
    } catch (err) {
      console.error("[unblockUser: route]", err);
      return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
    }

    if (result.status === "success") {
      return createSuccessResponse(result.data, correlationId, 200);
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

    if (result.status === "unauthenticated") {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const DELETE = createUnblockUserHandler();
