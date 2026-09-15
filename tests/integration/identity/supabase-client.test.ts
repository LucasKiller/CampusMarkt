import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createClient, createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(
    (...arguments_: [string, string, Record<string, unknown>]) => {
      void arguments_;
      return { kind: "user-client" };
    },
  ),
  createClient: vi.fn(
    (...arguments_: [string, string, Record<string, unknown>]) => {
      void arguments_;
      return { kind: "admin-client" };
    },
  ),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { AUTH_COOKIE_NAME } from "../../../apps/web/src/modules/identity/infrastructure/supabase/client/cookies.ts";
import {
  SupabaseClientConfigurationError,
  createAdminSupabaseClient,
  createUserSupabaseClient,
} from "../../../apps/web/src/modules/identity/infrastructure/supabase/client/index.ts";

const environment = {
  SUPABASE_INTERNAL_URL: "http://api-gw:8000",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_server_only",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-server-only-value",
};

const cookieStore = {
  getAll: () => [{ name: AUTH_COOKIE_NAME, value: "request-session" }],
  set: vi.fn(),
};

describe("Supabase server clients", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a request-scoped SSR client with only the publishable key", () => {
    expect(createUserSupabaseClient(cookieStore, environment)).toEqual({
      kind: "user-client",
    });
    expect(createServerClient).toHaveBeenCalledWith(
      environment.SUPABASE_INTERNAL_URL,
      environment.SUPABASE_PUBLISHABLE_KEY,
      expect.any(Object),
    );
    expect(JSON.stringify(createServerClient.mock.calls[0])).not.toContain(
      environment.SUPABASE_SERVICE_ROLE_KEY,
    );
  });

  it("configures the SSR client for cookie-only PKCE persistence", () => {
    createUserSupabaseClient(cookieStore, environment);

    expect(createServerClient.mock.calls[0]?.[2]).toMatchObject({
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: true,
      },
      cookieOptions: {
        httpOnly: true,
        maxAge: 2_592_000,
        name: AUTH_COOKIE_NAME,
        path: "/",
        sameSite: "lax",
      },
      cookies: {
        getAll: expect.any(Function),
        setAll: expect.any(Function),
      },
    });
    expect(
      (createServerClient.mock.calls[0]?.[2]?.auth as Record<string, unknown>)
        .storage,
    ).toBeUndefined();
  });

  it("creates an isolated admin client with persistence disabled", () => {
    expect(createAdminSupabaseClient(environment)).toEqual({
      kind: "admin-client",
    });
    expect(createClient).toHaveBeenCalledWith(
      environment.SUPABASE_INTERNAL_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });

  it.each([
    "SUPABASE_INTERNAL_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ])("fails closed with a bounded error when %s is absent", (name) => {
    const missing = { ...environment, [name]: undefined };
    const create =
      name === "SUPABASE_SERVICE_ROLE_KEY"
        ? () => createAdminSupabaseClient(missing)
        : () => createUserSupabaseClient(cookieStore, missing);

    expect(create).toThrow(new SupabaseClientConfigurationError());
    expect(create).not.toThrow(name);
  });
});
