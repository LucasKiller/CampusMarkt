import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
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

function queryAsync(sql: string) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>(
    (resolvePromise) => {
      const child = spawn(
        docker,
        [
          ...composePrefix,
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
        { cwd: repositoryRoot, env: environment },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("close", (status) => {
        resolvePromise({ status, stdout: stdout.trim(), stderr });
      });
      child.stdin.write(sql);
      child.stdin.end();
    },
  );
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

describe("T7 confirm and disconnect RPCs", () => {
  it("confirms verification, sets 180-day expiry, and clears token", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "a1".repeat(32);
    const tokenHashHex = "\\x" + "b1".repeat(32);

    query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
    `);

    const confirm = query(`
      select auth_user_id, university_id, status, expires_at > transaction_timestamp() + interval '179 days'
      from identity_api.confirm_university_verification('${tokenHashHex}'::bytea);
    `);
    expect(confirm.status, confirm.stderr).toBe(0);
    expect(confirm.stdout).toBe(`${userId}|tu-braunschweig|verified|t`);

    // Verify token hash is cleared
    const row = query(`
      select status, token_hash is null, token_expires_at is null, verified_at is not null
      from identity.university_verifications
      where auth_user_id = '${userId}';
    `);
    expect(row.stdout).toBe("verified|t|t|t");
  });

  it("rejects confirmation for expired token", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "a2".repeat(32);
    const tokenHashHex = "\\x" + "b2".repeat(32);

    // Insert pending with expired token
    query(`
      insert into identity.university_verifications (
        auth_user_id, university_id, institutional_email_hash, status,
        token_hash, token_expires_at
      ) values (
        '${userId}', 'tu-braunschweig', '${emailHash}', 'pending',
        '${tokenHashHex}'::bytea, transaction_timestamp() - interval '1 hour'
      );
    `);

    const confirm = query(`
      select * from identity_api.confirm_university_verification('${tokenHashHex}'::bytea);
    `);
    expect(confirm.status).not.toBe(0);
    expect(confirm.stderr).toContain("verification token is expired");
  });

  it("rejects confirmation for unknown or already consumed token", () => {
    const unknownTokenHex = "\\x" + "99".repeat(32);
    const confirm = query(`
      select * from identity_api.confirm_university_verification('${unknownTokenHex}'::bytea);
    `);
    expect(confirm.status).not.toBe(0);
    expect(confirm.stderr).toContain(
      "verification token is invalid or expired",
    );
  });

  it("rejects confirmation and cancels pending verification if account is deletion-pending", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "a3".repeat(32);
    const tokenHashHex = "\\x" + "b3".repeat(32);

    query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
    `);

    // Mark account deletion-pending
    query(`
      update identity.accounts
      set state = 'deletion_pending',
          deletion_requested_at = transaction_timestamp(),
          purge_due_at = transaction_timestamp() + interval '30 days'
      where auth_user_id = '${userId}';
    `);

    const confirm = query(`
      select * from identity_api.confirm_university_verification('${tokenHashHex}'::bytea);
    `);
    expect(confirm.status).not.toBe(0);
    expect(confirm.stderr).toContain("account is unavailable");

    // Pending verification record was not confirmed
    const row = query(`
      select status from identity.university_verifications where auth_user_id = '${userId}';
    `);
    expect(row.stdout).toBe("pending");
  });

  it("rejects confirmation if another account verified same email hash while in-flight", () => {
    const userA = createAuthUser({ confirmed: true });
    const userB = createAuthUser({ confirmed: true });
    const emailHash = "a4".repeat(32);
    const tokenHashHexB = "\\x" + "b4".repeat(32);

    // userB initiates verification
    query(`
      select identity_api.initiate_university_verification(
        '${userB}', 'tu-braunschweig', '${emailHash}', '${tokenHashHexB}'::bytea
      );
    `);

    // Meanwhile userA becomes verified with same hash
    query(`
      insert into identity.university_verifications (
        auth_user_id, university_id, institutional_email_hash, status,
        verified_at, expires_at
      ) values (
        '${userA}', 'tu-braunschweig', '${emailHash}', 'verified',
        transaction_timestamp(), transaction_timestamp() + interval '180 days'
      );
    `);

    // Now userB attempts to confirm
    const confirm = query(`
      select * from identity_api.confirm_university_verification('${tokenHashHexB}'::bytea);
    `);
    expect(confirm.status).not.toBe(0);
    expect(confirm.stderr).toContain("institutional email is already verified");
  });

  it("serializes concurrent confirmations so exactly one succeeds", async () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "a5".repeat(32);
    const tokenHashHex = "\\x" + "b5".repeat(32);

    query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
    `);

    const results = await Promise.all([
      queryAsync(
        `select * from identity_api.confirm_university_verification('${tokenHashHex}'::bytea);`,
      ),
      queryAsync(
        `select * from identity_api.confirm_university_verification('${tokenHashHex}'::bytea);`,
      ),
    ]);

    const successes = results.filter((r) => r.status === 0);
    const failures = results.filter((r) => r.status !== 0);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it("disconnects verification and allows email reuse", () => {
    const userId = createAuthUser({ confirmed: true });
    const emailHash = "a6".repeat(32);
    const tokenHashHex = "\\x" + "b6".repeat(32);

    query(`
      select identity_api.initiate_university_verification(
        '${userId}', 'tu-braunschweig', '${emailHash}', '${tokenHashHex}'::bytea
      );
      select * from identity_api.confirm_university_verification('${tokenHashHex}'::bytea);
    `);

    // Verify it is verified
    const before = query(`
      select count(*) from identity.university_verifications where auth_user_id = '${userId}';
    `);
    expect(before.stdout).toBe("1");

    // Disconnect
    const disconnect = query(`
      select identity_api.disconnect_university_verification('${userId}');
    `);
    expect(disconnect.status, disconnect.stderr).toBe(0);

    const after = query(`
      select count(*) from identity.university_verifications where auth_user_id = '${userId}';
    `);
    expect(after.stdout).toBe("0");

    // Now another user can initiate with this email hash immediately
    const userOther = createAuthUser({ confirmed: true });
    const tokenOther = "\\x" + "b7".repeat(32);
    const reuse = query(`
      select identity_api.initiate_university_verification(
        '${userOther}', 'tu-braunschweig', '${emailHash}', '${tokenOther}'::bytea
      );
    `);
    expect(reuse.status, reuse.stderr).toBe(0);
  });

  it("grants confirm and disconnect RPCs only to service_role", () => {
    expect(
      query(`
        select
          has_function_privilege('public', 'identity_api.confirm_university_verification(bytea)', 'execute'),
          has_function_privilege('anon', 'identity_api.confirm_university_verification(bytea)', 'execute'),
          has_function_privilege('authenticated', 'identity_api.confirm_university_verification(bytea)', 'execute'),
          has_function_privilege('service_role', 'identity_api.confirm_university_verification(bytea)', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");

    expect(
      query(`
        select
          has_function_privilege('public', 'identity_api.disconnect_university_verification(uuid)', 'execute'),
          has_function_privilege('anon', 'identity_api.disconnect_university_verification(uuid)', 'execute'),
          has_function_privilege('authenticated', 'identity_api.disconnect_university_verification(uuid)', 'execute'),
          has_function_privilege('service_role', 'identity_api.disconnect_university_verification(uuid)', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");
  });
});
