import "server-only";

import {
  createListingApplicationService,
  type ListingApplicationService,
  type ListingSecurityAudit,
} from "../application/index";
import { getIdentityInfrastructureConfig } from "../../identity/infrastructure/environment";
import { createAdminSupabaseClient } from "../../identity/infrastructure/supabase/client/index";
import { createIdentityRepository } from "../../identity/infrastructure/supabase/repository/index";
import {
  createListingRepository,
  type MarketplaceRpcClient,
} from "./repository";
import { createMarketplaceFeedRepository } from "./feed-repository";
import { createMarketplaceSearchRepository } from "./search-repository";
import { createMarketplaceFavoritesRepository } from "./favorites-repository";
import { createMarketplaceOffersRepository } from "./offers-repository";
import { createMarketplacePickupRepository } from "./pickup-repository";
import {
  createMarketplaceFeedService,
  type MarketplaceFeedService,
  type FeedSecurityAudit,
} from "../application/feed";
import {
  createMarketplaceSearchService,
  type MarketplaceSearchService,
  type SearchSecurityAudit,
} from "../application/search";
import {
  createMarketplaceFavoritesService,
  type MarketplaceFavoritesService,
  type FavoritesSecurityAudit,
} from "../application/favorites";
import {
  createMarketplaceNegotiationService,
  type MarketplaceNegotiationService,
  type NegotiationSecurityAudit,
} from "../application/negotiation";

export type {
  ListingApplicationService,
  MarketplaceFeedService,
  MarketplaceSearchService,
  MarketplaceFavoritesService,
  MarketplaceNegotiationService,
};

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
export * from "./search-repository";
export * from "./favorites-repository";
export * from "./offers-repository";
export * from "./pickup-repository";

export function getMarketplacePickupRepository(
  customClient?: MarketplaceRpcClient,
) {
  if (customClient) {
    return createMarketplacePickupRepository({ service: customClient });
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplacePickupRepository({
    service: adminClient,
  });
}

export function getMarketplaceOffersRepository(
  customClient?: MarketplaceRpcClient,
) {
  if (customClient) {
    return createMarketplaceOffersRepository({ service: customClient });
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceOffersRepository({
    service: adminClient,
  });
}

export function getMarketplaceFavoritesRepository(
  customClient?: MarketplaceRpcClient,
) {
  if (customClient) {
    return createMarketplaceFavoritesRepository({ service: customClient });
  }
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceFavoritesRepository({
    service: adminClient,
  });
}

export function getMarketplaceSearchRepository() {
  const config = getIdentityInfrastructureConfig();
  const env = {
    SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
    SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
    SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
  };
  const adminClient = createAdminSupabaseClient(env);
  return createMarketplaceSearchRepository({
    service: adminClient,
  });
}

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

let cachedFeedService: MarketplaceFeedService | null = null;

export function getMarketplaceFeedService(): MarketplaceFeedService {
  if (cachedFeedService) {
    return cachedFeedService;
  }

  const repository = getMarketplaceFeedRepository();
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

  const security: FeedSecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[FeedTelemetry: ${event.eventType}]`, {
          correlationId: event.correlationId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        });
      }
    },
    async checkRateLimit(clientIp, action) {
      const res = await identityRepo.consumeRateLimits({
        action,
        subjectHash: clientIp,
        ipHash: clientIp,
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

  const service = createMarketplaceFeedService({
    repository,
    security,
  });

  cachedFeedService = service;
  return service;
}

let cachedSearchService: MarketplaceSearchService | null = null;

export function getMarketplaceSearchService(): MarketplaceSearchService {
  if (cachedSearchService) {
    return cachedSearchService;
  }

  const repository = getMarketplaceSearchRepository();
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

  const security: SearchSecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[SearchTelemetry: ${event.eventType}]`, {
          correlationId: event.correlationId,
          metadata: event.metadata,
          timestamp: event.timestamp,
        });
      }
    },
    async checkRateLimit(clientIp, action) {
      const res = await identityRepo.consumeRateLimits({
        action,
        subjectHash: clientIp,
        ipHash: clientIp,
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

  const service = createMarketplaceSearchService({
    repository,
    security,
  });

  cachedSearchService = service;
  return service;
}

let cachedFavoritesService: MarketplaceFavoritesService | null = null;

export function getMarketplaceFavoritesService(
  customClient?: MarketplaceRpcClient,
): MarketplaceFavoritesService {
  if (cachedFavoritesService && !customClient) {
    return cachedFavoritesService;
  }

  const repository = getMarketplaceFavoritesRepository(customClient);
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

  const security: FavoritesSecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[FavoritesTelemetry: ${event.eventType}]`, {
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

  const service = createMarketplaceFavoritesService({
    repository,
    security,
  });

  if (!customClient) {
    cachedFavoritesService = service;
  }
  return service;
}

let cachedNegotiationService: MarketplaceNegotiationService | null = null;

export function getMarketplaceNegotiationService(
  customClient?: MarketplaceRpcClient,
): MarketplaceNegotiationService {
  if (cachedNegotiationService && !customClient) {
    return cachedNegotiationService;
  }

  const repository = getMarketplaceOffersRepository(customClient);
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

  const security: NegotiationSecurityAudit = {
    async recordTelemetry(event) {
      if (process.env.NODE_ENV !== "test") {
        console.info(`[NegotiationTelemetry: ${event.eventType}]`, {
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

  const service = createMarketplaceNegotiationService({
    repository,
    security,
  });

  if (!customClient) {
    cachedNegotiationService = service;
  }
  return service;
}
