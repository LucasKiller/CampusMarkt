import { describe, expect, it, vi } from "vitest";

import {
  handleIdentityJsonMutation,
  type IdentityMutationOutcome,
} from "../../../apps/web/src/modules/identity/http/index.ts";

const origin = "https://markt.example.test";
const correlationId = "11111111-1111-4111-8111-111111111111";

function request(
  body = '{"email":"person@example.test"}',
  headers: Record<string, string> = {},
) {
  return new Request(`${origin}/api/identity/registrations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...headers,
    },
    body,
  });
}

function handler(
  outcome: IdentityMutationOutcome = {
    ok: true,
    data: { status: "accepted" },
    status: 202,
  },
) {
  return vi.fn(async (body: unknown, context: { correlationId: string }) => {
    void body;
    void context;
    return outcome;
  });
}

describe("identity HTTP security integration", () => {
  it.each([
    ["missing origin", { origin: "" }],
    ["cross origin", { origin: "https://evil.example.test" }],
    ["unsupported content", { "content-type": "text/plain" }],
    ["oversized declaration", { "content-length": "70000" }],
    ["malformed correlation", { "x-correlation-id": "bad value" }],
  ])("rejects %s before invoking the use case", async (_label, headers) => {
    const useCase = handler();
    const response = await handleIdentityJsonMutation(
      request(undefined, headers),
      { canonicalOrigin: origin, randomUUID: () => correlationId },
      useCase,
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(useCase).not.toHaveBeenCalled();
  });

  it("passes only parsed input and the server correlation ID to the use case", async () => {
    const useCase = handler();

    await handleIdentityJsonMutation(
      request('{"email":"person@example.test"}', {
        "x-correlation-id": "22222222-2222-4222-8222-222222222222",
      }),
      { canonicalOrigin: origin, randomUUID: () => correlationId },
      useCase,
    );

    expect(useCase).toHaveBeenCalledWith(
      { email: "person@example.test" },
      { correlationId },
    );
  });

  it("maps a bounded field failure without provider detail", async () => {
    const response = await handleIdentityJsonMutation(
      request(),
      { canonicalOrigin: origin, randomUUID: () => correlationId },
      handler({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { email: ["Enter a valid email address."] },
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
    expect(payload).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      fieldErrors: { email: ["Enter a valid email address."] },
      correlationId,
    });
    expect(JSON.stringify(payload)).not.toContain("provider");
  });

  it("maps thrown dependency details to a stable unavailable envelope", async () => {
    const useCase = vi.fn(async () => {
      throw new Error("SQL password token person@example.test");
    });

    const response = await handleIdentityJsonMutation(
      request(),
      { canonicalOrigin: origin, randomUUID: () => correlationId },
      useCase,
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      ok: false,
      code: "DEPENDENCY_UNAVAILABLE",
      correlationId,
    });
    expect(JSON.stringify(payload)).not.toContain("person@example.test");
  });

  it("emits Retry-After from the bounded outcome", async () => {
    const response = await handleIdentityJsonMutation(
      request(),
      { canonicalOrigin: origin, randomUUID: () => correlationId },
      handler({ ok: false, code: "RATE_LIMITED", retryAfterSeconds: 120 }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: 120,
      correlationId,
    });
  });

  it("rejects a body that exceeds the limit without a Content-Length header", async () => {
    const useCase = handler();
    const response = await handleIdentityJsonMutation(
      request(`{"value":"${"x".repeat(80)}"}`),
      {
        canonicalOrigin: origin,
        maxBodyBytes: 32,
        randomUUID: () => correlationId,
      },
      useCase,
    );

    expect(response.status).toBe(400);
    expect(useCase).not.toHaveBeenCalled();
  });
});
