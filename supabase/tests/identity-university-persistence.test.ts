import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const projectName = `campusmarkt-university-db-${process.pid}`;
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
    POSTGRES_PASSWORD: "identity-test-postgres-password",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:8080",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_identity_test",
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

function createAuthUser(options?: {
  confirmed?: boolean;
  emailKey?: string;
  displayName?: string;
  adultDeclared?: boolean;
  termsVersion?: string;
  privacyVersion?: string;
  acceptedAt?: string;
}) {
  const id = crypto.randomUUID();
  const confirmedAt = options?.confirmed ? "transaction_timestamp()" : "null";
  const metadata = {
    email_key: options?.emailKey ?? id.replaceAll("-", "").repeat(2),
    display_name: options?.displayName ?? "Ada Lovelace",
    adult_declared: options?.adultDeclared ?? true,
    terms_version: options?.termsVersion ?? "2026-09-15",
    privacy_version: options?.privacyVersion ?? "2026-09-15",
    accepted_at: options?.acceptedAt ?? "2026-09-15T12:00:00.000Z",
  };
  const result = query(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated',
      'authenticated', '${id}@example.test', '', ${confirmedAt},
      '{"provider":"email","providers":["email"]}'::jsonb,
      '${JSON.stringify(metadata)}'::jsonb, transaction_timestamp(),
      transaction_timestamp()
    );
  `);
  expect(result.status, result.stderr).toBe(0);
  return id;
}

beforeAll(() => {
  const started = compose([
    "up",
    "--detach",
    "--wait",
    "db",
    "auth",
    "storage",
  ]);
  if (started.status !== 0) {
    throw new Error(started.stderr || started.stdout);
  }
  const migration = applyMigrations();
  if (migration.status !== 0) {
    throw new Error(migration.stderr || migration.stdout);
  }
}, 120_000);

afterAll(() => {
  compose(["down", "--volumes", "--remove-orphans"]);
}, 120_000);

describe("T5 university_verifications persistence and RLS", () => {
  it("enforces RLS and force RLS on identity.university_verifications", () => {
    const rls = query(`
      select c.relrowsecurity, c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'identity' and c.relname = 'university_verifications';
    `);
    expect(rls.stdout).toBe("t|t");
  });

  it("denies direct select to anon and authenticated roles", () => {
    const anon = query(`
      set role anon;
      select * from identity.university_verifications;
    `);
    expect(anon.status).not.toBe(0);
    expect(anon.stderr).toMatch(
      /permission denied for (schema identity|table university_verifications)/,
    );

    const auth = query(`
      set role authenticated;
      select * from identity.university_verifications;
    `);
    expect(auth.status).not.toBe(0);
    expect(auth.stderr).toMatch(
      /permission denied for (schema identity|table university_verifications)/,
    );
  });

  it("persists pending verification records", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "a".repeat(64);
    const tokenHashHex = "\\x" + "b".repeat(64);

    const inserted = query(`
      insert into identity.university_verifications (
        auth_user_id,
        university_id,
        institutional_email_hash,
        status,
        token_hash,
        token_expires_at
      ) values (
        '${userId}',
        'tu-braunschweig',
        '${emailHash}',
        'pending',
        '${tokenHashHex}'::bytea,
        transaction_timestamp() + interval '24 hours'
      );
      select status, university_id from identity.university_verifications where auth_user_id = '${userId}';
    `);

    expect(inserted.status, inserted.stderr).toBe(0);
    expect(inserted.stdout).toContain("pending|tu-braunschweig");
  });

  it("cascades verification record deletion when account is deleted", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "c".repeat(64);
    const tokenHashHex = "\\x" + "d".repeat(64);

    const inserted = query(`
      insert into identity.university_verifications (
        auth_user_id,
        university_id,
        institutional_email_hash,
        status,
        token_hash,
        token_expires_at
      ) values (
        '${userId}',
        'tu-braunschweig',
        '${emailHash}',
        'pending',
        '${tokenHashHex}'::bytea,
        transaction_timestamp() + interval '24 hours'
      );
    `);
    expect(inserted.status, inserted.stderr).toBe(0);

    const before = query(`
      select count(*) from identity.university_verifications where auth_user_id = '${userId}';
    `);
    expect(before.stdout).toBe("1");

    // Deleting from auth.users cascades to identity.accounts and then to university_verifications
    query(`delete from auth.users where id = '${userId}';`);

    const after = query(`
      select count(*) from identity.university_verifications where auth_user_id = '${userId}';
    `);
    expect(after.stdout).toBe("0");
  });

  it("enforces status and token consistency constraints", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "e".repeat(64);

    // Pending must have token_hash
    const invalidPending = query(`
      insert into identity.university_verifications (
        auth_user_id, university_id, institutional_email_hash, status
      ) values (
        '${userId}', 'tu-braunschweig', '${emailHash}', 'pending'
      );
    `);
    expect(invalidPending.status).not.toBe(0);

    // Verified must have null token_hash
    const tokenHashHex = "\\x" + "f".repeat(64);
    const invalidVerified = query(`
      insert into identity.university_verifications (
        auth_user_id, university_id, institutional_email_hash, status, token_hash, token_expires_at, verified_at, expires_at
      ) values (
        '${userId}', 'tu-braunschweig', '${emailHash}', 'verified', '${tokenHashHex}'::bytea,
        transaction_timestamp() + interval '24 hours', transaction_timestamp(), transaction_timestamp() + interval '180 days'
      );
    `);
    expect(invalidVerified.status).not.toBe(0);
  });
});

describe("T6 initiate_university_verification RPC", () => {
  it("denies initiation for unconfirmed accounts", () => {
    const userId = createAuthUser({ confirmed: false });
    const emailHash = "1".repeat(64);
    const tokenHashHex = "\\x" + "1".repeat(64);

    const result = query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
    `);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("account is unavailable");
  });

  it("denies initiation for deletion-pending accounts", () => {
    const userId = createAuthUser({ confirmed: true });
    // Mark account deletion_pending
    query(`
      update identity.accounts
      set state = 'deletion_pending',
          deletion_requested_at = transaction_timestamp(),
          purge_due_at = transaction_timestamp() + interval '30 days'
      where auth_user_id = '${userId}';
    `);

    const emailHash = "2".repeat(64);
    const tokenHashHex = "\\x" + "2".repeat(64);
    const result = query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
    `);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("account is unavailable");
  });

  it("denies initiation when institutional email is active on another account", () => {
    const userA = createAuthUser({ confirmed: true });
    const userB = createAuthUser({ confirmed: true });
    const emailHash = "3".repeat(64);

    // userA is verified and active (unexpired)
    query(`
      insert into identity.university_verifications (
        auth_user_id, university_id, institutional_email_hash, status,
        verified_at, expires_at
      ) values (
        '${userA}', 'tu-braunschweig', '${emailHash}', 'verified',
        transaction_timestamp(), transaction_timestamp() + interval '180 days'
      );
    `);

    // userB tries to initiate with same email hash
    const tokenHashHex = "\\x" + "3".repeat(64);
    const result = query(`
      select identity_api.initiate_university_verification(
        '${userB}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
    `);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("institutional email is already verified");
  });

  it("allows initiation when institutional email on another account is expired", () => {
    const userA = createAuthUser({ confirmed: true });
    const userB = createAuthUser({ confirmed: true });
    const emailHash = "4".repeat(64);

    // userA was verified but is now expired
    query(`
      insert into identity.university_verifications (
        auth_user_id, university_id, institutional_email_hash, status,
        verified_at, expires_at
      ) values (
        '${userA}', 'tu-braunschweig', '${emailHash}', 'verified',
        transaction_timestamp() - interval '200 days', transaction_timestamp() - interval '20 days'
      );
    `);

    // userB can initiate with this email hash
    const tokenHashHex = "\\x" + "4".repeat(64);
    const result = query(`
      select identity_api.initiate_university_verification(
        '${userB}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
      select status, university_id from identity.university_verifications where auth_user_id = '${userB}';
    `);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("pending|tu-braunschweig");
  });

  it("persists pending row with 24-hour token expiry and allows re-initiation by same user", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "5".repeat(64);
    const tokenHashHex1 = "\\x" + "5".repeat(64);
    const tokenHashHex2 = "\\x" + "6".repeat(64);

    const init1 = query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex1}'::bytea
      );
      select
        status,
        university_id,
        token_hash = '${tokenHashHex1}'::bytea,
        token_expires_at > transaction_timestamp() + interval '23 hours' and
        token_expires_at <= transaction_timestamp() + interval '24 hours'
      from identity.university_verifications
      where auth_user_id = '${userId}';
    `);
    expect(init1.status, init1.stderr).toBe(0);
    expect(init1.stdout).toContain("pending|tu-braunschweig|t|t");

    // Re-initiating overwrites token
    const init2 = query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex2}'::bytea
      );
      select
        status,
        token_hash = '${tokenHashHex2}'::bytea
      from identity.university_verifications
      where auth_user_id = '${userId}';
    `);
    expect(init2.status, init2.stderr).toBe(0);
    expect(init2.stdout).toContain("pending|t");
  });

  it("grants initiate_university_verification only to service_role", () => {
    expect(
      query(`
        select
          has_function_privilege('public', 'identity_api.initiate_university_verification(uuid,text,text,bytea)', 'execute'),
          has_function_privilege('anon', 'identity_api.initiate_university_verification(uuid,text,text,bytea)', 'execute'),
          has_function_privilege('authenticated', 'identity_api.initiate_university_verification(uuid,text,text,bytea)', 'execute'),
          has_function_privilege('service_role', 'identity_api.initiate_university_verification(uuid,text,text,bytea)', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");
  });
});
