import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  MAX_AUTH_COOKIE_AGE_SECONDS,
  createAuthCookieMethods,
  type AuthCookieStore,
} from "./cookies";

type SupabaseEnvironment = Record<string, string | undefined>;

export class SupabaseClientConfigurationError extends Error {
  constructor() {
    super("SUPABASE_CLIENT_CONFIGURATION_INVALID");
    this.name = "SupabaseClientConfigurationError";
  }
}

function required(environment: SupabaseEnvironment, name: string) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new SupabaseClientConfigurationError();
  }
  return value;
}

export function createUserSupabaseClient(
  cookieStore: AuthCookieStore,
  environment: SupabaseEnvironment = process.env,
) {
  const internalUrl = required(environment, "SUPABASE_INTERNAL_URL");
  const publishableKey = required(environment, "SUPABASE_PUBLISHABLE_KEY");

  return createServerClient(internalUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
    cookieOptions: {
      name: AUTH_COOKIE_NAME,
      httpOnly: true,
      maxAge: MAX_AUTH_COOKIE_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: createAuthCookieMethods(cookieStore),
  });
}

export async function createRequestSupabaseClient(
  environment: SupabaseEnvironment = process.env,
) {
  return createUserSupabaseClient(await cookies(), environment);
}

export function createAdminSupabaseClient(
  environment: SupabaseEnvironment = process.env,
) {
  const internalUrl = required(environment, "SUPABASE_INTERNAL_URL");
  const serviceRoleKey = required(environment, "SUPABASE_SERVICE_ROLE_KEY");

  return createClient(internalUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export {
  AUTH_COOKIE_NAME,
  MAX_AUTH_COOKIE_AGE_SECONDS,
  AuthCookieMutationError,
  clearAuthCookies,
  createAuthCookieMethods,
} from "./cookies";
