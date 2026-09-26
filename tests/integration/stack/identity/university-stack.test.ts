import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureStartupDiagnostic } from "../startup-diagnostics.js";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const projectName = `campusmarkt-uni-stack-${process.pid}`;
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

describe("university verification live stack journeys", () => {
  const user1Email = `uni-user1-${Date.now()}@example.test`;
  const user2Email = `uni-user2-${Date.now()}@example.test`;
  const studentEmail = `student-${Date.now()}@tu-braunschweig.de`;
  const password = "StackPassword123!";

  let user1AuthCookie = "";
  let user1PublicId = "";
  let user1AuthUserId = "";
  let user2AuthCookie = "";
  let verificationToken = "";

  async function registerAndLogin(email: string, displayName: string) {
    const regRes = await fetch(`${baseUrl}/api/identity/registrations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
      },
      body: JSON.stringify({
        email,
        password,
        displayName,
        adultDeclared: true,
        termsVersion: "2026-09-15",
        privacyVersion: "2026-09-15",
      }),
    });
    expect(regRes.status).toBe(202);

    let emailBody: string | null = null;
    for (let i = 0; i < 15; i++) {
      emailBody = await getLatestEmailBody(email);
      if (emailBody) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    expect(emailBody).not.toBeNull();
    const token = extractActionToken(emailBody!);
    expect(token).toBeTruthy();

    const stageRes = await fetch(
      `${baseUrl}/auth/action/email_confirmation?token=${token}`,
      { redirect: "manual" },
    );
    expect(stageRes.status).toBe(303);
    const setCookie = stageRes.headers.get("set-cookie") || "";
    const stageCookie = setCookie.split(";")[0];

    const confirmRes = await fetch(`${baseUrl}/api/identity/confirmations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
        cookie: stageCookie,
      },
      body: JSON.stringify({}),
    });
    expect(confirmRes.status).toBe(200);

    const loginRes = await fetch(`${baseUrl}/api/identity/sessions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: canonicalOrigin,
      },
      body: JSON.stringify({ email, password }),
    });
    expect(loginRes.status).toBe(200);
    const loginSetCookie = loginRes.headers.get("set-cookie") || "";
    return loginSetCookie.split(";")[0];
  }

  it("sets up authenticated user and verifies initial unverified profile state", async () => {
    user1AuthCookie = await registerAndLogin(user1Email, "Gauss Student");

    const profileRes = await fetch(`${baseUrl}/api/identity/me/profile`, {
      headers: { cookie: user1AuthCookie },
    });
    expect(profileRes.status).toBe(200);
    const profileJson = await profileRes.json();
    user1PublicId = profileJson.data.publicId;
    expect(user1PublicId).toBeTruthy();

    const statusRes = await fetch(
      `${baseUrl}/api/identity/me/university-verification`,
      { headers: { cookie: user1AuthCookie } },
    );
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.data.status).toBe("none");

    const publicRes = await fetch(
      `${baseUrl}/api/identity/profiles/${user1PublicId}`,
    );
    expect(publicRes.status).toBe(200);
    const publicJson = await publicRes.json();
    expect(publicJson.data.universityBadge).toBeFalsy();
  });

  it("initiates university verification and captures email in Inbucket", async () => {
    const initRes = await fetch(
      `${baseUrl}/api/identity/university-verifications`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
          cookie: user1AuthCookie,
        },
        body: JSON.stringify({ institutionalEmail: studentEmail }),
      },
    );

    expect(initRes.status).toBe(202);
    const initJson = await initRes.json();
    expect(initJson.ok).toBe(true);
    expect(initJson.data.status).toBe("accepted");

    let emailBody: string | null = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      emailBody = await getLatestEmailBody(studentEmail);
      if (emailBody) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(emailBody).not.toBeNull();
    expect(emailBody).toContain("TU Braunschweig");
    expect(emailBody).toContain("expires in 24 hours");

    const token = extractActionToken(emailBody!);
    expect(token).toBeTruthy();
    verificationToken = token!;
  });

  it("confirms verification and projects TU Braunschweig badge on public profile", async () => {
    const confirmRes = await fetch(
      `${baseUrl}/api/identity/university-verifications/confirm`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
        },
        body: JSON.stringify({ token: verificationToken }),
      },
    );

    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.ok).toBe(true);
    expect(confirmJson.data.status).toBe("verified");
    expect(confirmJson.data.badgeLabel).toBe("TU Braunschweig");
    expect(confirmJson.data.universityId).toBe("tu-braunschweig");

    const expiresAt = new Date(confirmJson.data.expiresAt);
    const now = new Date();
    const days = Math.round(
      (expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000),
    );
    expect(days).toBeGreaterThanOrEqual(179);
    expect(days).toBeLessThanOrEqual(181);

    const publicRes = await fetch(
      `${baseUrl}/api/identity/profiles/${user1PublicId}`,
    );
    expect(publicRes.status).toBe(200);
    const publicJson = await publicRes.json();
    expect(publicJson.data.universityBadge).toEqual({
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    });

    const statusRes = await fetch(
      `${baseUrl}/api/identity/me/university-verification`,
      { headers: { cookie: user1AuthCookie } },
    );
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.data.status).toBe("verified");
    expect(statusJson.data.daysRemaining).toBeGreaterThanOrEqual(179);
  });

  it("prevents reuse of consumed verification token", async () => {
    const reuseRes = await fetch(
      `${baseUrl}/api/identity/university-verifications/confirm`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
        },
        body: JSON.stringify({ token: verificationToken }),
      },
    );

    expect(reuseRes.status).toBe(200);
    const reuseJson = await reuseRes.json();
    expect(reuseJson.data.status).toBe("invalid_link");
  });

  it("rejects verification initiation for second account using active student email (1:1 uniqueness)", async () => {
    user2AuthCookie = await registerAndLogin(user2Email, "Second Student");

    const conflictRes = await fetch(
      `${baseUrl}/api/identity/university-verifications`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
          cookie: user2AuthCookie,
        },
        body: JSON.stringify({ institutionalEmail: studentEmail }),
      },
    );

    expect(conflictRes.status).toBe(409);
    const conflictJson = await conflictRes.json();
    expect(conflictJson.code).toBe("CONFLICT");
  });

  it("evaluates badge as expired at query time when expiration date passes", async () => {
    const dbResult = query(`
      UPDATE identity.university_verifications
      SET expires_at = now() - interval '1 hour'
      WHERE status = 'verified'
      RETURNING auth_user_id;
    `);
    expect(dbResult.status).toBe(0);
    user1AuthUserId = dbResult.stdout.split("\n")[0];
    expect(user1AuthUserId).toBeTruthy();

    const publicRes = await fetch(
      `${baseUrl}/api/identity/profiles/${user1PublicId}`,
    );
    expect(publicRes.status).toBe(200);
    const publicJson = await publicRes.json();
    expect(publicJson.data.universityBadge).toBeNull();

    const statusRes = await fetch(
      `${baseUrl}/api/identity/me/university-verification`,
      { headers: { cookie: user1AuthCookie } },
    );
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.data.status).toBe("expired");
    expect(statusJson.data.daysRemaining).toBe(0);
  });

  it("disconnects verification voluntarily and purges record releasing email hash", async () => {
    query(`
      UPDATE identity.university_verifications
      SET expires_at = now() + interval '12 months'
      WHERE auth_user_id = '${user1AuthUserId}';
    `);

    const delRes = await fetch(
      `${baseUrl}/api/identity/me/university-verification`,
      {
        method: "DELETE",
        headers: {
          origin: canonicalOrigin,
          cookie: user1AuthCookie,
        },
      },
    );
    expect(delRes.status).toBe(200);
    const delJson = await delRes.json();
    expect(delJson.ok).toBe(true);
    expect(delJson.data.status).toBe("disconnected");

    const countCheck = query(`
      SELECT count(*) FROM identity.university_verifications
      WHERE auth_user_id = '${user1AuthUserId}';
    `);
    expect(countCheck.stdout).toBe("0");

    const reuseInitRes = await fetch(
      `${baseUrl}/api/identity/university-verifications`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: canonicalOrigin,
          cookie: user2AuthCookie,
        },
        body: JSON.stringify({ institutionalEmail: studentEmail }),
      },
    );
    expect(reuseInitRes.status).toBe(202);
  });
});
