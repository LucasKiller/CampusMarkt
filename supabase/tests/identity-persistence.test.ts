import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const projectName = `campusmarkt-identity-db-${process.pid}`;
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
      child.stdin.end(sql);
    },
  );
}

function tokenHash() {
  return `\\x${crypto.randomUUID().replaceAll("-", "").repeat(2)}`;
}

function subjectHash() {
  return crypto.randomUUID().replaceAll("-", "").repeat(2);
}

function publicIdFor(authUserId: string) {
  return query(
    `select public_id from identity.accounts where auth_user_id = '${authUserId}';`,
  ).stdout;
}

function avatarKey(publicId: string, version: number) {
  return `profiles/${publicId}/${version}-${crypto.randomUUID().replaceAll("-", "")}.webp`;
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

function createAuthSession(
  authUserId: string,
  options?: { id?: string; notAfter?: string | null },
) {
  const id = options?.id ?? crypto.randomUUID();
  const notAfter =
    options?.notAfter === undefined
      ? "transaction_timestamp() + interval '30 days'"
      : options.notAfter === null
        ? "null"
        : `'${options.notAfter}'::timestamptz`;
  const result = query(`
    insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
    values (
      '${id}', '${authUserId}', transaction_timestamp(),
      transaction_timestamp(), ${notAfter}
    );
  `);
  expect(result.status, result.stderr).toBe(0);
  return id;
}

function authenticatedQuery(
  authUserId: string,
  sessionId: string,
  sql: string,
) {
  return query(`
    do $claims$
    begin
      perform set_config(
        'request.jwt.claims',
        '{"sub":"${authUserId}","session_id":"${sessionId}","role":"authenticated"}',
        false
      );
    end
    $claims$;
    set role authenticated;
    ${sql}
  `);
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
});

afterAll(() => {
  compose(["down", "--volumes", "--remove-orphans"]);
});

describe("T8 account, profile, and consent persistence", () => {
  it("provisions exactly one account, profile, and consent set", () => {
    const id = createAuthUser();
    expect(
      query(`
        select
          (select count(*) from identity.accounts where auth_user_id = '${id}'),
          (select count(*) from identity.profiles where auth_user_id = '${id}'),
          (select count(*) from identity.consents where auth_user_id = '${id}');
      `).stdout,
    ).toBe("1|1|1");
  });

  it.each<[string, NonNullable<Parameters<typeof createAuthUser>[0]>]>([
    ["email_key", { emailKey: "short" }],
    ["display_name", { displayName: "x" }],
    ["adult_declared", { adultDeclared: false }],
    ["terms_version", { termsVersion: "" }],
    ["privacy_version", { privacyVersion: "" }],
    ["accepted_at", { acceptedAt: "invalid" }],
  ])("rejects invalid %s bootstrap without partial rows", (_field, input) => {
    const before = query("select count(*) from auth.users;").stdout;
    const id = crypto.randomUUID();
    const metadata = {
      email_key: input.emailKey ?? "b".repeat(64),
      display_name: input.displayName ?? "Grace Hopper",
      adult_declared: input.adultDeclared ?? true,
      terms_version: input.termsVersion ?? "2026-09-15",
      privacy_version: input.privacyVersion ?? "2026-09-15",
      accepted_at: input.acceptedAt ?? "2026-09-15T12:00:00.000Z",
    };
    const insertion = query(`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated',
        'authenticated', '${id}@example.test', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '${JSON.stringify(metadata)}'::jsonb, transaction_timestamp(),
        transaction_timestamp()
      );
    `);
    expect(insertion.status).not.toBe(0);
    expect(
      query(`select count(*) from auth.users where id = '${id}';`).stdout,
    ).toBe("0");
    expect(query("select count(*) from auth.users;").stdout).toBe(before);
  });

  it("creates unconfirmed application state for an unconfirmed Auth user", () => {
    const id = createAuthUser();
    expect(
      query(`select state from identity.accounts where auth_user_id = '${id}';`)
        .stdout,
    ).toBe("active_unconfirmed");
  });

  it("creates confirmed application state only for a confirmed Auth user", () => {
    const id = createAuthUser({ confirmed: true });
    expect(
      query(`
        select state, confirmed_at is not null
        from identity.accounts where auth_user_id = '${id}';
      `).stdout,
    ).toBe("active_confirmed|t");
  });

  it("stores only the pseudonymous email key outside Auth", () => {
    const key = "c".repeat(64);
    const id = createAuthUser({ emailKey: key });
    expect(
      query(`
        select email_key, to_jsonb(a)::text like '%@example.test%'
        from identity.accounts a where auth_user_id = '${id}';
      `).stdout,
    ).toBe(`${key}|f`);
  });

  it.each(["accounts", "profiles", "consents"])(
    "enables and forces RLS on identity.%s",
    (table) => {
      expect(
        query(`
          select c.relrowsecurity, c.relforcerowsecurity
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'identity' and c.relname = '${table}';
        `).stdout,
      ).toBe("t|t");
    },
  );

  it.each(["anon", "authenticated"])(
    "denies %s direct base-table access",
    (role) => {
      expect(
        query(`
          select has_schema_privilege('${role}', 'identity', 'usage'),
                 has_table_privilege('${role}', 'identity.accounts', 'select'),
                 has_table_privilege('${role}', 'identity.profiles', 'update'),
                 has_table_privilege('${role}', 'identity.consents', 'insert');
        `).stdout,
      ).toBe("f|f|f|f");
    },
  );

  it("returns exactly four approved public-profile fields", () => {
    const id = createAuthUser({ confirmed: true, displayName: "Lin Chen" });
    const publicId = query(
      `select public_id from identity.accounts where auth_user_id = '${id}';`,
    ).stdout;
    expect(
      query(`
        select array_to_string(array_agg(a.attname order by a.attnum), ',')
        from pg_type t
        join pg_attribute a on a.attrelid = t.typrelid
        where t.oid = 'identity_api.public_profile'::regtype
          and a.attnum > 0 and not a.attisdropped;
      `).stdout,
    ).toBe("public_id,display_name,joined_month,avatar_url");
    expect(
      query(`
        select public_id, display_name, joined_month, avatar_url is null
        from identity_api.get_public_profile('${publicId}');
      `).stdout,
    ).toMatch(new RegExp(`^${publicId}\\|Lin Chen\\|\\d{4}-\\d{2}\\|t$`, "u"));
  });

  it("returns no public profile for unconfirmed identities", () => {
    const id = createAuthUser();
    const publicId = query(
      `select public_id from identity.accounts where auth_user_id = '${id}';`,
    ).stdout;
    expect(
      query(
        `select count(*) from identity_api.get_public_profile('${publicId}');`,
      ).stdout,
    ).toBe("0");
  });

  it("returns the same empty result for absent and deletion-pending identities", () => {
    const id = createAuthUser({ confirmed: true });
    const publicId = query(
      `select public_id from identity.accounts where auth_user_id = '${id}';`,
    ).stdout;
    expect(
      query(`
        update identity.accounts set state = 'deletion_pending',
          deletion_requested_at = transaction_timestamp(),
          purge_due_at = transaction_timestamp() + interval '30 days'
        where auth_user_id = '${id}';
        select
          (select count(*) from identity_api.get_public_profile('${publicId}')),
          (select count(*) from identity_api.get_public_profile('${crypto.randomUUID()}'));
      `).stdout,
    ).toBe("0|0");
  });

  it("grants the public RPC only to its approved roles", () => {
    expect(
      query(`
        select
          has_function_privilege('public', 'identity_api.get_public_profile(uuid)', 'execute'),
          has_function_privilege('anon', 'identity_api.get_public_profile(uuid)', 'execute'),
          has_function_privilege('authenticated', 'identity_api.get_public_profile(uuid)', 'execute'),
          has_function_privilege('service_role', 'identity_api.get_public_profile(uuid)', 'execute');
      `).stdout,
    ).toBe("f|t|t|t");
  });

  it("indexes every non-primary foreign-key column", () => {
    expect(
      query(`
        select count(*)
        from pg_constraint c
        join pg_namespace n on n.oid = c.connamespace
        where n.nspname = 'identity' and c.contype = 'f'
          and not exists (
            select 1 from pg_index i
            where i.indrelid = c.conrelid
              and c.conkey <@ i.indkey::smallint[]
          );
      `).stdout,
    ).toBe("0");
  });

  it("cascades the complete projection when the Auth identity is deleted", () => {
    const id = createAuthUser();
    expect(query(`delete from auth.users where id = '${id}';`).status).toBe(0);
    expect(
      query(`
        select
          (select count(*) from identity.accounts where auth_user_id = '${id}'),
          (select count(*) from identity.profiles where auth_user_id = '${id}'),
          (select count(*) from identity.consents where auth_user_id = '${id}');
      `).stdout,
    ).toBe("0|0|0");
  });
});

describe("T9 one-time identity action tokens", () => {
  it("stores a digest and never defines a raw-token column", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${hash}'::bytea);
        select encode(token_hash, 'hex'),
          exists (
            select 1 from information_schema.columns
            where table_schema = 'identity' and table_name = 'action_tokens'
              and column_name in ('token', 'raw_token')
          )
        from identity.action_tokens where auth_user_id = '${id}';
      `).stdout,
    ).toBe(`${hash.slice(2)}|f`);
  });

  it.each([
    ["email_confirmation", 86_400],
    ["password_recovery", 1_800],
  ])("uses the exact %s lifetime", (purpose, seconds) => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', '${purpose}', '${hash}'::bytea);
        select extract(epoch from (expires_at - created_at))::bigint
        from identity.action_tokens where token_hash = '${hash}'::bytea;
      `).stdout,
    ).toBe(String(seconds));
  });

  it("rejects an unsupported token purpose", () => {
    const id = createAuthUser();
    expect(
      query(`
        select identity_api.issue_action_token(
          '${id}', 'magic_link', '${tokenHash()}'::bytea
        );
      `).status,
    ).not.toBe(0);
  });

  it("rejects a duplicate digest", () => {
    const first = createAuthUser();
    const second = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${first}', 'email_confirmation', '${hash}'::bytea);
        select identity_api.issue_action_token('${second}', 'password_recovery', '${hash}'::bytea);
      `).status,
    ).not.toBe(0);
  });

  it("reissue invalidates the earlier unused token of the same purpose", () => {
    const id = createAuthUser();
    const oldHash = tokenHash();
    const newHash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${oldHash}'::bytea);
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${newHash}'::bytea);
        select count(*) filter (where invalidated_at is not null),
               count(*) filter (where invalidated_at is null)
        from identity.action_tokens where auth_user_id = '${id}';
      `).stdout,
    ).toBe("1|1");
  });

  it("reissue does not invalidate the other purpose", () => {
    const id = createAuthUser();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${tokenHash()}'::bytea);
        select identity_api.issue_action_token('${id}', 'password_recovery', '${tokenHash()}'::bytea);
        select count(*) from identity.action_tokens
        where auth_user_id = '${id}' and invalidated_at is null;
      `).stdout,
    ).toBe("2");
  });

  it("stages a valid token without returning account data", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${hash}'::bytea);
        select valid, purpose
        from identity_api.stage_action_token('${hash}'::bytea, 'email_confirmation');
      `).stdout,
    ).toBe("t|email_confirmation");
  });

  it("staging rejects the wrong purpose without consuming the token", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${hash}'::bytea);
        select valid from identity_api.stage_action_token('${hash}'::bytea, 'password_recovery');
        select used_at is null from identity.action_tokens where token_hash = '${hash}'::bytea;
      `).stdout,
    ).toBe("f\nt");
  });

  it("staging rejects a token at its exact expiry boundary", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    query(`
      select identity_api.issue_action_token('${id}', 'password_recovery', '${hash}'::bytea);
      update identity.action_tokens set expires_at = transaction_timestamp()
      where token_hash = '${hash}'::bytea;
    `);
    expect(
      query(`
        select valid from identity_api.stage_action_token(
          '${hash}'::bytea, 'password_recovery'
        );
      `).stdout,
    ).toBe("f");
  });

  it("consumes a valid token exactly once", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'password_recovery', '${hash}'::bytea);
        select * from identity_api.consume_action_token('${hash}'::bytea, 'password_recovery');
        select count(*) from identity_api.consume_action_token('${hash}'::bytea, 'password_recovery');
      `).stdout,
    ).toBe(`${id}\n0`);
  });

  it("a wrong-purpose consume leaves the correct transition available", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${hash}'::bytea);
        select count(*) from identity_api.consume_action_token('${hash}'::bytea, 'password_recovery');
        select * from identity_api.consume_action_token('${hash}'::bytea, 'email_confirmation');
      `).stdout,
    ).toBe(`0\n${id}`);
  });

  it("an expired token cannot be consumed", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    query(`
      select identity_api.issue_action_token('${id}', 'password_recovery', '${hash}'::bytea);
      update identity.action_tokens set expires_at = transaction_timestamp()
      where token_hash = '${hash}'::bytea;
    `);
    expect(
      query(`
        select count(*) from identity_api.consume_action_token(
          '${hash}'::bytea, 'password_recovery'
        );
      `).stdout,
    ).toBe("0");
  });

  it("concurrent callbacks produce one successful transition", async () => {
    const id = createAuthUser();
    const hash = tokenHash();
    query(
      `select identity_api.issue_action_token('${id}', 'email_confirmation', '${hash}'::bytea);`,
    );
    const sql = `select count(*) from identity_api.consume_action_token('${hash}'::bytea, 'email_confirmation');`;
    const results = await Promise.all([queryAsync(sql), queryAsync(sql)]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(
      results
        .map((result) => Number(result.stdout))
        .reduce((sum, count) => sum + count, 0),
    ).toBe(1);
  });

  it("explicit invalidation prevents later consumption", () => {
    const id = createAuthUser();
    const hash = tokenHash();
    expect(
      query(`
        select identity_api.issue_action_token('${id}', 'email_confirmation', '${hash}'::bytea);
        select identity_api.invalidate_action_token('${hash}'::bytea, 'email_confirmation');
        select count(*) from identity_api.consume_action_token('${hash}'::bytea, 'email_confirmation');
      `).stdout,
    ).toBe("t\n0");
  });

  it("expiry cleanup removes expired tokens and preserves active ones", () => {
    query("select identity_api.prune_expired_action_tokens();");
    const id = createAuthUser();
    const expiredHash = tokenHash();
    const activeHash = tokenHash();
    query(`
      select identity_api.issue_action_token('${id}', 'email_confirmation', '${expiredHash}'::bytea);
      select identity_api.issue_action_token('${id}', 'password_recovery', '${activeHash}'::bytea);
      update identity.action_tokens set expires_at = transaction_timestamp()
      where token_hash = '${expiredHash}'::bytea;
    `);
    expect(
      query(`
        select identity_api.prune_expired_action_tokens();
        select encode(token_hash, 'hex') from identity.action_tokens
        where auth_user_id = '${id}';
      `).stdout,
    ).toBe(`1\n${activeHash.slice(2)}`);
  });

  it.each([
    "issue_action_token(uuid,text,bytea)",
    "stage_action_token(bytea,text)",
    "consume_action_token(bytea,text)",
    "invalidate_action_token(bytea,text)",
    "prune_expired_action_tokens()",
  ])("grants identity_api.%s only to service_role", (signature) => {
    expect(
      query(`
        select has_function_privilege('public', 'identity_api.${signature}', 'execute'),
               has_function_privilege('anon', 'identity_api.${signature}', 'execute'),
               has_function_privilege('authenticated', 'identity_api.${signature}', 'execute'),
               has_function_privilege('service_role', 'identity_api.${signature}', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");
  });

  it("forces RLS and denies browser roles direct token access", () => {
    expect(
      query(`
        select c.relrowsecurity, c.relforcerowsecurity,
          has_table_privilege('anon', 'identity.action_tokens', 'select'),
          has_table_privilege('authenticated', 'identity.action_tokens', 'insert')
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'identity' and c.relname = 'action_tokens';
      `).stdout,
    ).toBe("t|t|f|f");
  });

  it("deleting the Auth identity cascades all action tokens", () => {
    const id = createAuthUser();
    query(
      `select identity_api.issue_action_token('${id}', 'email_confirmation', '${tokenHash()}'::bytea);`,
    );
    expect(
      query(`
        delete from auth.users where id = '${id}';
        select count(*) from identity.action_tokens where auth_user_id = '${id}';
      `).stdout,
    ).toBe("0");
  });
});

describe("T10 atomic abuse limits and redacted audit", () => {
  it("allows ten sign-in identity attempts and rejects the eleventh", () => {
    const subject = subjectHash();
    const ip = subjectHash();
    query(`
      do $block$
      begin
        for attempt in 1..10 loop
          perform * from identity_api.consume_rate_limits('sign_in', '${subject}', '${ip}');
        end loop;
      end
      $block$;
    `);
    expect(
      query(`
        select allowed, retry_after_seconds between 1 and 900
        from identity_api.consume_rate_limits('sign_in', '${subject}', '${ip}');
      `).stdout,
    ).toBe("f|t");
  });

  it("allows one hundred sign-in IP attempts and rejects the next", () => {
    const ip = subjectHash();
    query(`
      do $block$
      begin
        for attempt in 1..100 loop
          perform * from identity_api.consume_rate_limits(
            'sign_in', md5(attempt::text) || md5(attempt::text), '${ip}'
          );
        end loop;
      end
      $block$;
    `);
    expect(
      query(`
        select allowed, retry_after_seconds between 1 and 900
        from identity_api.consume_rate_limits('sign_in', '${subjectHash()}', '${ip}');
      `).stdout,
    ).toBe("f|t");
  });

  it.each(["registration", "confirmation_resend", "recovery"])(
    "allows three %s identity requests and rejects the fourth",
    (action) => {
      const subject = subjectHash();
      const ip = subjectHash();
      query(`
        do $block$
        begin
          for attempt in 1..3 loop
            perform * from identity_api.consume_rate_limits('${action}', '${subject}', '${ip}');
          end loop;
        end
        $block$;
      `);
      expect(
        query(`
          select allowed, retry_after_seconds between 1 and 3600
          from identity_api.consume_rate_limits('${action}', '${subject}', '${ip}');
        `).stdout,
      ).toBe("f|t");
    },
  );

  it.each(["registration", "confirmation_resend", "recovery"])(
    "allows thirty %s IP requests and rejects the next",
    (action) => {
      const ip = subjectHash();
      query(`
        do $block$
        begin
          for attempt in 1..30 loop
            perform * from identity_api.consume_rate_limits(
              '${action}', md5(attempt::text) || md5(attempt::text), '${ip}'
            );
          end loop;
        end
        $block$;
      `);
      expect(
        query(`
          select allowed, retry_after_seconds between 1 and 3600
          from identity_api.consume_rate_limits('${action}', '${subjectHash()}', '${ip}');
        `).stdout,
      ).toBe("f|t");
    },
  );

  it("consumes both counters even when one limit denies", () => {
    const subject = subjectHash();
    const ip = subjectHash();
    query(`
      do $block$
      begin
        for attempt in 1..3 loop
          perform * from identity_api.consume_rate_limits('registration', '${subject}', '${subjectHash()}');
        end loop;
      end
      $block$;
    `);
    expect(
      query(`
        select allowed from identity_api.consume_rate_limits('registration', '${subject}', '${ip}');
        select attempts from identity.rate_limit_buckets
        where action = 'registration' and subject_kind = 'ip' and subject_hash = '${ip}';
      `).stdout,
    ).toBe("f\n1");
  });

  it("returns the longest applicable retry duration", () => {
    const subject = subjectHash();
    const ip = subjectHash();
    query(`
      insert into identity.rate_limit_buckets (
        action, subject_kind, subject_hash, window_started_at, attempts, expires_at
      ) values
        ('registration', 'identity', '${subject}', date_trunc('hour', transaction_timestamp()), 3,
          transaction_timestamp() + interval '500 seconds'),
        ('registration', 'ip', '${ip}', date_trunc('hour', transaction_timestamp()), 30,
          transaction_timestamp() + interval '1000 seconds');
    `);
    expect(
      query(`
        select allowed, retry_after_seconds
        from identity_api.consume_rate_limits('registration', '${subject}', '${ip}');
      `).stdout,
    ).toBe("f|1000");
  });

  it("serializes concurrent attempts at the identity threshold", async () => {
    const subject = subjectHash();
    query(`
      do $block$
      begin
        for attempt in 1..9 loop
          perform * from identity_api.consume_rate_limits(
            'sign_in', '${subject}', md5(attempt::text) || md5(attempt::text)
          );
        end loop;
      end
      $block$;
    `);
    const results = await Promise.all([
      queryAsync(
        `select allowed::int from identity_api.consume_rate_limits('sign_in', '${subject}', '${subjectHash()}');`,
      ),
      queryAsync(
        `select allowed::int from identity_api.consume_rate_limits('sign_in', '${subject}', '${subjectHash()}');`,
      ),
    ]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(results.map((result) => Number(result.stdout)).sort()).toEqual([
      0, 1,
    ]);
    expect(
      query(`
        select attempts from identity.rate_limit_buckets
        where action = 'sign_in' and subject_kind = 'identity'
          and subject_hash = '${subject}';
      `).stdout,
    ).toBe("11");
  });

  it("rejects an unsupported limiter action without buckets", () => {
    const subject = subjectHash();
    expect(
      query(`
        select * from identity_api.consume_rate_limits(
          'avatar', '${subject}', '${subjectHash()}'
        );
      `).status,
    ).not.toBe(0);
    expect(
      query(
        `select count(*) from identity.rate_limit_buckets where subject_hash = '${subject}';`,
      ).stdout,
    ).toBe("0");
  });

  it("rejects malformed subject hashes", () => {
    expect(
      query(`
        select * from identity_api.consume_rate_limits(
          'sign_in', 'raw@example.test', '${subjectHash()}'
        );
      `).status,
    ).not.toBe(0);
  });

  it("grants the limiter only to service_role", () => {
    expect(
      query(`
        select has_function_privilege('public', 'identity_api.consume_rate_limits(text,text,text)', 'execute'),
          has_function_privilege('anon', 'identity_api.consume_rate_limits(text,text,text)', 'execute'),
          has_function_privilege('authenticated', 'identity_api.consume_rate_limits(text,text,text)', 'execute'),
          has_function_privilege('service_role', 'identity_api.consume_rate_limits(text,text,text)', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");
  });

  it("persists every allowlisted security-event field", () => {
    const id = createAuthUser();
    const subject = subjectHash();
    const ip = subjectHash();
    const correlation = crypto.randomUUID();
    query(`
      select identity_api.append_security_event(
        '${id}', '${subject}', '${ip}', 'sign_in', 'succeeded', '${correlation}'
      );
    `);
    expect(
      query(`
        select auth_user_id, subject_hash, ip_hash, event_type, outcome,
          correlation_id, occurred_at is not null
        from identity.security_events where correlation_id = '${correlation}';
      `).stdout,
    ).toBe(`${id}|${subject}|${ip}|sign_in|succeeded|${correlation}|t`);
  });

  it("requires a pseudonymous subject, IP, or linked account", () => {
    expect(
      query(`
        select identity_api.append_security_event(
          null, null, null, 'sign_in', 'denied', '${crypto.randomUUID()}'
        );
      `).status,
    ).not.toBe(0);
  });

  it.each([
    ["unknown", "succeeded"],
    ["sign_in", "provider said raw details"],
  ])("rejects non-allowlisted audit values %s/%s", (eventType, outcome) => {
    expect(
      query(`
        select identity_api.append_security_event(
          null, '${subjectHash()}', null, '${eventType}', '${outcome}', '${crypto.randomUUID()}'
        );
      `).status,
    ).not.toBe(0);
  });

  it("rejects raw email text in audit hash fields", () => {
    expect(
      query(`
        select identity_api.append_security_event(
          null, 'person@example.test', null, 'recovery', 'accepted', '${crypto.randomUUID()}'
        );
      `).status,
    ).not.toBe(0);
  });

  it("grants audit append only to service_role and no table writes", () => {
    expect(
      query(`
        select has_function_privilege(
            'service_role', 'identity_api.append_security_event(uuid,text,text,text,text,uuid)', 'execute'
          ),
          has_function_privilege(
            'authenticated', 'identity_api.append_security_event(uuid,text,text,text,text,uuid)', 'execute'
          ),
          has_table_privilege('service_role', 'identity.security_events', 'insert'),
          has_table_privilege('service_role', 'identity.security_events', 'update'),
          has_table_privilege('service_role', 'identity.security_events', 'delete');
      `).stdout,
    ).toBe("t|f|f|f|f");
  });

  it.each(["rate_limit_buckets", "security_events"])(
    "forces RLS and denies browser access to identity.%s",
    (table) => {
      expect(
        query(`
          select c.relrowsecurity, c.relforcerowsecurity,
            has_table_privilege('anon', 'identity.${table}', 'select'),
            has_table_privilege('authenticated', 'identity.${table}', 'insert')
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'identity' and c.relname = '${table}';
        `).stdout,
      ).toBe("t|t|f|f");
    },
  );

  it("indexes user-linked events and investigation order", () => {
    expect(
      query(`
        select count(*)
        from pg_indexes
        where schemaname = 'identity'
          and indexname in (
            'security_events_auth_user_occurred_idx',
            'security_events_type_occurred_idx',
            'rate_limit_buckets_expiry_idx'
          );
      `).stdout,
    ).toBe("3");
  });

  it("cascades user-linked events during account purge", () => {
    const id = createAuthUser();
    query(`
      select identity_api.append_security_event(
        '${id}', null, null, 'account_deletion', 'accepted', '${crypto.randomUUID()}'
      );
      delete from auth.users where id = '${id}';
    `);
    expect(
      query(
        `select count(*) from identity.security_events where auth_user_id = '${id}';`,
      ).stdout,
    ).toBe("0");
  });
});

describe("T11 session assurance and immediate revocation", () => {
  it("accepts only a session bound to the JWT subject", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    expect(
      authenticatedQuery(
        id,
        sessionId,
        "select identity_api.current_session_is_active();",
      ).stdout,
    ).toBe("t");
  });

  it("rejects a missing backing session", () => {
    const id = createAuthUser({ confirmed: true });
    expect(
      authenticatedQuery(
        id,
        crypto.randomUUID(),
        "select identity_api.current_session_is_active();",
      ).stdout,
    ).toBe("f");
  });

  it("rejects a session belonging to another user", () => {
    const owner = createAuthUser({ confirmed: true });
    const caller = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(owner);
    expect(
      authenticatedQuery(
        caller,
        sessionId,
        "select identity_api.current_session_is_active();",
      ).stdout,
    ).toBe("f");
  });

  it("rejects an authenticated role without trusted claims", () => {
    expect(
      query(`
        do $claims$
        begin
          perform set_config('request.jwt.claims', '{}', false);
        end
        $claims$;
        set role authenticated;
        select identity_api.current_session_is_active();
      `).stdout,
    ).toBe("f");
  });

  it("rejects a session exactly at its not-after boundary", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id, {
      notAfter: "2026-09-15T12:00:00.000Z",
    });
    expect(
      authenticatedQuery(
        id,
        sessionId,
        "select identity_api.current_session_is_active();",
      ).stdout,
    ).toBe("f");
  });

  it("returns confirmed, active, fully provisioned identity status", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    expect(
      authenticatedQuery(
        id,
        sessionId,
        `select is_active, email_confirmed, profile_complete, consent_complete
         from identity_api.current_identity_status();`,
      ).stdout,
    ).toBe("t|t|t|t");
  });

  it("reports an unconfirmed identity as non-participating", () => {
    const id = createAuthUser();
    const sessionId = createAuthSession(id);
    expect(
      authenticatedQuery(
        id,
        sessionId,
        `select is_active, email_confirmed, profile_complete, consent_complete
         from identity_api.current_identity_status();`,
      ).stdout,
    ).toBe("t|f|t|t");
  });

  it("reports deletion-pending identity as inactive", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`
      update identity.accounts set state = 'deletion_pending',
        deletion_requested_at = transaction_timestamp(),
        purge_due_at = transaction_timestamp() + interval '30 days'
      where auth_user_id = '${id}';
    `);
    expect(
      authenticatedQuery(
        id,
        sessionId,
        "select is_active from identity_api.current_identity_status();",
      ).stdout,
    ).toBe("f");
  });

  it("fails closed when the profile projection is missing", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`delete from identity.profiles where auth_user_id = '${id}';`);
    expect(
      authenticatedQuery(
        id,
        sessionId,
        "select profile_complete from identity_api.current_identity_status();",
      ).stdout,
    ).toBe("f");
  });

  it("records password assurance only for a live matching session", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    expect(
      query(`
        select identity_api.record_password_assurance('${id}', '${sessionId}');
        select auth_user_id, password_verified_at is not null
        from identity.session_assurance where session_id = '${sessionId}';
      `).stdout,
    ).toBe(`${id}|t`);
  });

  it("rejects assurance for another user's session", () => {
    const owner = createAuthUser({ confirmed: true });
    const caller = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(owner);
    expect(
      query(
        `select identity_api.record_password_assurance('${caller}', '${sessionId}');`,
      ).status,
    ).not.toBe(0);
    expect(
      query(
        `select count(*) from identity.session_assurance where session_id = '${sessionId}';`,
      ).stdout,
    ).toBe("0");
  });

  it("rejects assurance for an expired session", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id, {
      notAfter: "2026-09-15T12:00:00.000Z",
    });
    expect(
      query(
        `select identity_api.record_password_assurance('${id}', '${sessionId}');`,
      ).status,
    ).not.toBe(0);
  });

  it("upserts one assurance row for repeated password verification", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`
      select identity_api.record_password_assurance('${id}', '${sessionId}');
      update identity.session_assurance
      set password_verified_at = transaction_timestamp() - interval '1 minute'
      where session_id = '${sessionId}';
      select identity_api.record_password_assurance('${id}', '${sessionId}');
    `);
    expect(
      query(`
        select count(*), password_verified_at > transaction_timestamp() - interval '10 seconds'
        from identity.session_assurance where session_id = '${sessionId}'
        group by password_verified_at;
      `).stdout,
    ).toBe("1|t");
  });

  it("does not refresh assurance when the Auth session refreshes", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`
      select identity_api.record_password_assurance('${id}', '${sessionId}');
      update identity.session_assurance
      set password_verified_at = '2026-09-15T12:00:00.000Z'
      where session_id = '${sessionId}';
      update auth.sessions set refreshed_at = transaction_timestamp()
      where id = '${sessionId}';
    `);
    expect(
      query(`
        select password_verified_at from identity.session_assurance
        where session_id = '${sessionId}';
      `).stdout,
    ).toBe("2026-09-15 12:00:00+00");
  });

  it("accepts assurance exactly at the ten-minute boundary", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`
      select identity_api.record_password_assurance('${id}', '${sessionId}');
      update identity.session_assurance
      set password_verified_at = '2026-09-15T12:00:00.000Z'
      where session_id = '${sessionId}';
    `);
    expect(
      query(`
        select identity.password_assurance_is_recent(
          '${id}', '${sessionId}', '2026-09-15T12:10:00.000Z'
        );
      `).stdout,
    ).toBe("t");
  });

  it("rejects assurance beyond the ten-minute boundary", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`
      select identity_api.record_password_assurance('${id}', '${sessionId}');
      update identity.session_assurance
      set password_verified_at = '2026-09-15T12:00:00.000Z'
      where session_id = '${sessionId}';
    `);
    expect(
      query(`
        select identity.password_assurance_is_recent(
          '${id}', '${sessionId}', '2026-09-15T12:10:00.001Z'
        );
      `).stdout,
    ).toBe("f");
  });

  it("revokes every target session and preserves another user's session", () => {
    const target = createAuthUser({ confirmed: true });
    const other = createAuthUser({ confirmed: true });
    createAuthSession(target);
    createAuthSession(target);
    createAuthSession(other);
    expect(
      query(`
        select identity_api.revoke_user_sessions('${target}');
        select
          (select count(*) from auth.sessions where user_id = '${target}'),
          (select count(*) from auth.sessions where user_id = '${other}');
      `).stdout,
    ).toBe("2\n0|1");
  });

  it("treats repeated all-session revocation as idempotent", () => {
    const id = createAuthUser({ confirmed: true });
    createAuthSession(id);
    expect(
      query(`
        select identity_api.revoke_user_sessions('${id}');
        select identity_api.revoke_user_sessions('${id}');
      `).stdout,
    ).toBe("1\n0");
  });

  it("converges safely when all-session revocations race", async () => {
    const id = createAuthUser({ confirmed: true });
    createAuthSession(id);
    createAuthSession(id);
    const sql = `select identity_api.revoke_user_sessions('${id}');`;
    const results = await Promise.all([queryAsync(sql), queryAsync(sql)]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(
      results
        .map((result) => Number(result.stdout))
        .reduce((sum, count) => sum + count, 0),
    ).toBe(2);
    expect(
      query(`select count(*) from auth.sessions where user_id = '${id}';`)
        .stdout,
    ).toBe("0");
  });

  it.each([
    ["current_identity_status()", "authenticated"],
    ["current_session_is_active()", "authenticated"],
    ["record_password_assurance(uuid,uuid)", "service_role"],
    ["revoke_user_sessions(uuid)", "service_role"],
  ])("grants identity_api.%s only to %s", (signature, role) => {
    expect(
      query(`
        select has_function_privilege('public', 'identity_api.${signature}', 'execute'),
          has_function_privilege('anon', 'identity_api.${signature}', 'execute'),
          has_function_privilege('authenticated', 'identity_api.${signature}', 'execute'),
          has_function_privilege('service_role', 'identity_api.${signature}', 'execute');
      `).stdout,
    ).toBe(role === "authenticated" ? "f|f|t|f" : "f|f|f|t");
  });

  it("forces assurance RLS, denies direct roles, and indexes account cleanup", () => {
    expect(
      query(`
        select c.relrowsecurity, c.relforcerowsecurity,
          has_table_privilege('authenticated', 'identity.session_assurance', 'select'),
          has_table_privilege('service_role', 'identity.session_assurance', 'insert'),
          exists (
            select 1 from pg_indexes where schemaname = 'identity'
              and indexname = 'session_assurance_auth_user_id_idx'
          )
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'identity' and c.relname = 'session_assurance';
      `).stdout,
    ).toBe("t|t|f|f|t");
  });

  it("cascades assurance when the Auth identity is deleted", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    query(`
      select identity_api.record_password_assurance('${id}', '${sessionId}');
      delete from auth.users where id = '${id}';
    `);
    expect(
      query(
        `select count(*) from identity.session_assurance where auth_user_id = '${id}';`,
      ).stdout,
    ).toBe("0");
  });
});

describe("T12 avatar state, private bucket, and cleanup queue", () => {
  it("creates one private WebP-only avatar bucket", () => {
    expect(
      query(`
        select id, public, file_size_limit, array_to_string(allowed_mime_types, ',')
        from storage.buckets where id = 'profile-avatars';
      `).stdout,
    ).toBe("profile-avatars|f|4194304|image/webp");
  });

  it.each(["anon", "authenticated"])(
    "prevents %s from reading the private bucket directly",
    (role) => {
      expect(
        query(`
          set role ${role};
          select count(*) from storage.buckets where id = 'profile-avatars';
        `).stdout,
      ).toBe("0");
    },
  );

  it.each(["anon", "authenticated"])(
    "prevents %s from writing avatar objects directly",
    (role) => {
      const insertion = query(`
        set role ${role};
        insert into storage.objects (bucket_id, name)
        values ('profile-avatars', 'profiles/forbidden/1-file.webp');
      `);
      expect(insertion.status).not.toBe(0);
    },
  );

  it("allows service_role to resolve the private bucket", () => {
    expect(
      query(`
        set role service_role;
        select count(*) from storage.buckets where id = 'profile-avatars';
      `).stdout,
    ).toBe("1");
  });

  it("swaps an avatar only at the expected version", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const key = avatarKey(publicIdFor(id), 1);
    expect(
      query(`
        select swapped, avatar_version, previous_object_key is null
        from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${key}');
        select avatar_version, avatar_object_key from identity.profiles
        where auth_user_id = '${id}';
      `).stdout,
    ).toBe(`t|1|t\n1|${key}`);
  });

  it("queues the superseded derivative within 24 hours", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const publicId = publicIdFor(id);
    const oldKey = avatarKey(publicId, 1);
    const newKey = avatarKey(publicId, 2);
    query(`
      select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${oldKey}');
      select * from identity_api.swap_avatar('${id}', '${sessionId}', 1, '${newKey}');
    `);
    expect(
      query(`
        select object_key, delete_by <= transaction_timestamp() + interval '24 hours',
          state, attempts
        from identity.avatar_cleanup_jobs where object_key = '${oldKey}';
      `).stdout,
    ).toBe(`${oldKey}|t|pending|0`);
  });

  it("queues a losing candidate and preserves the winning pointer", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const publicId = publicIdFor(id);
    const winner = avatarKey(publicId, 1);
    const loser = avatarKey(publicId, 1);
    query(
      `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${winner}');`,
    );
    expect(
      query(`
        select swapped, avatar_version, previous_object_key
        from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${loser}');
        select avatar_object_key from identity.profiles where auth_user_id = '${id}';
        select count(*) from identity.avatar_cleanup_jobs where object_key = '${loser}';
      `).stdout,
    ).toBe(`f|1|${winner}\n${winner}\n1`);
  });

  it("serializes concurrent replacements to one visible winner", async () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const publicId = publicIdFor(id);
    const first = avatarKey(publicId, 1);
    const second = avatarKey(publicId, 1);
    const results = await Promise.all([
      queryAsync(
        `select swapped::int from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${first}');`,
      ),
      queryAsync(
        `select swapped::int from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${second}');`,
      ),
    ]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(results.map((result) => Number(result.stdout)).sort()).toEqual([
      0, 1,
    ]);
    expect(
      query(`
        select avatar_object_key in ('${first}', '${second}'), avatar_version,
          (select count(*) from identity.avatar_cleanup_jobs
            where object_key in ('${first}', '${second}'))
        from identity.profiles where auth_user_id = '${id}';
      `).stdout,
    ).toBe("t|1|1");
  });

  it("rejects a candidate outside the owner's immutable path", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const other = createAuthUser({ confirmed: true });
    const key = avatarKey(publicIdFor(other), 1);
    expect(
      query(
        `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${key}');`,
      ).status,
    ).not.toBe(0);
    expect(
      query(
        `select count(*) from identity.avatar_cleanup_jobs where object_key = '${key}';`,
      ).stdout,
    ).toBe("0");
  });

  it.each([
    "profiles/not-a-uuid/1-file.webp",
    "profiles/00000000-0000-0000-0000-000000000000/1-file.gif",
  ])("rejects malformed immutable key %s", (key) => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    expect(
      query(
        `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${key}');`,
      ).status,
    ).not.toBe(0);
  });

  it("denies avatar replacement for a deletion-pending account", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const key = avatarKey(publicIdFor(id), 1);
    query(`
      update identity.accounts set state = 'deletion_pending',
        deletion_requested_at = transaction_timestamp(),
        purge_due_at = transaction_timestamp() + interval '30 days'
      where auth_user_id = '${id}';
    `);
    expect(
      query(
        `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${key}');`,
      ).status,
    ).not.toBe(0);
    expect(
      query(
        `select avatar_object_key is null from identity.profiles where auth_user_id = '${id}';`,
      ).stdout,
    ).toBe("t");
  });

  it("removes the public pointer immediately and queues the derivative", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const publicId = publicIdFor(id);
    const key = avatarKey(publicId, 1);
    query(
      `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${key}');`,
    );
    expect(
      query(`
        select changed, avatar_version, previous_object_key
        from identity_api.remove_avatar('${id}', '${sessionId}');
        select avatar_object_key is null from identity.profiles where auth_user_id = '${id}';
        select count(*) from identity_api.get_public_profile('${publicId}')
          where avatar_url is null;
        select count(*) from identity.avatar_cleanup_jobs where object_key = '${key}';
      `).stdout,
    ).toBe(`t|2|${key}\nt\n1\n1`);
  });

  it("treats repeated avatar removal as an idempotent no-op", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    expect(
      query(`
        select changed, avatar_version, previous_object_key is null
        from identity_api.remove_avatar('${id}', '${sessionId}');
        select changed, avatar_version, previous_object_key is null
        from identity_api.remove_avatar('${id}', '${sessionId}');
      `).stdout,
    ).toBe("f|0|t\nf|0|t");
  });

  it("claims the earliest due job with a bounded lease", () => {
    query("delete from identity.avatar_cleanup_jobs;");
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const key = avatarKey(publicIdFor(id), 1);
    query(`
      select * from identity_api.swap_avatar('${id}', '${sessionId}', 99, '${key}');
    `);
    expect(
      query(`
        select object_key, attempts, lease_until > transaction_timestamp(), state
        from identity_api.claim_avatar_cleanup_job('worker-a', 300);
      `).stdout,
    ).toBe(`${key}|1|t|processing`);
  });

  it("concurrent cleanup workers claim distinct jobs without waiting", async () => {
    query("delete from identity.avatar_cleanup_jobs;");
    const first = createAuthUser({ confirmed: true });
    const second = createAuthUser({ confirmed: true });
    query(`
      select * from identity_api.swap_avatar(
        '${first}', '${createAuthSession(first)}', 9, '${avatarKey(publicIdFor(first), 1)}'
      );
      select * from identity_api.swap_avatar(
        '${second}', '${createAuthSession(second)}', 9, '${avatarKey(publicIdFor(second), 1)}'
      );
    `);
    const results = await Promise.all([
      queryAsync(
        "select id from identity_api.claim_avatar_cleanup_job('worker-one', 300);",
      ),
      queryAsync(
        "select id from identity_api.claim_avatar_cleanup_job('worker-two', 300);",
      ),
    ]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(new Set(results.map((result) => result.stdout)).size).toBe(2);
  });

  it("recovers an expired processing lease", () => {
    query("delete from identity.avatar_cleanup_jobs;");
    const id = createAuthUser({ confirmed: true });
    const key = avatarKey(publicIdFor(id), 1);
    query(`
      select * from identity_api.swap_avatar(
        '${id}', '${createAuthSession(id)}', 9, '${key}'
      );
      update identity.avatar_cleanup_jobs set state = 'processing',
        worker_id = 'expired-worker',
        lease_until = transaction_timestamp() - interval '1 second'
      where object_key = '${key}';
    `);
    expect(
      query(`
        select object_key, worker_id, attempts
        from identity_api.claim_avatar_cleanup_job('recovery-worker', 300)
        where object_key = '${key}';
      `).stdout,
    ).toBe(`${key}|recovery-worker|1`);
  });

  it("treats completing an absent cleanup job as success", () => {
    const jobId = "9223372036854775800";
    expect(
      query(`
        select identity_api.complete_avatar_cleanup_job(${jobId});
        select identity_api.complete_avatar_cleanup_job(${jobId});
      `).stdout,
    ).toBe("t\nt");
  });

  it("retries a claimed job without exposing a stored dependency error", () => {
    query("delete from identity.avatar_cleanup_jobs;");
    const id = createAuthUser({ confirmed: true });
    const key = avatarKey(publicIdFor(id), 1);
    query(`
      select * from identity_api.swap_avatar(
        '${id}', '${createAuthSession(id)}', 9, '${key}'
      );
    `);
    const jobId = query(
      "select id from identity_api.claim_avatar_cleanup_job('retry-worker', 300);",
    ).stdout;
    expect(
      query(`
        select identity_api.retry_avatar_cleanup_job(
          ${jobId}, 'storage_unavailable', transaction_timestamp() + interval '5 minutes'
        );
        select state, worker_id is null, lease_until is null, last_error_code
        from identity.avatar_cleanup_jobs where id = ${jobId};
      `).stdout,
    ).toBe("t\nretry|t|t|storage_unavailable");
  });

  it.each([
    "swap_avatar(uuid,uuid,bigint,text)",
    "remove_avatar(uuid,uuid)",
    "claim_avatar_cleanup_job(text,integer)",
    "complete_avatar_cleanup_job(bigint)",
    "retry_avatar_cleanup_job(bigint,text,timestamp with time zone)",
  ])("grants identity_api.%s only to service_role", (signature) => {
    expect(
      query(`
        select has_function_privilege('public', 'identity_api.${signature}', 'execute'),
          has_function_privilege('anon', 'identity_api.${signature}', 'execute'),
          has_function_privilege('authenticated', 'identity_api.${signature}', 'execute'),
          has_function_privilege('service_role', 'identity_api.${signature}', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");
  });

  it("forces cleanup RLS and indexes its nullable account foreign key", () => {
    expect(
      query(`
        select c.relrowsecurity, c.relforcerowsecurity,
          has_table_privilege('authenticated', 'identity.avatar_cleanup_jobs', 'select'),
          exists (
            select 1 from pg_indexes where schemaname = 'identity'
              and indexname = 'avatar_cleanup_jobs_auth_user_id_idx'
          )
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'identity' and c.relname = 'avatar_cleanup_jobs';
      `).stdout,
    ).toBe("t|t|f|t");
  });

  it("keeps queued object cleanup after account purge", () => {
    const id = createAuthUser({ confirmed: true });
    const key = avatarKey(publicIdFor(id), 1);
    query(`
      select * from identity_api.swap_avatar(
        '${id}', '${createAuthSession(id)}', 9, '${key}'
      );
      delete from auth.users where id = '${id}';
    `);
    expect(
      query(`
        select auth_user_id is null, object_key
        from identity.avatar_cleanup_jobs where object_key = '${key}';
      `).stdout,
    ).toBe(`t|${key}`);
  });
});

describe("T13 deletion-pending lifecycle and purge queue", () => {
  function assureDeletion(authUserId: string, sessionId: string) {
    query(
      `select identity_api.record_password_assurance('${authUserId}', '${sessionId}');`,
    );
  }

  function requestDeletion(authUserId: string, sessionId: string) {
    return query(
      `select * from identity_api.request_deletion('${authUserId}', '${sessionId}');`,
    );
  }

  it("rejects deletion without recent password assurance", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    expect(requestDeletion(id, sessionId).status).not.toBe(0);
    expect(
      query(`select state from identity.accounts where auth_user_id = '${id}';`)
        .stdout,
    ).toBe("active_confirmed");
  });

  it("rejects assurance older than ten minutes", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    query(`
      update identity.session_assurance
      set password_verified_at = transaction_timestamp() - interval '10 minutes 1 millisecond'
      where session_id = '${sessionId}';
    `);
    expect(requestDeletion(id, sessionId).status).not.toBe(0);
  });

  it("accepts assurance exactly at the ten-minute boundary", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    expect(
      query(`
        begin;
        update identity.session_assurance
        set password_verified_at = transaction_timestamp() - interval '10 minutes'
        where session_id = '${sessionId}';
        select changed from identity_api.request_deletion('${id}', '${sessionId}');
        commit;
      `).stdout,
    ).toBe("t");
  });

  it("rejects a mismatched or absent Auth session", () => {
    const id = createAuthUser({ confirmed: true });
    const other = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    expect(requestDeletion(other, sessionId).status).not.toBe(0);
    query(`delete from auth.sessions where id = '${sessionId}';`);
    expect(requestDeletion(id, sessionId).status).not.toBe(0);
  });

  it("marks the account pending and creates one bounded purge job", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    expect(
      query(`
        select changed, requested_at is not null,
          purge_due_at = requested_at + interval '30 days'
        from identity_api.request_deletion('${id}', '${sessionId}');
        select account.state, job.state, job.attempts,
          job.purge_due_at = account.purge_due_at
        from identity.accounts as account
        join identity.deletion_jobs as job using (auth_user_id)
        where account.auth_user_id = '${id}';
      `).stdout,
    ).toBe("t|t|t\ndeletion_pending|pending|0|t");
  });

  it("treats a repeated deletion request as an idempotent no-op", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    expect(
      query(`
        select changed from identity_api.request_deletion('${id}', '${sessionId}');
        select changed from identity_api.request_deletion('${id}', '${sessionId}');
        select count(*) from identity.deletion_jobs where auth_user_id = '${id}';
      `).stdout,
    ).toBe("t\nf\n1");
  });

  it("depublishes the public profile in the request transaction", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const publicId = publicIdFor(id);
    assureDeletion(id, sessionId);
    expect(
      query(`
        begin;
        select changed from identity_api.request_deletion('${id}', '${sessionId}');
        select count(*) from identity_api.get_public_profile('${publicId}');
        commit;
      `).stdout,
    ).toBe("t\n0");
  });

  it("clears an avatar pointer and queues its object atomically", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const key = avatarKey(publicIdFor(id), 1);
    query(
      `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${key}');`,
    );
    assureDeletion(id, sessionId);
    expect(
      query(`
        begin;
        select changed from identity_api.request_deletion('${id}', '${sessionId}');
        select profile.avatar_object_key is null,
          exists (
            select 1 from identity.avatar_cleanup_jobs
            where object_key = '${key}' and delete_by <= transaction_timestamp() + interval '24 hours'
          )
        from identity.profiles as profile where auth_user_id = '${id}';
        commit;
      `).stdout,
    ).toBe("t\nt|t");
  });

  it("denies avatar mutation while deletion is pending", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      query(
        `select * from identity_api.swap_avatar('${id}', '${sessionId}', 0, '${avatarKey(publicIdFor(id), 1)}');`,
      ).status,
    ).not.toBe(0);
    expect(
      query(
        `select * from identity_api.remove_avatar('${id}', '${sessionId}');`,
      ).status,
    ).not.toBe(0);
  });

  it("reports a deletion-pending identity as inactive", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      authenticatedQuery(
        id,
        sessionId,
        "select is_active from identity_api.current_identity_status();",
      ).stdout,
    ).toBe("f");
  });

  it("denies issuing and consuming action tokens while deletion is pending", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    const issuedBeforeDeletion = tokenHash();
    query(`
      select identity_api.issue_action_token(
        '${id}', 'password_recovery', '${issuedBeforeDeletion}'::bytea
      );
    `);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      query(`
        select valid from identity_api.stage_action_token(
          '${issuedBeforeDeletion}'::bytea, 'password_recovery'
        );
        select auth_user_id from identity_api.consume_action_token(
          '${issuedBeforeDeletion}'::bytea, 'password_recovery'
        );
      `).stdout,
    ).toBe("f");
    expect(
      query(`
        select identity_api.issue_action_token(
          '${id}', 'password_recovery', '${tokenHash()}'::bytea
        );
      `).status,
    ).not.toBe(0);
  });

  it("retains the email key so pending registration reuse fails", () => {
    const emailKey = subjectHash();
    const id = createAuthUser({ confirmed: true, emailKey });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    const replacementId = crypto.randomUUID();
    expect(
      query(`
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at
        ) values (
          '00000000-0000-0000-0000-000000000000', '${replacementId}',
          'authenticated', 'authenticated', '${replacementId}@example.test', '',
          transaction_timestamp(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"email_key":"${emailKey}","display_name":"Grace Hopper","adult_declared":true,"terms_version":"2026-09-15","privacy_version":"2026-09-15","accepted_at":"2026-09-15T12:00:00.000Z"}'::jsonb,
          transaction_timestamp(), transaction_timestamp()
        );
      `).status,
    ).not.toBe(0);
  });

  it("never schedules purge later than thirty days", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      query(`
        select purge_due_at > requested_at,
          purge_due_at <= requested_at + interval '30 days',
          next_attempt_at <= purge_due_at
        from identity.deletion_jobs where auth_user_id = '${id}';
      `).stdout,
    ).toBe("t|t|t");
  });

  it("serializes concurrent requests to one state transition and job", async () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    const sql = `select changed::int from identity_api.request_deletion('${id}', '${sessionId}');`;
    const results = await Promise.all([queryAsync(sql), queryAsync(sql)]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(results.map((result) => Number(result.stdout)).sort()).toEqual([
      0, 1,
    ]);
    expect(
      query(
        `select count(*) from identity.deletion_jobs where auth_user_id = '${id}';`,
      ).stdout,
    ).toBe("1");
  });

  it("claims the earliest due deletion job with a bounded lease", () => {
    query("delete from identity.deletion_jobs;");
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      query(`
        select auth_user_id, attempts, lease_until > transaction_timestamp(), state
        from identity_api.claim_deletion_job('deletion-worker', 300);
      `).stdout,
    ).toBe(`${id}|1|t|processing`);
  });

  it("lets concurrent workers claim distinct deletion jobs", async () => {
    query("delete from identity.deletion_jobs;");
    const first = createAuthUser({ confirmed: true });
    const second = createAuthUser({ confirmed: true });
    const firstSession = createAuthSession(first);
    const secondSession = createAuthSession(second);
    assureDeletion(first, firstSession);
    assureDeletion(second, secondSession);
    requestDeletion(first, firstSession);
    requestDeletion(second, secondSession);
    const results = await Promise.all([
      queryAsync(
        "select auth_user_id from identity_api.claim_deletion_job('purger-one', 300);",
      ),
      queryAsync(
        "select auth_user_id from identity_api.claim_deletion_job('purger-two', 300);",
      ),
    ]);
    expect(results.map((result) => result.status)).toEqual([0, 0]);
    expect(new Set(results.map((result) => result.stdout)).size).toBe(2);
  });

  it("recovers an expired deletion-job lease", () => {
    query("delete from identity.deletion_jobs;");
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    query(`
      update identity.deletion_jobs set state = 'processing',
        worker_id = 'expired-purger',
        lease_until = transaction_timestamp() - interval '1 second'
      where auth_user_id = '${id}';
    `);
    expect(
      query(`
        select auth_user_id, worker_id, attempts
        from identity_api.claim_deletion_job('recovery-purger', 300);
      `).stdout,
    ).toBe(`${id}|recovery-purger|1`);
  });

  it("persists only a bounded redacted retry code", () => {
    query("delete from identity.deletion_jobs;");
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    query(
      "select * from identity_api.claim_deletion_job('retry-purger', 300);",
    );
    expect(
      query(`
        select identity_api.retry_deletion_job(
          '${id}', 'storage_unavailable', transaction_timestamp() + interval '5 minutes'
        );
        select state, worker_id is null, lease_until is null, last_error_code
        from identity.deletion_jobs where auth_user_id = '${id}';
      `).stdout,
    ).toBe("t\nretry|t|t|storage_unavailable");
  });

  it("clamps deletion retry scheduling to the purge deadline", () => {
    query("delete from identity.deletion_jobs;");
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      query(`
        select identity_api.retry_deletion_job(
          '${id}', 'auth_unavailable', transaction_timestamp() + interval '60 days'
        );
        select next_attempt_at = purge_due_at from identity.deletion_jobs
        where auth_user_id = '${id}';
      `).stdout,
    ).toBe("t\nt");
  });

  it("refuses to complete a deletion job while the account still exists", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    expect(
      query(`
        select identity_api.complete_deletion_job('${id}');
        select count(*) from identity.deletion_jobs where auth_user_id = '${id}';
      `).stdout,
    ).toBe("f\n1");
  });

  it("treats completion after account absence as idempotent success", () => {
    const id = crypto.randomUUID();
    expect(
      query(`
        select identity_api.complete_deletion_job('${id}');
        select identity_api.complete_deletion_job('${id}');
      `).stdout,
    ).toBe("t\nt");
  });

  it.each(["public", "anon", "authenticated"])(
    "denies %s direct deletion-queue access",
    (role) => {
      expect(
        query(`
          select has_table_privilege('${role}', 'identity.deletion_jobs', 'select'),
            has_table_privilege('${role}', 'identity.deletion_jobs', 'insert'),
            has_table_privilege('${role}', 'identity.deletion_jobs', 'update'),
            has_table_privilege('${role}', 'identity.deletion_jobs', 'delete');
        `).stdout,
      ).toBe("f|f|f|f");
    },
  );

  it.each([
    "request_deletion(uuid,uuid)",
    "claim_deletion_job(text,integer)",
    "complete_deletion_job(uuid)",
    "retry_deletion_job(uuid,text,timestamp with time zone)",
  ])("grants identity_api.%s only to service_role", (signature) => {
    expect(
      query(`
        select has_function_privilege('public', 'identity_api.${signature}', 'execute'),
          has_function_privilege('anon', 'identity_api.${signature}', 'execute'),
          has_function_privilege('authenticated', 'identity_api.${signature}', 'execute'),
          has_function_privilege('service_role', 'identity_api.${signature}', 'execute');
      `).stdout,
    ).toBe("f|f|f|t");
  });

  it("forces queue RLS and creates claim and account indexes", () => {
    expect(
      query(`
        select c.relrowsecurity, c.relforcerowsecurity,
          exists (
            select 1 from pg_indexes where schemaname = 'identity'
              and indexname = 'deletion_jobs_due_idx'
          ),
          exists (
            select 1 from pg_indexes where schemaname = 'identity'
              and indexname = 'deletion_jobs_expired_lease_idx'
          )
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'identity' and c.relname = 'deletion_jobs';
      `).stdout,
    ).toBe("t|t|t|t");
  });

  it("enforces the thirty-day deadline constraint", () => {
    const id = createAuthUser({ confirmed: true });
    expect(
      query(`
        insert into identity.deletion_jobs (
          auth_user_id, state, requested_at, purge_due_at, next_attempt_at
        ) values (
          '${id}', 'pending', transaction_timestamp(),
          transaction_timestamp() + interval '30 days 1 millisecond',
          transaction_timestamp()
        );
      `).status,
    ).not.toBe(0);
  });

  it("cascades the queue row only when the Auth identity is purged", () => {
    const id = createAuthUser({ confirmed: true });
    const sessionId = createAuthSession(id);
    assureDeletion(id, sessionId);
    requestDeletion(id, sessionId);
    query(`delete from auth.users where id = '${id}';`);
    expect(
      query(
        `select count(*) from identity.deletion_jobs where auth_user_id = '${id}';`,
      ).stdout,
    ).toBe("0");
  });
});
