import "server-only";

import type { FieldErrors, PublicProfile } from "@campusmarkt/types";
import { parseDisplayName } from "@campusmarkt/validation";
import { getIdentityInfrastructureConfig } from "../infrastructure/environment";
import { createAdminSupabaseClient } from "../infrastructure/supabase/client/index";
import { createIdentityRepository } from "../infrastructure/supabase/repository/index";
import { createCookieIdentityRpcClient } from "./access";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ProfileService {
  getPublicProfile(
    publicId: string,
  ): Promise<
    | { status: "found"; profile: PublicProfile }
    | { status: "not_found" }
    | { status: "unavailable" }
  >;
  getOwnerProfile(
    authUserId: string,
  ): Promise<
    | { status: "found"; profile: PublicProfile }
    | { status: "not_found" }
    | { status: "unavailable" }
  >;
  updateDisplayName(
    authUserId: string,
    displayName: unknown,
  ): Promise<
    | { status: "updated"; profile: PublicProfile }
    | { status: "invalid"; fieldErrors: FieldErrors }
    | { status: "unavailable" }
  >;
}

export function createProfileService(ports?: {
  repository: ReturnType<typeof createIdentityRepository>;
}): ProfileService {
  function getPorts() {
    if (ports) return ports;
    const config = getIdentityInfrastructureConfig();
    const env = {
      SUPABASE_INTERNAL_URL: config.supabaseInternalUrl,
      SUPABASE_SERVICE_ROLE_KEY: config.supabaseServiceRoleKey,
      SUPABASE_PUBLISHABLE_KEY: config.supabasePublishableKey,
    };
    const adminClient = createAdminSupabaseClient(env);
    const userClient = createCookieIdentityRpcClient(env, adminClient);
    const repository = createIdentityRepository({
      user: userClient,
      service: adminClient,
    });
    return { repository };
  }

  return {
    async getPublicProfile(publicId: string) {
      if (!UUID_PATTERN.test(publicId)) {
        return { status: "not_found" as const };
      }

      if (process.env.E2E_TEST === "true") {
        if (publicId === "99999999-8888-4777-8666-555555555555") {
          return {
            status: "found" as const,
            profile: {
              publicId,
              displayName: "Ada Lovelace",
              joinedMonth: "2026-09",
              avatarUrl: null,
            },
          };
        }
        if (publicId === "88888888-7777-4666-8555-444444444444") {
          return {
            status: "found" as const,
            profile: {
              publicId,
              displayName: "Grace Hopper",
              joinedMonth: "2026-08",
              avatarUrl: "/media/avatars/sample.webp",
            },
          };
        }
        if (publicId === "77777777-6666-4555-8444-333333333333") {
          return {
            status: "found" as const,
            profile: {
              publicId,
              displayName: "Carl Friedrich Gauss",
              joinedMonth: "2026-09",
              avatarUrl: null,
              universityBadge: {
                universityId: "tu-braunschweig",
                badgeLabel: "TU Braunschweig",
              },
            },
          };
        }
        if (publicId === "00000000-0000-4000-8000-000000000000") {
          return { status: "not_found" as const };
        }
      }

      const { repository } = getPorts();
      const result = await repository.readPublicProfile(publicId);

      if (!result.ok) {
        return { status: "unavailable" as const };
      }
      if (result.value === null) {
        return { status: "not_found" as const };
      }

      return { status: "found" as const, profile: result.value };
    },

    async getOwnerProfile(authUserId: string) {
      if (!UUID_PATTERN.test(authUserId)) {
        return { status: "not_found" as const };
      }
      const { repository } = getPorts();
      const result = await repository.readOwnerProfile();
      if (!result.ok) {
        return { status: "unavailable" as const };
      }
      if (result.value === null) {
        return { status: "not_found" as const };
      }
      return { status: "found" as const, profile: result.value };
    },

    async updateDisplayName(authUserId: string, displayName: unknown) {
      if (!UUID_PATTERN.test(authUserId)) {
        return { status: "unavailable" as const };
      }
      const parsed = parseDisplayName(displayName);
      if (!parsed.ok) {
        return {
          status: "invalid" as const,
          fieldErrors: { displayName: parsed.errors },
        };
      }

      const { repository } = getPorts();
      const updateResult = await repository.updateDisplayName(parsed.value);
      if (!updateResult.ok) {
        return { status: "unavailable" as const };
      }
      const refreshed = await repository.readOwnerProfile();
      if (!refreshed.ok || !refreshed.value) {
        return { status: "unavailable" as const };
      }
      return { status: "updated" as const, profile: refreshed.value };
    },
  };
}

let cachedProfileService: ProfileService | null = null;

export function getProfileService(): ProfileService {
  if (cachedProfileService) return cachedProfileService;
  cachedProfileService = createProfileService();
  return cachedProfileService;
}
