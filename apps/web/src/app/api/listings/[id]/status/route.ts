import { handleIdentityJsonMutation } from "../../../../../modules/identity/http/index";
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

export function createListingStatusHandler(
  service?: ListingApplicationService,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return async function POST(
    request: Request,
    context: { params: Promise<RouteParams> | RouteParams },
  ) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const params = await context.params;
    const listingId = params.id;

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

        const result = await resolvedService.transitionStatus(
          identity.authUserId,
          listingId,
          body,
          { correlationId },
        );

        if (result.status === "success") {
          return {
            ok: true,
            data: result.data,
            status: 200,
          };
        }

        if (result.status === "invalid") {
          return {
            ok: false,
            code: "INVALID_INPUT",
            fieldErrors: result.fieldErrors,
          };
        }

        if (result.status === "conflict") {
          return {
            ok: false,
            code: "CONFLICT",
          };
        }

        if (result.status === "forbidden") {
          return {
            ok: false,
            code: "FORBIDDEN",
          };
        }

        if (result.status === "not_found") {
          return {
            ok: false,
            code: "NOT_FOUND",
          };
        }

        if (result.status === "unauthenticated") {
          return {
            ok: false,
            code: "UNAUTHENTICATED",
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

export const POST = createListingStatusHandler();
