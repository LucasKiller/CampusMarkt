import "server-only";

import { getIdentityInfrastructureConfig } from "../../identity/infrastructure/environment";
import { createAdminSupabaseClient } from "../../identity/infrastructure/supabase/client/index";
import { createIdentityRepository } from "../../identity/infrastructure/supabase/repository/index";
import {
  createMarketplaceSafetyRepository,
  type MarketplaceRpcClient,
  type MarketplaceSafetyClient,
  type MarketplaceSafetyRepository,
} from "./safety-repository";
import {
  createMarketplaceSafetyService,
  type MarketplaceSafetyService,
  type SafetySecurityAudit,
} from "../application/safety";

export * from "./safety-repository";
export * from "../application/safety";

let cachedSafetyService: MarketplaceSafetyService | null = null;

export function getMarketplaceSafetyRepository(
  customClient?: MarketplaceSafetyClient,
): MarketplaceSafetyRepository {
  if (customClient) {
    return createMarketplaceSafetyRepository(customClient);
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceSafetyRepository(
    adminClient as unknown as MarketplaceRpcClient,
  );
}

export function getMarketplaceSafetyService(
  customClient?: MarketplaceSafetyClient,
): MarketplaceSafetyService {
  if (cachedSafetyService && !customClient) {
    return cachedSafetyService;
  }

  const repository = getMarketplaceSafetyRepository(customClient);
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

  const security: SafetySecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[SafetyTelemetry: ${event.eventType}]`, {
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

  const service = createMarketplaceSafetyService({
    repository,
    security,
  });

  if (!customClient) {
    cachedSafetyService = service;
  }
  return service;
}
