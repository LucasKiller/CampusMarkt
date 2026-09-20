import { handleIdentityJsonMutation } from "../../../../modules/identity/http/index";
import {
  getAccessService,
  AUTH_COOKIE_NAME,
} from "../../../../modules/identity/server/access";

function getCanonicalOrigin(request: Request) {
  return (
    process.env.SITE_URL ||
    process.env.IDENTITY_ACTION_BASE_URL ||
    new URL(request.url).origin
  );
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...vals] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(vals.join("="));
    }
  }
  return null;
}

export function createPasswordResetHandler(
  service?: ReturnType<typeof getAccessService>,
  canonicalOrigin?: string,
) {
  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedService = service ?? getAccessService(origin);
    const cookieToken = parseCookie(
      request.headers.get("cookie"),
      "campusmarkt-action-password_recovery",
    );

    const response = await handleIdentityJsonMutation<{
      status: "password_updated" | "invalid_link";
    }>(request, { canonicalOrigin: origin }, async (body) => {
      const token =
        cookieToken ||
        (typeof body.token === "string" ? body.token.trim() : "");

      if (!token) {
        return {
          ok: true,
          data: { status: "invalid_link" as const },
          status: 200,
        };
      }

      const result = await resolvedService.resetPassword(token, body.password);

      if (result.status === "invalid") {
        return {
          ok: false,
          code: "INVALID_INPUT",
          fieldErrors: result.fieldErrors,
        };
      }
      if (result.status === "invalid_link") {
        return {
          ok: true,
          data: { status: "invalid_link" as const },
          status: 200,
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
        data: { status: "password_updated" as const },
        status: 200,
      };
    });

    // Clear action cookie and any pre-existing auth cookie
    response.headers.append(
      "set-cookie",
      "campusmarkt-action-password_recovery=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
    );
    response.headers.append(
      "set-cookie",
      `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    );

    return response;
  };
}

export const POST = createPasswordResetHandler();
