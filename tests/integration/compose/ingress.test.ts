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
    PUBLIC_CONTACT_EMAIL: "kontakt@campusmarkt.inovv.co",
    PUBLIC_PRIVACY_EMAIL: "datenschutz@campusmarkt.inovv.co",
    SMTP_USER: "compose-test-user",
    SMTP_PASS: "compose-test-password",
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

  it("publishes only Caddy and the loopback local mail inbox", () => {
    const servicesWithPorts = Object.entries(renderedModel().services)
      .filter(([, service]) => (service.ports?.length ?? 0) > 0)
      .map(([name]) => name);

    expect(servicesWithPorts).toEqual(["caddy", "mail"]);
    expect(renderedModel().services.mail?.ports).toEqual([
      expect.objectContaining({ host_ip: "127.0.0.1", target: 9000 }),
    ]);
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

  describe("direct public Auth mutation blocking", () => {
    const configuration = readFileSync(caddyfile, "utf8");
    const denyMatcher = configuration.match(
      /@auth_denied path ([\s\S]*?)\r?\n\r?\n\s*handle @auth_denied/u,
    );
    const deniedPaths =
      denyMatcher?.[1]?.replaceAll("\\", "").trim().split(/\s+/u) ?? [];

    it("declares fixed 403 access denial for blocked Auth mutations", () => {
      expect(configuration).toMatch(
        /handle @auth_denied\s*\{\s*respond "Access denied" 403\s*\}/u,
      );
    });

    it("evaluates Auth denial before proxying to the gateway", () => {
      const denyIndex = configuration.indexOf("handle @auth_denied");
      const proxyIndex = configuration.indexOf("handle @supa_api");
      expect(denyIndex).toBeGreaterThan(0);
      expect(proxyIndex).toBeGreaterThan(denyIndex);
    });

    it("denies direct public signup paths", () => {
      expect(deniedPaths).toContain("/auth/v1/signup");
      expect(deniedPaths).toContain("/auth/v1/signup/*");
    });

    it("denies direct public token grant paths", () => {
      expect(deniedPaths).toContain("/auth/v1/token");
      expect(deniedPaths).toContain("/auth/v1/token/*");
    });

    it("denies direct public recovery paths", () => {
      expect(deniedPaths).toContain("/auth/v1/recover");
      expect(deniedPaths).toContain("/auth/v1/recover/*");
      expect(deniedPaths).toContain("/auth/v1/recovery");
      expect(deniedPaths).toContain("/auth/v1/recovery/*");
    });

    it("denies direct public user mutation paths", () => {
      expect(deniedPaths).toContain("/auth/v1/user");
      expect(deniedPaths).toContain("/auth/v1/user/*");
    });

    it("denies direct public verification paths", () => {
      expect(deniedPaths).toContain("/auth/v1/verify");
      expect(deniedPaths).toContain("/auth/v1/verify/*");
    });

    it("denies direct public settings and admin paths", () => {
      expect(deniedPaths).toContain("/auth/v1/settings");
      expect(deniedPaths).toContain("/auth/v1/settings/*");
      expect(deniedPaths).toContain("/auth/v1/admin");
      expect(deniedPaths).toContain("/auth/v1/admin/*");
    });

    it("denies direct public logout and session termination bypass", () => {
      expect(deniedPaths).toContain("/auth/v1/logout");
      expect(deniedPaths).toContain("/auth/v1/logout/*");
    });

    it("denies direct public OAuth, callback, and SSO paths", () => {
      expect(deniedPaths).toContain("/auth/v1/authorize");
      expect(deniedPaths).toContain("/auth/v1/authorize/*");
      expect(deniedPaths).toContain("/auth/v1/callback");
      expect(deniedPaths).toContain("/auth/v1/callback/*");
      expect(deniedPaths).toContain("/auth/v1/sso");
      expect(deniedPaths).toContain("/auth/v1/sso/*");
    });

    it("denies direct public magiclink and OTP endpoints", () => {
      expect(deniedPaths).toContain("/auth/v1/magiclink");
      expect(deniedPaths).toContain("/auth/v1/magiclink/*");
      expect(deniedPaths).toContain("/auth/v1/otp");
      expect(deniedPaths).toContain("/auth/v1/otp/*");
    });

    it("denies direct public reauthentication and MFA factors endpoints", () => {
      expect(deniedPaths).toContain("/auth/v1/reauthenticate");
      expect(deniedPaths).toContain("/auth/v1/reauthenticate/*");
      expect(deniedPaths).toContain("/auth/v1/factors");
      expect(deniedPaths).toContain("/auth/v1/factors/*");
    });

    it("does not deny Auth health or JWKS discovery paths", () => {
      expect(deniedPaths).not.toContain("/auth/v1/health");
      expect(deniedPaths).not.toContain("/auth/v1/.well-known/jwks.json");
    });

    it("overwrites client forwarding headers with the trusted remote host", () => {
      expect(configuration).toMatch(
        /reverse_proxy api-gw:8000\s*\{\s*header_up X-Forwarded-For \{remote_host\}\s*header_up X-Real-IP \{remote_host\}\s*\}/u,
      );
      expect(configuration).toMatch(
        /reverse_proxy web:3000\s*\{\s*header_up X-Forwarded-For \{remote_host\}\s*header_up X-Real-IP \{remote_host\}\s*\}/u,
      );
    });
  });
});
