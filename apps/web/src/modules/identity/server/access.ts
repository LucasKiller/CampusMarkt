import "server-only";

import { Buffer } from "node:buffer";
import { cookies } from "next/headers";

import { createAccessService } from "../application/access/index";
import {
  AUTH_COOKIE_NAME,
  MAX_AUTH_COOKIE_AGE_SECONDS,
} from "../infrastructure/supabase/client/cookies";
import { getIdentityInfrastructureConfig } from "../infrastructure/environment";
import { createSupabaseAuthGateway } from "../infrastructure/supabase/auth/index";
import {
  createAdminSupabaseClient,
  createAnonSupabaseClient,
  createUserTokenSupabaseClient,
} from "../infrastructure/supabase/client/index";
import {
  createIdentityRepository,
  type IdentityRpcClient,
} from "../infrastructure/supabase/repository/index";
import { createIdentitySecurity } from "../security/index";
import { createIdentitySessionDal } from "./session/index";
import { getActionLinkService } from "./registration";

export { AUTH_COOKIE_NAME, MAX_AUTH_COOKIE_AGE_SECONDS };

export function parseJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const decoded = Buffer.from(parts[1], "base64").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function resolveCookieSession() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!authCookie) {
      return { ok: false as const, code: "NO_SESSION" as const };
    }

    let token = authCookie;
    // Handle JSON formatted cookie if present
    if (authCookie.startsWith("{") || authCookie.startsWith("[")) {
      try {
        const parsed = JSON.parse(authCookie);
        token = parsed.access_token || parsed[0] || authCookie;
      } catch {
        // Fall back to raw string
      }
    }

    const payload = parseJwtPayload(token);
    if (!payload) {
      return { ok: false as const, code: "MALFORMED" as const };
    }

    const authUserId = (payload.sub || payload.user_id) as string;
    const sessionId = (payload.session_id || payload.sid) as string;
    const expiresAt = payload.exp as number;

    if (!authUserId || !sessionId || typeof expiresAt !== "number") {
      return { ok: false as const, code: "MALFORMED" as const };
    }

    if (expiresAt * 1000 <= Date.now()) {
      return { ok: false as const, code: "EXPIRED" as const };
    }

    return {
      ok: true as const,
      value: {
        authUserId,
        sessionId,
        expiresAt,
        token,
      },
    };
  } catch {
    return { ok: false as const, code: "NO_SESSION" as const };
  }
}

export function getSessionDal(canonicalOrigin?: string) {
  const config = getIdentityInfrastructureConfig();
  const origin = canonicalOrigin ?? config.actionBaseUrl;
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const userProxy: IdentityRpcClient = {
    async rpc(
      functionName: string,
      args?: Record<string, unknown>,
      options?: { token?: string },
    ) {
      const token = options?.token;
      const session = token
        ? { ok: true as const, value: { token } }
        : await resolveCookieSession();
      if (
        session.ok &&
        typeof (session.value as { token?: string }).token === "string"
      ) {
        const userClient = createUserTokenSupabaseClient(
          (session.value as { token: string }).token,
          env,
        );
        return (
          userClient.schema("identity_api") as unknown as IdentityRpcClient
        ).rpc(functionName, args);
      }
      return (
        adminClient.schema("identity_api") as unknown as IdentityRpcClient
      ).rpc(functionName, args);
    },
  };

  const repository = createIdentityRepository({
    user: userProxy,
    service: adminClient,
  });

  return createIdentitySessionDal({
    auth: {
      resolveSession: resolveCookieSession,
    },
    repository,
    clearSession: async () => {
      try {
        const cookieStore = await cookies();
        cookieStore.delete(AUTH_COOKIE_NAME);
      } catch {
        // Cookie deletion in read-only phases fails safely
      }
    },
    canonicalOrigin: origin,
  });
}

let cachedAccessService: ReturnType<typeof createAccessService> | null = null;

export function getAccessService(canonicalOrigin?: string) {
  if (cachedAccessService) return cachedAccessService;

  const config = getIdentityInfrastructureConfig();
  const origin = canonicalOrigin ?? config.actionBaseUrl;
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const repository = createIdentityRepository({
    user: adminClient,
    service: adminClient,
  });
  const auth = createSupabaseAuthGateway({
    userClient: {
      auth: {
        signInWithPassword(input) {
          const client = createAnonSupabaseClient(env);
          return client.auth.signInWithPassword(input);
        },
        refreshSession(input) {
          const client = createAnonSupabaseClient(env);
          return client.auth.refreshSession(input);
        },
        async signOut(input) {
          const client = createAnonSupabaseClient(env);
          const { error } = await client.auth.signOut(input);
          return { data: null, error };
        },
      },
    },
    adminClient,
  });
  const security = createIdentitySecurity({
    pepper: config.identityHashPepper,
    repository,
  });
  const actionLinks = getActionLinkService();
  const sessionDal = getSessionDal(origin);

  cachedAccessService = createAccessService({
    security,
    auth,
    session: sessionDal,
    repository,
    actionLinks,
    clearSession: async () => {
      try {
        const cookieStore = await cookies();
        cookieStore.delete(AUTH_COOKIE_NAME);
      } catch {
        // Ignored
      }
    },
  });

  return cachedAccessService;
}
