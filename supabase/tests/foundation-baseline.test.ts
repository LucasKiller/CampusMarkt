import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const projectName = `campusmarkt-db-test-${process.pid}`;
const docker = process.platform === "win32" ? "docker.exe" : "docker";

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
    POSTGRES_PASSWORD: "foundation-test-postgres-password",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:8080",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_foundation_test",
  };
}

const environment = exampleEnvironment();
const composePrefix = [
  "compose",
  "--project-name",
  projectName,
  "--project-directory",
  repositoryRoot,
  "--file",
  resolve(repositoryRoot, "compose.yaml"),
  "--file",
  resolve(repositoryRoot, "supabase/tests/compose.test.yaml"),
];

function compose(arguments_: string[], input?: string) {
  return spawnSync(docker, [...composePrefix, ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: environment,
    input,
  });
}

function query(sql: string) {
  const result = compose(
    [
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
    ],
    sql,
  );
  return { ...result, stdout: result.stdout.trim() };
}

function applyMigrations() {
  return compose(["run", "--rm", "--no-deps", "migration"]);
}

beforeAll(() => {
  const started = compose(["up", "--detach", "--wait", "db"]);
  if (started.status !== 0) {
    throw new Error(started.stderr || started.stdout);
  }
});

afterAll(() => {
  compose(["down", "--volumes", "--remove-orphans"]);
});

describe("private-by-default migration baseline", () => {
  it("applies the clean migration and records one history entry", () => {
    const migration = applyMigrations();
    expect(migration.status, migration.stderr).toBe(0);

    expect(
      query("select to_regclass('public.foundation_canary');").stdout,
    ).toBe("foundation_canary");
    expect(
      query("select count(*) from app_migrations.schema_migrations;").stdout,
    ).toBe("1");
  });

  it("does not apply the same migration twice", () => {
    const migration = applyMigrations();
    expect(migration.status, migration.stderr).toBe(0);
    expect(
      query("select count(*) from app_migrations.schema_migrations;").stdout,
    ).toBe("1");
  });

  it("enables RLS on the canary without adding a policy", () => {
    expect(
      query(`
        select c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'foundation_canary';
      `).stdout,
    ).toBe("t");
    expect(
      query(`
        select count(*)
        from pg_policies
        where schemaname = 'public' and tablename = 'foundation_canary';
      `).stdout,
    ).toBe("0");
  });

  it("grants Data API visibility while denying rows to anon and authenticated", () => {
    expect(
      query(`
        truncate public.foundation_canary restart identity;
        insert into public.foundation_canary (marker) values ('private fixture');
        select has_table_privilege('anon', 'public.foundation_canary', 'select'),
               has_table_privilege('authenticated', 'public.foundation_canary', 'select');
      `).stdout,
    ).toBe("t|t");
    expect(
      query("set role anon; select count(*) from public.foundation_canary;")
        .stdout,
    ).toBe("0");
    expect(
      query(
        "set role authenticated; select count(*) from public.foundation_canary;",
      ).stdout,
    ).toBe("0");
  });

  it("fails an invalid scratch migration without history or partial schema", () => {
    const before = query(
      "select count(*) from app_migrations.schema_migrations;",
    ).stdout;
    const invalid = compose(
      [
        "exec",
        "--no-TTY",
        "db",
        "psql",
        "--username",
        "postgres",
        "--dbname",
        "postgres",
        "--single-transaction",
        "--set",
        "ON_ERROR_STOP=1",
      ],
      "create table public.invalid_scratch(id bigint); invalid syntax;",
    );

    expect(invalid.status).not.toBe(0);
    expect(
      query("select to_regclass('public.invalid_scratch') is null;").stdout,
    ).toBe("t");
    expect(
      query("select count(*) from app_migrations.schema_migrations;").stdout,
    ).toBe(before);
  });

  it("passes database lint and advisor error checks", () => {
    const port = compose(["port", "db", "5432"])
      .stdout.trim()
      .split(":")
      .at(-1);
    const databaseUrl = `postgresql://postgres:${environment.POSTGRES_PASSWORD}@127.0.0.1:${port}/postgres?sslmode=disable`;
    const cli = resolve(
      repositoryRoot,
      "node_modules/supabase/dist/supabase.js",
    );
    const lint = spawnSync(
      process.execPath,
      [
        cli,
        "db",
        "lint",
        "--db-url",
        databaseUrl,
        "--schema",
        "public",
        "--level",
        "error",
        "--fail-on",
        "error",
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    const advisors = spawnSync(
      process.execPath,
      [
        cli,
        "db",
        "advisors",
        "--db-url",
        databaseUrl,
        "--type",
        "all",
        "--level",
        "error",
        "--fail-on",
        "error",
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );

    expect(lint.status, lint.stderr || lint.stdout).toBe(0);
    expect(advisors.status, advisors.stderr || advisors.stdout).toBe(0);
  });
});
