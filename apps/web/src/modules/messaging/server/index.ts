import "server-only";

import { getIdentityInfrastructureConfig } from "../../identity/infrastructure/environment";
import { createAdminSupabaseClient } from "../../identity/infrastructure/supabase/client/index";
import { createIdentityRepository } from "../../identity/infrastructure/supabase/repository/index";
import {
  createMarketplaceMessagingRepository,
  type MarketplaceMessagingClient,
  type MarketplaceMessagingRepository,
} from "./messaging-repository";
import {
  createMarketplaceMessagingService,
  type MarketplaceMessagingService,
  type MessagingSecurityAudit,
} from "../application/messaging";

export * from "./messaging-repository";
export * from "../application/messaging";

let cachedMessagingService: MarketplaceMessagingService | null = null;

export function getMarketplaceMessagingRepository(
  customClient?: MarketplaceMessagingClient,
): MarketplaceMessagingRepository {
  if (customClient) {
    return createMarketplaceMessagingRepository({ service: customClient });
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceMessagingRepository({
    service: adminClient as unknown as MarketplaceMessagingClient,
  });
}

export function getMarketplaceMessagingService(
  customClient?: MarketplaceMessagingClient,
): MarketplaceMessagingService {
  if (cachedMessagingService && !customClient) {
    return cachedMessagingService;
  }

  const repository = getMarketplaceMessagingRepository(customClient);
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  const identityRepo = createIdentityRepository({
    user: adminClient,
    service: adminClient,
  });

  const security: MessagingSecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[MessagingTelemetry: ${event.eventType}]`, {
          correlationId: event.correlationId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        });
      }
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

  const service = createMarketplaceMessagingService({
    repository,
    security,
  });

  if (!customClient) {
    cachedMessagingService = service;
  }
  return service;
}
