import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  parseRefreshCookie,
  remainingSessionAge,
  encodeRefreshCookie,
  sessionCookieOptions,
} from "./session-cookie";

type RefreshResult =
  | { status: "refreshed"; accessToken: string; refreshToken: string }
  | { status: "invalid" }
  | { status: "unavailable" };
type Refresh = (refreshToken: string) => Promise<RefreshResult>;

function accessExpiresAt(token: string | undefined) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const binary = atob(payload.replace(/-/gu, "+").replace(/_/gu, "/"));
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof claims !== "object" || claims === null || !("exp" in claims)) {
      return null;
    }
    const expiresAt = claims.exp;
    return typeof expiresAt === "number" && Number.isFinite(expiresAt)
      ? expiresAt
      : null;
  } catch {
    return null;
  }
}

async function refreshWithSupabase(
  refreshToken: string,
): Promise<RefreshResult> {
  const url = process.env.SUPABASE_INTERNAL_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return { status: "unavailable" };

  try {
    const client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) {
      return {
        status:
          error.status === 400 || error.status === 401
            ? "invalid"
            : "unavailable",
      };
    }
    if (!data.session?.access_token || !data.session.refresh_token) {
      return { status: "unavailable" };
    }
    return {
      status: "refreshed",
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  } catch {
    return { status: "unavailable" };
  }
}

export async function refreshAuthSession(
  request: NextRequest,
  refresh: Refresh = refreshWithSupabase,
  now = Math.floor(Date.now() / 1000),
) {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshValue = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshValue) return NextResponse.next();

  const stored = parseRefreshCookie(refreshValue);
  const remaining = stored ? remainingSessionAge(stored.issuedAt, now) : 0;
  if (!stored || remaining === 0) {
    request.cookies.delete(AUTH_COOKIE_NAME);
    request.cookies.delete(REFRESH_COOKIE_NAME);
    const response = NextResponse.next({ request });
    response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieOptions(0));
    response.cookies.set(REFRESH_COOKIE_NAME, "", sessionCookieOptions(0));
    response.headers.set("cache-control", "private, no-store");
    return response;
  }

  const expiresAt = accessExpiresAt(accessToken);
  if (expiresAt !== null && expiresAt > now + 60) {
    return NextResponse.next();
  }

  const result = await refresh(stored.refreshToken);
  if (result.status === "unavailable") return NextResponse.next();
  if (result.status === "invalid") {
    request.cookies.delete(AUTH_COOKIE_NAME);
    request.cookies.delete(REFRESH_COOKIE_NAME);
    const response = NextResponse.next({ request });
    response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieOptions(0));
    response.cookies.set(REFRESH_COOKIE_NAME, "", sessionCookieOptions(0));
    response.headers.set("cache-control", "private, no-store");
    return response;
  }

  const rotatedRefresh = encodeRefreshCookie(
    result.refreshToken,
    stored.issuedAt,
  );
  request.cookies.set(AUTH_COOKIE_NAME, result.accessToken);
  request.cookies.set(REFRESH_COOKIE_NAME, rotatedRefresh);
  const response = NextResponse.next({ request });
  response.cookies.set(
    AUTH_COOKIE_NAME,
    result.accessToken,
    sessionCookieOptions(remaining),
  );
  response.cookies.set(
    REFRESH_COOKIE_NAME,
    rotatedRefresh,
    sessionCookieOptions(remaining),
  );
  response.headers.set("cache-control", "private, no-store");
  return response;
}
