import {
  AccountSuspendedError,
  assertAccountNotSuspended,
  assertCanModerate,
  assertListingNotRemoved,
  canEditOrRelistListing,
  canModerate,
  isListingPubliclyDiscoverable,
  isListingRemoved,
  ListingRemovedError,
  resolveReservationCascadeOnListingRemoval,
  resolveReservationCascadeOnUserSuspension,
  UnauthorizedModeratorError,
} from "@campusmarkt/domain";
import type {
  ExecuteModerationActionRequest,
  ExecuteModerationActionResponse,
  ModerationActionDTO,
  ModerationActionType,
  ModerationQueueItemDTO,
  ModerationStatusDTO,
} from "@campusmarkt/types";
import {
  isExecuteModerationActionRequest,
  isModerationActionDTO,
  isModerationActionType,
  isModerationQueueItemDTO,
  isModerationStatusDTO,
} from "@campusmarkt/types";
import {
  validateExecuteModerationActionInput,
  validateModerationTargetId,
  validateModeratorActionReason,
  validateReportId,
} from "@campusmarkt/validation";
import type {
  MarketplaceModerationRepository,
  MarketplaceModerationResult,
} from "../server/moderation-repository";

export {
  AccountSuspendedError,
  assertAccountNotSuspended,
  assertCanModerate,
  assertListingNotRemoved,
  canEditOrRelistListing,
  canModerate,
  isExecuteModerationActionRequest,
  isListingPubliclyDiscoverable,
  isListingRemoved,
  isModerationActionDTO,
  isModerationActionType,
  isModerationQueueItemDTO,
  isModerationStatusDTO,
  ListingRemovedError,
  resolveReservationCascadeOnListingRemoval,
  resolveReservationCascadeOnUserSuspension,
  UnauthorizedModeratorError,
  validateExecuteModerationActionInput,
  validateModerationTargetId,
  validateModeratorActionReason,
  validateReportId,
};

export type {
  ExecuteModerationActionRequest,
  ExecuteModerationActionResponse,
  ModerationActionDTO,
  ModerationActionType,
  ModerationQueueItemDTO,
  ModerationStatusDTO,
};

export type ModerationTelemetryEvent = {
  eventType:
    | "marketplace.moderation.dismissed"
    | "marketplace.moderation.listing_removed"
    | "marketplace.moderation.user_suspended";
  correlationId?: string;
  metadata?: {
    moderatorId?: string;
    reportId?: string;
    targetType?: string;
    targetId?: string;
    reason?: string;
    outcome?: string;
    durationMs?: number;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type ModerationSecurityAudit = {
  recordTelemetry?(event: ModerationTelemetryEvent): Promise<void>;
};

export type ModerationApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      errors?: string[];
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "conflict"; message?: string }
  | { status: "not_found"; message?: string }
  | { status: "forbidden"; message?: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export interface MarketplaceModerationService {
  checkModeratorStatus(userId: string): Promise<ModerationStatusDTO>;
  getModerationQueue(
    userId: string,
  ): Promise<ModerationApplicationResult<ModerationQueueItemDTO[]>>;
  executeModerationAction(
    userId: string,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<ModerationApplicationResult<ExecuteModerationActionResponse>>;
  getAuditLog(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ModerationApplicationResult<ModerationActionDTO[]>>;
}

export function createMarketplaceModerationService(deps: {
  repository: MarketplaceModerationRepository;
  security?: ModerationSecurityAudit;
}): MarketplaceModerationService {
  const { repository, security } = deps;

  async function emitTelemetry(event: ModerationTelemetryEvent): Promise<void> {
    try {
      if (security?.recordTelemetry) {
        await security.recordTelemetry(event);
      }
    } catch (err) {
      console.error("[ModerationService: Telemetry Error]", err);
    }
  }

  function mapRepoResult<T>(
    result: MarketplaceModerationResult<T>,
  ): ModerationApplicationResult<T> {
    if (result.ok) {
      return { status: "success", data: result.value };
    }

    switch (result.code) {
      case "UNAUTHENTICATED":
        return { status: "unauthenticated" };
      case "FORBIDDEN":
        return {
          status: "forbidden",
          message:
            result.message ||
            "User is not authorized as a marketplace moderator.",
        };
      case "NOT_FOUND":
        return {
          status: "not_found",
          message: result.message || "Requested resource not found.",
        };
      case "CONFLICT":
        return {
          status: "conflict",
          message: result.message || "Resource is already resolved.",
        };
      case "INVALID_INPUT":
        return {
          status: "invalid",
          message: result.message || "Invalid input provided.",
        };
      default:
        return { status: "unavailable" };
    }
  }

  return {
    async checkModeratorStatus(userId: string): Promise<ModerationStatusDTO> {
      if (!userId) {
        return { isModerator: false };
      }
      const res = await repository.isModerator(userId);
      if (res.ok && res.value === true) {
        return { isModerator: true };
      }
      return { isModerator: false };
    },

    async getModerationQueue(
      userId: string,
    ): Promise<ModerationApplicationResult<ModerationQueueItemDTO[]>> {
      if (!userId) {
        return { status: "unauthenticated" };
      }

      const modCheck = await repository.isModerator(userId);
      if (!modCheck.ok || !modCheck.value) {
        return {
          status: "forbidden",
          message: "User is not authorized as a marketplace moderator.",
        };
      }

      const repoResult = await repository.getModerationQueue();
      return mapRepoResult(repoResult);
    },

    async executeModerationAction(
      userId: string,
      input: unknown,
      context?: { correlationId?: string; clientIp?: string },
    ): Promise<ModerationApplicationResult<ExecuteModerationActionResponse>> {
      const startTime = Date.now();

      if (!userId) {
        return { status: "unauthenticated" };
      }

      const modCheck = await repository.isModerator(userId);
      if (!modCheck.ok || !modCheck.value) {
        return {
          status: "forbidden",
          message: "User is not authorized as a marketplace moderator.",
        };
      }

      const validation = validateExecuteModerationActionInput(input);
      if (!validation.ok) {
        return {
          status: "invalid",
          errors: validation.errors,
          fieldErrors: validation.fieldErrors,
        };
      }

      const request = validation.value;
      let repoResult: MarketplaceModerationResult<ExecuteModerationActionResponse>;

      if (request.actionType === "dismiss_report") {
        if (!request.reportId) {
          return {
            status: "invalid",
            fieldErrors: {
              reportId: ["Report ID is required for dismissing a report."],
            },
          };
        }
        repoResult = await repository.dismissReport(
          request.reportId,
          request.reason,
        );
        if (repoResult.ok) {
          await emitTelemetry({
            eventType: "marketplace.moderation.dismissed",
            correlationId: context?.correlationId,
            metadata: {
              moderatorId: userId,
              reportId: request.reportId,
              targetType: request.targetType,
              targetId: request.targetId,
              reason: request.reason,
              outcome: "success",
              durationMs: Date.now() - startTime,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else if (request.actionType === "remove_listing") {
        repoResult = await repository.removeListing(
          request.targetId,
          request.reason,
          request.reportId,
        );
        if (repoResult.ok) {
          await emitTelemetry({
            eventType: "marketplace.moderation.listing_removed",
            correlationId: context?.correlationId,
            metadata: {
              moderatorId: userId,
              reportId: request.reportId,
              targetType: request.targetType,
              targetId: request.targetId,
              reason: request.reason,
              outcome: "success",
              durationMs: Date.now() - startTime,
            },
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // suspend_user
        repoResult = await repository.suspendUser(
          request.targetId,
          request.reason,
          request.reportId,
        );
        if (repoResult.ok) {
          await emitTelemetry({
            eventType: "marketplace.moderation.user_suspended",
            correlationId: context?.correlationId,
            metadata: {
              moderatorId: userId,
              reportId: request.reportId,
              targetType: request.targetType,
              targetId: request.targetId,
              reason: request.reason,
              outcome: "success",
              durationMs: Date.now() - startTime,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      return mapRepoResult(repoResult);
    },

    async getAuditLog(
      userId: string,
      options?: { limit?: number; offset?: number },
    ): Promise<ModerationApplicationResult<ModerationActionDTO[]>> {
      if (!userId) {
        return { status: "unauthenticated" };
      }

      const modCheck = await repository.isModerator(userId);
      if (!modCheck.ok || !modCheck.value) {
        return {
          status: "forbidden",
          message: "User is not authorized as a marketplace moderator.",
        };
      }

      const repoResult = await repository.getAuditLog(
        options?.limit,
        options?.offset,
      );
      return mapRepoResult(repoResult);
    },
  };
}
