import { handleIdentityJsonMutation } from "../../../../../modules/identity/http/index";
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

type ConfirmationOutcome =
  | { status: "invalid_link" }
  | {
      status: "verified";
      universityId: string;
      badgeLabel: string;
      expiresAt: string;
    };

export function createUniversityConfirmationHandler(
  service?: UniversityVerificationService,
  canonicalOrigin?: string,
) {
  return async function POST(request: Request) {
    const origin = canonicalOrigin ?? getCanonicalOrigin(request);
    const resolvedService = service ?? getUniversityVerificationService(origin);
    const cookieToken = parseCookie(
      request.headers.get("cookie"),
      "campusmarkt-action-university_verification",
    );

    const response = await handleIdentityJsonMutation<ConfirmationOutcome>(
      request,
      { canonicalOrigin: origin },
      async (body, { correlationId }) => {
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

        const trustedClientIp = extractTrustedClientIp(request);
        const result = await resolvedService.confirmVerification(token, {
          trustedClientIp,
          correlationId,
        });

        if (result.status === "invalid_link") {
          return {
            ok: true,
            data: { status: "invalid_link" as const },
            status: 200,
          };
        }

        if (result.status === "conflict") {
          return {
            ok: false,
            code: "CONFLICT",
          };
        }

        if (result.status === "account_unavailable") {
          return {
            ok: false,
            code: "FORBIDDEN",
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
            status: "verified",
            universityId: result.universityId,
            badgeLabel: result.badgeLabel,
            expiresAt: result.expiresAt,
          },
          status: 200,
        };
      },
    );

    // Clear the action cookie if it was present
    if (cookieToken && response.status < 500) {
      response.headers.append(
        "set-cookie",
        "campusmarkt-action-university_verification=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
      );
    }

    return response;
  };
}

export const POST = createUniversityConfirmationHandler();
