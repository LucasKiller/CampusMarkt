import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  getMarketplaceFavoritesService,
  type MarketplaceFavoritesService,
} from "../../../../../modules/listings/server/index";

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

export function createToggleFavoriteHandler(
  service?: MarketplaceFavoritesService,
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

    const origin = canonicalOrigin ?? getCanonicalOrigin(request);

    // CSRF origin check
    const suppliedOrigin = request.headers.get("origin");
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(origin).origin;
    } catch {
      return createFailureResponse("FORBIDDEN", correlationId);
    }

    if (
      !suppliedOrigin ||
      new URL(suppliedOrigin).origin !== expectedOrigin ||
      suppliedOrigin !== expectedOrigin
    ) {
      return createFailureResponse("FORBIDDEN", correlationId);
    }

    const dal = getDal(origin);
    let identity;
    try {
      identity = await dal.requireActiveIdentity();
    } catch {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    const params = await context.params;
    const listingId = params.id;

    const resolvedService = service ?? getMarketplaceFavoritesService();
    const result = await resolvedService.toggleFavorite(
      identity.authUserId,
      listingId,
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

    if (result.status === "cannot_favorite_own_listing") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: {
          _form: [
            result.message || "Users cannot favorite their own listings.",
          ],
        },
      });
    }

    if (result.status === "rate_limited") {
      return createFailureResponse("RATE_LIMITED", correlationId, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
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

export const POST = createToggleFavoriteHandler();
