import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const file = resolve(root, "compose.coolify.yaml");
const docker = process.platform === "win32" ? "docker.exe" : "docker";
type Service = {
  container_name?: string;
  ports?: unknown[];
  networks?: Record<string, { aliases?: string[] }>;
  depends_on?: Record<string, { condition: string }>;
  environment?: Record<string, string>;
  volumes?: Array<{ type: string; source: string; target: string }>;
};
type Model = {
  include?: unknown;
  services: Record<string, Service>;
  networks: Record<string, { name?: string }>;
  volumes: Record<string, { name?: string }>;
};
const artifact = readFileSync(file, "utf8");
const result = spawnSync(
  docker,
  [
    "compose",
    "-f",
    file,
    "config",
    "--no-interpolate",
    "--no-normalize",
    "--no-path-resolution",
    "--format",
    "json",
  ],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) throw new Error(result.stderr);
const model = JSON.parse(result.stdout) as Model;

describe("DEPLOY-01 Coolify configuration", () => {
  it("discovers the complete stack without includes", () => {
    expect(Object.keys(model.services)).toEqual(
      expect.arrayContaining([
        "web",
        "caddy",
        "db",
        "auth",
        "rest",
        "realtime",
        "storage",
        "api-gw",
        "migration-gate",
        "minio",
        "minio-createbucket",
      ]),
    );
    expect(model.include).toBeUndefined();
  });
  it("publishes no host ports and isolates backend services from ingress", () => {
    for (const [name, service] of Object.entries(model.services)) {
      expect(service.ports, name).toBeUndefined();
      expect(service.container_name, name).toBeUndefined();
      expect(Object.keys(service.networks ?? {}), name).toEqual(
        name === "caddy" ? ["backend", "default"] : ["backend"],
      );
    }
    expect(model.networks.backend.name).toBe("${STACK_ID:?}-private");
    expect(model.services.realtime.networks?.backend.aliases).toContain(
      "realtime-dev.supabase-realtime",
    );
  });
  it("keeps distinct scoped data volumes and the successful migration gate", () => {
    expect(model.volumes["campusmarkt-postgres-data"].name).toBe(
      "${STACK_ID:?}-campusmarkt-postgres-data",
    );
    expect(model.volumes["minio-data"].name).toBe("${STACK_ID:?}-minio-data");
    expect(model.services.db.volumes).toContainEqual(
      expect.objectContaining({
        type: "volume",
        source: "campusmarkt-postgres-data",
        target: "/var/lib/postgresql/data",
      }),
    );
    expect(model.services.minio.volumes).toContainEqual(
      expect.objectContaining({
        type: "volume",
        source: "minio-data",
        target: "/data",
      }),
    );
    expect(model.services.web.depends_on?.["migration-gate"].condition).toBe(
      "service_completed_successfully",
    );
    expect(
      model.services.storage.depends_on?.["minio-createbucket"].condition,
    ).toBe("service_completed_successfully");
    expect(model.services.storage.environment?.STORAGE_BACKEND).toBe("s3");
  });
  it("contains only credential references and rejects absent required secrets", () => {
    expect(model.services.web.environment?.SUPABASE_SERVICE_ROLE_KEY).toBe(
      "${SERVICE_ROLE_KEY:?}",
    );
    expect(model.services.web.environment?.SMTP_PASS).toBe("${SMTP_PASS:?}");
    expect(model.services.minio.environment?.MINIO_ROOT_PASSWORD).toBe(
      "${MINIO_ROOT_PASSWORD:?}",
    );
    expect(model.services.web.environment?.SMTP_FROM).toBe(
      "${SMTP_SENDER_NAME:-CampusMarkt} <${SMTP_ADMIN_EMAIL:?}>",
    );
    expect(artifact).not.toMatch(
      /NEXT_PUBLIC_[A-Z_]*(?:SECRET|PASSWORD|SERVICE_ROLE)/u,
    );
    const missing = spawnSync(
      docker,
      [
        "compose",
        "--env-file",
        process.platform === "win32" ? "NUL" : "/dev/null",
        "-f",
        file,
        "config",
        "--quiet",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT },
      },
    );
    expect(missing.status).not.toBe(0);
  });
  it("retains repository bind files and denied Auth routing", () => {
    for (const service of Object.values(model.services)) {
      for (const volume of service.volumes ?? []) {
        if (volume.type === "bind") {
          expect(volume.source).toMatch(/^\.\//u);
          expect(existsSync(resolve(root, volume.source)), volume.source).toBe(
            true,
          );
        }
      }
    }
    const caddy = readFileSync(
      resolve(root, "infra/caddy/Caddyfile.coolify"),
      "utf8",
    );
    const original = readFileSync(
      resolve(root, "infra/caddy/Caddyfile"),
      "utf8",
    );
    expect(
      caddy.match(/@auth_denied[\s\S]*?respond "Access denied" 403/u)?.[0],
    ).toBe(
      original.match(/@auth_denied[\s\S]*?respond "Access denied" 403/u)?.[0],
    );
    expect(caddy).toContain("reverse_proxy api-gw:8000");
    expect(caddy).toContain("reverse_proxy web:3000");
    expect(caddy).toContain("trusted_proxies static private_ranges");
    expect(caddy).toContain(":80 {");
  });
});
