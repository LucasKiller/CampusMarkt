import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../modules/identity/server/access";
import {
  getListingApplicationService,
  type ListingApplicationService,
} from "../../../../modules/listings/server/index";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createListMyListingsHandler(
  service?: ListingApplicationService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function GET(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const context = createIdentityHttpContext(request);
    const resolvedService = service ?? getListingApplicationService();
    const dal = getDal(origin);

    let identity;
    try {
      identity = await dal.requireActiveIdentity();
    } catch {
      return createFailureResponse("UNAUTHENTICATED", context.correlationId);
    }

    const result = await resolvedService.listOwnerListings(identity.authUserId);
    if (result.status === "success") {
      return createSuccessResponse(result.data, context.correlationId);
    }
    if (result.status === "forbidden") {
      return createFailureResponse("FORBIDDEN", context.correlationId);
    }
    if (result.status === "unauthenticated") {
      return createFailureResponse("UNAUTHENTICATED", context.correlationId);
    }
    return createFailureResponse(
      "DEPENDENCY_UNAVAILABLE",
      context.correlationId,
    );
  };
}

export const GET = createListMyListingsHandler();
