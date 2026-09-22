import {
  createFailureResponse,
  createIdentityHttpContext,
} from "../../../../modules/identity/http/index";
import {
  getMarketplaceFeedService,
  type MarketplaceFeedService,
} from "../../../../modules/listings/server/index";

export function createFeedRouteHandler(service?: MarketplaceFeedService) {
  return async function GET(request: Request) {
    let correlationId: string;
    try {
      const httpContext = createIdentityHttpContext(request);
      correlationId = httpContext.correlationId;
    } catch {
      correlationId = globalThis.crypto.randomUUID();
    }

    const resolvedService = service ?? getMarketplaceFeedService();
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const rawParams: Record<string, unknown> = {};
    if (searchParams.has("cursor"))
      rawParams.cursor = searchParams.get("cursor");
    if (searchParams.has("category"))
      rawParams.category = searchParams.get("category");
    if (searchParams.has("pickupArea"))
      rawParams.pickupArea = searchParams.get("pickupArea");
    if (searchParams.has("listingType"))
      rawParams.listingType = searchParams.get("listingType");
    if (searchParams.has("limit")) rawParams.limit = searchParams.get("limit");

    const result = await resolvedService.getPublicFeed(rawParams, {
      correlationId,
      clientIp,
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

    if (result.status === "invalid") {
      return createFailureResponse("INVALID_INPUT", correlationId, {
        fieldErrors: result.fieldErrors ?? {
          _form: [result.message || "Invalid input"],
        },
      });
    }

    if (result.status === "rate_limited") {
      return createFailureResponse("RATE_LIMITED", correlationId, {
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    return createFailureResponse("DEPENDENCY_UNAVAILABLE", correlationId);
  };
}

export const GET = createFeedRouteHandler();
