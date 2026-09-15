import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { IdentityApiClientError, createIdentityApiClient } from "./index.js";

const CORRELATION_ID = "018f47a0-1234-7abc-8def-0123456789ab";
const PUBLIC_ID = "018f47a0-1234-7abc-8def-0123456789ab";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
}

function success(data: unknown) {
  return { ok: true, data, correlationId: CORRELATION_ID };
}

describe("same-origin identity API client", () => {
  it("posts registration with same-origin credentials", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(success({ status: "accepted" })),
    );
    const client = createIdentityApiClient(fetcher);
    const command = {
      email: "user@example.com",
      password: "long-password",
      displayName: "Ada Lovelace",
      adultDeclared: true as const,
      termsVersion: "terms-1",
      privacyVersion: "privacy-1",
    };

    await expect(client.register(command)).resolves.toEqual(
      success({ status: "accepted" }),
    );
    expect(fetcher).toHaveBeenCalledWith("/api/identity/registrations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    });
  });

  it("posts sign-in and parses a token-free session", async () => {
    const data = {
      status: "authenticated",
      returnTo: "/account",
      expiresAt: "2026-10-15T10:00:00.000Z",
    };
    const fetcher = vi.fn(async () => jsonResponse(success(data)));
    const client = createIdentityApiClient(fetcher);

    await expect(
      client.signIn({
        email: "user@example.com",
        password: "long-password",
        returnTo: "/account",
      }),
    ).resolves.toEqual(success(data));
    expect(fetcher).toHaveBeenCalledWith(
      "/api/identity/sessions",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("posts a generic recovery request", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(success({ status: "accepted" })),
    );
    const client = createIdentityApiClient(fetcher);

    await expect(
      client.requestRecovery({ email: "user@example.com" }),
    ).resolves.toEqual(success({ status: "accepted" }));
    expect(fetcher).toHaveBeenCalledWith(
      "/api/identity/recoveries",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("gets an encoded public profile with same-origin credentials", async () => {
    const profile = {
      publicId: PUBLIC_ID,
      displayName: "Ada Lovelace",
      joinedMonth: "2026-09",
      avatarUrl: null,
    };
    const fetcher = vi.fn(async () => jsonResponse(success(profile)));
    const client = createIdentityApiClient(fetcher);

    await expect(client.getPublicProfile(PUBLIC_ID)).resolves.toEqual(
      success(profile),
    );
    expect(fetcher).toHaveBeenCalledWith(
      `/api/identity/profiles/${encodeURIComponent(PUBLIC_ID)}`,
      { method: "GET", credentials: "same-origin" },
    );
  });

  it("patches only the owner display name", async () => {
    const profile = {
      publicId: PUBLIC_ID,
      displayName: "Grace Hopper",
      joinedMonth: "2026-09",
      avatarUrl: null,
    };
    const fetcher = vi.fn(async () =>
      jsonResponse(success({ status: "updated", profile })),
    );
    const client = createIdentityApiClient(fetcher);

    await expect(
      client.updateProfile({ displayName: "Grace Hopper" }),
    ).resolves.toEqual(success({ status: "updated", profile }));
    expect(fetcher).toHaveBeenCalledWith("/api/identity/me/profile", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Grace Hopper" }),
    });
  });

  it("posts explicit account deletion confirmation", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(success({ status: "deletion_pending" })),
    );
    const client = createIdentityApiClient(fetcher);

    await expect(
      client.requestDeletion({ confirmation: "DELETE" }),
    ).resolves.toEqual(success({ status: "deletion_pending" }));
    expect(fetcher).toHaveBeenCalledWith("/api/identity/me/deletion", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
  });

  it("parses an approved failure envelope without provider details", async () => {
    const failure = {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: 60,
      correlationId: CORRELATION_ID,
    };
    const client = createIdentityApiClient(async () => jsonResponse(failure));

    await expect(
      client.requestRecovery({ email: "user@example.com" }),
    ).resolves.toEqual(failure);
  });

  it.each([
    success({ status: "accepted", token: "provider-token" }),
    {
      ok: false,
      code: "SUPABASE_ERROR",
      correlationId: CORRELATION_ID,
      providerMessage: "user disabled",
    },
    {
      ok: true,
      data: { status: "accepted" },
      correlationId: CORRELATION_ID,
      authUserId: "internal-user",
    },
  ])(
    "maps malformed or unknown payloads to a bounded client error",
    async (body) => {
      const client = createIdentityApiClient(async () => jsonResponse(body));

      await expect(
        client.requestRecovery({ email: "user@example.com" }),
      ).rejects.toEqual(new IdentityApiClientError("INVALID_RESPONSE"));
    },
  );

  it("rejects a success envelope with an unsafe public profile", async () => {
    const client = createIdentityApiClient(async () =>
      jsonResponse(
        success({
          publicId: PUBLIC_ID,
          displayName: "Ada Lovelace",
          joinedMonth: "2026-09",
          avatarUrl: null,
          email: "private@example.com",
        }),
      ),
    );

    await expect(client.getPublicProfile(PUBLIC_ID)).rejects.toEqual(
      new IdentityApiClientError("INVALID_RESPONSE"),
    );
  });

  it("maps non-JSON responses to the same bounded client error", async () => {
    const client = createIdentityApiClient(
      async () =>
        new Response("gateway failure", {
          headers: { "content-type": "text/plain" },
        }),
    );

    await expect(
      client.requestRecovery({ email: "user@example.com" }),
    ).rejects.toEqual(new IdentityApiClientError("INVALID_RESPONSE"));
  });

  it("exposes no token persistence API or browser storage path", () => {
    const client = createIdentityApiClient(async () =>
      jsonResponse(success({ status: "accepted" })),
    );
    const source = readFileSync(
      resolve(import.meta.dirname, "./index.ts"),
      "utf8",
    );

    expect(Object.keys(client).sort()).toEqual([
      "getPublicProfile",
      "register",
      "requestDeletion",
      "requestRecovery",
      "signIn",
      "updateProfile",
    ]);
    expect(source).not.toMatch(
      /localStorage|sessionStorage|setToken|accessToken/u,
    );
  });
});
