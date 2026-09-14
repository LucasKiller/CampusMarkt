import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sourceProject = `campusmarkt-backup-test-${process.pid}`;
const restoreProject = `campusmarkt-restore-test-${process.pid}`;
const restoreDatabase = "campusmarkt_restore";
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const operationScript = resolve(
  repositoryRoot,
  "scripts/operations/backup-restore.ts",
);
const scratch = mkdtempSync(resolve(tmpdir(), "campusmarkt-operations-"));
const backupDestination = resolve(scratch, "backups");
let environment: NodeJS.ProcessEnv;
let manifestPath = "";
let marker = "";

type BackupManifest = {
  formatVersion: 1;
  createdAt: string;
  supabaseRelease: string;
  databaseArtifact: { path: string; sha256: string };
  storageArtifact: { path: string; sha256: string };
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
    POSTGRES_PASSWORD: "foundation-operations-test-password",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:8080",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      "sb_publishable_foundation_operations_test",
  };
}

function compose(projectName: string, arguments_: string[], input?: Buffer) {
  return spawnSync(
    docker,
    [
      "compose",
      "--project-name",
      projectName,
      "--project-directory",
      repositoryRoot,
      "--file",
      resolve(repositoryRoot, "compose.yaml"),
      ...arguments_,
    ],
    {
      cwd: repositoryRoot,
      encoding: input ? null : "utf8",
      env: environment,
      input,
      maxBuffer: 128 * 1024 * 1024,
    },
  );
}

function operation(arguments_: string[]) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", operationScript, ...arguments_],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: environment,
      maxBuffer: 128 * 1024 * 1024,
    },
  );
}

function query(projectName: string, database: string, sql: string) {
  const result = compose(projectName, [
    "exec",
    "--no-TTY",
    "db",
    "psql",
    "--username",
    "postgres",
    "--dbname",
    database,
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
    "--command",
    sql,
  ]);
  return {
    ...result,
    stdout: String(result.stdout).trim(),
    stderr: String(result.stderr),
  };
}

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function manifestFiles(directory: string) {
  return readdirSync(directory, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith("manifest.json"));
}

beforeAll(() => {
  environment = exampleEnvironment();
  mkdirSync(backupDestination);
  const started = compose(sourceProject, [
    "up",
    "--detach",
    "--wait",
    "storage",
  ]);
  if (started.status !== 0) {
    throw new Error(String(started.stderr || started.stdout));
  }
  const migrated = compose(sourceProject, ["run", "--rm", "migration"]);
  if (migrated.status !== 0) {
    throw new Error(String(migrated.stderr || migrated.stdout));
  }

  marker = `operations-round-trip-${process.pid}`;
  const inserted = query(
    sourceProject,
    "postgres",
    `insert into public.foundation_canary (marker) values ('${marker}');`,
  );
  if (inserted.status !== 0) {
    throw new Error(inserted.stderr);
  }
  const stored = compose(sourceProject, [
    "exec",
    "--no-TTY",
    "storage",
    "sh",
    "-c",
    `mkdir -p /var/lib/storage/operations-test && printf '%s' '${marker}' > /var/lib/storage/operations-test/object.txt`,
  ]);
  if (stored.status !== 0) {
    throw new Error(String(stored.stderr));
  }
}, 180_000);

afterAll(() => {
  compose(restoreProject, [
    "down",
    "--volumes",
    "--remove-orphans",
    "--timeout",
    "10",
  ]);
  compose(sourceProject, [
    "down",
    "--volumes",
    "--remove-orphans",
    "--timeout",
    "10",
  ]);
  rmSync(scratch, { recursive: true, force: true });
});

describe("manifest backup and isolated restore", () => {
  it("writes database and Storage artifacts with SHA-256 manifest entries", () => {
    const result = operation([
      "backup",
      "--destination",
      backupDestination,
      "--project-name",
      sourceProject,
    ]);

    expect(result.status, result.stderr).toBe(0);
    manifestPath = result.stdout.trim();
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as BackupManifest;
    const backupDirectory = resolve(manifestPath, "..");
    const databasePath = resolve(
      backupDirectory,
      manifest.databaseArtifact.path,
    );
    const storagePath = resolve(backupDirectory, manifest.storageArtifact.path);

    expect(manifest.formatVersion).toBe(1);
    expect(manifest.supabaseRelease).toBe("self-hosted/v0.8.1");
    expect(manifest.databaseArtifact.sha256).toBe(sha256(databasePath));
    expect(manifest.storageArtifact.sha256).toBe(sha256(storagePath));
    expect(backupDirectory.startsWith(backupDestination)).toBe(true);
  });

  it("emits no success manifest when the destination is unreachable", () => {
    const blockedDestination = resolve(scratch, "not-a-directory");
    writeFileSync(blockedDestination, "blocked");

    const result = operation([
      "backup",
      "--destination",
      blockedDestination,
      "--project-name",
      sourceProject,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
  });

  it("emits no success manifest after a database failure", () => {
    const destination = resolve(scratch, "database-failure");
    mkdirSync(destination);

    const result = operation([
      "backup",
      "--destination",
      destination,
      "--project-name",
      "campusmarkt-missing-database",
    ]);

    expect(result.status).not.toBe(0);
    expect(manifestFiles(destination)).toEqual([]);
  });

  it("emits no success manifest after a Storage failure", () => {
    const destination = resolve(scratch, "storage-failure");
    mkdirSync(destination);
    const stopped = compose(sourceProject, ["stop", "storage"]);
    expect(stopped.status, String(stopped.stderr)).toBe(0);

    try {
      const result = operation([
        "backup",
        "--destination",
        destination,
        "--project-name",
        sourceProject,
      ]);

      expect(result.status).not.toBe(0);
      expect(manifestFiles(destination)).toEqual([]);
    } finally {
      const restarted = compose(sourceProject, [
        "up",
        "--detach",
        "--wait",
        "storage",
      ]);
      expect(restarted.status, String(restarted.stderr)).toBe(0);
    }
  });

  it("refuses an active restore target", () => {
    const result = operation([
      "restore",
      "--source",
      manifestPath,
      "--target",
      "active",
      "--project-name",
      sourceProject,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("isolated");
  });

  it("rejects a manifest whose artifact checksum changed", () => {
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as BackupManifest;
    const tampered = resolve(scratch, "tampered");
    mkdirSync(tampered);
    copyFileSync(
      resolve(manifestPath, "..", manifest.databaseArtifact.path),
      resolve(tampered, manifest.databaseArtifact.path),
    );
    copyFileSync(
      resolve(manifestPath, "..", manifest.storageArtifact.path),
      resolve(tampered, manifest.storageArtifact.path),
    );
    const tamperedManifest = resolve(tampered, "manifest.json");
    writeFileSync(tamperedManifest, JSON.stringify(manifest));
    writeFileSync(
      resolve(tampered, manifest.databaseArtifact.path),
      "tampered",
      { flag: "a" },
    );

    const result = operation([
      "restore",
      "--source",
      tamperedManifest,
      "--target",
      "isolated",
      "--project-name",
      restoreProject,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("checksum");
  });

  it("restores the canary row and Storage object into an isolated project", () => {
    const stopped = compose(sourceProject, ["down", "--timeout", "10"]);
    expect(stopped.status, String(stopped.stderr)).toBe(0);
    const started = compose(restoreProject, [
      "up",
      "--detach",
      "--wait",
      "storage",
    ]);
    expect(started.status, String(started.stderr)).toBe(0);

    const restored = operation([
      "restore",
      "--source",
      manifestPath,
      "--target",
      "isolated",
      "--project-name",
      restoreProject,
    ]);
    expect(restored.status, restored.stderr).toBe(0);

    expect(
      query(
        restoreProject,
        restoreDatabase,
        `select marker from public.foundation_canary where marker = '${marker}';`,
      ).stdout,
    ).toBe(marker);
    const object = compose(restoreProject, [
      "exec",
      "--no-TTY",
      "storage",
      "cat",
      "/var/lib/storage/operations-test/object.txt",
    ]);
    expect(object.status, String(object.stderr)).toBe(0);
    expect(String(object.stdout)).toBe(marker);
  }, 180_000);
});
