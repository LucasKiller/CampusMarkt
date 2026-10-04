import type { NextRequest } from "next/server";
import { resolveLocale } from "@campusmarkt/domain";
import { refreshAuthSession } from "./modules/identity/session-refresh";

export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' ws: wss:; frame-ancestors 'none';",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
} as const;

export async function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = resolveLocale(cookieLocale);

  const response = await refreshAuthSession(request);

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  response.headers.set("Vary", "Cookie");
  response.headers.set("Content-Language", locale);

  return response;
}

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
