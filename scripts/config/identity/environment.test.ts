import { describe, expect, it } from "vitest";

import { validateIdentityEnvironment } from "./environment.ts";

const localEnvironment = {
  SUPABASE_INTERNAL_URL: "http://api-gw:8000",
  SUPABASE_SERVICE_ROLE_KEY: "role-key-with-at-least-thirty-two-characters",
  IDENTITY_HASH_PEPPER: "pepper-with-at-least-thirty-two-characters",
  IDENTITY_ACTION_BASE_URL: "http://localhost:3000",
  SITE_URL: "http://localhost:3000",
  CURRENT_TERMS_VERSION: "terms-2026-09",
  CURRENT_PRIVACY_VERSION: "privacy-2026-09",
  IDENTITY_WORKER_ID: "identity-worker-local",
  IDENTITY_WORKER_BATCH_SIZE: "25",
  GOTRUE_SESSIONS_TIMEBOX: "720h",
};

const productionEnvironment = {
  ...localEnvironment,
  IDENTITY_ACTION_BASE_URL: "https://markt.example.edu",
  SITE_URL: "https://markt.example.edu",
};

describe("identity environment contract", () => {
  it("accepts the complete local identity contract", () => {
    expect(validateIdentityEnvironment("local", localEnvironment)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("accepts an HTTPS production contract with a 30-day timebox", () => {
    expect(
      validateIdentityEnvironment("production", productionEnvironment),
    ).toEqual({ ok: true, errors: [] });
  });

  it.each([
    "SUPABASE_INTERNAL_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "IDENTITY_HASH_PEPPER",
    "IDENTITY_ACTION_BASE_URL",
    "CURRENT_TERMS_VERSION",
    "CURRENT_PRIVACY_VERSION",
    "IDENTITY_WORKER_ID",
    "IDENTITY_WORKER_BATCH_SIZE",
    "GOTRUE_SESSIONS_TIMEBOX",
  ])("names missing identity variable %s", (variable) => {
    const environment: Record<string, string | undefined> = {
      ...localEnvironment,
    };
    delete environment[variable];

    expect(validateIdentityEnvironment("local", environment).errors).toContain(
      `Missing identity variable: ${variable}`,
    );
  });

  it.each([
    ["SUPABASE_SERVICE_ROLE_KEY", "short"],
    ["IDENTITY_HASH_PEPPER", "short"],
  ])("rejects weak identity secret %s", (variable, value) => {
    expect(
      validateIdentityEnvironment("production", {
        ...productionEnvironment,
        [variable]: value,
      }).errors,
    ).toContain(`Weak identity secret: ${variable}`);
  });

  it.each([
    ["SUPABASE_SERVICE_ROLE_KEY", "change-me-service-role-key"],
    ["IDENTITY_HASH_PEPPER", "replace-with-production-pepper-value"],
  ])("rejects placeholder identity secret %s", (variable, value) => {
    expect(
      validateIdentityEnvironment("production", {
        ...productionEnvironment,
        [variable]: value,
      }).errors,
    ).toContain(`Placeholder identity secret: ${variable}`);
  });

  it("requires an HTTPS production action origin", () => {
    expect(
      validateIdentityEnvironment("production", {
        ...productionEnvironment,
        IDENTITY_ACTION_BASE_URL: "http://markt.example.edu",
      }).errors,
    ).toContain("Invalid production identity URL: IDENTITY_ACTION_BASE_URL");
  });

  it("requires the action origin to match the canonical site origin", () => {
    expect(
      validateIdentityEnvironment("production", {
        ...productionEnvironment,
        IDENTITY_ACTION_BASE_URL: "https://identity.example.edu",
      }).errors,
    ).toContain(
      "Mismatched identity origin: IDENTITY_ACTION_BASE_URL, SITE_URL",
    );
  });

  it.each(["0h", "721h", "30d", "unbounded"])(
    "rejects invalid or over-30-day session timebox %s",
    (timebox) => {
      expect(
        validateIdentityEnvironment("production", {
          ...productionEnvironment,
          GOTRUE_SESSIONS_TIMEBOX: timebox,
        }).errors,
      ).toContain("Invalid identity timebox: GOTRUE_SESSIONS_TIMEBOX");
    },
  );

  it.each(["0", "101", "1.5", "unbounded"])(
    "rejects invalid worker batch size %s",
    (batchSize) => {
      expect(
        validateIdentityEnvironment("local", {
          ...localEnvironment,
          IDENTITY_WORKER_BATCH_SIZE: batchSize,
        }).errors,
      ).toContain(
        "Invalid identity worker setting: IDENTITY_WORKER_BATCH_SIZE",
      );
    },
  );

  it.each([
    ["CURRENT_TERMS_VERSION", "change-me"],
    ["CURRENT_PRIVACY_VERSION", "placeholder"],
  ])("rejects placeholder policy version %s", (variable, value) => {
    expect(
      validateIdentityEnvironment("production", {
        ...productionEnvironment,
        [variable]: value,
      }).errors,
    ).toContain(`Invalid identity policy version: ${variable}`);
  });

  it("reports only variable names and classifications", () => {
    const privateValue = "short-private-value";
    const result = validateIdentityEnvironment("production", {
      ...productionEnvironment,
      IDENTITY_HASH_PEPPER: privateValue,
      IDENTITY_ACTION_BASE_URL: "http://different.invalid/private-path",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("IDENTITY_HASH_PEPPER");
    expect(result.errors.join("\n")).toContain("IDENTITY_ACTION_BASE_URL");
    expect(result.errors.join("\n")).not.toContain(privateValue);
    expect(result.errors.join("\n")).not.toContain("different.invalid");
  });
});
