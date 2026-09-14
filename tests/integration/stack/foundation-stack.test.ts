import { createServer } from "node:net";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const projectName = `campusmarkt-stack-test-${process.pid}`;
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const composeFiles = [resolve(repositoryRoot, "compose.yaml")];
let baseUrl = "";
let environment: NodeJS.ProcessEnv;

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

async function availablePort() {
  return await new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a stack test port."));
        return;
      }
      server.close(() => resolvePort(address.port));
    });
  });
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

async function statusOrZero(path: string) {
  try {
    return (
      await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(3_000),
      })
    ).status;
  } catch {
    return 0;
  }
}

beforeAll(async () => {
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  environment = {
    ...exampleEnvironment(),
    CADDY_HTTP_PORT: String(port),
    CADDY_HTTPS_PORT: String(port + 1),
    CADDY_SITE_ADDRESS: "http://127.0.0.1",
    POSTGRES_PASSWORD: "foundation-stack-postgres-password",
    NEXT_PUBLIC_SUPABASE_URL: baseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_foundation_test",
    SUPABASE_PUBLIC_URL: baseUrl,
    API_EXTERNAL_URL: `${baseUrl}/auth/v1`,
    SITE_URL: baseUrl,
  };

  const started = compose(["up", "--detach", "--wait"]);
  if (started.status !== 0) {
    throw new Error(started.stderr || started.stdout);
  }
}, 300_000);

afterAll(() => {
  compose(["down", "--volumes", "--remove-orphans", "--timeout", "10"]);
});

describe("running foundation stack", () => {
  it("keeps liveness independent from Supabase readiness", async () => {
    const stopped = compose(["stop", "api-gw"]);
    expect(stopped.status, stopped.stderr).toBe(0);

    try {
      const live = await waitForResponse("/health/live", 200);
      const ready = await waitForResponse("/health/ready", 503);

      expect(await live.json()).toEqual({ status: "live" });
      expect(await ready.json()).toEqual({
        status: "not_ready",
        unavailable: ["supabase"],
      });
    } finally {
      const restarted = compose(["start", "api-gw"]);
      expect(restarted.status, restarted.stderr).toBe(0);
      await waitForResponse("/health/ready", 200);
    }
  });

  it("serves the CampusMarkt shell through the only public ingress", async () => {
    const response = await fetch(baseUrl);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("CampusMarkt");
  });

  it("reports an exact ready payload when the platform is healthy", async () => {
    const response = await fetch(`${baseUrl}/health/ready`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready", unavailable: [] });
  });

  it("exposes Auth, REST, and Storage APIs only through ingress", async () => {
    const headers = { apikey: environment.ANON_KEY! };
    const [auth, rest, storage] = await Promise.all([
      fetch(`${baseUrl}/auth/v1/health`, { headers }),
      fetch(`${baseUrl}/rest/v1/foundation_canary?select=id`, { headers }),
      fetch(`${baseUrl}/storage/v1/status`),
    ]);

    expect([auth.status, rest.status, storage.status]).toEqual([200, 200, 200]);
    expect(await rest.json()).toEqual([]);
  });

  it("retains database and Storage fixtures across stop and start", async () => {
    const marker = `stack-persistence-${process.pid}`;
    const inserted = query(
      `insert into public.foundation_canary (marker) values ('${marker}');`,
    );
    expect(inserted.status, inserted.stderr).toBe(0);

    const stored = compose([
      "exec",
      "--no-TTY",
      "storage",
      "sh",
      "-c",
      `mkdir -p /var/lib/storage/stack-test && printf '%s' '${marker}' > /var/lib/storage/stack-test/object.txt`,
    ]);
    expect(stored.status, stored.stderr).toBe(0);

    const stopped = compose(["stop", "--timeout", "10"]);
    expect(stopped.status, stopped.stderr).toBe(0);
    const restarted = compose(["start"]);
    expect(restarted.status, restarted.stderr).toBe(0);
    await waitForResponse("/health/ready", 200);

    expect(
      query(
        `select marker from public.foundation_canary where marker = '${marker}';`,
      ).stdout,
    ).toBe(marker);
    const restoredObject = compose([
      "exec",
      "--no-TTY",
      "storage",
      "cat",
      "/var/lib/storage/stack-test/object.txt",
    ]);
    expect(restoredObject.status, restoredObject.stderr).toBe(0);
    expect(restoredObject.stdout).toBe(marker);
  });

  it("blocks public readiness and names a failed migration", async () => {
    const scratch = mkdtempSync(resolve(repositoryRoot, ".stack-migration-"));
    const migrations = resolve(scratch, "migrations");
    const override = resolve(scratch, "compose.yaml");

    try {
      writeFileSync(
        override,
        `services:\n  migration-gate:\n    volumes:\n      - type: bind\n        source: ${migrations.replaceAll("\\", "/")}\n        target: /app/migrations\n        read_only: true\n`,
      );
      mkdirSync(migrations);
      copyFileSync(
        resolve(
          repositoryRoot,
          "supabase/migrations/20260914221752_foundation_canary.sql",
        ),
        resolve(migrations, "20260914221752_foundation_canary.sql"),
      );
      writeFileSync(
        resolve(migrations, "20260915000000_invalid.sql"),
        "create table public.stack_invalid(id bigint); invalid syntax;",
      );

      const removed = compose([
        "rm",
        "--stop",
        "--force",
        "caddy",
        "web",
        "migration-gate",
      ]);
      expect(removed.status, removed.stderr).toBe(0);
      const failed = compose(["up", "--detach", "--wait", "caddy"], [override]);
      const diagnostic = `${failed.stderr}${failed.stdout}`;

      expect(failed.status).not.toBe(0);
      expect(diagnostic).toContain("migration");
      expect(diagnostic.length).toBeLessThan(20_000);
      expect(await statusOrZero("/health/ready")).not.toBe(200);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
