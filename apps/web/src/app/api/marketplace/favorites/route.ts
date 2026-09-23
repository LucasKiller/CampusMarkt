import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../modules/identity/server/access";
import {
  getMarketplaceFavoritesService,
  type MarketplaceFavoritesService,
} from "../../../../modules/listings/server/index";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createGetFavoritesHandler(
  service?: MarketplaceFavoritesService,
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
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    const url = new URL(request.url);
    const query: Record<string, unknown> = {};
    if (url.searchParams.has("cursor")) {
      query.cursor = url.searchParams.get("cursor");
    }
    if (url.searchParams.has("limit")) {
      query.limit = url.searchParams.get("limit");
    }

    const resolvedService = service ?? getMarketplaceFavoritesService();
    const result = await resolvedService.getUserFavorites(
      identity.authUserId,
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

    if (result.status === "unauthenticated") {
      return createFailureResponse("UNAUTHENTICATED", correlationId);
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const GET = createGetFavoritesHandler();
