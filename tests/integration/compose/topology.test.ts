import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const composeFile = resolve(repositoryRoot, "compose.yaml");

type ComposeService = {
  depends_on?: Record<string, { condition?: string }>;
  healthcheck?: {
    interval?: string;
    retries?: number;
    start_interval?: string;
    start_period?: string;
    timeout?: string;
  };
  ports?: unknown[];
  profiles?: string[];
  volumes?: Array<{ source?: string; target?: string; type?: string }>;
};

type ComposeModel = {
  networks?: Record<string, unknown>;
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

function renderCompose(environment = exampleEnvironment()) {
  return spawnSync(
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
    { cwd: repositoryRoot, encoding: "utf8", env: environment },
  );
}

function renderedModel(): ComposeModel {
  const result = renderCompose();
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as ComposeModel;
}

describe("root Compose topology", () => {
  it("includes the application and required Supabase services", () => {
    const services = Object.keys(renderedModel().services);

    expect(services).toEqual(
      expect.arrayContaining([
        "web",
        "api-gw",
        "db",
        "auth",
        "rest",
        "realtime",
        "storage",
        "migration",
        "studio",
        "meta",
        "imgproxy",
        "functions",
        "supavisor",
      ]),
    );
  });

  it("does not publish database or internal Supabase ports", () => {
    const { services } = renderedModel();

    for (const name of [
      "api-gw",
      "db",
      "supavisor",
      "auth",
      "rest",
      "realtime",
      "storage",
      "studio",
    ]) {
      expect(
        services[name]?.ports,
        `${name} has a public port`,
      ).toBeUndefined();
    }
  });

  it("declares named PostgreSQL and Storage volumes", () => {
    const volumes = renderedModel().volumes;

    expect(volumes).toHaveProperty("campusmarkt-postgres-data");
    expect(volumes).toHaveProperty("campusmarkt-storage-data");
  });

  it("mounts PostgreSQL data from its named volume", () => {
    const volumes = renderedModel().services.db?.volumes;

    expect(volumes).toContainEqual(
      expect.objectContaining({
        source: "campusmarkt-postgres-data",
        target: "/var/lib/postgresql/data",
        type: "volume",
      }),
    );
  });

  it("shares the named Storage volume with Storage and imgproxy", () => {
    const { services } = renderedModel();
    const expectedMount = expect.objectContaining({
      source: "campusmarkt-storage-data",
      target: "/var/lib/storage",
      type: "volume",
    });

    expect(services.storage?.volumes).toContainEqual(expectedMount);
    expect(services.imgproxy?.volumes).toContainEqual(expectedMount);
  });

  it("allows bounded cold-start time before Storage health failures count", () => {
    expect(renderedModel().services.storage?.healthcheck).toEqual(
      expect.objectContaining({
        interval: "5s",
        retries: 6,
        start_interval: "5s",
        start_period: "45s",
        timeout: "5s",
      }),
    );
  });

  it("waits for the gateway health before starting the web service", () => {
    expect(
      renderedModel().services.web?.depends_on?.["api-gw"]?.condition,
    ).toBe("service_healthy");
  });

  it("runs migrations only after PostgreSQL is healthy", () => {
    const migration = renderedModel().services.migration;

    expect(migration?.depends_on?.db?.condition).toBe("service_healthy");
    expect(migration?.profiles).toContain("operations");
  });

  it("keeps the platform on a project-scoped private network", () => {
    expect(renderedModel().networks?.default).toEqual(
      expect.objectContaining({ name: "campusmarkt-platform" }),
    );
  });

  it("names a missing required value in Compose validation output", () => {
    const environment = exampleEnvironment();
    delete environment.POSTGRES_PASSWORD;

    const result = renderCompose(environment);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("POSTGRES_PASSWORD");
  });
});
