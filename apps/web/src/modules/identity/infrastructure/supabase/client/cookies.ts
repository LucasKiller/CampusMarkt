import "server-only";

import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";

export const AUTH_COOKIE_NAME = "campusmarkt-auth";
export const MAX_AUTH_COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;

type RequestCookie = { name: string; value: string };

type AuthCookieStore = {
  getAll(): RequestCookie[];
  set(name: string, value: string, options: CookieOptions): void;
};

type CookieSecurity = { production?: boolean };

export class AuthCookieMutationError extends Error {
  constructor() {
    super("AUTH_COOKIE_MUTATION_FAILED");
    this.name = "AuthCookieMutationError";
  }
}

function isAuthCookieName(name: string) {
  if (
    name === AUTH_COOKIE_NAME ||
    /^\.\d+$/u.test(name.slice(AUTH_COOKIE_NAME.length))
  ) {
    return true;
  }

  const verifierName = name.slice(AUTH_COOKIE_NAME.length);
  return /^(?:-code-verifier|-flows-code-verifier|-flow-[A-Za-z0-9_-]{8,64}-code-verifier)(?:\.\d+)?$/u.test(
    verifierName,
  );
}

function secureOptions(
  options: CookieOptions,
  { production = process.env.NODE_ENV === "production" }: CookieSecurity,
): CookieOptions {
  const requestedMaxAge = options.maxAge;
  const maxAge =
    typeof requestedMaxAge === "number" && requestedMaxAge <= 0
      ? 0
      : Math.min(
          typeof requestedMaxAge === "number"
            ? requestedMaxAge
            : MAX_AUTH_COOKIE_AGE_SECONDS,
          MAX_AUTH_COOKIE_AGE_SECONDS,
        );

  return {
    ...options,
    expires: undefined,
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: production,
  };
}

function writeCookie(
  store: AuthCookieStore,
  cookie: RequestCookie & { options: CookieOptions },
  security: CookieSecurity,
) {
  if (!isAuthCookieName(cookie.name)) {
    throw new AuthCookieMutationError();
  }

  try {
    store.set(
      cookie.name,
      cookie.value,
      secureOptions(cookie.options, security),
    );
  } catch {
    throw new AuthCookieMutationError();
  }
}

export function createAuthCookieMethods(
  store: AuthCookieStore,
  security: CookieSecurity = {},
): CookieMethodsServer {
  return {
    getAll: async () =>
      store.getAll().filter(({ name }) => isAuthCookieName(name)),
    setAll: async (cookies) => {
      for (const cookie of cookies) {
        writeCookie(store, cookie, security);
      }
    },
  };
}

export function clearAuthCookies(
  store: AuthCookieStore,
  security: CookieSecurity = {},
) {
  for (const cookie of store.getAll()) {
    if (isAuthCookieName(cookie.name)) {
      writeCookie(
        store,
        { name: cookie.name, value: "", options: { maxAge: 0 } },
        security,
      );
    }
  }
}

export type { AuthCookieStore };
