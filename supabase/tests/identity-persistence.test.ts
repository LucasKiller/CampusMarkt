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
  const started = compose(["up", "--detach", "--wait", "db", "auth"]);
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
