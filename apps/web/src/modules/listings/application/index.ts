import type { ListingStatus } from "@campusmarkt/domain";
import type {
  CreateListingRequest,
  ListingEntity,
  UpdateListingRequest,
} from "@campusmarkt/types";
import {
  parseCreateListingInput,
  parseTransitionStatusInput,
  parseUpdateListingInput,
} from "@campusmarkt/validation";
import type { ListingRepository } from "../server/repository";

export type ListingAuditEvent = {
  eventType:
    | "listing.created"
    | "listing.updated"
    | "listing.status_changed"
    | "listing.viewed";
  listingId: string | null;
  ownerId: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
};

export type ListingSecurityAudit = {
  recordAudit(event: ListingAuditEvent): Promise<void>;
  checkRateLimit(
    userId: string,
    action: "create_listing",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type ListingApplicationResult<T> =
  | { status: "success"; data: T }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "conflict"; message?: string }
  | { status: "account_unavailable"; message?: string }
  | { status: "unavailable" };

export interface ListingApplicationService {
  createListing(
    callerId: string,
    input: unknown,
    context: { correlationId: string },
  ): Promise<ListingApplicationResult<ListingEntity>>;

  updateListing(
    callerId: string,
    listingId: string,
    input: unknown,
    context: { correlationId: string },
  ): Promise<ListingApplicationResult<ListingEntity>>;

  transitionStatus(
    callerId: string,
    listingId: string,
    input: unknown,
    context: { correlationId: string },
  ): Promise<
    ListingApplicationResult<{
      id: string;
      status: ListingStatus;
      updatedAt: string;
    }>
  >;

  getOwnerListing(
    callerId: string,
    listingId: string,
  ): Promise<ListingApplicationResult<ListingEntity | null>>;

  listOwnerListings(
    callerId: string,
  ): Promise<ListingApplicationResult<ListingEntity[]>>;
}

export function createListingApplicationService(ports: {
  repository: ListingRepository;
  security?: ListingSecurityAudit;
}): ListingApplicationService {
  const { repository, security } = ports;

  return {
    async createListing(callerId, input, context) {
      if (!callerId) {
        return { status: "unauthenticated" };
      }

      // 1. Rate limiting check (20/hr)
      if (security) {
        const rateLimit = await security.checkRateLimit(
          callerId,
          "create_listing",
        );
        if (!rateLimit.allowed) {
          if (security.recordAudit) {
            await security.recordAudit({
              eventType: "listing.created",
              listingId: null,
              ownerId: callerId,
              correlationId: context.correlationId,
              metadata: { outcome: "rate_limited" },
              timestamp: new Date().toISOString(),
            });
          }
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 3600,
          };
        }
      }

      // 2. Validate input with pure validation schema
      const parseResult = parseCreateListingInput(input);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
        };
      }

      // 3. Persist via repository
      const repoResult = await repository.createListing(
        callerId,
        parseResult.value as CreateListingRequest,
      );

      if (!repoResult.ok) {
        if (repoResult.code === "ACCOUNT_UNAVAILABLE") {
          return {
            status: "account_unavailable",
            message: repoResult.message,
          };
        }
        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }
        if (repoResult.code === "FORBIDDEN") {
          return { status: "forbidden" };
        }
        if (repoResult.code === "CONFLICT") {
          return { status: "conflict", message: repoResult.message };
        }
        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            fieldErrors: { _form: [repoResult.message || "Invalid input"] },
          };
        }
        return { status: "unavailable" };
      }

      // 4. Audit logging
      if (security?.recordAudit) {
        await security.recordAudit({
          eventType: "listing.created",
          listingId: repoResult.value.id,
          ownerId: callerId,
          correlationId: context.correlationId,
          metadata: {
            listingType: repoResult.value.listingType,
            category: repoResult.value.category,
            pickupArea: repoResult.value.pickupArea,
            priceCents: repoResult.value.priceCents,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return { status: "success", data: repoResult.value };
    },

    async updateListing(callerId, listingId, input, context) {
      if (!callerId) {
        return { status: "unauthenticated" };
      }

      // 1. Fetch existing listing to pass existing listing type to validation
      const existing = await repository.getOwnerListing(callerId, listingId);
      if (!existing.ok) {
        if (existing.code === "FORBIDDEN") return { status: "forbidden" };
        if (existing.code === "NOT_FOUND") return { status: "not_found" };
        return { status: "unavailable" };
      }

      if (!existing.value) {
        return { status: "not_found" };
      }

      // 2. Validate input
      const parseResult = parseUpdateListingInput(
        input,
        existing.value.listingType,
      );
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
        };
      }

      // 3. Update via repository
      const repoResult = await repository.updateListing(
        callerId,
        listingId,
        parseResult.value as UpdateListingRequest,
      );

      if (!repoResult.ok) {
        if (repoResult.code === "FORBIDDEN") return { status: "forbidden" };
        if (repoResult.code === "NOT_FOUND") return { status: "not_found" };
        if (repoResult.code === "CONFLICT") {
          return { status: "conflict", message: repoResult.message };
        }
        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            fieldErrors: { _form: [repoResult.message || "Invalid input"] },
          };
        }
        return { status: "unavailable" };
      }

      // 4. Audit logging
      if (security?.recordAudit) {
        await security.recordAudit({
          eventType: "listing.updated",
          listingId,
          ownerId: callerId,
          correlationId: context.correlationId,
          metadata: {
            updatedFields: Object.keys(parseResult.value),
          },
          timestamp: new Date().toISOString(),
        });
      }

      return { status: "success", data: repoResult.value };
    },

    async transitionStatus(callerId, listingId, input, context) {
      if (!callerId) {
        return { status: "unauthenticated" };
      }

      // 1. Validate status input
      const parseResult = parseTransitionStatusInput(input);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
        };
      }

      // 2. Transition status via repository
      const repoResult = await repository.transitionListingStatus(
        callerId,
        listingId,
        parseResult.value.status,
      );

      if (!repoResult.ok) {
        if (repoResult.code === "FORBIDDEN") return { status: "forbidden" };
        if (repoResult.code === "NOT_FOUND") return { status: "not_found" };
        if (repoResult.code === "CONFLICT") {
          return { status: "conflict", message: repoResult.message };
        }
        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            fieldErrors: {
              _form: [repoResult.message || "Invalid status transition"],
            },
          };
        }
        return { status: "unavailable" };
      }

      // 3. Audit logging
      if (security?.recordAudit) {
        await security.recordAudit({
          eventType: "listing.status_changed",
          listingId,
          ownerId: callerId,
          correlationId: context.correlationId,
          metadata: {
            targetStatus: parseResult.value.status,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return { status: "success", data: repoResult.value };
    },

    async getOwnerListing(callerId, listingId) {
      if (!callerId) {
        return { status: "unauthenticated" };
      }

      const result = await repository.getOwnerListing(callerId, listingId);
      if (!result.ok) {
        if (result.code === "FORBIDDEN") return { status: "forbidden" };
        if (result.code === "NOT_FOUND") return { status: "not_found" };
        return { status: "unavailable" };
      }

      return { status: "success", data: result.value };
    },

    async listOwnerListings(callerId) {
      if (!callerId) {
        return { status: "unauthenticated" };
      }

      const result = await repository.listOwnerListings(callerId);
      if (!result.ok) {
        if (result.code === "FORBIDDEN") return { status: "forbidden" };
        return { status: "unavailable" };
      }

      return { status: "success", data: result.value };
    },
  };
}
