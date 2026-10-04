import "server-only";

import { getIdentityInfrastructureConfig } from "../../identity/infrastructure/environment";
import { createUserTokenSupabaseClient } from "../../identity/infrastructure/supabase/client/index";
import { resolveCookieSession } from "../../identity/server/access";
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

export function getMarketplaceMessagingRepository(
  client: MarketplaceMessagingClient,
): MarketplaceMessagingRepository {
  return createMarketplaceMessagingRepository({ service: client });
}

export async function getMarketplaceMessagingService(
  userId: string,
): Promise<MarketplaceMessagingService | null> {
  const session = await resolveCookieSession();
  if (!session.ok || session.value.authUserId !== userId) {
    return null;
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const userClient = createUserTokenSupabaseClient(session.value.token, env);
  const repository = getMarketplaceMessagingRepository(
    userClient as unknown as MarketplaceMessagingClient,
  );
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
  };

  return createMarketplaceMessagingService({
    repository,
    security,
  });
}
