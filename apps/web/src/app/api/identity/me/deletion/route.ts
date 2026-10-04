import type { DeletionResult } from "@campusmarkt/types";
import { parseDeletionConfirmation } from "@campusmarkt/validation";
import { handleIdentityJsonMutation } from "../../../../../modules/identity/http/index";
import {
  getAccessService,
  getSessionDal,
} from "../../../../../modules/identity/server/access";
import { appendClearedSessionCookies } from "../../../../../modules/identity/session-cookie";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createAccountDeletionHandler(
  service?: ReturnType<typeof getAccessService>,
  sessionDalGetter?: typeof getSessionDal,
  canonicalOrigin?: string,
) {
  const getDal = sessionDalGetter ?? getSessionDal;

  return {
    async POST(request: Request) {
      const origin = canonicalOrigin ?? getCanonicalOrigin(request);
      const resolvedService = service ?? getAccessService(origin);
      const dal = getDal(origin);

      let outcomeStatus:
        "deletion_pending" | "reauthentication_required" | null = null;

      const response = await handleIdentityJsonMutation<DeletionResult>(
        request,
        { canonicalOrigin: origin },
        async (body) => {
          try {
            await dal.requireActiveIdentity();
          } catch {
            return {
              ok: false,
              code: "UNAUTHENTICATED",
            };
          }

          const parsed = parseDeletionConfirmation(body);
          if (!parsed.ok) {
            return {
              ok: false,
              code: "INVALID_INPUT",
              fieldErrors: parsed.fieldErrors,
            };
          }

          let result;
          try {
            result = await resolvedService.requestDeletion();
          } catch {
            return {
              ok: false,
              code: "DEPENDENCY_UNAVAILABLE",
            };
          }

          if (result.status === "recent_authentication_required") {
            outcomeStatus = "reauthentication_required";
            return {
              ok: true,
              data: {
                status: "reauthentication_required" as const,
              },
              status: 200,
            };
          }

          if (result.status === "unavailable") {
            return {
              ok: false,
              code: "DEPENDENCY_UNAVAILABLE",
            };
          }

          outcomeStatus = "deletion_pending";
          return {
            ok: true,
            data: {
              status: "deletion_pending" as const,
            },
            status: 200,
          };
        },
      );

      // When deletion becomes pending or dependency failed after local clear, clear auth cookie
      if (outcomeStatus === "deletion_pending" || response.status === 503) {
        appendClearedSessionCookies(response.headers);
      }

      return response;
    },
  };
}

const defaultHandler = createAccountDeletionHandler();
export const POST = defaultHandler.POST;
