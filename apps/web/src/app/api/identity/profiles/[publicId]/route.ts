import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../modules/identity/http/index";
import {
  getProfileService,
  type ProfileService,
} from "../../../../../modules/identity/server/profile";

type RouteParams = {
  publicId: string;
};

export function createPublicProfileHandler(service?: ProfileService) {
  return async function GET(
    request: Request,
    context: { params: Promise<RouteParams> | RouteParams },
  ) {
    const httpContext = createIdentityHttpContext(request);
    const params = await context.params;
    const publicId = params.publicId;

    const resolvedService = service ?? getProfileService();
    const result = await resolvedService.getPublicProfile(publicId);

    if (result.status === "not_found") {
      return createFailureResponse("NOT_FOUND", httpContext.correlationId);
    }
    if (result.status === "unavailable") {
      return createFailureResponse(
        "DEPENDENCY_UNAVAILABLE",
        httpContext.correlationId,
      );
    }

    return createSuccessResponse(result.profile, httpContext.correlationId);
  };
}

export const GET = createPublicProfileHandler();
