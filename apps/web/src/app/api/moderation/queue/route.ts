import { cookies } from "next/headers";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../modules/identity/server/access";
import {
  getMarketplaceModerationService,
  type MarketplaceModerationService,
} from "../../../../modules/moderation/server/index";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

async function resolveIdentity(
  request: Request,
  dal: ReturnType<typeof getSessionDal>,
) {
  try {
    return await dal.requireActiveIdentity();
  } catch {
    if (process.env.E2E_TEST === "true") {
      const cookieStore = await cookies();
      const testSession = cookieStore.get("campusmarkt-test-session")?.value;
      if (testSession) {
        const authUserId = testSession.startsWith("user:")
          ? testSession.slice(5)
          : testSession === "moderator"
            ? "99999999-9999-4999-8999-999999999999"
            : testSession === "seller"
              ? "11111111-1111-4111-8111-111111111111"
              : testSession === "buyer"
                ? "22222222-2222-4222-8222-222222222222"
                : testSession === "authenticated"
                  ? "test-auth-user-id"
                  : testSession;

        return {
          authUserId,
          sessionId: "test-session-id",
          emailConfirmed: true,
          profileComplete: true,
          consentComplete: true,
        };
      }
    }
    return null;
  }
}

export function createGetModerationQueueHandler(
  service?: MarketplaceModerationService,
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

    const identity = await resolveIdentity(request, dal);
    if (!identity) {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    const resolvedService = service ?? getMarketplaceModerationService();
    const result = await resolvedService.getModerationQueue(
      identity.authUserId,
    );

    if (result.status === "success") {
      return createSuccessResponse({ queue: result.data }, correlationId, 200);
    }

    if (result.status === "unauthenticated") {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    if (result.status === "forbidden") {
      return createFailureResponse("FORBIDDEN", correlationId);
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const GET = createGetModerationQueueHandler();
