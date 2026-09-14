import { describe, expect, it } from "vitest";
import {
  MINIMUM_PRODUCTION_RESOURCES,
  validateDeployment,
  type DeploymentEnvironment,
} from "./validate-env.ts";

const generatedLocalEnvironment: DeploymentEnvironment = {
  POSTGRES_PASSWORD: "generated-postgres-password",
  JWT_SECRET: "generated-jwt-secret-at-least-32-characters",
  ANON_KEY: "generated-anon-key",
  SERVICE_ROLE_KEY: "generated-service-role-key",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_generated_local",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:8080",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_generated_local",
};

const productionEnvironment: DeploymentEnvironment = {
  ...generatedLocalEnvironment,
  NEXT_PUBLIC_SUPABASE_URL: "https://markt.example.edu",
  SUPABASE_PUBLIC_URL: "https://markt.example.edu",
  API_EXTERNAL_URL: "https://markt.example.edu/auth/v1",
  SITE_URL: "https://markt.example.edu",
  CADDY_SITE_ADDRESS: "markt.example.edu",
  SMTP_ADMIN_EMAIL: "operator@example.edu",
  SMTP_HOST: "smtp.example.edu",
  SMTP_PORT: "587",
  SMTP_USER: "campusmarkt",
  SMTP_PASS: "generated-smtp-password",
  SMTP_SENDER_NAME: "CampusMarkt",
  STORAGE_BACKEND: "s3",
  GLOBAL_S3_BUCKET: "campusmarkt-production",
  GLOBAL_S3_ENDPOINT: "https://objects.example.edu",
  GLOBAL_S3_PROTOCOL: "https",
  AWS_ACCESS_KEY_ID: "generated-access-id",
  AWS_SECRET_ACCESS_KEY: "generated-access-secret",
  REGION: "eu-central-1",
  BACKUP_TARGET: "s3://campusmarkt-backups/production",
};

const productionResources = { ...MINIMUM_PRODUCTION_RESOURCES };

describe("deployment environment validation", () => {
  it("accepts generated local values without production providers", () => {
    expect(
      validateDeployment({
        mode: "local",
        environment: generatedLocalEnvironment,
        resources: { cpuCores: 1, memoryGb: 1, diskGb: 1 },
      }),
    ).toEqual({ ok: true, errors: [] });
  });

  it("accepts a complete production contract at the resource minimums", () => {
    expect(
      validateDeployment({
        mode: "production",
        environment: productionEnvironment,
        resources: productionResources,
      }),
    ).toEqual({ ok: true, errors: [] });
  });

  it("rejects an unknown mode by name", () => {
    expect(
      validateDeployment({
        mode: "preview" as "local",
        environment: generatedLocalEnvironment,
        resources: productionResources,
      }).errors,
    ).toEqual(["Invalid deployment mode: MODE"]);
  });

  it.each([
    "POSTGRES_PASSWORD",
    "JWT_SECRET",
    "ANON_KEY",
    "SERVICE_ROLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ])("names missing required local variable %s", (variable) => {
    const environment = { ...generatedLocalEnvironment };
    delete environment[variable];

    expect(
      validateDeployment({
        mode: "local",
        environment,
        resources: productionResources,
      }).errors,
    ).toContain(`Missing required variable: ${variable}`);
  });

  it.each([
    "NEXT_PUBLIC_POSTGRES_PASSWORD",
    "NEXT_PUBLIC_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  ])("rejects forbidden browser credential %s", (variable) => {
    expect(
      validateDeployment({
        mode: "local",
        environment: { ...generatedLocalEnvironment, [variable]: "secret" },
        resources: productionResources,
      }).errors,
    ).toContain(`Forbidden browser credential: ${variable}`);
  });

  it("rejects a server secret copied under another browser variable", () => {
    expect(
      validateDeployment({
        mode: "local",
        environment: {
          ...generatedLocalEnvironment,
          NEXT_PUBLIC_ACCIDENTAL_TOKEN:
            generatedLocalEnvironment.SERVICE_ROLE_KEY,
        },
        resources: productionResources,
      }).errors,
    ).toContain(
      "Forbidden browser secret exposure: NEXT_PUBLIC_ACCIDENTAL_TOKEN matches SERVICE_ROLE_KEY",
    );
  });

  it("requires the browser publishable key to match the server contract", () => {
    expect(
      validateDeployment({
        mode: "local",
        environment: {
          ...generatedLocalEnvironment,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_wrong",
        },
        resources: productionResources,
      }).errors,
    ).toContain(
      "Mismatched publishable variables: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it.each([
    "SUPABASE_PUBLIC_URL",
    "API_EXTERNAL_URL",
    "SITE_URL",
    "CADDY_SITE_ADDRESS",
    "SMTP_ADMIN_EMAIL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_SENDER_NAME",
    "STORAGE_BACKEND",
    "GLOBAL_S3_BUCKET",
    "GLOBAL_S3_ENDPOINT",
    "GLOBAL_S3_PROTOCOL",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "REGION",
    "BACKUP_TARGET",
  ])("names missing required production variable %s", (variable) => {
    const environment = { ...productionEnvironment };
    delete environment[variable];

    expect(
      validateDeployment({
        mode: "production",
        environment,
        resources: productionResources,
      }).errors,
    ).toContain(`Missing required variable: ${variable}`);
  });

  it.each([
    ["NEXT_PUBLIC_SUPABASE_URL", "http://markt.example.edu"],
    ["SUPABASE_PUBLIC_URL", "http://markt.example.edu"],
    ["API_EXTERNAL_URL", "http://markt.example.edu/auth/v1"],
    ["SITE_URL", "http://markt.example.edu"],
  ])("requires HTTPS in production variable %s", (variable, value) => {
    expect(
      validateDeployment({
        mode: "production",
        environment: { ...productionEnvironment, [variable]: value },
        resources: productionResources,
      }).errors,
    ).toContain(`Invalid production HTTPS variable: ${variable}`);
  });

  it.each(["http://markt.example.edu", "localhost", "127.0.0.1"])(
    "rejects non-production Caddy hostname %s",
    (value) => {
      expect(
        validateDeployment({
          mode: "production",
          environment: {
            ...productionEnvironment,
            CADDY_SITE_ADDRESS: value,
          },
          resources: productionResources,
        }).errors,
      ).toContain("Invalid production hostname: CADDY_SITE_ADDRESS");
    },
  );

  it("requires the S3 Storage backend in production", () => {
    expect(
      validateDeployment({
        mode: "production",
        environment: { ...productionEnvironment, STORAGE_BACKEND: "file" },
        resources: productionResources,
      }).errors,
    ).toContain("Invalid production storage backend: STORAGE_BACKEND");
  });

  it.each([
    ["CPU_CORES", { cpuCores: 3, memoryGb: 8, diskGb: 80 }],
    ["MEMORY_GB", { cpuCores: 4, memoryGb: 7, diskGb: 80 }],
    ["DISK_GB", { cpuCores: 4, memoryGb: 8, diskGb: 79 }],
  ] as const)(
    "rejects insufficient production resource %s",
    (name, resources) => {
      expect(
        validateDeployment({
          mode: "production",
          environment: productionEnvironment,
          resources,
        }).errors,
      ).toContain(`Insufficient production resource: ${name}`);
    },
  );

  it("reports names for multiple failures without revealing values", () => {
    const environment: DeploymentEnvironment = {
      ...productionEnvironment,
      SMTP_PASS: "do-not-print-this-smtp-secret",
      NEXT_PUBLIC_ACCIDENTAL_TOKEN: "do-not-print-this-smtp-secret",
    };
    delete environment.BACKUP_TARGET;

    const result = validateDeployment({
      mode: "production",
      environment,
      resources: { cpuCores: 2, memoryGb: 4, diskGb: 40 },
    });

    expect(result.errors.join("\n")).toContain("BACKUP_TARGET");
    expect(result.errors.join("\n")).toContain("CPU_CORES");
    expect(result.errors.join("\n")).not.toContain(
      "do-not-print-this-smtp-secret",
    );
  });
});
