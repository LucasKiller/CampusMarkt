import { cookies } from "next/headers";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../../modules/identity/server/access";
import {
  getMarketplaceMessagingService,
  type MarketplaceMessagingService,
} from "../../../../../../modules/messaging/server/index";

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

export function createMarkConversationReadHandler(
  service?: MarketplaceMessagingService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function POST(
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

    const { id } = await Promise.resolve(context.params);
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
    const identity = await resolveIdentity(request, dal);
    if (!identity) {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    const resolvedService =
      service ?? (await getMarketplaceMessagingService(identity.authUserId));
    if (!resolvedService) {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }
    const result = await resolvedService.markConversationRead(
      identity.authUserId,
      id,
      { correlationId },
    );

    if (result.status === "success") {
      return createSuccessResponse(
        {
          success: true,
          markedCount: result.data.markedCount,
        },
        correlationId,
        200,
      );
    }

    if (result.status === "invalid") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: result.fieldErrors,
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

export const POST = createMarkConversationReadHandler();
