import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export type ScanEntry = { path: string; contents: string };
export type SecretFinding = { file: string; rule: string };

const trustedVendoredExamples = new Set(["infra/supabase/.env.example"]);

const namedSecretRules = new Map<string, string>([
  ["SERVICE_ROLE_KEY", "service-role-key"],
  ["SUPABASE_SECRET_KEY", "supabase-secret-key"],
  ["POSTGRES_PASSWORD", "database-password"],
  ["DATABASE_PASSWORD", "database-password"],
  ["SMTP_PASS", "smtp-password"],
  ["SMTP_PASSWORD", "smtp-password"],
  ["AWS_SECRET_ACCESS_KEY", "storage-secret"],
  ["S3_SECRET_ACCESS_KEY", "storage-secret"],
]);

const namedAssignment = new RegExp(
  `^\\s*["']?(${[...namedSecretRules.keys()].join("|")})["']?\\s*[:=]\\s*(.+?)\\s*$`,
  "u",
);

function normalizedPath(path: string) {
  return path.replaceAll("\\", "/");
}

function isInertPlaceholder(value: string) {
  const normalized = value
    .trim()
    .replace(/,$/u, "")
    .replace(/^["']|["']$/gu, "")
    .toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith("$") ||
    /^<[^>]+>$/u.test(normalized) ||
    /^\$\{[^}]+\}$/u.test(normalized) ||
    [
      "change-me",
      "changeme",
      "replace-me",
      "placeholder",
      "example",
      "generated",
      "test",
      "local",
      "development",
      "demo",
      "fake",
      "inert",
      "do-not-print",
      "foundation-stack-",
      "invalid",
      "your-",
    ].some((marker) => normalized.includes(marker))
  );
}

export function scanEntries(entries: ScanEntry[]): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const entry of entries) {
    const file = entry.path;
    if (
      trustedVendoredExamples.has(normalizedPath(file)) ||
      entry.contents.includes("\0")
    ) {
      continue;
    }

    if (/\bsb_secret_[A-Za-z0-9_-]{16,}\b/u.test(entry.contents)) {
      findings.push({ file, rule: "supabase-secret-key" });
    }

    if (
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(entry.contents)
    ) {
      findings.push({ file, rule: "tls-private-key" });
    }

    for (const line of entry.contents.split(/\r?\n/u)) {
      const assignment = namedAssignment.exec(line);
      if (assignment) {
        const [, variable, value] = assignment;
        if (variable && value && !isInertPlaceholder(value)) {
          findings.push({ file, rule: namedSecretRules.get(variable)! });
        }
      }

      const databaseUrl = /postgres(?:ql)?:\/\/[^:\s/]+:([^@\s]+)@/u.exec(line);
      if (databaseUrl?.[1] && !isInertPlaceholder(databaseUrl[1])) {
        findings.push({ file, rule: "database-url-password" });
      }
    }
  }

  return findings.filter(
    (finding, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.file === finding.file && candidate.rule === finding.rule,
      ) === index,
  );
}

export function scanTrackedFiles(repositoryRoot: string) {
  const inventory = spawnSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (inventory.status !== 0) {
    throw new Error("Could not read the Git tracked-file inventory.");
  }

  const entries = inventory.stdout
    .split("\0")
    .filter(Boolean)
    .map((path) => ({
      path: normalizedPath(path),
      contents: readFileSync(resolve(repositoryRoot, path), "utf8"),
    }));

  return scanEntries(entries);
}

export function formatFindings(findings: SecretFinding[]) {
  return findings
    .map((finding) => `${finding.file}: ${finding.rule}`)
    .join("\n");
}

function runCli() {
  const findings = scanTrackedFiles(process.cwd());
  if (findings.length > 0) {
    console.error(formatFindings(findings));
    process.exitCode = 1;
    return;
  }

  console.log("Tracked-file secret scan passed.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}
