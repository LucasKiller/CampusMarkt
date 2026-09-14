import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const composeFile = resolve(repositoryRoot, "compose.yaml");
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const maximumArtifactSize = 128 * 1024 * 1024;
const restoreDatabase = "campusmarkt_restore";

type Artifact = { path: string; sha256: string };

type BackupManifest = {
  formatVersion: 1;
  createdAt: string;
  supabaseRelease: string;
  databaseArtifact: Artifact;
  storageArtifact: Artifact;
};

type CommandResult = ReturnType<typeof spawnSync>;

function fail(message: string): never {
  throw new Error(message);
}

function option(arguments_: string[], name: string): string {
  const index = arguments_.indexOf(name);
  const value = index === -1 ? undefined : arguments_[index + 1];
  if (!value || value.startsWith("--")) {
    fail(`Missing required option ${name}.`);
  }
  return value;
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
      composeFile,
      ...arguments_,
    ],
    {
      cwd: repositoryRoot,
      encoding: null,
      env: process.env,
      input,
      maxBuffer: maximumArtifactSize,
    },
  );
}

function diagnostic(result: CommandResult): string {
  const output = Buffer.concat([
    Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0),
    Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
  ])
    .toString("utf8")
    .trim();
  return output.slice(0, 2_000) || "command did not return diagnostics";
}

function requireSuccess(result: CommandResult, operation: string): Buffer {
  if (result.error) {
    fail(`${operation} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${operation} failed: ${diagnostic(result)}`);
  }
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
}

function sha256(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

function artifactPath(manifestPath: string, artifact: Artifact): string {
  if (isAbsolute(artifact.path)) {
    fail("Manifest artifact paths must be relative.");
  }
  const directory = dirname(manifestPath);
  const resolved = resolve(directory, artifact.path);
  const pathFromManifest = relative(directory, resolved);
  if (pathFromManifest === ".." || pathFromManifest.startsWith(`..${sep}`)) {
    fail("Manifest artifact path escapes its backup directory.");
  }
  return resolved;
}

function readManifest(manifestPath: string): BackupManifest {
  const parsed = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as Partial<BackupManifest>;
  const artifacts = [parsed.databaseArtifact, parsed.storageArtifact];
  if (
    parsed.formatVersion !== 1 ||
    typeof parsed.createdAt !== "string" ||
    typeof parsed.supabaseRelease !== "string" ||
    artifacts.some(
      (artifact) =>
        !artifact ||
        typeof artifact.path !== "string" ||
        !/^[a-f0-9]{64}$/u.test(artifact.sha256 ?? ""),
    )
  ) {
    fail("Backup manifest is invalid or unsupported.");
  }
  return parsed as BackupManifest;
}

function releaseReference(): string {
  const contents = readFileSync(
    resolve(repositoryRoot, "infra/supabase/.supabase-version"),
    "utf8",
  ).trim();
  if (!contents.startsWith("ref=") || contents.length <= 4) {
    fail("Pinned Supabase release reference is invalid.");
  }
  return contents.slice(4);
}

function backup(arguments_: string[]): string {
  const destination = resolve(option(arguments_, "--destination"));
  const projectName = option(arguments_, "--project-name");
  mkdirSync(destination, { recursive: true });

  const createdAt = new Date().toISOString();
  const suffix = `${createdAt.replaceAll(":", "-")}-${process.pid}`;
  const partial = resolve(destination, `.partial-${suffix}`);
  const completed = resolve(destination, `backup-${suffix}`);

  try {
    mkdirSync(partial);
    const database = requireSuccess(
      compose(projectName, [
        "exec",
        "--no-TTY",
        "db",
        "pg_dump",
        "--username",
        "supabase_admin",
        "--dbname",
        "postgres",
        "--format=custom",
        "--no-owner",
        "--no-privileges",
      ]),
      "Database backup",
    );
    writeFileSync(resolve(partial, "database.dump"), database);

    const storage = requireSuccess(
      compose(projectName, [
        "exec",
        "--no-TTY",
        "storage",
        "tar",
        "-C",
        "/var/lib/storage",
        "-cf",
        "-",
        ".",
      ]),
      "Storage backup",
    );
    writeFileSync(resolve(partial, "storage.tar"), storage);

    const manifest: BackupManifest = {
      formatVersion: 1,
      createdAt,
      supabaseRelease: releaseReference(),
      databaseArtifact: {
        path: "database.dump",
        sha256: sha256(database),
      },
      storageArtifact: {
        path: "storage.tar",
        sha256: sha256(storage),
      },
    };
    writeFileSync(
      resolve(partial, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    renameSync(partial, completed);
    return resolve(completed, "manifest.json");
  } catch (error) {
    rmSync(partial, { recursive: true, force: true });
    throw error;
  }
}

function restore(arguments_: string[]): string {
  if (option(arguments_, "--target") !== "isolated") {
    fail("Restore is permitted only for an explicitly isolated target.");
  }
  const manifestPath = resolve(option(arguments_, "--source"));
  const projectName = option(arguments_, "--project-name");
  const manifest = readManifest(manifestPath);
  const databasePath = artifactPath(manifestPath, manifest.databaseArtifact);
  const storagePath = artifactPath(manifestPath, manifest.storageArtifact);
  const database = readFileSync(databasePath);
  const storage = readFileSync(storagePath);

  if (sha256(database) !== manifest.databaseArtifact.sha256) {
    fail(
      `Database artifact checksum does not match ${basename(manifestPath)}.`,
    );
  }
  if (sha256(storage) !== manifest.storageArtifact.sha256) {
    fail(`Storage artifact checksum does not match ${basename(manifestPath)}.`);
  }

  requireSuccess(
    compose(projectName, [
      "exec",
      "--no-TTY",
      "db",
      "createdb",
      "--username",
      "supabase_admin",
      restoreDatabase,
    ]),
    "Isolated restore database creation",
  );
  requireSuccess(
    compose(
      projectName,
      [
        "exec",
        "--no-TTY",
        "db",
        "pg_restore",
        "--username",
        "supabase_admin",
        "--dbname",
        restoreDatabase,
        "--exit-on-error",
        "--no-owner",
        "--no-privileges",
      ],
      database,
    ),
    "Database restore",
  );
  requireSuccess(
    compose(
      projectName,
      [
        "exec",
        "--no-TTY",
        "storage",
        "tar",
        "-C",
        "/var/lib/storage",
        "-xf",
        "-",
      ],
      storage,
    ),
    "Storage restore",
  );
  return "Restore completed for isolated target.";
}

function main(arguments_: string[]) {
  const [command, ...options] = arguments_;
  const output =
    command === "backup"
      ? backup(options)
      : command === "restore"
        ? restore(options)
        : fail("Usage: backup-restore.ts <backup|restore> [options]");
  process.stdout.write(`${output}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Operation failed."}\n`,
    );
    process.exitCode = 1;
  }
}
