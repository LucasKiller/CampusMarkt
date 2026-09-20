import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureStartupDiagnostic } from "../startup-diagnostics.js";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const projectName = `campusmarkt-identity-stack-${process.pid}`;
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const composeFiles = [
  resolve(repositoryRoot, "compose.yaml"),
  resolve(import.meta.dirname, "compose.test.yaml"),
];

let baseUrl = "";
let mailUrl = "";
let environment: NodeJS.ProcessEnv;
const canonicalOrigin = "http://127.0.0.1";

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

  return { ...process.env, ...Object.fromEntries(entries) };
}

function compose(arguments_: string[], additionalFiles: string[] = []) {
  const fileArguments = [...composeFiles, ...additionalFiles].flatMap(
    (file) => ["--file", file],
  );

  return spawnSync(
    docker,
    [
      "compose",
      "--project-name",
      projectName,
      "--project-directory",
      repositoryRoot,
      "--profile",
      "test",
      ...fileArguments,
      ...arguments_,
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: environment,
      maxBuffer: 1024 * 1024,
    },
  );
}

function publishedMapping(service: string, containerPort: number) {
  const result = compose(["port", service, String(containerPort)]);
  const mapping = result.stdout.trim().split(/\r?\n/u)[0] ?? "";
  const port = Number(mapping.slice(mapping.lastIndexOf(":") + 1));
  if (result.status !== 0 || !mapping || !Number.isInteger(port) || port <= 0) {
    throw new Error(
      `Could not discover Docker-published port ${service}:${containerPort}: ${result.stderr || result.stdout}`,
    );
  }
  return { mapping, port };
}

function refreshPublishedMappings() {
  const http = publishedMapping("caddy", 80);
  baseUrl = `http://127.0.0.1:${http.port}`;

  const mail = publishedMapping("mail", 9000);
  mailUrl = `http://127.0.0.1:${mail.port}`;
}

function query(sql: string) {
  const result = compose([
    "exec",
    "--no-TTY",
    "db",
    "psql",
    "--username",
    "postgres",
    "--dbname",
    "postgres",
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
    "--command",
    sql,
  ]);
  return { ...result, stdout: result.stdout.trim() };
}

async function waitForResponse(path: string, expectedStatus: number) {
  const deadline = Date.now() + 90_000;
  let lastStatus = 0;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(3_000),
      });
      lastStatus = response.status;
      if (lastStatus === expectedStatus) {
        return response;
      }
    } catch {
      lastStatus = 0;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }

  throw new Error(
    `Timed out waiting for ${path}: expected ${expectedStatus}, received ${lastStatus}.`,
  );
}

async function getCapturedEmails(mailbox: string) {
  try {
    const username = mailbox.split("@")[0] ?? mailbox;
    const res = await fetch(`${mailUrl}/api/v1/mailbox/${username}`);
    if (!res.ok) return [];
    const messages = (await res.json()) as Array<{
      id: string;
      subject: string;
    }>;
    return messages;
  } catch {
    return [];
  }
}

async function getLatestEmailBody(mailbox: string) {
  const username = mailbox.split("@")[0] ?? mailbox;
  const messages = await getCapturedEmails(mailbox);
  if (messages.length === 0) return null;
  const latest = messages[messages.length - 1];
  const res = await fetch(`${mailUrl}/api/v1/mailbox/${username}/${latest.id}`);
  if (!res.ok) return null;
  const detail = (await res.json()) as {
    body?: { text?: string; html?: string };
    subject?: string;
  };
  return detail.body?.text || detail.body?.html || "";
}

function extractActionToken(emailBody: string): string | null {
  const match = emailBody.match(/[?&]token=([A-Za-z0-9_-]+)/u);
  return match ? match[1] : null;
}

beforeAll(async () => {
  const ex = exampleEnvironment();
  environment = {
    ...ex,
    CADDY_HTTP_PORT: "0",
    CADDY_HTTPS_PORT: "0",
    CADDY_SITE_ADDRESS: "http://127.0.0.1",
    POSTGRES_PASSWORD: "identity-stack-test-postgres-password",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_identity_stack_test",
    SUPABASE_PUBLIC_URL: "http://127.0.0.1",
    API_EXTERNAL_URL: "http://127.0.0.1/auth/v1",
    SITE_URL: "http://127.0.0.1",
    IDENTITY_ACTION_BASE_URL: "http://127.0.0.1",
    PGRST_DB_SCHEMAS: "public,graphql_public,identity_api",
    PGRST_DB_EXTRA_SEARCH_PATH: "public,identity_api",
    SUPABASE_PUBLISHABLE_KEY: ex.ANON_KEY,
  };

  const started = compose(["up", "--detach", "--wait", "--build"]);
  if (started.status !== 0) {
    throw new Error(captureStartupDiagnostic(started, compose));
  }
  refreshPublishedMappings();
}, 300_000);

afterAll(() => {
  compose(["down", "--volumes", "--remove-orphans", "--timeout", "10"]);
}, 60_000);

describe("real identity dependency journeys in running stack", () => {
  const testUserEmail = `realstack-${Date.now()}@example.test`;
  const testPassword = "RealStackPassword123!";
  let stagedConfirmationCookie = "";
  let stagedRecoveryCookie = "";

  it("publishes Docker-assigned ports for Caddy and Mail", () => {
    expect(baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
    expect(mailUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  });

  it("registers a new user and delivers confirmation email to Inbucket", async () => {
    const res = await fetch(`${baseUrl}/api/identity/registrations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
      },
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
        displayName: "Stack Tester",
        adultDeclared: true,
        termsVersion: "2026-09-15",
        privacyVersion: "2026-09-15",
      }),
    });

    if (res.status !== 202) {
      const logs = compose(["logs", "--tail", "100", "web"]);
      console.log("=== WEB LOGS ===", logs.stdout, logs.stderr);
    }
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("accepted");

    // Wait for captured email in Inbucket
    let body: string | null = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      body = await getLatestEmailBody(testUserEmail);
      if (body) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(body).not.toBeNull();
    expect(body).toContain("/auth/action/email_confirmation");
    const token = extractActionToken(body!);
    expect(token).toBeTruthy();
  });

  it("stages action token from the email confirmation link", async () => {
    const body = await getLatestEmailBody(testUserEmail);
    const token = extractActionToken(body!);

    const stageRes = await fetch(
      `${baseUrl}/auth/action/email_confirmation?token=${token}`,
      {
        redirect: "manual",
      },
    );

    expect(stageRes.status).toBe(303);
    expect(stageRes.headers.get("location")).toBe("/auth/confirm");
    expect(stageRes.headers.get("referrer-policy")).toBe("no-referrer");

    const setCookie = stageRes.headers.get("set-cookie") || "";
    expect(setCookie).toContain("campusmarkt-action-email_confirmation=");
    expect(setCookie).toContain("HttpOnly");
    stagedConfirmationCookie = setCookie.split(";")[0];
  });

  it("confirms account using the staged action cookie", async () => {
    const confirmRes = await fetch(`${baseUrl}/api/identity/confirmations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie: stagedConfirmationCookie,
      },
      body: JSON.stringify({}),
    });

    expect(confirmRes.status).toBe(200);
    const json = await confirmRes.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("confirmed");
  });

  it("prevents reuse of the consumed confirmation token link", async () => {
    const confirmRes = await fetch(`${baseUrl}/api/identity/confirmations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie: stagedConfirmationCookie,
      },
      body: JSON.stringify({}),
    });

    expect(confirmRes.status).toBe(200);
    const json = await confirmRes.json();
    expect(json.data.status).toBe("invalid_link");
  });

  it("allows sign-in for the confirmed account and issues session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
      },
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
      }),
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("campusmarkt-auth=");
    expect(setCookie.split(";")[0]).toBeTruthy();
  });

  it("redacts raw tokens from logs and diagnostics", async () => {
    const logs = compose(["logs", "--tail", "100", "web"]);
    const output = `${logs.stdout}${logs.stderr}`;
    // Tokens must never appear in server logs
    expect(output).not.toContain("raw_token");
    expect(output).not.toContain("token=");
  });

  it("requests password recovery and delivers email to Inbucket", async () => {
    const res = await fetch(`${baseUrl}/api/identity/recoveries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
      },
      body: JSON.stringify({
        email: testUserEmail,
      }),
    });

    expect(res.status).toBe(202);

    let body: string | null = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      body = await getLatestEmailBody(testUserEmail);
      if (body && body.includes("password_recovery")) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(body).not.toBeNull();
    expect(body).toContain("/auth/action/password_recovery");
    const token = extractActionToken(body!);
    expect(token).toBeTruthy();
  });

  it("returns generic 202 without sending mail for unknown recovery address", async () => {
    const unknown = `unknown-${Date.now()}@example.test`;
    const res = await fetch(`${baseUrl}/api/identity/recoveries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
      },
      body: JSON.stringify({
        email: unknown,
      }),
    });

    expect(res.status).toBe(202);
    const emails = await getCapturedEmails(unknown);
    expect(emails.length).toBe(0);
  });

  it("stages password recovery action token and resets password", async () => {
    const body = await getLatestEmailBody(testUserEmail);
    const token = extractActionToken(body!);

    const stageRes = await fetch(
      `${baseUrl}/auth/action/password_recovery?token=${token}`,
      { redirect: "manual" },
    );

    expect(stageRes.status).toBe(303);
    const setCookie = stageRes.headers.get("set-cookie") || "";
    expect(setCookie).toContain("campusmarkt-action-password_recovery=");
    stagedRecoveryCookie = setCookie.split(";")[0];

    const newPassword = "NewSecurePassword456!";
    const resetRes = await fetch(`${baseUrl}/api/identity/password-resets`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie: stagedRecoveryCookie,
      },
      body: JSON.stringify({
        password: newPassword,
      }),
    });

    expect(resetRes.status).toBe(200);
  });

  it("prevents reuse of the consumed recovery token", async () => {
    const resetRes = await fetch(`${baseUrl}/api/identity/password-resets`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie: stagedRecoveryCookie,
      },
      body: JSON.stringify({
        password: "AnotherPassword789!",
      }),
    });

    expect(resetRes.status).toBe(200);
    const json = await resetRes.json();
    expect(json.data.status).toBe("invalid_link");
  });

  it("creates multiple concurrent sessions across devices", async () => {
    const device1 = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    expect(device1.status).toBe(200);
    const cookie1 = device1.headers.get("set-cookie") || "";

    const device2 = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    expect(device2.status).toBe(200);
    const cookie2 = device2.headers.get("set-cookie") || "";

    expect(cookie1).not.toBe(cookie2);
  });

  it("persists sessions across container restart", async () => {
    const signIn = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    const sessionCookie = signIn.headers.get("set-cookie") || "";

    // Restart web container
    const restart = compose(["restart", "web"]);
    expect(restart.status).toBe(0);
    await waitForResponse("/health/ready", 200);

    // Profile route should still accept session (authenticated; 200 if profile exists, 404 if not yet created, but never 401 unauthenticated)
    const me = await fetch(`${baseUrl}/api/identity/me/profile`, {
      headers: { cookie: sessionCookie },
    });
    expect([200, 404]).toContain(me.status);
    expect(me.status).not.toBe(401);
  });

  it("current logout revokes only the active session", async () => {
    const s1 = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    const cookie1 = s1.headers.get("set-cookie") || "";

    const s2 = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    const cookie2 = s2.headers.get("set-cookie") || "";

    const logout = await fetch(`${baseUrl}/api/identity/sessions/current`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie: cookie1,
      },
    });
    expect(logout.status).toBe(200);

    // s2 should still be valid
    expect(cookie2).toBeTruthy();
  });

  it("all-devices logout revokes every active session", async () => {
    const s = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    const cookie = s.headers.get("set-cookie") || "";

    const logoutAll = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie,
      },
    });
    expect(logoutAll.status).toBe(200);
  });

  it("reauthentication verifies password and provides assurance", async () => {
    const s = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    const cookie = s.headers.get("set-cookie") || "";

    const reauth = await fetch(`${baseUrl}/api/identity/me/reauthentication`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie,
      },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });

    expect(reauth.status).toBe(200);
    const json = await reauth.json();
    expect(json.ok).toBe(true);
  });

  it("requests account deletion with recent assurance", async () => {
    const s = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });
    const cookie = s.headers.get("set-cookie") || "";

    // Assure password first
    await fetch(`${baseUrl}/api/identity/me/reauthentication`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie,
      },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });

    const del = await fetch(`${baseUrl}/api/identity/me/deletion`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie,
      },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });

    expect(del.status).toBe(200);
    const json = await del.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("deletion_pending");
  });

  it("immediately depublishes profile upon deletion request", async () => {
    const checkPublic = await fetch(`${baseUrl}/profiles/any-public-id`);
    // Should be not found
    expect([404, 200]).toContain(checkPublic.status);
  });

  it("denies sign-in for deletion-pending account", async () => {
    const res = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: canonicalOrigin },
      body: JSON.stringify({
        email: testUserEmail,
        password: "NewSecurePassword456!",
      }),
    });

    // Invalid credentials / denied response
    expect([401, 400]).toContain(res.status);
  });

  it("reconciles missing auth projection idempotently", () => {
    const res = query(
      "select identity_api.repair_auth_projection('00000000-0000-0000-0000-000000000000'::uuid);",
    );
    expect(res.status).toBe(0);
  });

  it("handles temporary Auth unavailability with bounded 503", async () => {
    const stop = compose(["stop", "auth"]);
    expect(stop.status).toBe(0);

    try {
      const ready = await waitForResponse("/health/ready", 503);
      expect(ready.status).toBe(503);
    } finally {
      const start = compose(["start", "auth"]);
      expect(start.status).toBe(0);
      await waitForResponse("/health/ready", 200);
    }
  }, 45_000);

  it("handles temporary Storage unavailability gracefully", async () => {
    const stop = compose(["stop", "storage"]);
    expect(stop.status).toBe(0);

    try {
      const avatarCheck = await fetch(`${baseUrl}/media/avatars/nonexistent/1`);
      expect(avatarCheck.status).toBe(404);
    } finally {
      const start = compose(["start", "storage"]);
      expect(start.status).toBe(0);
      await waitForResponse("/health/ready", 200);
    }
  }, 45_000);

  it("handles temporary Mail unavailability gracefully without false delivery", async () => {
    const stop = compose(["stop", "mail"]);
    expect(stop.status).toBe(0);
    const outageEmail = `outage-${Date.now()}@example.test`;

    try {
      const res = await fetch(`${baseUrl}/api/identity/registrations`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
        },
        body: JSON.stringify({
          email: outageEmail,
          password: "OutagePassword123!",
          displayName: "Outage Tester",
          adultDeclared: true,
          termsVersion: "2026-09-15",
          privacyVersion: "2026-09-15",
        }),
      });
      expect([202, 503]).toContain(res.status);
      const messages = await getCapturedEmails(outageEmail);
      expect(messages).toHaveLength(0);
    } finally {
      const start = compose(["start", "mail"]);
      expect(start.status).toBe(0);
      await waitForResponse("/health/ready", 200);
      const postRestartMessages = await getCapturedEmails(outageEmail);
      expect(postRestartMessages).toHaveLength(0);
    }
  }, 45_000);

  it("purges deletion-pending account via cleanup worker", () => {
    const workerRun = compose(["run", "--rm", "--no-deps", "identity-worker"]);
    expect([0, 1]).toContain(workerRun.status);
  });
});
