import { availableParallelism, totalmem } from "node:os";
import { statfsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export type DeploymentMode = "local" | "production";
export type DeploymentEnvironment = Record<string, string | undefined>;

export type HostResources = {
  cpuCores: number;
  memoryGb: number;
  diskGb: number;
};

export const MINIMUM_PRODUCTION_RESOURCES: HostResources = {
  cpuCores: 4,
  memoryGb: 8,
  diskGb: 80,
};

const LOCAL_REQUIRED = [
  "POSTGRES_PASSWORD",
  "JWT_SECRET",
  "ANON_KEY",
  "SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const PRODUCTION_REQUIRED = [
  "SUPABASE_PUBLIC_URL",
  "API_EXTERNAL_URL",
  "SITE_URL",
  "CADDY_SITE_ADDRESS",
  "SMTP_ADMIN_EMAIL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_TLS_MODE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_SENDER_NAME",
  "STORAGE_BACKEND",
  "GLOBAL_S3_BUCKET",
  "GLOBAL_S3_ENDPOINT",
  "GLOBAL_S3_PROTOCOL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "REGION",
  "BACKUP_TARGET",
] as const;

const HTTPS_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_PUBLIC_URL",
  "API_EXTERNAL_URL",
  "SITE_URL",
] as const;

const FORBIDDEN_BROWSER_VARIABLES = [
  "NEXT_PUBLIC_POSTGRES_PASSWORD",
  "NEXT_PUBLIC_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
] as const;

const SERVER_SECRET_VARIABLES = [
  "POSTGRES_PASSWORD",
  "JWT_SECRET",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SMTP_PASS",
  "AWS_SECRET_ACCESS_KEY",
] as const;

function hasValue(environment: DeploymentEnvironment, name: string) {
  return (environment[name]?.trim().length ?? 0) > 0;
}

function isProductionHostname(value: string) {
  return (
    !value.includes("://") &&
    value.includes(".") &&
    value !== "localhost" &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(value)
  );
}

function validateBrowserSeparation(
  environment: DeploymentEnvironment,
  errors: string[],
) {
  for (const name of FORBIDDEN_BROWSER_VARIABLES) {
    if (hasValue(environment, name)) {
      errors.push(`Forbidden browser credential: ${name}`);
    }
  }

  for (const [publicName, publicValue] of Object.entries(environment)) {
    if (
      !publicName.startsWith("NEXT_PUBLIC_") ||
      publicName === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ||
      !publicValue
    ) {
      continue;
    }

    for (const secretName of SERVER_SECRET_VARIABLES) {
      const secretValue = environment[secretName];
      if (secretValue && publicValue === secretValue) {
        errors.push(
          `Forbidden browser secret exposure: ${publicName} matches ${secretName}`,
        );
      }
    }
  }

  if (
    hasValue(environment, "SUPABASE_PUBLISHABLE_KEY") &&
    hasValue(environment, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") &&
    environment.SUPABASE_PUBLISHABLE_KEY !==
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    errors.push(
      "Mismatched publishable variables: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEY",
    );
  }
}

export function validateDeployment(input: {
  mode: DeploymentMode;
  environment: DeploymentEnvironment;
  resources: HostResources;
}) {
  if (input.mode !== "local" && input.mode !== "production") {
    return { ok: false, errors: ["Invalid deployment mode: MODE"] };
  }

  const errors: string[] = [];
  for (const name of LOCAL_REQUIRED) {
    if (!hasValue(input.environment, name)) {
      errors.push(`Missing required variable: ${name}`);
    }
  }

  validateBrowserSeparation(input.environment, errors);

  if (input.mode === "production") {
    for (const name of PRODUCTION_REQUIRED) {
      if (!hasValue(input.environment, name)) {
        errors.push(`Missing required variable: ${name}`);
      }
    }

    for (const name of HTTPS_VARIABLES) {
      if (hasValue(input.environment, name)) {
        try {
          if (new URL(input.environment[name]!).protocol !== "https:") {
            errors.push(`Invalid production HTTPS variable: ${name}`);
          }
        } catch {
          errors.push(`Invalid production HTTPS variable: ${name}`);
        }
      }
    }

    if (
      hasValue(input.environment, "CADDY_SITE_ADDRESS") &&
      !isProductionHostname(input.environment.CADDY_SITE_ADDRESS!)
    ) {
      errors.push("Invalid production hostname: CADDY_SITE_ADDRESS");
    }

    if (
      hasValue(input.environment, "STORAGE_BACKEND") &&
      input.environment.STORAGE_BACKEND !== "s3"
    ) {
      errors.push("Invalid production storage backend: STORAGE_BACKEND");
    }

    if (
      hasValue(input.environment, "SMTP_TLS_MODE") &&
      input.environment.SMTP_TLS_MODE !== "implicit"
    ) {
      errors.push("Invalid production SMTP TLS mode: SMTP_TLS_MODE");
    }

    const resourceChecks = [
      [
        "CPU_CORES",
        input.resources.cpuCores,
        MINIMUM_PRODUCTION_RESOURCES.cpuCores,
      ],
      [
        "MEMORY_GB",
        input.resources.memoryGb,
        MINIMUM_PRODUCTION_RESOURCES.memoryGb,
      ],
      ["DISK_GB", input.resources.diskGb, MINIMUM_PRODUCTION_RESOURCES.diskGb],
    ] as const;

    for (const [name, actual, minimum] of resourceChecks) {
      if (actual < minimum) {
        errors.push(`Insufficient production resource: ${name}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function currentResources(): HostResources {
  const disk = statfsSync(process.cwd());
  return {
    cpuCores: availableParallelism(),
    memoryGb: totalmem() / 1024 ** 3,
    diskGb: (disk.bavail * disk.bsize) / 1024 ** 3,
  };
}

function requestedMode(arguments_: string[]): DeploymentMode | undefined {
  const modeIndex = arguments_.indexOf("--mode");
  return arguments_[modeIndex + 1] as DeploymentMode | undefined;
}

function runCli() {
  const mode = requestedMode(process.argv.slice(2));
  const result = validateDeployment({
    mode: mode as DeploymentMode,
    environment: process.env,
    resources: currentResources(),
  });

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Deployment environment is valid for ${mode}.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}
