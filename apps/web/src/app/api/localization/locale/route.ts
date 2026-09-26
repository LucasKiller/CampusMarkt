import { NextResponse } from "next/server";
import { isSupportedLocale } from "@campusmarkt/domain";

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestOrigin = new URL(request.url).origin;
    if (new URL(origin).origin === requestOrigin) {
      return true;
    }
  } catch {
    // ignore
  }

  const baseUrls = [
    process.env.SITE_URL,
    process.env.IDENTITY_ACTION_BASE_URL,
  ].filter(Boolean) as string[];

  for (const base of baseUrls) {
    try {
      if (new URL(origin).origin === new URL(base).origin) {
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
