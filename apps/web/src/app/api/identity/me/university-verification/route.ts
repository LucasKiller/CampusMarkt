import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  getUniversityVerificationService,
  type UniversityVerificationService,
} from "../../../../../modules/identity/server/university";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

function extractTrustedClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}

export function createUniversityVerificationMeHandler(
  service?: UniversityVerificationService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return {
    async GET(request: Request) {
      const httpContext = createIdentityHttpContext(request);
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);
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

      const resolvedService =
        service ?? getUniversityVerificationService(origin);
      const result = await resolvedService.getVerificationStatus(
        identity.authUserId,
      );

      if (!result.ok) {
        return createFailureResponse(
          "DEPENDENCY_UNAVAILABLE",
          httpContext.correlationId,
        );
      }

      return createSuccessResponse(result.value, httpContext.correlationId);
    },

    async DELETE(request: Request) {
      const httpContext = createIdentityHttpContext(request);
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);

      const suppliedOrigin = request.headers.get("origin");
      let expectedOrigin: string;
      try {
        expectedOrigin = new URL(origin).origin;
      } catch {
        return createFailureResponse("FORBIDDEN", httpContext.correlationId);
      }

      if (
        !suppliedOrigin ||
        new URL(suppliedOrigin).origin !== expectedOrigin ||
        suppliedOrigin !== expectedOrigin
      ) {
        return createFailureResponse("FORBIDDEN", httpContext.correlationId);
      }

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

      const resolvedService =
        service ?? getUniversityVerificationService(origin);
      const trustedClientIp = extractTrustedClientIp(request);
      const result = await resolvedService.disconnectVerification(
        identity.authUserId,
        {
          trustedClientIp,
          correlationId: httpContext.correlationId,
        },
      );

      if (result.status === "unavailable") {
        return createFailureResponse(
          "DEPENDENCY_UNAVAILABLE",
          httpContext.correlationId,
        );
      }

      return createSuccessResponse(
        { status: "disconnected" },
        httpContext.correlationId,
        200,
      );
    },
  };
}

const defaultHandler = createUniversityVerificationMeHandler();
export const GET = defaultHandler.GET;
export const DELETE = defaultHandler.DELETE;
