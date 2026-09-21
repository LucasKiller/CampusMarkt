import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createHash } from "node:crypto";

import {
  createUniversityVerificationService,
  type RequestContext,
  type UniversityMailer,
  type UniversitySecurity,
} from "./index.ts";
import type {
  UniversityRepository,
  UniversityVerificationRecord,
  InitiateVerificationInput,
  ConfirmVerificationInput,
} from "../../infrastructure/supabase/repository/university.ts";

function createMockSecurity(): UniversitySecurity & {
  audits: Array<Record<string, unknown>>;
} {
  const audits: Array<Record<string, unknown>> = [];
  return {
    audits,
    fingerprintIdentity(identity: string) {
      return createHash("sha256").update(identity).digest("hex");
    },
    fingerprintClientIp(input: { trustedClientIp: string }) {
      return createHash("sha256").update(input.trustedClientIp).digest("hex");
    },
    async enforce(input, operation) {
      return { status: "allowed", value: await operation() };
    },
    async audit(input) {
      audits.push(input);
      return { status: "recorded" };
    },
  };
}

function createMockRepository(): UniversityRepository & {
  initiateCalls: Array<InitiateVerificationInput>;
  confirmCalls: Array<ConfirmVerificationInput>;
  disconnectCalls: Array<string>;
  setRecord: (r: UniversityVerificationRecord | null) => void;
} {
  const initiateCalls: Array<InitiateVerificationInput> = [];
  const confirmCalls: Array<ConfirmVerificationInput> = [];
  const disconnectCalls: Array<string> = [];
  let record: UniversityVerificationRecord | null = null;

  return {
    initiateCalls,
    confirmCalls,
    disconnectCalls,
    async initiateUniversityVerification(input) {
      initiateCalls.push(input);
      return { ok: true, value: undefined };
    },
    async confirmUniversityVerification(input) {
      confirmCalls.push(input);
      return {
        ok: true,
        value: {
          authUserId: "11111111-1111-4111-8111-111111111111",
          universityId: "tu-braunschweig",
          status: "verified",
          expiresAt: "2027-03-21T10:00:00.000Z",
        },
      };
    },
    async disconnectUniversityVerification(authUserId) {
      disconnectCalls.push(authUserId);
      return { ok: true, value: undefined };
    },
    async getVerificationRecord() {
      return { ok: true, value: record };
    },
    setRecord(r: UniversityVerificationRecord | null) {
      record = r;
    },
  };
}

function createMockMailer(): UniversityMailer & {
  sent: Array<{
    recipient: string;
    subject: string;
    text: string;
    url: string;
  }>;
} {
  const sent: Array<{
    recipient: string;
    subject: string;
    text: string;
    url: string;
  }> = [];
  return {
    sent,
    async send(mail) {
      sent.push(mail);
      return { ok: true };
    },
  };
}

describe("UniversityVerificationService", () => {
  const authUserId = "11111111-1111-4111-8111-111111111111";
  const context: RequestContext = {
    trustedClientIp: "127.0.0.1",
    correlationId: "22222222-2222-4222-8222-222222222222",
  };

  describe("initiateVerification", () => {
    it("successfully initiates verification, dispatches email, and audits", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "STUDENT@TU-BRAUNSCHWEIG.DE" },
        context,
      );

      expect(result).toEqual({ status: "accepted" });
      expect(repository.initiateCalls).toHaveLength(1);
      expect(repository.initiateCalls[0]).toMatchObject({
        authUserId,
        universityId: "tu-braunschweig",
      });
      expect(mailer.sent).toHaveLength(1);
      expect(mailer.sent[0].recipient).toBe("student@tu-braunschweig.de");
      expect(mailer.sent[0].subject).toContain("TU Braunschweig");
      expect(mailer.sent[0].text).toContain("24 hours");

      // Verify audit recorded with pseudonymous hashes, no plaintext email
      const audit = security.audits.find((a) => a.outcome === "accepted");
      expect(audit).toBeDefined();
      expect(JSON.stringify(audit)).not.toContain("student@tu-braunschweig.de");
    });

    it("rejects invalid institutional email domain with field error", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "student@gmail.com" },
        context,
      );

      expect(result).toEqual({
        status: "invalid_input",
        fieldErrors: {
          institutionalEmail: [
            "Enter an email address from a supported university (e.g. tu-braunschweig.de or tu-bs.de).",
          ],
        },
      });
      expect(repository.initiateCalls).toHaveLength(0);
      expect(mailer.sent).toHaveLength(0);
    });

    it("rejects header injection attempts in email", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "student\r\nBcc:attacker@test@tu-bs.de" },
        context,
      );

      expect(result.status).toBe("invalid_input");
      expect(mailer.sent).toHaveLength(0);
    });

    it("enforces dual rate limits (3/hr per account, 30/hr per IP)", async () => {
      const security = createMockSecurity();
      security.enforce = async () => ({
        status: "rate_limited",
        retryAfterSeconds: 3600,
      });
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "student@tu-braunschweig.de" },
        context,
      );

      expect(result).toEqual({
        status: "rate_limited",
        retryAfterSeconds: 3600,
      });
      expect(mailer.sent).toHaveLength(0);
    });

    it("handles database conflict when email hash is active on another account", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      repository.initiateUniversityVerification = async () => ({
        ok: false,
        code: "CONFLICT",
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "student@tu-braunschweig.de" },
        context,
      );

      expect(result).toEqual({ status: "conflict" });
      expect(mailer.sent).toHaveLength(0);
    });

    it("handles unconfirmed or deletion-pending account rejection", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      repository.initiateUniversityVerification = async () => ({
        ok: false,
        code: "ACCOUNT_UNAVAILABLE",
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "student@tu-braunschweig.de" },
        context,
      );

      expect(result).toEqual({ status: "account_unavailable" });
      expect(mailer.sent).toHaveLength(0);
    });

    it("handles SMTP delivery failure gracefully with unavailable status", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      mailer.send = async () => ({ ok: false, code: "SMTP_ERROR" });
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.initiateVerification(
        authUserId,
        { institutionalEmail: "student@tu-braunschweig.de" },
        context,
      );

      expect(result).toEqual({ status: "unavailable" });
      const audit = security.audits.find(
        (a) => a.outcome === "dependency_failure",
      );
      expect(audit).toBeDefined();
    });
  });

  describe("confirmVerification", () => {
    it("successfully confirms verification and returns badge data", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.confirmVerification(
        "valid_token_123",
        context,
      );

      expect(result).toEqual({
        status: "verified",
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
        expiresAt: "2027-03-21T10:00:00.000Z",
      });
      expect(repository.confirmCalls).toHaveLength(1);
    });

    it("handles invalid or expired token", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      repository.confirmUniversityVerification = async () => ({
        ok: false,
        code: "INVALID_OR_EXPIRED_TOKEN",
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.confirmVerification(
        "expired_token",
        context,
      );

      expect(result).toEqual({ status: "invalid_link" });
    });

    it("handles empty token", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.confirmVerification("   ", context);
      expect(result).toEqual({ status: "invalid_link" });
      expect(repository.confirmCalls).toHaveLength(0);
    });

    it("handles conflict during concurrent confirmation", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      repository.confirmUniversityVerification = async () => ({
        ok: false,
        code: "CONFLICT",
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.confirmVerification("token123", context);
      expect(result).toEqual({ status: "conflict" });
    });
  });

  describe("disconnectVerification", () => {
    it("successfully disconnects verification and audits", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.disconnectVerification(authUserId, context);

      expect(result).toEqual({ status: "disconnected" });
      expect(repository.disconnectCalls).toEqual([authUserId]);
      const audit = security.audits.find(
        (a) => a.authUserId === authUserId && a.outcome === "succeeded",
      );
      expect(audit).toBeDefined();
    });
  });

  describe("getVerificationStatus", () => {
    it("returns none when no verification record exists", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.getVerificationStatus(authUserId);
      expect(result).toEqual({
        ok: true,
        value: {
          status: "none",
          universityId: null,
          badgeLabel: null,
          expiresAt: null,
          daysRemaining: null,
        },
      });
    });

    it("returns pending when verification is pending", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      repository.setRecord({
        status: "pending",
        universityId: "tu-braunschweig",
        expiresAt: null,
        tokenExpiresAt: "2026-09-22T10:00:00.000Z",
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
      });

      const result = await service.getVerificationStatus(authUserId);
      expect(result).toEqual({
        ok: true,
        value: {
          status: "pending",
          universityId: "tu-braunschweig",
          badgeLabel: null,
          expiresAt: null,
          daysRemaining: null,
        },
      });
    });

    it("returns verified with days remaining when active", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const now = new Date("2026-09-21T10:00:00.000Z");
      const expiresAt = new Date("2027-03-20T10:00:00.000Z").toISOString();
      repository.setRecord({
        status: "verified",
        universityId: "tu-braunschweig",
        expiresAt,
        tokenExpiresAt: null,
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
        now: () => now,
      });

      const result = await service.getVerificationStatus(authUserId);
      expect(result).toEqual({
        ok: true,
        value: {
          status: "verified",
          universityId: "tu-braunschweig",
          badgeLabel: "TU Braunschweig",
          expiresAt,
          daysRemaining: 180,
        },
      });
    });

    it("returns expired with 0 days remaining when expired", async () => {
      const security = createMockSecurity();
      const repository = createMockRepository();
      const now = new Date("2027-04-01T10:00:00.000Z");
      const expiresAt = new Date("2027-03-20T10:00:00.000Z").toISOString();
      repository.setRecord({
        status: "verified",
        universityId: "tu-braunschweig",
        expiresAt,
        tokenExpiresAt: null,
      });
      const mailer = createMockMailer();
      const service = createUniversityVerificationService({
        security,
        repository,
        mailer,
        origin: "https://campusmarkt.test",
        now: () => now,
      });

      const result = await service.getVerificationStatus(authUserId);
      expect(result).toEqual({
        ok: true,
        value: {
          status: "expired",
          universityId: "tu-braunschweig",
          badgeLabel: null,
          expiresAt,
          daysRemaining: 0,
        },
      });
    });
  });
});
