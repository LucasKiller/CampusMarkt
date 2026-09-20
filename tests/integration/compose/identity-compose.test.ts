import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const composeFile = resolve(repositoryRoot, "compose.yaml");
const productionCompose = resolve(
  repositoryRoot,
  "infra/compose/production.yaml",
);

type ComposeService = {
  depends_on?: Record<string, { condition?: string }>;
  entrypoint?: string[];
  environment?: Record<string, string>;
  expose?: string[];
  image?: string;
  networks?: Record<string, { aliases?: string[] }>;
  ports?: Array<{ published?: string; target?: number; host_ip?: string }>;
  profiles?: string[];
  restart?: string;
  volumes?: Array<{ source?: string; target?: string; type?: string }>;
  working_dir?: string;
};

type ComposeModel = {
  networks?: Record<string, unknown>;
  services: Record<string, ComposeService>;
  volumes?: Record<string, unknown>;
};

function exampleEnvironment(): NodeJS.ProcessEnv {
  const contents = readFileSync(
    resolve(repositoryRoot, "infra/supabase/.env.example"),
    "utf8",
  );
  const entries = contents
    .split(/\r?\n/u)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    });

  return {
    ...process.env,
    ...Object.fromEntries(entries),
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost/api",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
  };
}

function renderCompose(environment = exampleEnvironment()): ComposeModel {
  const result = spawnSync(
    process.platform === "win32" ? "docker.exe" : "docker",
    [
      "compose",
      "--project-directory",
      repositoryRoot,
      "--file",
      composeFile,
      "--profile",
      "*",
      "config",
      "--format",
      "json",
    ],
    { cwd: repositoryRoot, encoding: "utf8", env: environment },
  );

  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as ComposeModel;
}

function renderProduction(environment: NodeJS.ProcessEnv) {
  return spawnSync(
    process.platform === "win32" ? "docker.exe" : "docker",
    [
      "compose",
      "--project-directory",
      repositoryRoot,
      "--file",
      composeFile,
      "--file",
      productionCompose,
      "--profile",
      "*",
      "config",
      "--format",
      "json",
    ],
    { cwd: repositoryRoot, encoding: "utf8", env: environment },
  );
}

describe("identity Compose integration and configuration", () => {
  it("enforces a 30-day absolute session timebox in Auth", () => {
    const auth = renderCompose().services.auth;
    expect(auth?.environment?.GOTRUE_SESSIONS_TIMEBOX).toBe("720h");
  });

  it("disables native Auth email autoconfirmation", () => {
    const auth = renderCompose().services.auth;
    expect(auth?.environment?.GOTRUE_MAILER_AUTOCONFIRM).toBe("false");
  });

  it("disables anonymous user registration in Auth", () => {
    const auth = renderCompose().services.auth;
    expect(auth?.environment?.GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED).toBe(
      "false",
    );
  });

  it("disables phone registration and SMS autoconfirmation in Auth", () => {
    const auth = renderCompose().services.auth;
    expect(auth?.environment?.GOTRUE_EXTERNAL_PHONE_ENABLED).toBe("false");
    expect(auth?.environment?.GOTRUE_SMS_AUTOCONFIRM).toBe("false");
  });

  it("configures web container service role credentials without client exposure", () => {
    const web = renderCompose().services.web;
    expect(web?.environment?.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    expect(web?.environment?.SUPABASE_SERVICE_ROLE_KEY).not.toBe("");
  });

  it("supplies the identity hash pepper to the web container", () => {
    const web = renderCompose().services.web;
    expect(web?.environment?.IDENTITY_HASH_PEPPER).toBe(
      "local-identity-pepper-for-testing-only-change-in-production",
    );
  });

  it("supplies the action link base URL to the web container", () => {
    const web = renderCompose().services.web;
    expect(web?.environment?.IDENTITY_ACTION_BASE_URL).toBe(
      "http://localhost:3000",
    );
  });

  it("sets required terms and privacy versions in the web container", () => {
    const web = renderCompose().services.web;
    expect(web?.environment?.CURRENT_TERMS_VERSION).toBe("2026-09-15");
    expect(web?.environment?.CURRENT_PRIVACY_VERSION).toBe("2026-09-15");
  });

  it("wires SMTP delivery settings to the web container", () => {
    const web = renderCompose().services.web;
    expect(web?.environment?.SMTP_HOST).toBeDefined();
    expect(web?.environment?.SMTP_PORT).toBeDefined();
    expect(web?.environment?.SMTP_ADMIN_EMAIL).toBeDefined();
    expect(web?.environment?.SMTP_TLS_MODE).toBeDefined();
  });

  it("wires the Inbucket mail capture service on test and local profiles", () => {
    const mail = renderCompose().services.mail;
    expect(mail?.image).toBe("inbucket/inbucket:3.0.3");
    expect(mail?.profiles).toEqual(expect.arrayContaining(["local", "test"]));
  });

  it("does not expose mail capture ports to the public host", () => {
    const mail = renderCompose().services.mail;
    expect(mail?.ports).toBeUndefined();
    expect(mail?.expose).toEqual(expect.arrayContaining(["2500", "9000"]));
  });

  it("provides backward-compatible network aliases for mail capture", () => {
    const mail = renderCompose().services.mail;
    expect(mail?.networks?.default?.aliases).toEqual(
      expect.arrayContaining(["mail", "supabase-mail"]),
    );
  });

  it("wires the identity-worker service with operations profile and no auto-restart", () => {
    const worker = renderCompose().services["identity-worker"];
    expect(worker?.profiles).toContain("operations");
    expect(worker?.restart).toBe("no");
  });

  it("configures identity-worker dependencies on database and gateway health", () => {
    const worker = renderCompose().services["identity-worker"];
    expect(worker?.depends_on?.db?.condition).toBe("service_healthy");
    expect(worker?.depends_on?.["api-gw"]?.condition).toBe("service_healthy");
  });

  it("configures identity-worker entrypoint and environment for bounded execution", () => {
    const worker = renderCompose().services["identity-worker"];
    expect(worker?.working_dir).toBe("/app");
    expect(worker?.entrypoint).toEqual([
      "node",
      "--experimental-strip-types",
      "scripts/identity/worker.ts",
      "--once",
    ]);
    expect(worker?.environment?.SUPABASE_INTERNAL_URL).toBe(
      "http://api-gw:8000",
    );
    expect(worker?.environment?.IDENTITY_WORKER_ID).toBeDefined();
    expect(worker?.environment?.IDENTITY_WORKER_BATCH_SIZE).toBe("25");
  });

  it("keeps identity-worker without public port exposure", () => {
    const worker = renderCompose().services["identity-worker"];
    expect(worker?.ports).toBeUndefined();
  });

  it("requires IDENTITY_HASH_PEPPER for production deployment", () => {
    const environment = exampleEnvironment();
    environment.CADDY_SITE_ADDRESS = "markt.example.edu";
    delete environment.IDENTITY_HASH_PEPPER;

    const result = renderProduction(environment);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("IDENTITY_HASH_PEPPER");
  });

  it("requires IDENTITY_ACTION_BASE_URL for production deployment", () => {
    const environment = exampleEnvironment();
    environment.CADDY_SITE_ADDRESS = "markt.example.edu";
    delete environment.IDENTITY_ACTION_BASE_URL;

    const result = renderProduction(environment);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("IDENTITY_ACTION_BASE_URL");
  });

  it("requires SMTP configuration for production deployment", () => {
    const environment = exampleEnvironment();
    environment.CADDY_SITE_ADDRESS = "markt.example.edu";
    delete environment.SMTP_HOST;

    const result = renderProduction(environment);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("SMTP_HOST");
  });
});
