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

export function createGetMessagesHandler(
  service?: MarketplaceMessagingService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function GET(
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
    const dal = getDal(origin);

    const identity = await resolveIdentity(request, dal);
    if (!identity) {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    const url = new URL(request.url);
    const query: Record<string, unknown> = {};
    if (url.searchParams.has("cursor")) {
      query.cursor = url.searchParams.get("cursor");
    }
    if (url.searchParams.has("before")) {
      query.before = url.searchParams.get("before");
    }
    if (url.searchParams.has("after")) {
      query.after = url.searchParams.get("after");
    }
    if (url.searchParams.has("limit")) {
      query.limit = url.searchParams.get("limit");
    }

    const resolvedService = service ?? getMarketplaceMessagingService();
    const result = await resolvedService.getMessages(
      identity.authUserId,
      id,
      query,
      { correlationId },
    );

    if (result.status === "success") {
      return createSuccessResponse(result.data, correlationId, 200);
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

export function createSendMessageHandler(
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: { _form: ["Request body must be valid JSON."] },
      });
    }

    const resolvedService = service ?? getMarketplaceMessagingService();
    const result = await resolvedService.sendMessage(
      identity.authUserId,
      id,
      body,
      { correlationId },
    );

    if (result.status === "success") {
      return createSuccessResponse(
        { message: result.data },
        correlationId,
        201,
      );
    }

    if (result.status === "invalid") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: result.fieldErrors,
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

export const GET = createGetMessagesHandler();
export const POST = createSendMessageHandler();
