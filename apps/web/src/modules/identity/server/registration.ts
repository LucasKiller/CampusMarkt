import "server-only";

import { createActionLinkService } from "../action-links/index";
import { createRegistrationService } from "../application/registration/index";
import { getIdentityInfrastructureConfig } from "../infrastructure/environment";
import { getSmtpMailer } from "../infrastructure/mail/index";
import { createSupabaseAuthGateway } from "../infrastructure/supabase/auth/index";
import { createAdminSupabaseClient } from "../infrastructure/supabase/client/index";
import { createIdentityRepository } from "../infrastructure/supabase/repository/index";
import { createIdentitySecurity } from "../security/index";

let cachedRegistrationService: ReturnType<
  typeof createRegistrationService
> | null = null;
let cachedActionLinkService: ReturnType<typeof createActionLinkService> | null =
  null;

export function getActionLinkService() {
  if (cachedActionLinkService) return cachedActionLinkService;

  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const repository = createIdentityRepository({
    user: adminClient,
    service: adminClient,
  });
  const mailer = getSmtpMailer();

  cachedActionLinkService = createActionLinkService({
    repository,
    mailer,
    origin: config.actionBaseUrl,
  });

  return cachedActionLinkService;
}

export function getRegistrationService() {
  if (cachedRegistrationService) return cachedRegistrationService;

  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const repository = createIdentityRepository({
    user: adminClient,
    service: adminClient,
  });
  const auth = createSupabaseAuthGateway({
    userClient: adminClient as unknown as Parameters<
      typeof createSupabaseAuthGateway
    >[0]["userClient"],
    adminClient,
  });
  const actionLinks = getActionLinkService();
  const security = createIdentitySecurity({
    pepper: config.identityHashPepper,
    repository,
  });
  const policies = {
    termsVersion: config.termsVersion,
    privacyVersion: config.privacyVersion,
  };

  cachedRegistrationService = createRegistrationService({
    security,
    auth,
    actionLinks,
    repository,
    policies,
  });

  return cachedRegistrationService;
}
