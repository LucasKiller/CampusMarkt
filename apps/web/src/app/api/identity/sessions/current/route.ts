import {
  createSuccessResponse,
  createFailureResponse,
  validateMutationRequest,
  createIdentityHttpContext,
} from "../../../../../modules/identity/http/index";
import {
  getAccessService,
  AUTH_COOKIE_NAME,
} from "../../../../../modules/identity/server/access";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createCurrentSessionHandler(
  service?: ReturnType<typeof getAccessService>,
  canonicalOrigin?: string,
) {
  return async function DELETE(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const context = createIdentityHttpContext(request);

    const decision = validateMutationRequest(request, {
      canonicalOrigin: origin,
      allowedContentTypes: ["application/json"],
    });
    if (!decision.ok && request.headers.get("origin")) {
      const suppliedOrigin = request.headers.get("origin");
      if (suppliedOrigin !== origin) {
        return createFailureResponse("FORBIDDEN", context.correlationId);
      }
    }

    const resolvedService = service ?? getAccessService(origin);
    try {
      await resolvedService.signOutCurrent();
    } catch {
      // Ignored
    }

    const response = createSuccessResponse(
      { status: "signed_out" as const },
      context.correlationId,
    );

    response.headers.append(
      "set-cookie",
      `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    );

    return response;
  };
}

export const DELETE = createCurrentSessionHandler();
