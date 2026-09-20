import {
  applyActionStaging,
  type ActionCookie,
} from "../../../../modules/identity/http/index";
import { getActionLinkService } from "../../../../modules/identity/server/registration";

type ActionParams = {
  purpose: string;
};

const DESTINATIONS: Record<string, string> = {
  email_confirmation: "/auth/confirm",
  password_recovery: "/reset-password",
};

export function createActionStagingHandler(
  actionLinks?: ReturnType<typeof getActionLinkService>,
) {
  return async function GET(
    request: Request,
    context: { params: Promise<ActionParams> | ActionParams },
  ) {
    const resolvedActionLinks = actionLinks ?? getActionLinkService();
    const params = await context.params;
    const purpose = params.purpose;

    if (purpose !== "email_confirmation" && purpose !== "password_recovery") {
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Referrer-Policy": "no-referrer",
          "Cache-Control": "no-store",
        },
      });
    }

    const destination = DESTINATIONS[purpose];
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: `${destination}?status=invalid_link`,
          "Referrer-Policy": "no-referrer",
          "Cache-Control": "no-store",
        },
      });
    }

    const staged = await resolvedActionLinks.stage(token, purpose);

    if (staged.status !== "staged") {
      return new Response(null, {
        status: 303,
        headers: {
          Location: `${destination}?status=invalid_link`,
          "Referrer-Policy": "no-referrer",
          "Cache-Control": "no-store",
        },
      });
    }

    const headers = new Headers({
      Location: staged.redirectTo,
    });
    applyActionStaging(headers, staged.cookie as unknown as ActionCookie);

    return new Response(null, {
      status: 303,
      headers,
    });
  };
}

export const GET = createActionStagingHandler();
