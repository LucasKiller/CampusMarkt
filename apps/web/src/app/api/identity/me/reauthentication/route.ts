import { handleIdentityJsonMutation } from "../../../../../modules/identity/http/index";
import {
  getAccessService,
  getSessionDal,
} from "../../../../../modules/identity/server/access";
import {
  appendSessionCookies,
  type SessionTokens,
} from "../../../../../modules/identity/session-cookie";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

export function createReauthenticationHandler(
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
      let establishedSession: SessionTokens | null = null;

      const response = await handleIdentityJsonMutation(
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

          const result = await resolvedService.reauthenticate(
            identity,
            {
              email: body.email,
              password: body.password,
            },
            (tokens) => {
              establishedSession = tokens;
            },
          );

          if (result.status === "invalid") {
            return {
              ok: false,
              code: "INVALID_INPUT",
              fieldErrors: result.fieldErrors,
            };
          }
          if (result.status === "denied") {
            return {
              ok: false,
              code: "UNAUTHENTICATED",
            };
          }
          if (result.status === "unavailable") {
            return {
              ok: false,
              code: "DEPENDENCY_UNAVAILABLE",
            };
          }
          if (!establishedSession) {
            return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
          }

          return {
            ok: true,
            data: {
              status: "reauthenticated" as const,
            },
            status: 200,
          };
        },
      );

      if (response.status === 200 && establishedSession) {
        appendSessionCookies(
          response.headers,
          establishedSession,
          Math.floor(Date.now() / 1000),
        );
      }

      return response;
    },
  };
}

const defaultHandler = createReauthenticationHandler();
export const POST = defaultHandler.POST;
