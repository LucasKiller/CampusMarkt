import {
  createFailureResponse,
  createIdentityHttpContext,
} from "../../../../modules/identity/http/index";
import {
  getMarketplaceSearchService,
  type MarketplaceSearchService,
} from "../../../../modules/listings/server/index";

export function createSearchRouteHandler(service?: MarketplaceSearchService) {
  return async function GET(request: Request) {
    let correlationId: string;
    try {
      const httpContext = createIdentityHttpContext(request);
      correlationId = httpContext.correlationId;
    } catch {
      correlationId = globalThis.crypto.randomUUID();
    }

    const resolvedService = service ?? getMarketplaceSearchService();
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const rawParams: Record<string, unknown> = {};

    if (searchParams.has("q")) rawParams.q = searchParams.get("q");
    else if (searchParams.has("query"))
      rawParams.query = searchParams.get("query");

    if (searchParams.has("category"))
      rawParams.category = searchParams.get("category");
    else if (searchParams.has("categories"))
      rawParams.categories = searchParams.get("categories");

    if (searchParams.has("pickupArea"))
      rawParams.pickupArea = searchParams.get("pickupArea");
    else if (searchParams.has("area"))
      rawParams.pickupArea = searchParams.get("area");
    else if (searchParams.has("pickupAreas"))
      rawParams.pickupAreas = searchParams.get("pickupAreas");

    if (searchParams.has("listingType"))
      rawParams.listingType = searchParams.get("listingType");
    else if (searchParams.has("type"))
      rawParams.listingType = searchParams.get("type");
    else if (searchParams.has("listingTypes"))
      rawParams.listingTypes = searchParams.get("listingTypes");

    if (searchParams.has("condition"))
      rawParams.condition = searchParams.get("condition");
    else if (searchParams.has("conditions"))
      rawParams.conditions = searchParams.get("conditions");

    if (searchParams.has("minPrice"))
      rawParams.minPrice = searchParams.get("minPrice");
    else if (searchParams.has("minPriceCents"))
      rawParams.minPriceCents = searchParams.get("minPriceCents");

    if (searchParams.has("maxPrice"))
      rawParams.maxPrice = searchParams.get("maxPrice");
    else if (searchParams.has("maxPriceCents"))
      rawParams.maxPriceCents = searchParams.get("maxPriceCents");

    if (searchParams.has("verifiedOnly"))
      rawParams.verifiedOnly = searchParams.get("verifiedOnly");
    else if (searchParams.has("verified"))
      rawParams.verifiedOnly = searchParams.get("verified");

    if (searchParams.has("sort")) rawParams.sort = searchParams.get("sort");
    if (searchParams.has("cursor"))
      rawParams.cursor = searchParams.get("cursor");
    if (searchParams.has("limit")) rawParams.limit = searchParams.get("limit");

    const result = await resolvedService.search(rawParams, {
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

export const GET = createSearchRouteHandler();
