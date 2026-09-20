import "server-only";

export type IdentityInfrastructureConfig = {
  supabaseInternalUrl: string;
  supabaseServiceRoleKey: string;
  supabasePublishableKey: string;
  identityHashPepper: string;
  actionBaseUrl: string;
  termsVersion: string;
  privacyVersion: string;
  smtp: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
  };
};

export function getIdentityInfrastructureConfig(): IdentityInfrastructureConfig {
  return {
    supabaseInternalUrl:
      process.env.SUPABASE_INTERNAL_URL?.trim() || "http://127.0.0.1:54321",
    supabaseServiceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      "test-service-role-key-with-at-least-32-chars",
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      "test-publishable-key-with-at-least-32-chars",
    identityHashPepper:
      process.env.IDENTITY_HASH_PEPPER?.trim() ||
      "test-identity-hash-pepper-at-least-32-chars",
    actionBaseUrl:
      process.env.IDENTITY_ACTION_BASE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      "http://localhost:3100",
    termsVersion: process.env.CURRENT_TERMS_VERSION?.trim() || "terms-2026-09",
    privacyVersion:
      process.env.CURRENT_PRIVACY_VERSION?.trim() || "privacy-2026-09",
    smtp: {
      host: process.env.SMTP_HOST?.trim() || "127.0.0.1",
      port: Number(process.env.SMTP_PORT?.trim() || 25),
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
      from:
        process.env.SMTP_FROM?.trim() ||
        "CampusMarkt <no-reply@campusmarkt.local>",
    },
  };
}
