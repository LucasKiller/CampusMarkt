export const AUTH_COOKIE_NAME = "campusmarkt-auth";
export const REFRESH_COOKIE_NAME = "campusmarkt-refresh";
export const MAX_AUTH_COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionTokens = { accessToken: string; refreshToken: string };

export function encodeRefreshCookie(refreshToken: string, issuedAt: number) {
  return `${issuedAt}.${encodeURIComponent(refreshToken)}`;
}

export function parseRefreshCookie(value: string | undefined) {
  if (!value) return null;
  const separator = value.indexOf(".");
  if (separator < 1) return null;
  const issuedAt = Number(value.slice(0, separator));
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) return null;
  try {
    const refreshToken = decodeURIComponent(value.slice(separator + 1));
    return refreshToken ? { refreshToken, issuedAt } : null;
  } catch {
    return null;
  }
}

export function remainingSessionAge(issuedAt: number, now: number) {
  if (issuedAt > now || issuedAt <= 0) return 0;
  return Math.max(0, MAX_AUTH_COOKIE_AGE_SECONDS - (now - issuedAt));
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function cookieHeader(name: string, value: string, maxAge: number) {
  return [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function appendSessionCookies(
  headers: Headers,
  tokens: SessionTokens,
  issuedAt: number,
  now = Math.floor(Date.now() / 1000),
) {
  const maxAge = remainingSessionAge(issuedAt, now);
  if (maxAge === 0) return false;
  headers.append(
    "set-cookie",
    cookieHeader(AUTH_COOKIE_NAME, tokens.accessToken, maxAge),
  );
  headers.append(
    "set-cookie",
    cookieHeader(
      REFRESH_COOKIE_NAME,
      encodeRefreshCookie(tokens.refreshToken, issuedAt),
      maxAge,
    ),
  );
  return true;
}

export function appendClearedSessionCookies(headers: Headers) {
  headers.append("set-cookie", cookieHeader(AUTH_COOKIE_NAME, "", 0));
  headers.append("set-cookie", cookieHeader(REFRESH_COOKIE_NAME, "", 0));
}
