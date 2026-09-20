import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { validateIdentityEnvironment } from "../../../scripts/config/identity/environment.ts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const runbookPath = resolve(
  repositoryRoot,
  "docs/operations/identity/runbook.md",
);
const packageJsonPath = resolve(repositoryRoot, "package.json");

describe("identity operations guidance and runbook verification", () => {
  it("provides the identity operations runbook file", () => {
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("runbook prominently states that no VPS, deploy, or account action occurs without separate authorization", () => {
    const content = readFileSync(runbookPath, "utf8");
    expect(content).toContain("separate, explicit user authorization");
    expect(content).toContain(
      "defines a deployable contract; it does not authorize deployment",
    );
  });

  it("runbook explicitly documents the legal review launch blocker for 18+ declaration", () => {
    const content = readFileSync(runbookPath, "utf8");
    expect(content).toContain("Legal Review Blocker");
    expect(content).toContain("18+ adult age confirmation");
  });

  it("runbook explicitly documents the future feature deletion participant launch blocker", () => {
    const content = readFileSync(runbookPath, "utf8");
    expect(content).toContain("Future Feature Deletion-Participant Blocker");
    expect(content).toContain("30-day");
  });

  it("runbook documents executable commands that exist in package.json or docker compose", () => {
    const content = readFileSync(runbookPath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const scripts = packageJson.scripts || {};

    const commandMatches = content.matchAll(/```console\r?\n([\s\S]*?)```/gu);
    const documentedCommands: string[] = [];
    for (const match of commandMatches) {
      for (const line of match[1].split(/\r?\n/u)) {
        if (line.startsWith("$ ")) {
          documentedCommands.push(line.slice(2).trim());
        }
      }
    }

    expect(documentedCommands.length).toBeGreaterThanOrEqual(3);

    for (const cmd of documentedCommands) {
      if (cmd.startsWith("npm run ")) {
        const scriptName = cmd.replace("npm run ", "").split(" ")[0];
        expect(scripts[scriptName]).toBeDefined();
      } else if (cmd.startsWith("docker compose ")) {
        expect(cmd).toMatch(/^docker compose (run|ps|up|down|config)/);
      }
    }
  });
});

describe("identity preflight configuration validation and redaction", () => {
  const validProductionEnv = {
    SUPABASE_INTERNAL_URL: "https://supabase-internal.campusmarkt.test",
    SUPABASE_SERVICE_ROLE_KEY:
      "prod-service-role-key-length-at-least-32-chars-long",
    IDENTITY_HASH_PEPPER:
      "prod-hash-pepper-secret-with-more-than-32-characters",
    IDENTITY_ACTION_BASE_URL: "https://campusmarkt.test",
    SITE_URL: "https://campusmarkt.test",
    CURRENT_TERMS_VERSION: "2026-09-15",
    CURRENT_PRIVACY_VERSION: "2026-09-15",
    IDENTITY_WORKER_ID: "worker_prod_1",
    IDENTITY_WORKER_BATCH_SIZE: "25",
    GOTRUE_SESSIONS_TIMEBOX: "720h",
  };

  it("accepts a fully compliant production identity configuration", () => {
    const result = validateIdentityEnvironment(
      "production",
      validProductionEnv,
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("preflight fails on missing required identity variables and reports variable names only", () => {
    const result = validateIdentityEnvironment("production", {});
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Missing identity variable: SUPABASE_INTERNAL_URL",
    );
    expect(result.errors).toContain(
      "Missing identity variable: SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(result.errors).toContain(
      "Missing identity variable: IDENTITY_HASH_PEPPER",
    );
    expect(result.errors).toContain(
      "Missing identity variable: IDENTITY_ACTION_BASE_URL",
    );
  });

  it("preflight fails on weak identity secrets (< 32 characters)", () => {
    const env = {
      ...validProductionEnv,
      SUPABASE_SERVICE_ROLE_KEY: "too-short",
      IDENTITY_HASH_PEPPER: "short",
    };
    const result = validateIdentityEnvironment("production", env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Weak identity secret: SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(result.errors).toContain(
      "Weak identity secret: IDENTITY_HASH_PEPPER",
    );
  });

  it("preflight fails on placeholder secrets in production mode", () => {
    const env = {
      ...validProductionEnv,
      SUPABASE_SERVICE_ROLE_KEY:
        "change-me-production-service-role-key-32-chars",
      IDENTITY_HASH_PEPPER: "replace-me-production-hash-pepper-value-32-chars",
    };
    const result = validateIdentityEnvironment("production", env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Placeholder identity secret: SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(result.errors).toContain(
      "Placeholder identity secret: IDENTITY_HASH_PEPPER",
    );
  });

  it("preflight fails on non-HTTPS action URL in production mode", () => {
    const env = {
      ...validProductionEnv,
      IDENTITY_ACTION_BASE_URL: "http://campusmarkt.test",
    };
    const result = validateIdentityEnvironment("production", env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Invalid production identity URL: IDENTITY_ACTION_BASE_URL",
    );
  });

  it("preflight fails on mismatched action base URL and site URL in production mode", () => {
    const env = {
      ...validProductionEnv,
      IDENTITY_ACTION_BASE_URL: "https://auth-trap.attacker.test",
      SITE_URL: "https://campusmarkt.test",
    };
    const result = validateIdentityEnvironment("production", env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Mismatched identity origin: IDENTITY_ACTION_BASE_URL, SITE_URL",
    );
  });

  it("preflight fails on session timebox exceeding the 30-day (720h) boundary", () => {
    const env = {
      ...validProductionEnv,
      GOTRUE_SESSIONS_TIMEBOX: "721h",
    };
    const result = validateIdentityEnvironment("production", env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Invalid identity timebox: GOTRUE_SESSIONS_TIMEBOX",
    );
  });

  it("preflight fails on malformed or non-integer session timeboxes", () => {
    for (const badTimebox of ["0h", "-1h", "30d", "infinite", "abc"]) {
      const env = {
        ...validProductionEnv,
        GOTRUE_SESSIONS_TIMEBOX: badTimebox,
      };
      const result = validateIdentityEnvironment("production", env);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        "Invalid identity timebox: GOTRUE_SESSIONS_TIMEBOX",
      );
    }
  });

  it("preflight fails on invalid worker batch size below 1 or above 100", () => {
    for (const badBatch of ["0", "101", "-5", "1000", "invalid"]) {
      const env = {
        ...validProductionEnv,
        IDENTITY_WORKER_BATCH_SIZE: badBatch,
      };
      const result = validateIdentityEnvironment("production", env);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        "Invalid identity worker setting: IDENTITY_WORKER_BATCH_SIZE",
      );
    }
  });

  it("preflight fails on invalid worker ID with illegal characters", () => {
    for (const badId of [
      "worker/1",
      "worker@id",
      "$worker",
      "worker with space",
    ]) {
      const env = {
        ...validProductionEnv,
        IDENTITY_WORKER_ID: badId,
      };
      const result = validateIdentityEnvironment("production", env);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        "Invalid identity worker setting: IDENTITY_WORKER_ID",
      );
    }
  });

  it("preflight fails on placeholder policy versions in production", () => {
    const env = {
      ...validProductionEnv,
      CURRENT_TERMS_VERSION: "change-me-terms",
      CURRENT_PRIVACY_VERSION: "placeholder-privacy",
    };
    const result = validateIdentityEnvironment("production", env);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Invalid identity policy version: CURRENT_TERMS_VERSION",
    );
    expect(result.errors).toContain(
      "Invalid identity policy version: CURRENT_PRIVACY_VERSION",
    );
  });

  it("preflight errors strictly never disclose raw secret values or passwords in error messages", () => {
    const rawSecret = "super-secret-service-role-key-value-12345";
    const rawPepper = "sensitive-pepper-value-should-never-leak-98765";
    const env = {
      ...validProductionEnv,
      SUPABASE_SERVICE_ROLE_KEY: "change-me-" + rawSecret,
      IDENTITY_HASH_PEPPER: "replace-me-" + rawPepper,
    };
    const result = validateIdentityEnvironment("production", env);
    const combinedErrors = result.errors.join(" ");

    expect(combinedErrors).not.toContain(rawSecret);
    expect(combinedErrors).not.toContain(rawPepper);
  });
});
