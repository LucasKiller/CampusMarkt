import type { ProfileMutationResult } from "@campusmarkt/types";
import {
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
  handleIdentityJsonMutation,
} from "../../../../../modules/identity/http/index";
import { getSessionDal } from "../../../../../modules/identity/server/access";
import {
  getProfileService,
  type ProfileService,
} from "../../../../../modules/identity/server/profile";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createOwnerProfileHandler(
  service?: ProfileService,
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

      const resolvedService = service ?? getProfileService();
      const result = await resolvedService.getOwnerProfile(identity.authUserId);

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
    },

    async PATCH(request: Request) {
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);
      const resolvedService = service ?? getProfileService();
      const dal = getDal(origin);

      return handleIdentityJsonMutation<ProfileMutationResult>(
        request,
        { canonicalOrigin: origin },
        async (body) => {
          let identity;
          try {
            identity = await dal.requireActiveIdentity();
          } catch {
            return {
              ok: false,
              code: "UNAUTHENTICATED",
            };
          }

          const result = await resolvedService.updateDisplayName(
            identity.authUserId,
            body.displayName,
          );

          if (result.status === "invalid") {
            return {
              ok: false,
              code: "INVALID_INPUT",
              fieldErrors: result.fieldErrors,
            };
          }
          if (result.status === "unavailable") {
            return {
              ok: false,
              code: "DEPENDENCY_UNAVAILABLE",
            };
          }

          return {
            ok: true,
            data: {
              status: "updated" as const,
              profile: result.profile,
            },
            status: 200,
          };
        },
      );
    },
  };
}

const defaultHandler = createOwnerProfileHandler();
export const GET = defaultHandler.GET;
export const PATCH = defaultHandler.PATCH;
