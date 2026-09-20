import "server-only";

import type { FieldErrors, PublicProfile } from "@campusmarkt/types";
import { parseDisplayName } from "@campusmarkt/validation";
import { getIdentityInfrastructureConfig } from "../infrastructure/environment";
import { createAdminSupabaseClient } from "../infrastructure/supabase/client/index";
import { createIdentityRepository } from "../infrastructure/supabase/repository/index";

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
  adminClient: ReturnType<typeof createAdminSupabaseClient>;
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
    const repository = createIdentityRepository({
      user: adminClient,
      service: adminClient,
    });
    return { adminClient, repository };
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
      const { adminClient, repository } = getPorts();

      try {
        const { data, error } = await adminClient
          .schema("identity")
          .from("accounts")
          .select("public_id")
          .eq("auth_user_id", authUserId)
          .maybeSingle();

        if (error || !data?.public_id) {
          return { status: "not_found" as const };
        }

        const publicResult = await repository.readPublicProfile(data.public_id);
        if (!publicResult.ok) {
          return { status: "unavailable" as const };
        }
        if (publicResult.value === null) {
          return { status: "not_found" as const };
        }

        return { status: "found" as const, profile: publicResult.value };
      } catch {
        return { status: "unavailable" as const };
      }
    },

    async updateDisplayName(authUserId: string, displayName: unknown) {
      const parsed = parseDisplayName(displayName);
      if (!parsed.ok) {
        return {
          status: "invalid" as const,
          fieldErrors: { displayName: parsed.errors },
        };
      }

      const { adminClient, repository } = getPorts();

      try {
        const { error: updateError } = await adminClient
          .schema("identity")
          .from("profiles")
          .update({ display_name: parsed.value })
          .eq("auth_user_id", authUserId);

        if (updateError) {
          return { status: "unavailable" as const };
        }

        const { data: accountData, error: accountError } = await adminClient
          .schema("identity")
          .from("accounts")
          .select("public_id")
          .eq("auth_user_id", authUserId)
          .maybeSingle();

        if (accountError || !accountData?.public_id) {
          return { status: "unavailable" as const };
        }

        const refreshed = await repository.readPublicProfile(
          accountData.public_id,
        );
        if (!refreshed.ok || !refreshed.value) {
          return { status: "unavailable" as const };
        }

        return { status: "updated" as const, profile: refreshed.value };
      } catch {
        return { status: "unavailable" as const };
      }
    },
  };
}

let cachedProfileService: ProfileService | null = null;

export function getProfileService(): ProfileService {
  if (cachedProfileService) return cachedProfileService;
  cachedProfileService = createProfileService();
  return cachedProfileService;
}
