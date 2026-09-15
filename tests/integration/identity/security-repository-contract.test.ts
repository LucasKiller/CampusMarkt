import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createIdentityRepository } from "../../../apps/web/src/modules/identity/infrastructure/supabase/repository/index.ts";
import { createIdentitySecurity } from "../../../apps/web/src/modules/identity/security/index.ts";

const correlationId = "11111111-1111-4111-8111-111111111111";

function ports() {
  const calls: Array<{
    functionName: string;
    arguments_: Record<string, unknown> | undefined;
  }> = [];
  const service = {
    rpc: async (functionName: string, arguments_?: Record<string, unknown>) => {
      calls.push({ functionName, arguments_ });
      return functionName === "consume_rate_limits"
        ? { data: [{ allowed: true, retry_after_seconds: 0 }], error: null }
        : { data: null, error: null };
    },
  };
  const user = { rpc: service.rpc };
  const repository = createIdentityRepository({ service, user });
  return {
    calls,
    service: createIdentitySecurity({ pepper: "p".repeat(48), repository }),
  };
}

describe("security to identity RPC contract", () => {
  it("sends the database's exact lowercase 64-hex fingerprint encoding", async () => {
    const test = ports();
    await test.service.enforce(
      {
        action: "sign_in",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      async () => null,
    );

    expect(test.calls[0]).toEqual({
      functionName: "consume_rate_limits",
      arguments_: {
        p_action: "sign_in",
        p_subject_hash: expect.stringMatching(/^[0-9a-f]{64}$/u),
        p_ip_hash: expect.stringMatching(/^[0-9a-f]{64}$/u),
      },
    });
  });

  it("sends only database-allowlisted audit event and outcome values", async () => {
    const test = ports();
    await test.service.enforce(
      {
        action: "recovery",
        normalizedIdentity: "person@example.test",
        trustedClientIp: "203.0.113.8",
        correlationId,
      },
      async () => null,
    );

    expect(test.calls[1]).toEqual({
      functionName: "append_security_event",
      arguments_: expect.objectContaining({
        p_event_type: "recovery",
        p_outcome: "accepted",
      }),
    });
  });
});
