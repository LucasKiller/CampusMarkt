import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  getListingApplicationService,
  type ListingApplicationService,
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

export function createManageListingHandler(
  service?: ListingApplicationService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function GET(
    request: Request,
    context: { params: Promise<RouteParams> | RouteParams },
  ) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const httpContext = createIdentityHttpContext(request);
    const params = await context.params;
    const listingId = params.id;

    const resolvedService = service ?? getListingApplicationService();
    const dal = getDal(origin);

    let identity;
    try {
      identity = await dal.requireActiveIdentity();
    } catch {
      return createFailureResponse(
        "UNAUTHENTICATED",
        httpContext.correlationId,
      );
    }

    const result = await resolvedService.getOwnerListing(
      identity.authUserId,
      listingId,
    );

    if (result.status === "success") {
      if (!result.data) {
        return createFailureResponse("NOT_FOUND", httpContext.correlationId);
      }
      return createSuccessResponse(result.data, httpContext.correlationId);
    }
    if (result.status === "forbidden") {
      return createFailureResponse("FORBIDDEN", httpContext.correlationId);
    }
    if (result.status === "not_found") {
      return createFailureResponse("NOT_FOUND", httpContext.correlationId);
    }
    if (result.status === "unauthenticated") {
      return createFailureResponse(
        "UNAUTHENTICATED",
        httpContext.correlationId,
      );
    }
    return createFailureResponse(
      "DEPENDENCY_UNAVAILABLE",
      httpContext.correlationId,
    );
  };
}

export const GET = createManageListingHandler();
