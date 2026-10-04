import "server-only";

import type { ListingStatus } from "@campusmarkt/domain";
import type {
  CreateListingRequest,
  ListingEntity,
  UpdateListingRequest,
} from "@campusmarkt/types";

export interface MarketplaceRpcClient {
  rpc(
    functionName: string,
    arguments_?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
  schema?(schema: string): unknown;
}

export interface MarketplaceStorageClient {
  storage: {
    from(bucket: string): {
      createSignedUploadUrl(
        path: string,
        options?: { upsert?: boolean },
      ): Promise<{
        data: { signedUrl: string; token: string; path: string } | null;
        error: unknown;
      }>;
    };
  };
}

export type ListingRepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "ACCOUNT_UNAVAILABLE"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "CONFLICT"
        | "INVALID_INPUT"
        | "DEPENDENCY_UNAVAILABLE"
        | "INVALID_PROVIDER_RESPONSE";
      message?: string;
    };

function firstRow(data: unknown): unknown {
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function callMarketplaceRpc(
  client: MarketplaceRpcClient,
  functionName: string,
  arguments_?: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  const target =
    typeof client.schema === "function"
      ? (client.schema("marketplace_api") as unknown as MarketplaceRpcClient)
      : client;

  return target.rpc(functionName, arguments_);
}

function mapDatabaseError(error: unknown): {
  code:
    | "UNAUTHENTICATED"
    | "ACCOUNT_UNAVAILABLE"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INVALID_INPUT"
    | "DEPENDENCY_UNAVAILABLE";
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (err.code === "28000" || message.includes("unauthenticated")) {
    if (
      message.includes("account is not active") ||
      message.includes("deletion is pending")
    ) {
      return { code: "ACCOUNT_UNAVAILABLE", message };
    }
    return { code: "UNAUTHENTICATED", message };
  }

  if (
    err.code === "42501" ||
    message.includes("not authorized") ||
    message.includes("permission denied")
  ) {
    return { code: "FORBIDDEN", message };
  }

  if (
    err.code === "P0002" ||
    message.includes("not found") ||
    message.includes("account is unavailable")
  ) {
    if (message.includes("account is unavailable")) {
      return { code: "ACCOUNT_UNAVAILABLE", message };
    }
    return { code: "NOT_FOUND", message };
  }

  if (
    err.code === "22023" ||
    err.code === "23514" ||
    message.includes("intent cannot be changed") ||
    message.includes("invalid") ||
    message.includes("must be")
  ) {
    if (message.includes("invalid status transition")) {
      return { code: "CONFLICT", message };
    }
    return { code: "INVALID_INPUT", message };
  }

  if (err.code === "23505" || message.includes("duplicate")) {
    return { code: "CONFLICT", message };
  }

  return { code: "DEPENDENCY_UNAVAILABLE", message };
}

export function createListingRepository(clients: {
  service: MarketplaceRpcClient;
  storage?: MarketplaceStorageClient;
}) {
  const { service, storage } = clients;

  return {
    async createListing(
      ownerId: string,
      payload: CreateListingRequest,
    ): Promise<ListingRepositoryResult<ListingEntity>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "create_listing",
          {
            p_owner_id: ownerId,
            p_payload: payload,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        const entity = firstRow(data) as ListingEntity;
        if (!entity || !isRecord(entity) || typeof entity.id !== "string") {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return { ok: true, value: entity };
      } catch (err) {
        console.error("[ListingRepository: createListing]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async updateListing(
      callerId: string,
      listingId: string,
      payload: UpdateListingRequest,
    ): Promise<ListingRepositoryResult<ListingEntity>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "update_listing",
          {
            p_caller_id: callerId,
            p_listing_id: listingId,
            p_payload: payload,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        const entity = firstRow(data) as ListingEntity;
        if (!entity || !isRecord(entity) || typeof entity.id !== "string") {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return { ok: true, value: entity };
      } catch (err) {
        console.error("[ListingRepository: updateListing]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async transitionListingStatus(
      callerId: string,
      listingId: string,
      targetStatus: ListingStatus,
    ): Promise<
      ListingRepositoryResult<{
        id: string;
        status: ListingStatus;
        updatedAt: string;
      }>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "transition_listing_status",
          {
            p_caller_id: callerId,
            p_listing_id: listingId,
            p_target_status: targetStatus,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        const result = firstRow(data) as {
          id: string;
          status: ListingStatus;
          updatedAt: string;
        };
        if (
          !result ||
          !isRecord(result) ||
          typeof result.id !== "string" ||
          typeof result.status !== "string"
        ) {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return { ok: true, value: result };
      } catch (err) {
        console.error("[ListingRepository: transitionListingStatus]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getOwnerListing(
      callerId: string,
      listingId: string,
    ): Promise<ListingRepositoryResult<ListingEntity | null>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_owner_listing",
          {
            p_caller_id: callerId,
            p_listing_id: listingId,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        const row = firstRow(data);
        if (!row || row === null) {
          return { ok: true, value: null };
        }

        if (!isRecord(row) || typeof row.id !== "string") {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return { ok: true, value: row as unknown as ListingEntity };
      } catch (err) {
        console.error("[ListingRepository: getOwnerListing]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async listOwnerListings(
      callerId: string,
    ): Promise<ListingRepositoryResult<ListingEntity[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "list_owner_listings",
          {
            p_caller_id: callerId,
          },
        );

        if (error) {
          const mapped = mapDatabaseError(error);
          return { ok: false, ...mapped };
        }

        const rows = firstRow(data);
        if (!Array.isArray(rows)) {
          return { ok: false, code: "INVALID_PROVIDER_RESPONSE" };
        }

        return { ok: true, value: rows as ListingEntity[] };
      } catch (err) {
        console.error("[ListingRepository: listOwnerListings]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async createSignedUploadUrl(storagePath: string): Promise<
      ListingRepositoryResult<{
        signedUploadUrl: string;
        storagePath: string;
        expiresAt: string;
      }>
    > {
      if (!storage) {
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }

      try {
        const bucket = storage.storage.from("listing-media");
        const { data, error } = await bucket.createSignedUploadUrl(storagePath);

        if (error || !data) {
          return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
        }

        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
        return {
          ok: true,
          value: {
            signedUploadUrl: data.signedUrl,
            storagePath,
            expiresAt,
          },
        };
      } catch (err) {
        console.error("[ListingRepository: createSignedUploadUrl]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export type ListingRepository = ReturnType<typeof createListingRepository>;
