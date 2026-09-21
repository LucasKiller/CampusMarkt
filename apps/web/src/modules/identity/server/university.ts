import "server-only";

import {
  createUniversityVerificationService,
  type UniversityVerificationService,
} from "../application/university/index";
import { getIdentityInfrastructureConfig } from "../infrastructure/environment";
import { getSmtpMailer } from "../infrastructure/mail/index";
import { createAdminSupabaseClient } from "../infrastructure/supabase/client/index";
import { createIdentityRepository } from "../infrastructure/supabase/repository/index";
import { createUniversityRepository } from "../infrastructure/supabase/repository/university";
import { createIdentitySecurity } from "../security/index";

export type { UniversityVerificationService };

let cachedUniversityVerificationService: UniversityVerificationService | null =
  null;

export function getUniversityVerificationService(
  overrideOrigin?: string,
): UniversityVerificationService {
  if (cachedUniversityVerificationService && !overrideOrigin) {
    return cachedUniversityVerificationService;
  }

  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const repository = createUniversityRepository({
    service: adminClient,
    user: adminClient,
  });
  const security = createIdentitySecurity({
    pepper: config.identityHashPepper,
    repository: createIdentityRepository({
      user: adminClient,
      service: adminClient,
    }),
  });
  const mailer = getSmtpMailer();

  const service = createUniversityVerificationService({
    security,
    repository,
    mailer,
    origin: overrideOrigin ?? config.actionBaseUrl,
  });

  if (!overrideOrigin) {
    cachedUniversityVerificationService = service;
  }

  return service;
}
