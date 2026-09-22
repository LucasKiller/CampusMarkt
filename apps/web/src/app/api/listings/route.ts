import { handleIdentityJsonMutation } from "../../../modules/identity/http/index";
import { getSessionDal } from "../../../modules/identity/server/access";
import {
  getListingApplicationService,
  type ListingApplicationService,
} from "../../../modules/listings/server/index";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createListingsRouteHandler(
  service?: ListingApplicationService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedService = service ?? getListingApplicationService();
    const dal = getDal(origin);

    return handleIdentityJsonMutation(
      request,
      { canonicalOrigin: origin },
      async (body, { correlationId }) => {
        let identity;
        try {
          identity = await dal.requireActiveIdentity();
        } catch {
          return {
            ok: false,
            code: "UNAUTHENTICATED",
          };
        }

        const result = await resolvedService.createListing(
          identity.authUserId,
          body,
          { correlationId },
        );

        if (result.status === "success") {
          return {
            ok: true,
            data: result.data,
            status: 201,
          };
        }

        if (result.status === "invalid") {
          return {
            ok: false,
            code: "INVALID_INPUT",
            fieldErrors: result.fieldErrors,
          };
        }

        if (result.status === "rate_limited") {
          return {
            ok: false,
            code: "RATE_LIMITED",
            retryAfterSeconds: result.retryAfterSeconds,
          };
        }

        if (result.status === "unauthenticated") {
          return {
            ok: false,
            code: "UNAUTHENTICATED",
          };
        }

        if (result.status === "account_unavailable") {
          return {
            ok: false,
            code: "FORBIDDEN",
          };
        }

        if (result.status === "conflict") {
          return {
            ok: false,
            code: "CONFLICT",
          };
        }

        return {
          ok: false,
          code: "DEPENDENCY_UNAVAILABLE",
        };
      },
    );
  };
}

export const POST = createListingsRouteHandler();
