import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const REQUIRED_TABLES = [
  "marketplace.listings",
  "marketplace.profiles",
  "marketplace.moderation_actions",
] as const;

export type RequiredTable = (typeof REQUIRED_TABLES)[number];

export interface TableVerification {
  tableName: string;
  schemaPresent: boolean;
  rowCount: number;
}

export interface VerificationResult {
  ok: boolean;
  error?: string;
  message?: string;
  checksum?: string;
  tables?: TableVerification[];
  timestamp?: string;
}

export function calculateChecksum(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function verifyDumpContent(dumpSql: string): VerificationResult {
  if (!dumpSql || dumpSql.trim().length === 0) {
    return {
      ok: false,
      error: "EMPTY_DUMP",
      message: "Database dump content is empty.",
    };
  }

  const checksum = calculateChecksum(dumpSql);
  const tables: TableVerification[] = [];

  for (const table of REQUIRED_TABLES) {
    const [schema, name] = table.split(".");
    const tableRegex = new RegExp(
      `CREATE TABLE (?:IF NOT EXISTS )?(?:${schema}\\.|"${schema}"\\.)?["']?${name}["']?\\s*\\(`,
      "i",
    );

    const schemaPresent = tableRegex.test(dumpSql);

    let rowCount = 0;
    const copyRegex = new RegExp(
      `COPY (?:${schema}\\.|"${schema}"\\.)?["']?${name}["']?[^\\n]*FROM stdin;([\\s\\S]*?)\\\\?\\.`,
      "i",
    );
    const copyMatch = copyRegex.exec(dumpSql);
    if (copyMatch && copyMatch[1]) {
      const lines = copyMatch[1]
        .trim()
        .split("\n")
        .filter((l) => l.trim().length > 0 && l.trim() !== "\\.");
      rowCount = lines.length;
    } else {
      const insertRegex = new RegExp(
        `INSERT INTO (?:${schema}\\.|"${schema}"\\.)?["']?${name}["']?`,
        "gi",
      );
      const matches = dumpSql.match(insertRegex);
      if (matches) {
        rowCount = matches.length;
      }
    }

    tables.push({
      tableName: table,
      schemaPresent,
      rowCount,
    });
  }

  const missingTables = tables.filter((t) => !t.schemaPresent);
  if (missingTables.length > 0) {
    return {
      ok: false,
      error: "MISSING_TABLES",
      message: `Required tables missing in dump: ${missingTables.map((t) => t.tableName).join(", ")}`,
      checksum,
      tables,
    };
  }

  return {
    ok: true,
    checksum,
    tables,
    timestamp: new Date().toISOString(),
  };
}

export interface BackupVerifyOptions {
  dbUrl?: string;
  dumpProvider?: (url: string) => string;
}

export function executeBackupVerification(
  options: BackupVerifyOptions = {},
): VerificationResult {
  const dbUrl =
    options.dbUrl ?? process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    return {
      ok: false,
      error: "MISSING_ENV",
      message:
        "DATABASE_URL or SUPABASE_DB_URL environment variable is required.",
    };
  }

  try {
    let dumpContent = "";
    if (options.dumpProvider) {
      dumpContent = options.dumpProvider(dbUrl);
    } else {
      const cmd = `pg_dump --dbname="${dbUrl}" --clean --if-exists --schema=marketplace`;
      dumpContent = execSync(cmd, {
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
    }

    return verifyDumpContent(dumpContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: "DUMP_EXECUTION_FAILED",
      message: `Failed to execute pg_dump: ${message}`,
    };
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const result = executeBackupVerification();
  if (!result.ok) {
    console.error(
      `Backup verification failed: [${result.error}] ${result.message}`,
    );
    process.exit(1);
  }
  console.log(`Backup verification succeeded! Checksum: ${result.checksum}`);
  console.log(JSON.stringify(result.tables, null, 2));
  process.exit(0);
}
