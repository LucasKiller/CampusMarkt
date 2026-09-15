import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AUTH_COOKIE_NAME,
  MAX_AUTH_COOKIE_AGE_SECONDS,
  AuthCookieMutationError,
  clearAuthCookies,
  createAuthCookieMethods,
} from "./cookies";

type StoredCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

function cookieStore(initial: StoredCookie[] = []) {
  const current = [...initial];
  const writes: StoredCookie[] = [];

  return {
    current,
    writes,
    getAll: vi.fn(() => current.map(({ name, value }) => ({ name, value }))),
    set: vi.fn(
      (name: string, value: string, options?: Record<string, unknown>) => {
        writes.push({ name, value, options });
      },
    ),
  };
}

describe("identity auth cookie adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the base auth cookie from the request store", async () => {
    const store = cookieStore([{ name: AUTH_COOKIE_NAME, value: "base" }]);

    await expect(createAuthCookieMethods(store).getAll()).resolves.toEqual([
      { name: AUTH_COOKIE_NAME, value: "base" },
    ]);
  });

  it("reads every auth cookie chunk in request order", async () => {
    const store = cookieStore([
      { name: `${AUTH_COOKIE_NAME}.0`, value: "first" },
      { name: `${AUTH_COOKIE_NAME}.1`, value: "second" },
    ]);

    await expect(createAuthCookieMethods(store).getAll()).resolves.toEqual([
      { name: `${AUTH_COOKIE_NAME}.0`, value: "first" },
      { name: `${AUTH_COOKIE_NAME}.1`, value: "second" },
    ]);
  });

  it("does not expose unrelated request cookies to the auth client", async () => {
    const store = cookieStore([
      { name: "preferences", value: "private" },
      { name: `${AUTH_COOKIE_NAME}.0`, value: "session" },
    ]);

    await expect(createAuthCookieMethods(store).getAll()).resolves.toEqual([
      { name: `${AUTH_COOKIE_NAME}.0`, value: "session" },
    ]);
  });

  it("keeps PKCE verifier cookies available to the server auth client", async () => {
    const verifierName = `${AUTH_COOKIE_NAME}-flow-abcdefgh-code-verifier.0`;
    const store = cookieStore([{ name: verifierName, value: "verifier" }]);

    await expect(createAuthCookieMethods(store).getAll()).resolves.toEqual([
      { name: verifierName, value: "verifier" },
    ]);
  });

  it("does not pass malformed chunk names to the auth provider", async () => {
    const store = cookieStore([
      { name: `${AUTH_COOKIE_NAME}.not-a-chunk`, value: "malformed" },
      { name: `${AUTH_COOKIE_NAME}.0`, value: "valid" },
    ]);

    await expect(createAuthCookieMethods(store).getAll()).resolves.toEqual([
      { name: `${AUTH_COOKIE_NAME}.0`, value: "valid" },
    ]);
  });

  it("writes every cookie as HttpOnly SameSite Lax on the root path", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store).setAll?.(
      [{ name: AUTH_COOKIE_NAME, value: "session", options: {} }],
      {},
    );

    expect(store.writes[0]?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("sets Secure in production", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store, { production: true }).setAll?.(
      [{ name: AUTH_COOKIE_NAME, value: "session", options: {} }],
      {},
    );

    expect(store.writes[0]?.options?.secure).toBe(true);
  });

  it("does not set Secure for local HTTP development", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store, { production: false }).setAll?.(
      [{ name: AUTH_COOKIE_NAME, value: "session", options: {} }],
      {},
    );

    expect(store.writes[0]?.options?.secure).toBe(false);
  });

  it("caps provider cookie lifetime at thirty days", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store).setAll?.(
      [
        {
          name: AUTH_COOKIE_NAME,
          value: "session",
          options: { maxAge: MAX_AUTH_COOKIE_AGE_SECONDS * 2 },
        },
      ],
      {},
    );

    expect(store.writes[0]?.options?.maxAge).toBe(MAX_AUTH_COOKIE_AGE_SECONDS);
  });

  it("gives provider cookies with no lifetime a thirty-day maximum", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store).setAll?.(
      [{ name: AUTH_COOKIE_NAME, value: "session", options: {} }],
      {},
    );

    expect(store.writes[0]?.options?.maxAge).toBe(MAX_AUTH_COOKIE_AGE_SECONDS);
  });

  it("preserves immediate expiry while enforcing secure attributes", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store, { production: true }).setAll?.(
      [
        {
          name: `${AUTH_COOKIE_NAME}.0`,
          value: "",
          options: { maxAge: 0 },
        },
      ],
      {},
    );

    expect(store.writes[0]).toEqual({
      name: `${AUTH_COOKIE_NAME}.0`,
      value: "",
      options: expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: true,
      }),
    });
  });

  it("applies identical security attributes to every rotated chunk", async () => {
    const store = cookieStore();

    await createAuthCookieMethods(store, { production: true }).setAll?.(
      [
        { name: `${AUTH_COOKIE_NAME}.0`, value: "first", options: {} },
        { name: `${AUTH_COOKIE_NAME}.1`, value: "second", options: {} },
      ],
      {},
    );

    expect(store.writes.map(({ options }) => options)).toEqual([
      expect.objectContaining({
        httpOnly: true,
        maxAge: MAX_AUTH_COOKIE_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: true,
      }),
      expect.objectContaining({
        httpOnly: true,
        maxAge: MAX_AUTH_COOKIE_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: true,
      }),
    ]);
  });

  it("rejects a provider attempt to write an unrelated cookie", async () => {
    const store = cookieStore();

    await expect(
      createAuthCookieMethods(store).setAll?.(
        [{ name: "tracking", value: "value", options: {} }],
        {},
      ),
    ).rejects.toEqual(new AuthCookieMutationError());
    expect(store.writes).toEqual([]);
  });

  it("maps cookie-store write failures to a bounded error", async () => {
    const store = cookieStore();
    store.set.mockImplementation(() => {
      throw new Error("raw cookie provider detail");
    });

    await expect(
      createAuthCookieMethods(store).setAll?.(
        [{ name: AUTH_COOKIE_NAME, value: "session", options: {} }],
        {},
      ),
    ).rejects.toEqual(new AuthCookieMutationError());
  });

  it("clears the base auth cookie and every present chunk", () => {
    const store = cookieStore([
      { name: AUTH_COOKIE_NAME, value: "base" },
      { name: `${AUTH_COOKIE_NAME}.0`, value: "first" },
      { name: `${AUTH_COOKIE_NAME}.1`, value: "second" },
    ]);

    clearAuthCookies(store, { production: true });

    expect(
      store.writes.map(({ name, value, options }) => [name, value, options]),
    ).toEqual([
      [AUTH_COOKIE_NAME, "", expect.objectContaining({ maxAge: 0 })],
      [`${AUTH_COOKIE_NAME}.0`, "", expect.objectContaining({ maxAge: 0 })],
      [`${AUTH_COOKIE_NAME}.1`, "", expect.objectContaining({ maxAge: 0 })],
    ]);
  });

  it("clears every PKCE verifier fragment", () => {
    const store = cookieStore([
      { name: `${AUTH_COOKIE_NAME}-code-verifier`, value: "one" },
      { name: `${AUTH_COOKIE_NAME}-flows-code-verifier.0`, value: "two" },
    ]);

    clearAuthCookies(store);

    expect(store.writes.map(({ name }) => name)).toEqual([
      `${AUTH_COOKIE_NAME}-code-verifier`,
      `${AUTH_COOKIE_NAME}-flows-code-verifier.0`,
    ]);
  });

  it("does not clear similarly named or unrelated cookies", () => {
    const store = cookieStore([
      { name: `${AUTH_COOKIE_NAME}-malformed`, value: "do-not-touch" },
      { name: "preferences", value: "do-not-touch" },
    ]);

    clearAuthCookies(store);

    expect(store.writes).toEqual([]);
  });

  it("performs no writes when no auth fragments exist", () => {
    const store = cookieStore([{ name: "preferences", value: "value" }]);

    clearAuthCookies(store);

    expect(store.set).not.toHaveBeenCalled();
  });
});
