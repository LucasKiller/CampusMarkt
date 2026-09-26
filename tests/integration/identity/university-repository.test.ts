import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createUniversityRepository,
  renderUniversityVerificationEmail,
  type IdentityRpcClient,
} from "../../../apps/web/src/modules/identity/infrastructure/supabase/repository/university.ts";

function mockClient(data: unknown = { accepted: true }, error: unknown = null) {
  const calls: Array<{ functionName: string; arguments_: object | undefined }> =
    [];
  const rpc: IdentityRpcClient["rpc"] = async (
    functionName: string,
    arguments_?: Record<string, unknown>,
  ) => {
    calls.push({ functionName, arguments_ });
    return { data, error };
  };
  return { calls, rpc };
}

describe("university verification repository", () => {
  const authUserId = "11111111-1111-4111-8111-111111111111";
  const universityId = "tu-braunschweig";
  const emailHash = "a".repeat(64);
  const tokenHash = "b".repeat(64);

  describe("initiateUniversityVerification", () => {
    it("calls initiate_university_verification with normalized bytea and expected arguments", async () => {
      const client = mockClient(null, null);
      const repo = createUniversityRepository({ service: client });

      const result = await repo.initiateUniversityVerification({
        authUserId,
        universityId,
        emailHash,
        tokenHash,
      });

      expect(result).toEqual({ ok: true, value: undefined });
      expect(client.calls).toEqual([
        {
          functionName: "initiate_university_verification",
          arguments_: {
            requested_auth_user_id: authUserId,
            requested_university_id: universityId,
            requested_email_hash: emailHash,
            requested_token_hash: `\\x${tokenHash}`,
          },
        },
      ]);
    });

    it("preserves existing \\x prefix on tokenHash", async () => {
      const client = mockClient(null, null);
      const repo = createUniversityRepository({ service: client });

      await repo.initiateUniversityVerification({
        authUserId,
        universityId,
        emailHash,
        tokenHash: `\\x${tokenHash}`,
      });

      expect(client.calls[0].arguments_).toEqual({
        requested_auth_user_id: authUserId,
        requested_university_id: universityId,
        requested_email_hash: emailHash,
        requested_token_hash: `\\x${tokenHash}`,
      });
    });

    it("maps 23505 collision error to CONFLICT", async () => {
      const client = mockClient(null, {
        code: "23505",
        message: "institutional email is already verified",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.initiateUniversityVerification({
        authUserId,
        universityId,
        emailHash,
        tokenHash,
      });

      expect(result).toEqual({ ok: false, code: "CONFLICT" });
    });

    it("maps 28000 and P0002 to ACCOUNT_UNAVAILABLE", async () => {
      const client = mockClient(null, {
        code: "28000",
        message: "account is unavailable",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.initiateUniversityVerification({
        authUserId,
        universityId,
        emailHash,
        tokenHash,
      });

      expect(result).toEqual({ ok: false, code: "ACCOUNT_UNAVAILABLE" });
    });

    it("maps 22023 to INVALID_INPUT", async () => {
      const client = mockClient(null, {
        code: "22023",
        message: "invalid university verification input",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.initiateUniversityVerification({
        authUserId,
        universityId,
        emailHash,
        tokenHash,
      });

      expect(result).toEqual({ ok: false, code: "INVALID_INPUT" });
    });

    it("maps general errors to DEPENDENCY_UNAVAILABLE", async () => {
      const client = mockClient(null, {
        code: "50000",
        message: "network timeout",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.initiateUniversityVerification({
        authUserId,
        universityId,
        emailHash,
        tokenHash,
      });

      expect(result).toEqual({ ok: false, code: "DEPENDENCY_UNAVAILABLE" });
    });
  });

  describe("confirmUniversityVerification", () => {
    it("calls confirm_university_verification and parses valid returned row", async () => {
      const client = mockClient([
        {
          auth_user_id: authUserId,
          university_id: universityId,
          status: "verified",
          expires_at: "2027-03-21T00:00:00.000Z",
        },
      ]);
      const repo = createUniversityRepository({ service: client });

      const result = await repo.confirmUniversityVerification({
        tokenHash,
      });

      expect(result).toEqual({
        ok: true,
        value: {
          authUserId,
          universityId,
          status: "verified",
          expiresAt: "2027-03-21T00:00:00.000Z",
        },
      });
      expect(client.calls).toEqual([
        {
          functionName: "confirm_university_verification",
          arguments_: {
            requested_token_hash: `\\x${tokenHash}`,
          },
        },
      ]);
    });

    it("maps 23505 conflict to CONFLICT", async () => {
      const client = mockClient(null, {
        code: "23505",
        message: "institutional email is already verified",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.confirmUniversityVerification({ tokenHash });
      expect(result).toEqual({ ok: false, code: "CONFLICT" });
    });

    it("maps P0002 or expired 22023 to INVALID_OR_EXPIRED_TOKEN", async () => {
      const client = mockClient(null, {
        code: "P0002",
        message: "verification token is invalid or expired",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.confirmUniversityVerification({ tokenHash });
      expect(result).toEqual({ ok: false, code: "INVALID_OR_EXPIRED_TOKEN" });
    });

    it("maps 28000 to ACCOUNT_UNAVAILABLE", async () => {
      const client = mockClient(null, {
        code: "28000",
        message: "account is unavailable",
      });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.confirmUniversityVerification({ tokenHash });
      expect(result).toEqual({ ok: false, code: "ACCOUNT_UNAVAILABLE" });
    });

    it("rejects invalid provider response payload", async () => {
      const client = mockClient([{ unexpected_field: true }]);
      const repo = createUniversityRepository({ service: client });

      const result = await repo.confirmUniversityVerification({ tokenHash });
      expect(result).toEqual({ ok: false, code: "INVALID_PROVIDER_RESPONSE" });
    });
  });

  describe("disconnectUniversityVerification", () => {
    it("calls disconnect_university_verification with authUserId", async () => {
      const client = mockClient(null, null);
      const repo = createUniversityRepository({ service: client });

      const result = await repo.disconnectUniversityVerification(authUserId);

      expect(result).toEqual({ ok: true, value: undefined });
      expect(client.calls).toEqual([
        {
          functionName: "disconnect_university_verification",
          arguments_: {
            requested_auth_user_id: authUserId,
          },
        },
      ]);
    });

    it("maps error to DEPENDENCY_UNAVAILABLE", async () => {
      const client = mockClient(null, { message: "db unavailable" });
      const repo = createUniversityRepository({ service: client });

      const result = await repo.disconnectUniversityVerification(authUserId);
      expect(result).toEqual({ ok: false, code: "DEPENDENCY_UNAVAILABLE" });
    });
  });

  describe("getVerificationRecord", () => {
    it("reads the bounded record through the service RPC", async () => {
      const service = mockClient([
        {
          status: "verified",
          university_id: "tu-braunschweig",
          expires_at: "2027-09-21T00:00:00.000Z",
          token_expires_at: null,
        },
      ]);

      const repo = createUniversityRepository({ service });
      const result = await repo.getVerificationRecord(authUserId);

      expect(result).toEqual({
        ok: true,
        value: {
          status: "verified",
          universityId: "tu-braunschweig",
          expiresAt: "2027-09-21T00:00:00.000Z",
          tokenExpiresAt: null,
        },
      });
      expect(service.calls).toEqual([
        {
          functionName: "get_university_verification_record",
          arguments_: { requested_auth_user_id: authUserId },
        },
      ]);
    });

    it("returns null when no record exists", async () => {
      const service = mockClient([], null);

      const repo = createUniversityRepository({ service });
      const result = await repo.getVerificationRecord(authUserId);

      expect(result).toEqual({ ok: true, value: null });
    });
  });

  describe("renderUniversityVerificationEmail", () => {
    it("renders action link and 24-hour expiration notice with TU Braunschweig default", () => {
      const email = renderUniversityVerificationEmail({
        actionUrl:
          "https://campusmarkt.test/auth/action/university_verification?token=secret123",
      });

      expect(email.subject).toBe(
        "Verify your TU Braunschweig affiliation on CampusMarkt",
      );
      expect(email.text).toContain(
        "https://campusmarkt.test/auth/action/university_verification?token=secret123",
      );
      expect(email.text).toContain(
        "This verification link expires in 24 hours.",
      );
      expect(email.text).toContain("TU Braunschweig");
    });

    it("renders custom university name if provided", () => {
      const email = renderUniversityVerificationEmail({
        actionUrl: "https://campusmarkt.test/verify",
        universityName: "HBK Braunschweig",
      });

      expect(email.subject).toBe(
        "Verify your HBK Braunschweig affiliation on CampusMarkt",
      );
      expect(email.text).toContain("HBK Braunschweig");
      expect(email.text).toContain(
        "This verification link expires in 24 hours.",
      );
    });
  });
});
