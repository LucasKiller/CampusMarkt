import "server-only";

import { getIdentityInfrastructureConfig } from "../../identity/infrastructure/environment";
import { createAdminSupabaseClient } from "../../identity/infrastructure/supabase/client/index";
import {
  createMarketplaceModerationRepository,
  type MarketplaceModerationClient,
  type MarketplaceModerationRepository,
  type MarketplaceRpcClient,
} from "./moderation-repository";
import {
  createMarketplaceModerationService,
  type MarketplaceModerationService,
  type ModerationSecurityAudit,
} from "../application/moderation";

export * from "./moderation-repository";
export * from "../application/moderation";

let cachedModerationService: MarketplaceModerationService | null = null;

export function getMarketplaceModerationRepository(
  customClient?: MarketplaceModerationClient,
): MarketplaceModerationRepository {
  if (customClient) {
    return createMarketplaceModerationRepository(customClient);
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceModerationRepository(
    adminClient as unknown as MarketplaceRpcClient,
  );
}

export function getMarketplaceModerationService(
  customClient?: MarketplaceModerationClient,
): MarketplaceModerationService {
  if (cachedModerationService && !customClient) {
    return cachedModerationService;
  }

  const repository = getMarketplaceModerationRepository(customClient);

  const security: ModerationSecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[ModerationTelemetry: ${event.eventType}]`, {
          correlationId: event.correlationId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        });
      }
    },
  };

  const service = createMarketplaceModerationService({
    repository,
    security,
  });

  if (!customClient) {
    cachedModerationService = service;
  }
  return service;
}
