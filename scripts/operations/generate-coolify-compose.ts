import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const result = spawnSync(
  process.platform === "win32" ? "docker.exe" : "docker",
  [
    "compose",
    "-f",
    "compose.yaml",
    "--profile",
    "*",
    "config",
    "--no-interpolate",
    "--no-path-resolution",
    "--no-normalize",
    "--format",
    "json",
  ],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) throw new Error(result.stderr);
type Service = {
  container_name?: string;
  ports?: unknown;
  environment?: Record<string, unknown>;
  networks?: Record<string, { aliases?: string[] }>;
  volumes?: Array<{
    type: string;
    source: string;
    target: string;
    bind?: { create_host_path?: boolean; selinux?: string };
  }>;
  depends_on?: Record<string, { condition: string }>;
  image?: string;
  [key: string]: unknown;
};
const model = JSON.parse(result.stdout) as {
  name?: string;
  services: Record<string, Service>;
  networks: Record<string, unknown>;
  volumes: Record<string, { name?: string }>;
};
delete model.name;
const required = new Set([
  "ANON_KEY",
  "SERVICE_ROLE_KEY",
  "POSTGRES_PASSWORD",
  "JWT_SECRET",
  "SECRET_KEY_BASE",
  "VAULT_ENC_KEY",
  "PG_META_CRYPTO_KEY",
  "REALTIME_DB_ENC_KEY",
  "IDENTITY_HASH_PEPPER",
  "DASHBOARD_PASSWORD",
  "S3_PROTOCOL_ACCESS_KEY_ID",
  "S3_PROTOCOL_ACCESS_KEY_SECRET",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_ADMIN_EMAIL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLIC_URL",
  "SITE_URL",
  "API_EXTERNAL_URL",
]);
const defaults: Record<string, string> = {
  POSTGRES_HOST: "db",
  POSTGRES_PORT: "5432",
  POSTGRES_DB: "postgres",
  DASHBOARD_USERNAME: "campusmarkt",
  JWT_EXPIRY: "3600",
  DISABLE_SIGNUP: "false",
  ENABLE_EMAIL_SIGNUP: "true",
  ENABLE_EMAIL_AUTOCONFIRM: "false",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "465",
  SMTP_TLS_MODE: "implicit",
  SMTP_SENDER_NAME: "CampusMarkt",
  REGION: "eu-central-1",
  GLOBAL_S3_BUCKET: "campusmarkt",
  STORAGE_TENANT_ID: "campusmarkt",
  POOLER_TENANT_ID: "campusmarkt",
  POOLER_DEFAULT_POOL_SIZE: "20",
  POOLER_MAX_CLIENT_CONN: "100",
  POOLER_DB_POOL_SIZE: "5",
  STUDIO_DEFAULT_ORGANIZATION: "CampusMarkt",
  STUDIO_DEFAULT_PROJECT: "Production",
  PGRST_DB_MAX_ROWS: "1000",
  IMGPROXY_AUTO_WEBP: "true",
  FUNCTIONS_VERIFY_JWT: "true",
  MAILER_URLPATHS_CONFIRMATION: "/auth/v1/verify",
  MAILER_URLPATHS_INVITE: "/auth/v1/verify",
  MAILER_URLPATHS_RECOVERY: "/auth/v1/verify",
  MAILER_URLPATHS_EMAIL_CHANGE: "/auth/v1/verify",
};
function references(value: unknown): unknown {
  if (typeof value === "string")
    return value.replace(
      /\$\{([A-Z][A-Z0-9_]*)(?::[?-][^{}]*)?\}/gu,
      (reference: string, key: string) =>
        required.has(key)
          ? `\${${key}:?}`
          : defaults[key]
            ? `\${${key}:-${defaults[key]}}`
            : reference,
    );
  if (Array.isArray(value)) return value.map(references);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, references(entry)]),
    );
  return value;
}
for (const [name, service] of Object.entries(model.services)) {
  if (Array.isArray(service.environment))
    service.environment = Object.fromEntries(
      service.environment.map((entry: string) => {
        const separator = entry.indexOf("=");
        return [entry.slice(0, separator), entry.slice(separator + 1)];
      }),
    );
  delete service.container_name;
  delete service.ports;
  const aliases = service.networks?.default?.aliases ?? [];
  if (name === "realtime") aliases.push("realtime-dev.supabase-realtime");
  service.networks = { backend: aliases.length ? { aliases } : {} };
  for (const mount of service.volumes ?? []) {
    if (mount.type !== "bind") continue;
    if (name === "studio" && mount.target === "/app/snippets") {
      mount.type = "volume";
      mount.source = "studio-snippets";
      delete mount.bind;
      continue;
    }
    mount.source =
      name === "identity-worker"
        ? "./"
        : `./${mount.source.replaceAll("\\", "/").replace(/^\.\//u, "")}`;
    if (!existsSync(resolve(root, mount.source)))
      throw new Error(`Missing deployment bind: ${mount.source}`);
    mount.bind = { create_host_path: false };
  }
}
model.networks = { backend: { name: "${STACK_ID:?}-private" }, default: {} };
for (const [name, volume] of Object.entries(model.volumes))
  model.volumes[name] = { ...volume, name: `\${STACK_ID:?}-${name}` };
model.services.caddy.networks!.default = {};
model.services.caddy.environment = {};
model.services.caddy.expose = ["80"];
model.services.caddy.volumes![0].source = "./infra/caddy/Caddyfile.coolify";
// Resource-scoped image names prevent a second installation overwriting this build.
model.services.web.image = "campusmarkt/web:${STACK_ID:?}";
model.services.web.environment!.SMTP_FROM =
  "${SMTP_SENDER_NAME:-CampusMarkt} <${SMTP_ADMIN_EMAIL:?}>";
model.services.minio = {
  image:
    "cgr.dev/chainguard/minio@sha256:0f95aa412a12351a95bb43c3b54b66440eb0aa022bb3f3458942678a489e915b",
  restart: "unless-stopped",
  command: ["server", "--console-address", ":9001", "/data"],
  environment: {
    MINIO_ROOT_USER: "${MINIO_ROOT_USER:-campusmarkt-storage}",
    MINIO_ROOT_PASSWORD: "${MINIO_ROOT_PASSWORD:?}",
  },
  healthcheck: {
    test: ["CMD", "mc", "ready", "local"],
    interval: "5s",
    timeout: "10s",
    retries: 6,
    start_period: "30s",
  },
  networks: { backend: {} },
  volumes: [{ type: "volume", source: "minio-data", target: "/data" }],
};
model.services["minio-createbucket"] = {
  image:
    "cgr.dev/chainguard/minio-client@sha256:f99f0052305eefdc41a40cb7ac555734566e47e06871360eb28997e5c24d8e16",
  restart: "no",
  networks: { backend: {} },
  depends_on: { minio: { condition: "service_healthy" } },
  environment: {
    MINIO_ROOT_USER: "${MINIO_ROOT_USER:-campusmarkt-storage}",
    MINIO_ROOT_PASSWORD: "${MINIO_ROOT_PASSWORD:?}",
    GLOBAL_S3_BUCKET: "${GLOBAL_S3_BUCKET:-campusmarkt}",
  },
  // Shell expansion happens inside the container; credentials never appear in Compose commands.
  entrypoint: [
    "/bin/sh",
    "-ec",
    'mc alias set internal http://minio:9000 "$$MINIO_ROOT_USER" "$$MINIO_ROOT_PASSWORD" >/dev/null && mc mb --ignore-existing "internal/$$GLOBAL_S3_BUCKET"',
  ],
};
model.volumes["minio-data"] = { name: "${STACK_ID:?}-minio-data" };
model.volumes["studio-snippets"] = { name: "${STACK_ID:?}-studio-snippets" };
Object.assign(model.services.storage.environment!, {
  STORAGE_BACKEND: "s3",
  GLOBAL_S3_ENDPOINT: "http://minio:9000",
  GLOBAL_S3_PROTOCOL: "http",
  GLOBAL_S3_FORCE_PATH_STYLE: "true",
  AWS_ACCESS_KEY_ID: "${MINIO_ROOT_USER:-campusmarkt-storage}",
  AWS_SECRET_ACCESS_KEY: "${MINIO_ROOT_PASSWORD:?}",
});
Object.assign(model.services.storage.depends_on!, {
  minio: { condition: "service_healthy" },
  "minio-createbucket": { condition: "service_completed_successfully" },
});

function yaml(value: unknown, indent = 0): string {
  const space = " ".repeat(indent);
  if (Array.isArray(value))
    return value
      .map((entry) => `${space}- ${JSON.stringify(entry)}`)
      .join("\n");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([key, entry]) => {
        const nested =
          entry &&
          typeof entry === "object" &&
          Object.keys(entry).length > 0 &&
          !Array.isArray(entry);
        return nested
          ? `${space}${key}:\n${yaml(entry, indent + 2)}`
          : `${space}${key}: ${JSON.stringify(entry)}`;
      })
      .join("\n");
  return JSON.stringify(value);
}
writeFileSync(
  resolve(root, "compose.coolify.yaml"),
  `# Generated by scripts/operations/generate-coolify-compose.ts. Do not edit.\n${yaml(references(model))}\n`,
);
const originalCaddy = readFileSync(
  resolve(root, "infra/caddy/Caddyfile"),
  "utf8",
);
writeFileSync(
  resolve(root, "infra/caddy/Caddyfile.coolify"),
  `# Generated for the Coolify TLS proxy.\n{\n\tauto_https off\n\tservers {\n\t\ttrusted_proxies static private_ranges\n\t\ttrusted_proxies_strict\n\t}\n}\n\n${originalCaddy
    .replace(/^.*\r?\n/u, ":80 {\n")
    .replaceAll(
      "header_up X-Forwarded-For {remote_host}",
      "header_up X-Forwarded-For {client_ip}",
    )
    .replaceAll(
      "header_up X-Real-IP {remote_host}",
      "header_up X-Real-IP {client_ip}",
    )}`,
);
console.log(
  "Generated isolated Coolify stack and ingress configuration; no credentials interpolated.",
);
