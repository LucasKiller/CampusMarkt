import {
  createFailureResponse,
  createIdentityHttpContext,
} from "../../../../../modules/identity/http/index";
import {
  getMarketplaceFeedService,
  type MarketplaceFeedService,
} from "../../../../../modules/listings/server/index";

type RouteParams = {
  id: string;
};

export function createListingDetailsRouteHandler(
  service?: MarketplaceFeedService,
) {
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

    const params = await context.params;
    const listingId = params.id;

    const resolvedService = service ?? getMarketplaceFeedService();
    const result = await resolvedService.getListingDetails(listingId, {
      correlationId,
    });

    if (result.status === "success") {
      return Response.json(
        {
          ok: true,
          data: result.data,
          correlationId,
        },
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
            "x-correlation-id": correlationId,
          },
        },
      );
    }

    if (result.status === "not_found") {
      return createFailureResponse("NOT_FOUND", correlationId);
    }

    if (result.status === "invalid") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: { id: [result.message || "Invalid listing ID"] },
      });
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const GET = createListingDetailsRouteHandler();
