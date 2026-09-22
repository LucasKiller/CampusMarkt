import "server-only";

import {
  createListingApplicationService,
  type ListingApplicationService,
  type ListingSecurityAudit,
} from "../application/index";
import { getIdentityInfrastructureConfig } from "../../identity/infrastructure/environment";
import { createAdminSupabaseClient } from "../../identity/infrastructure/supabase/client/index";
import { createIdentityRepository } from "../../identity/infrastructure/supabase/repository/index";
import { createListingRepository } from "./repository";
import { createMarketplaceFeedRepository } from "./feed-repository";

export type { ListingApplicationService };

let cachedListingService: ListingApplicationService | null = null;

export function getListingApplicationService(): ListingApplicationService {
  if (cachedListingService) {
    return cachedListingService;
  }

  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const repository = createListingRepository({
    service: adminClient,
    storage: adminClient,
  });

  const identityRepo = createIdentityRepository({
    user: adminClient,
    service: adminClient,
  });

  const security: ListingSecurityAudit = {
    async recordAudit(event) {
      await identityRepo.appendSecurityEvent({
        authUserId: event.ownerId,
        subjectHash: null,
        ipHash: null,
        eventType: event.eventType,
        outcome: (event.metadata?.outcome as string) || "succeeded",
        correlationId: event.correlationId,
      });
    },
    async checkRateLimit(userId, action) {
      const res = await identityRepo.consumeRateLimits({
        action,
        subjectHash: userId,
        ipHash: "127.0.0.1",
      });
      if (!res.ok) {
        return { allowed: true };
      }
      const val = res.value as {
        allowed?: boolean;
        retry_after_seconds?: number;
      };
      if (val && val.allowed === false) {
        return { allowed: false, retryAfterSeconds: val.retry_after_seconds };
      }
      return { allowed: true };
    },
  };

  const service = createListingApplicationService({
    repository,
    security,
  });

  cachedListingService = service;
  return service;
}

export function getListingRepository() {
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createListingRepository({
    service: adminClient,
    storage: adminClient,
  });
}

export * from "./feed-repository";

export function getMarketplaceFeedRepository() {
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceFeedRepository({
    service: adminClient,
  });
}
