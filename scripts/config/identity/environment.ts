export type IdentityDeploymentMode = "local" | "production";
export type IdentityEnvironment = Record<string, string | undefined>;

const REQUIRED_IDENTITY_VARIABLES = [
  "SUPABASE_INTERNAL_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IDENTITY_HASH_PEPPER",
  "IDENTITY_ACTION_BASE_URL",
  "CURRENT_TERMS_VERSION",
  "CURRENT_PRIVACY_VERSION",
  "IDENTITY_WORKER_ID",
  "IDENTITY_WORKER_BATCH_SIZE",
  "GOTRUE_SESSIONS_TIMEBOX",
] as const;

const IDENTITY_SECRETS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "IDENTITY_HASH_PEPPER",
] as const;

const POLICY_VERSIONS = [
  "CURRENT_TERMS_VERSION",
  "CURRENT_PRIVACY_VERSION",
] as const;

const PLACEHOLDER_PATTERN = /change[-_ ]?me|replace|placeholder/iu;

function value(environment: IdentityEnvironment, name: string) {
  return environment[name]?.trim() ?? "";
}

function parsedUrl(environment: IdentityEnvironment, name: string) {
  try {
    return new URL(value(environment, name));
  } catch {
    return undefined;
  }
}

export function validateIdentityEnvironment(
  mode: IdentityDeploymentMode,
  environment: IdentityEnvironment,
) {
  const errors: string[] = [];

  for (const name of REQUIRED_IDENTITY_VARIABLES) {
    if (value(environment, name).length === 0) {
      errors.push(`Missing identity variable: ${name}`);
    }
  }

  const internalUrl = parsedUrl(environment, "SUPABASE_INTERNAL_URL");
  if (
    value(environment, "SUPABASE_INTERNAL_URL") &&
    (!internalUrl || !["http:", "https:"].includes(internalUrl.protocol))
  ) {
    errors.push("Invalid identity URL: SUPABASE_INTERNAL_URL");
  }

  for (const name of IDENTITY_SECRETS) {
    const secret = value(environment, name);
    if (secret && secret.length < 32) {
      errors.push(`Weak identity secret: ${name}`);
    }
    if (mode === "production" && secret && PLACEHOLDER_PATTERN.test(secret)) {
      errors.push(`Placeholder identity secret: ${name}`);
    }
  }

  const actionUrl = parsedUrl(environment, "IDENTITY_ACTION_BASE_URL");
  const siteUrl = parsedUrl(environment, "SITE_URL");
  if (
    mode === "production" &&
    value(environment, "IDENTITY_ACTION_BASE_URL") &&
    (!actionUrl || actionUrl.protocol !== "https:")
  ) {
    errors.push("Invalid production identity URL: IDENTITY_ACTION_BASE_URL");
  }
  if (
    mode === "production" &&
    actionUrl &&
    siteUrl &&
    actionUrl.origin !== siteUrl.origin
  ) {
    errors.push(
      "Mismatched identity origin: IDENTITY_ACTION_BASE_URL, SITE_URL",
    );
  }

  const timebox = value(environment, "GOTRUE_SESSIONS_TIMEBOX");
  const timeboxMatch = /^(\d+)h$/u.exec(timebox);
  const timeboxHours = timeboxMatch ? Number(timeboxMatch[1]) : Number.NaN;
  if (
    timebox &&
    (!Number.isInteger(timeboxHours) || timeboxHours < 1 || timeboxHours > 720)
  ) {
    errors.push("Invalid identity timebox: GOTRUE_SESSIONS_TIMEBOX");
  }

  const batchSize = Number(value(environment, "IDENTITY_WORKER_BATCH_SIZE"));
  if (
    value(environment, "IDENTITY_WORKER_BATCH_SIZE") &&
    (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100)
  ) {
    errors.push("Invalid identity worker setting: IDENTITY_WORKER_BATCH_SIZE");
  }

  const workerId = value(environment, "IDENTITY_WORKER_ID");
  if (workerId && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(workerId)) {
    errors.push("Invalid identity worker setting: IDENTITY_WORKER_ID");
  }

  for (const name of POLICY_VERSIONS) {
    const version = value(environment, name);
    if (version && mode === "production" && PLACEHOLDER_PATTERN.test(version)) {
      errors.push(`Invalid identity policy version: ${name}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
