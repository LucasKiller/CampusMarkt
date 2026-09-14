import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const operationsDirectory = resolve(repositoryRoot, "docs/operations");
const packageManifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
) as { scripts?: Record<string, string> };
const docker = process.platform === "win32" ? "docker.exe" : "docker";

const exercisedScripts = new Set([
  "backup",
  "build",
  "check",
  "docs:check",
  "env:validate",
  "preflight",
  "restore",
  "test:db",
  "test:operations",
  "verify",
]);
const exercisedComposeCommands = new Set([
  "config",
  "down",
  "exec",
  "pull",
  "run",
  "up",
]);

function fail(message: string): never {
  throw new Error(message);
}

function documentedCommands(contents: string): string[] {
  const commands: string[] = [];
  const blocks = contents.matchAll(/```console\r?\n([\s\S]*?)```/gu);
  for (const block of blocks) {
    for (const line of block[1]?.split(/\r?\n/u) ?? []) {
      if (line.startsWith("$ ")) {
        commands.push(line.slice(2));
      }
    }
  }
  return commands;
}

function verifyNpm(command: string) {
  if (command === "npm ci") {
    if (!existsSync(resolve(repositoryRoot, "package-lock.json"))) {
      fail("npm ci is documented without a package-lock.json file.");
    }
    return;
  }
  const match = /^npm run ([\w:-]+)/u.exec(command);
  const script = match?.[1];
  if (!script || !packageManifest.scripts?.[script]) {
    fail(`Documented npm command does not exist: ${command}`);
  }
  if (!exercisedScripts.has(script)) {
    fail(`Documented npm command is not covered by a gate: ${script}`);
  }
}

function verifyCompose(command: string) {
  if (!existsSync(resolve(repositoryRoot, "compose.yaml"))) {
    fail("A Compose command is documented without compose.yaml.");
  }
  const tokens = command.split(/\s+/u);
  const composeIndex = tokens.indexOf("compose");
  const subcommand = tokens
    .slice(composeIndex + 1)
    .find((token) => !token.startsWith("-") && !token.includes("campusmarkt"));
  if (!subcommand || !exercisedComposeCommands.has(subcommand)) {
    fail(`Unsupported documented Compose command: ${command}`);
  }
  const help = spawnSync(docker, ["compose", subcommand, "--help"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (help.status !== 0) {
    fail(
      `Docker Compose does not provide the documented command: ${subcommand}`,
    );
  }
}

function verifyShell(command: string) {
  const match = /^sh ([^ ]+\.sh)(?: |$)/u.exec(command);
  const script = match?.[1];
  if (!script || !existsSync(resolve(repositoryRoot, script))) {
    fail(`Documented shell script does not exist: ${command}`);
  }
}

function verifyCurl(command: string) {
  const match = /^curl --fail --show-error (https?:\/\/\S+)$/u.exec(command);
  if (!match?.[1]) {
    fail(`Unsupported documented curl command: ${command}`);
  }
  new URL(match[1]);
}

function verifyCommand(command: string) {
  if (command.startsWith("npm ")) return verifyNpm(command);
  if (command.startsWith("docker compose ")) return verifyCompose(command);
  if (command.startsWith("sh ")) return verifyShell(command);
  if (command.startsWith("curl ")) return verifyCurl(command);
  fail(`Documented command has no verification adapter: ${command}`);
}

function run() {
  const files = readdirSync(operationsDirectory)
    .filter((file) => file.endsWith(".md"))
    .sort();
  if (files.length !== 4) {
    fail("The operations guide set must contain exactly four Markdown files.");
  }

  const contents = files.map((file) => ({
    file,
    contents: readFileSync(resolve(operationsDirectory, file), "utf8"),
  }));
  const commands = contents.flatMap(({ contents: guide }) =>
    documentedCommands(guide),
  );
  if (commands.length === 0) {
    fail("The operations guides do not contain testable console commands.");
  }
  for (const command of commands) verifyCommand(command);

  const combined = contents.map(({ contents: guide }) => guide).join("\n");
  for (const contract of [
    "docker compose up --detach --wait",
    "docker compose down",
    "npm run preflight",
    "npm run backup",
    "npm run restore",
    "sh infra/supabase/update.sh --dry-run",
    "https://github.com/supabase/supabase/blob/master/docker/CHANGELOG.md",
  ]) {
    if (!combined.includes(contract)) {
      fail(
        `Operations documentation is missing required contract: ${contract}`,
      );
    }
  }
  process.stdout.write(
    `Documentation command verification passed (${files.length} guides, ${commands.length} commands).\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    run();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Documentation check failed."}\n`,
    );
    process.exitCode = 1;
  }
}
