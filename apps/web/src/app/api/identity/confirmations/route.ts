import { handleIdentityJsonMutation } from "../../../../modules/identity/http/index";
import { getRegistrationService } from "../../../../modules/identity/server/registration";

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

export function createConfirmationHandler(
  service?: ReturnType<typeof getRegistrationService>,
  canonicalOrigin?: string,
) {
  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedService = service ?? getRegistrationService();
    const cookieToken = parseCookie(
      request.headers.get("cookie"),
      "campusmarkt-action-email_confirmation",
    );

    const response = await handleIdentityJsonMutation(
      request,
      { canonicalOrigin: origin },
      async (body) => {
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

        const result = await resolvedService.confirmEmail(token);
        if (result.status === "unavailable") {
          return {
            ok: false,
            code: "DEPENDENCY_UNAVAILABLE",
          };
        }

        return {
          ok: true,
          data: { status: result.status },
          status: 200,
        };
      },
    );

    // Clear the action cookie after confirmation attempt
    response.headers.append(
      "set-cookie",
      "campusmarkt-action-email_confirmation=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
    );

    return response;
  };
}

export const POST = createConfirmationHandler();
