import { describe, expect, it } from "vitest";

import {
  ACTION_COOKIE_MAX_AGE_SECONDS,
  DEFAULT_JSON_BODY_LIMIT_BYTES,
  applyActionStaging,
  createFailureResponse,
  createIdentityHttpContext,
  createSuccessResponse,
  readBoundedJson,
  validateMutationRequest,
} from "./index";

const origin = "https://markt.example.test";
const correlationId = "11111111-1111-4111-8111-111111111111";

function mutationRequest(body = "{}", headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/identity/example`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...headers,
    },
    body,
  });
}

describe("identity HTTP boundary", () => {
  it("creates a server-owned UUID correlation ID", () => {
    const context = createIdentityHttpContext(
      mutationRequest("{}", {
        "x-correlation-id": "22222222-2222-4222-8222-222222222222",
      }),
      { randomUUID: () => correlationId },
    );

    expect(context).toEqual({
      correlationId,
      inboundCorrelationId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("rejects malformed inbound correlation input", () => {
    expect(() =>
      createIdentityHttpContext(
        mutationRequest("{}", { "x-correlation-id": "raw-provider" }),
        { randomUUID: () => correlationId },
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("requires an Origin header for browser mutations", () => {
    const request = mutationRequest();
    request.headers.delete("origin");

    expect(
      validateMutationRequest(request, { canonicalOrigin: origin }),
    ).toEqual(expect.objectContaining({ ok: false, code: "FORBIDDEN" }));
  });

  it.each([
    "https://evil.example.test",
    "https://markt.example.test:444",
    "null",
    "not a URL",
  ])("rejects untrusted mutation origin %s", (untrustedOrigin) => {
    const request = mutationRequest("{}", { origin: untrustedOrigin });

    expect(
      validateMutationRequest(request, { canonicalOrigin: origin }),
    ).toEqual(expect.objectContaining({ ok: false, code: "FORBIDDEN" }));
  });

  it("accepts the exact canonical origin", () => {
    expect(
      validateMutationRequest(mutationRequest(), { canonicalOrigin: origin }),
    ).toEqual({ ok: true });
  });

  it("accepts JSON with a charset parameter", () => {
    const request = mutationRequest("{}", {
      "content-type": "application/json; charset=utf-8",
    });

    expect(
      validateMutationRequest(request, { canonicalOrigin: origin }),
    ).toEqual({
      ok: true,
    });
  });

  it.each(["text/plain", "application/xml", "multipart/form-data"])(
    "rejects unsupported content type %s",
    (contentType) => {
      const request = mutationRequest("{}", { "content-type": contentType });

      expect(
        validateMutationRequest(request, { canonicalOrigin: origin }),
      ).toEqual(expect.objectContaining({ ok: false, code: "INVALID_INPUT" }));
    },
  );

  it("rejects a declared body larger than the configured limit", () => {
    const request = mutationRequest("{}", { "content-length": "65537" });

    expect(
      validateMutationRequest(request, {
        canonicalOrigin: origin,
        maxBodyBytes: DEFAULT_JSON_BODY_LIMIT_BYTES,
      }),
    ).toEqual(expect.objectContaining({ ok: false, code: "INVALID_INPUT" }));
  });

  it("reads a bounded JSON object", async () => {
    await expect(
      readBoundedJson(mutationRequest('{"name":"Ada"}'), 32),
    ).resolves.toEqual({
      name: "Ada",
    });
  });

  it("rejects an actual body larger than the configured limit", async () => {
    await expect(
      readBoundedJson(mutationRequest('{"value":"123456"}'), 8),
    ).rejects.toEqual(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("rejects malformed JSON without echoing it", async () => {
    const body = '{"password":"secret"';

    const rejection = await readBoundedJson(mutationRequest(body), 64).catch(
      (error: unknown) => error,
    );

    expect(rejection).toEqual(
      expect.objectContaining({ code: "INVALID_INPUT" }),
    );
    expect(JSON.stringify(rejection)).not.toContain("secret");
  });

  it("returns an exact no-store success envelope", async () => {
    const response = createSuccessResponse(
      { status: "accepted" },
      correlationId,
      202,
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { status: "accepted" },
      correlationId,
    });
  });

  it("maps rate limits to 429 with integer Retry-After", async () => {
    const response = createFailureResponse("RATE_LIMITED", correlationId, {
      retryAfterSeconds: 73,
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("73");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: 73,
      correlationId,
    });
  });

  it("uses the same private no-store response for missing profiles", async () => {
    const response = createFailureResponse("NOT_FOUND", correlationId);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
      correlationId,
    });
  });

  it("stages a short-lived strict HttpOnly action cookie on a tokenless redirect", () => {
    const response = new Response(null, {
      status: 303,
      headers: { location: "/auth/confirm" },
    });

    applyActionStaging(response.headers, {
      name: "campusmarkt-action-email_confirmation",
      value: "raw-token",
      options: {
        httpOnly: true,
        maxAge: ACTION_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "strict",
        secure: true,
      },
    });

    expect(response.headers.get("location")).toBe("/auth/confirm");
    expect(response.headers.get("location")).not.toContain("raw-token");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("set-cookie")).toBe(
      "campusmarkt-action-email_confirmation=raw-token; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Strict",
    );
  });

  it("does not stage arbitrary cookie names", () => {
    const headers = new Headers();

    expect(() =>
      applyActionStaging(headers, {
        name: "tracking",
        value: "raw",
        options: {
          httpOnly: true,
          maxAge: 300,
          path: "/",
          sameSite: "strict",
          secure: true,
        },
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(headers.has("set-cookie")).toBe(false);
  });
});
