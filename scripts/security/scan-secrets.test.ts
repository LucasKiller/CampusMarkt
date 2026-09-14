import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  formatFindings,
  scanEntries,
  scanTrackedFiles,
} from "./scan-secrets.ts";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function entry(contents: string, path = "fixture.env") {
  return { path, contents };
}

describe("tracked-file secret scanning", () => {
  it("allows publishable browser credentials", () => {
    const findings = scanEntries([
      entry(
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${["sb", "publishable", "public_browser_value_123456"].join("_")}`,
      ),
    ]);

    expect(findings).toEqual([]);
  });

  it("allows inert documented placeholders", () => {
    const findings = scanEntries([
      entry(
        [
          "POSTGRES_PASSWORD=<operator-managed>",
          "SMTP_PASS=${SMTP_PASS}",
          "AWS_SECRET_ACCESS_KEY=replace-me",
        ].join("\n"),
      ),
    ]);

    expect(findings).toEqual([]);
  });

  it("rejects a Supabase secret key", () => {
    const credential = ["sb", "secret", "live_value_0123456789abcdef"].join(
      "_",
    );

    expect(scanEntries([entry(`TOKEN=${credential}`)])).toEqual([
      { file: "fixture.env", rule: "supabase-secret-key" },
    ]);
  });

  it.each([
    ["service-role-key", "SERVICE_ROLE_KEY"],
    ["database-password", "POSTGRES_PASSWORD"],
    ["smtp-password", "SMTP_PASS"],
    ["storage-secret", "AWS_SECRET_ACCESS_KEY"],
  ])("rejects a %s assignment", (rule, variable) => {
    const credential = "Q9vK2mX7pL4sN8cR6tY1wA5zD3fH0jB2";

    expect(scanEntries([entry(`${variable}=${credential}`)])).toEqual([
      { file: "fixture.env", rule },
    ]);
  });

  it("rejects a TLS private key", () => {
    const privateKeyHeader = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");

    expect(scanEntries([entry(privateKeyHeader, "tls/server.key")])).toEqual([
      { file: "tls/server.key", rule: "tls-private-key" },
    ]);
  });

  it("rejects a database URL containing a password", () => {
    const credential = "Q9vK2mX7pL4sN8cR6tY1wA5zD3fH0jB2";

    expect(
      scanEntries([
        entry(`DATABASE_URL=postgresql://operator:${credential}@db:5432/app`),
      ]),
    ).toEqual([{ file: "fixture.env", rule: "database-url-password" }]);
  });

  it("identifies only the file and rule without printing the credential", () => {
    const credential = "Q9vK2mX7pL4sN8cR6tY1wA5zD3fH0jB2";
    const diagnostic = formatFindings(
      scanEntries([entry(`SMTP_PASS=${credential}`, "config/runtime.env")]),
    );

    expect(diagnostic).toBe("config/runtime.env: smtp-password");
    expect(diagnostic).not.toContain(credential);
  });

  it("uses scratch files without changing the real working tree", () => {
    const before = spawnSync("git", ["status", "--porcelain=v1"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).stdout;
    const scratch = mkdtempSync(resolve(tmpdir(), "campusmarkt-secrets-"));
    const scratchFile = resolve(scratch, "tracked.env");
    const credential = "Q9vK2mX7pL4sN8cR6tY1wA5zD3fH0jB2";

    try {
      writeFileSync(scratchFile, `POSTGRES_PASSWORD=${credential}`);

      expect(
        scanEntries([
          { path: scratchFile, contents: readFileSync(scratchFile, "utf8") },
        ]),
      ).toEqual([{ file: scratchFile, rule: "database-password" }]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }

    expect(
      spawnSync("git", ["status", "--porcelain=v1"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }).stdout,
    ).toBe(before);
  });

  it("finds no configured credential pattern in current tracked files", () => {
    expect(scanTrackedFiles(repositoryRoot)).toEqual([]);
  });
});
