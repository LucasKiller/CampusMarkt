import { NextResponse } from "next/server";
import { isSupportedLocale } from "@campusmarkt/domain";

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let suppliedUrl: URL;
  try {
    suppliedUrl = new URL(origin);
  } catch {
    return false;
  }

  // 1. Host header match
  const host = request.headers.get("host");
  if (
    host &&
    (suppliedUrl.host === host ||
      (host.startsWith("localhost:") && suppliedUrl.hostname === "127.0.0.1") ||
      (host.startsWith("127.0.0.1:") && suppliedUrl.hostname === "localhost"))
  ) {
    return true;
  }

  // 2. Request URL match (including loopback equivalence)
  try {
    const requestUrl = new URL(request.url);
    if (suppliedUrl.origin === requestUrl.origin) {
      return true;
    }
    if (
      suppliedUrl.port === requestUrl.port &&
      ((suppliedUrl.hostname === "localhost" &&
        requestUrl.hostname === "127.0.0.1") ||
        (suppliedUrl.hostname === "127.0.0.1" &&
          requestUrl.hostname === "localhost"))
    ) {
      return true;
    }
  } catch {
    // ignore
  }

  // 3. Configured base URLs
  const baseUrls = [
    process.env.SITE_URL,
    process.env.IDENTITY_ACTION_BASE_URL,
  ].filter(Boolean) as string[];

  for (const base of baseUrls) {
    try {
      if (suppliedUrl.origin === new URL(base).origin) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("locale" in body) ||
    !isSupportedLocale((body as { locale: unknown }).locale)
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid or unsupported locale" },
      { status: 400 },
    );
  }

  const locale = (body as { locale: string }).locale;
  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
    secure: isProduction,
  });

  return response;
}
