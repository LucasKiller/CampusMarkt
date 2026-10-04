import { describe, expect, it, vi } from "vitest";
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  MAX_AUTH_COOKIE_AGE_SECONDS,
  encodeRefreshCookie,
  parseRefreshCookie,
} from "../../../apps/web/src/modules/identity/session-cookie.ts";
import { refreshAuthSession } from "../../../apps/web/src/modules/identity/session-refresh.ts";

const now = 1_800_000_000;

function jwt(expiresAt: number) {
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", session_id: "session-1", exp: expiresAt }),
  ).toString("base64url");
  return `header.${payload}.signature`;
}

function request(access: string, refresh?: string) {
  const values = new Map<string, string>([
    [AUTH_COOKIE_NAME, access],
    ...(refresh ? [[REFRESH_COOKIE_NAME, refresh] as [string, string]] : []),
  ]);
  return {
    url: "https://campusmarkt.example/account",
    headers: new Headers(),
    cookies: {
      get(name: string) {
        const value = values.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set(name: string, value: string) {
        values.set(name, value);
      },
      delete(name: string) {
        values.delete(name);
      },
    },
  } as unknown as Parameters<typeof refreshAuthSession>[0];
}

describe("bounded session refresh", () => {
  it("rotates both HttpOnly cookies and forwards the new access token to the request", async () => {
    const issuedAt = now - 90;
    const oldAccess = jwt(now - 1);
    const newAccess = jwt(now + 3600);
    const req = request(
      oldAccess,
      encodeRefreshCookie("old-refresh", issuedAt),
    );
    const refresh = vi.fn(async () => ({
      status: "refreshed" as const,
      accessToken: newAccess,
      refreshToken: "new-refresh",
    }));

    const response = await refreshAuthSession(req, refresh, now);

    expect(refresh).toHaveBeenCalledExactlyOnceWith("old-refresh");
    expect(req.cookies.get(AUTH_COOKIE_NAME)?.value).toBe(newAccess);
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.value).toBe(newAccess);
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.httpOnly).toBe(true);
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.sameSite).toBe("lax");
    expect(
      parseRefreshCookie(response.cookies.get(REFRESH_COOKIE_NAME)?.value),
    ).toEqual({ refreshToken: "new-refresh", issuedAt });
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.httpOnly).toBe(true);
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.sameSite).toBe("lax");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.maxAge).toBe(
      MAX_AUTH_COOKIE_AGE_SECONDS - 90,
    );
  });

  it("refreshes at 60 seconds before expiry but waits at 61 seconds", async () => {
    const refresh = vi.fn(async () => ({
      status: "refreshed" as const,
      accessToken: jwt(now + 3600),
      refreshToken: "rotated",
    }));
    const threshold = request(
      jwt(now + 60),
      encodeRefreshCookie("at-threshold", now - 20),
    );
    const early = request(
      jwt(now + 61),
      encodeRefreshCookie("early", now - 20),
    );

    const thresholdResponse = await refreshAuthSession(threshold, refresh, now);
    const earlyResponse = await refreshAuthSession(early, refresh, now);

    expect(refresh).toHaveBeenCalledExactlyOnceWith("at-threshold");
    expect(thresholdResponse.cookies.get(AUTH_COOKIE_NAME)?.value).toBe(
      jwt(now + 3600),
    );
    expect(earlyResponse.cookies.getAll()).toHaveLength(0);
  });

  it("marks each rotated credential Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const req = request(
        jwt(now + 30),
        encodeRefreshCookie("current-refresh", now - 20),
      );
      const response = await refreshAuthSession(
        req,
        async () => ({
          status: "refreshed",
          accessToken: jwt(now + 3600),
          refreshToken: "new-refresh",
        }),
        now,
      );
      for (const name of [AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME]) {
        expect(response.cookies.get(name)?.httpOnly).toBe(true);
        expect(response.cookies.get(name)?.sameSite).toBe("lax");
        expect(response.cookies.get(name)?.secure).toBe(true);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not refresh a valid access token or a legacy access-only cookie", async () => {
    const refresh = vi.fn();
    const current = request(
      jwt(now + 600),
      encodeRefreshCookie("keep", now - 20),
    );
    const legacy = request(jwt(now - 1));

    const currentResponse = await refreshAuthSession(current, refresh, now);
    const legacyResponse = await refreshAuthSession(legacy, refresh, now);

    expect(refresh).not.toHaveBeenCalled();
    expect(currentResponse.cookies.getAll()).toHaveLength(0);
    expect(legacyResponse.cookies.getAll()).toHaveLength(0);
  });

  it("ends credentials at the original 30-day boundary", async () => {
    const refresh = vi.fn();
    const req = request(
      jwt(now + 600),
      encodeRefreshCookie("old", now - MAX_AUTH_COOKIE_AGE_SECONDS),
    );

    const response = await refreshAuthSession(req, refresh, now);

    expect(refresh).not.toHaveBeenCalled();
    expect(req.cookies.get(AUTH_COOKIE_NAME)).toBeUndefined();
    expect(req.cookies.get(REFRESH_COOKIE_NAME)).toBeUndefined();
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.maxAge).toBe(0);
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.maxAge).toBe(0);
  });

  it("clears both credentials when Auth rejects the refresh token", async () => {
    const req = request(jwt(now - 1), encodeRefreshCookie("revoked", now - 20));
    const response = await refreshAuthSession(
      req,
      async () => ({ status: "invalid" }),
      now,
    );

    expect(req.cookies.get(AUTH_COOKIE_NAME)).toBeUndefined();
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.maxAge).toBe(0);
    expect(response.cookies.get(REFRESH_COOKIE_NAME)?.maxAge).toBe(0);
  });

  it("keeps credentials for retry when Auth is temporarily unavailable", async () => {
    const oldAccess = jwt(now - 1);
    const req = request(oldAccess, encodeRefreshCookie("retry", now - 20));
    const response = await refreshAuthSession(
      req,
      async () => ({ status: "unavailable" }),
      now,
    );

    expect(req.cookies.get(AUTH_COOKIE_NAME)?.value).toBe(oldAccess);
    expect(response.cookies.getAll()).toHaveLength(0);
  });
});
