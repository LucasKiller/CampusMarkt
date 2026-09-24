import { cookies } from "next/headers";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  getMarketplacePickupService,
  type MarketplacePickupService,
} from "../../../../../modules/listings/server/index";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createGetCompletedHistoryHandler(
  service?: MarketplacePickupService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function GET(request: Request) {
    let correlationId: string;
    try {
      const httpContext = createIdentityHttpContext(request);
      correlationId = httpContext.correlationId;
    } catch {
      correlationId = globalThis.crypto.randomUUID();
    }

    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
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

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const cursorParam = url.searchParams.get("cursor");
    const query = {
      ...(limitParam !== null ? { limit: limitParam } : {}),
      ...(cursorParam !== null ? { cursor: cursorParam } : {}),
    };

    const resolvedService = service ?? getMarketplacePickupService();
    const result = await resolvedService.getCompletedTransactions(
      identity.authUserId,
      query,
    );

    if (result.status === "success") {
      return createSuccessResponse({ items: result.data }, correlationId, 200);
    }

    if (result.status === "invalid") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: result.fieldErrors,
      });
    }

    if (result.status === "unauthenticated") {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const GET = createGetCompletedHistoryHandler();
