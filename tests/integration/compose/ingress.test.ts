import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const composeFile = resolve(repositoryRoot, "compose.yaml");
const caddyfile = resolve(repositoryRoot, "infra/caddy/Caddyfile");

type PublishedPort = {
  host_ip?: string;
  published?: string;
  target?: number;
};

type ComposeService = {
  environment?: Record<string, string>;
  image?: string;
  ports?: PublishedPort[];
};

type ComposeModel = {
  services: Record<string, ComposeService>;
  volumes?: Record<string, unknown>;
};

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
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost/api",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
  };
}

function renderedModel(overrides: NodeJS.ProcessEnv = {}): ComposeModel {
  const result = spawnSync(
    process.platform === "win32" ? "docker.exe" : "docker",
    [
      "compose",
      "--project-directory",
      repositoryRoot,
      "--file",
      composeFile,
      "--profile",
      "*",
      "config",
      "--format",
      "json",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...exampleEnvironment(), ...overrides },
    },
  );

  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as ComposeModel;
}

function renderProduction(environment: NodeJS.ProcessEnv) {
  return spawnSync(
    process.platform === "win32" ? "docker.exe" : "docker",
    [
      "compose",
      "--project-directory",
      repositoryRoot,
      "--file",
      composeFile,
      "--file",
      resolve(repositoryRoot, "infra/compose/production.yaml"),
      "config",
      "--format",
      "json",
    ],
    { cwd: repositoryRoot, encoding: "utf8", env: environment },
  );
}

describe("Caddy ingress boundary", () => {
  it("pins the ingress image to an immutable Caddy release", () => {
    expect(renderedModel().services.caddy?.image).toBe(
      "caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648",
    );
  });

  it("makes Caddy the only service with published ports", () => {
    const servicesWithPorts = Object.entries(renderedModel().services)
      .filter(([, service]) => (service.ports?.length ?? 0) > 0)
      .map(([name]) => name);

    expect(servicesWithPorts).toEqual(["caddy"]);
  });

  it("binds local ingress to loopback", () => {
    const ports = renderedModel().services.caddy?.ports;

    expect(ports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ host_ip: "127.0.0.1", target: 80 }),
        expect.objectContaining({ host_ip: "127.0.0.1", target: 443 }),
      ]),
    );
  });

  it("renders public ports and a hostname for production HTTPS", () => {
    const environment = exampleEnvironment();
    environment.CADDY_SITE_ADDRESS = "markt.example.edu";
    const result = renderProduction(environment);
    expect(result.status, result.stderr).toBe(0);
    const caddy = (JSON.parse(result.stdout) as ComposeModel).services.caddy;

    expect(caddy?.environment?.CADDY_SITE_ADDRESS).toBe("markt.example.edu");
    expect(caddy?.ports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ published: "80", target: 80 }),
        expect.objectContaining({ published: "443", target: 443 }),
      ]),
    );
  });

  it("rejects production ingress without a hostname", () => {
    const environment = exampleEnvironment();
    delete environment.CADDY_SITE_ADDRESS;
    const result = renderProduction(environment);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CADDY_SITE_ADDRESS");
  });

  it("routes only documented Supabase API prefixes to the gateway", () => {
    const configuration = readFileSync(caddyfile, "utf8");
    const apiMatcher = configuration.match(
      /@supa_api path ([\s\S]*?)\r?\n\r?\n\s*handle/u,
    );

    expect(apiMatcher?.[1]?.replaceAll("\\", "").trim().split(/\s+/u)).toEqual([
      "/auth/v1",
      "/auth/v1/*",
      "/rest/v1",
      "/rest/v1/*",
      "/realtime/v1",
      "/realtime/v1/*",
      "/storage/v1",
      "/storage/v1/*",
      "/functions/v1",
      "/functions/v1/*",
      "/graphql/v1",
      "/graphql/v1/*",
    ]);
    expect(configuration.match(/reverse_proxy api-gw:8000/gu)).toHaveLength(1);
  });

  it("routes non-API requests to the web application", () => {
    expect(readFileSync(caddyfile, "utf8")).toContain("reverse_proxy web:3000");
  });

  it("does not publish Studio or PostgreSQL routes", () => {
    const configuration = readFileSync(caddyfile, "utf8");

    expect(configuration).not.toMatch(/\/studio|\/pg(?:\s|\*)/u);
    expect(renderedModel().services.studio?.ports).toBeUndefined();
    expect(renderedModel().services.db?.ports).toBeUndefined();
  });

  it("persists Caddy certificate state in named volumes", () => {
    const volumes = renderedModel().volumes;

    expect(volumes).toHaveProperty("caddy-data");
    expect(volumes).toHaveProperty("caddy-config");
  });
});
