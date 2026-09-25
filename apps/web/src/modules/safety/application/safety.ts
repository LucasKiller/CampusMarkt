import {
  assertCanBlock,
  assertCanReport,
  canBlock,
  canReport,
  DuplicatePendingReportError,
  SelfBlockError,
  SelfReportError,
  UserBlockedInteractionError,
} from "@campusmarkt/domain";
import type {
  BlockedUsersListResponse,
  BlockUserRequest,
  BlockUserResponse,
  CreateReportRequest,
  ReportConfirmationDTO,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UnblockUserResponse,
  UserBlockDTO,
} from "@campusmarkt/types";
import {
  validateBlockedUserId,
  validateBlockUserInput,
  validateCreateReportInput,
  validateReportTargetId,
} from "@campusmarkt/validation";
import type { MarketplaceSafetyRepository } from "../server/safety-repository";

export {
  assertCanBlock,
  assertCanReport,
  canBlock,
  canReport,
  DuplicatePendingReportError,
  SelfBlockError,
  SelfReportError,
  UserBlockedInteractionError,
  validateBlockedUserId,
  validateBlockUserInput,
  validateCreateReportInput,
  validateReportTargetId,
};

export type {
  BlockedUsersListResponse,
  BlockUserRequest,
  BlockUserResponse,
  CreateReportRequest,
  ReportConfirmationDTO,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UnblockUserResponse,
  UserBlockDTO,
};

export type SafetyTelemetryEvent = {
  eventType:
    | "marketplace.report.submitted"
    | "marketplace.user.blocked"
    | "marketplace.user.unblocked";
  correlationId?: string;
  metadata?: {
    userId?: string;
    targetType?: string;
    targetId?: string;
    reason?: string;
    blockedId?: string;
    outcome?: string;
    durationMs?: number;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type SafetySecurityAudit = {
  recordTelemetry?(event: SafetyTelemetryEvent): Promise<void>;
  checkRateLimit?(
    userId: string,
    action: "submit_report" | "block_user" | "unblock_user",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type SafetyApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "cannot_report_self"; message?: string }
  | { status: "cannot_block_self"; message?: string }
  | { status: "conflict"; message?: string }
  | { status: "not_found"; message?: string }
  | { status: "forbidden"; message?: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export interface MarketplaceSafetyService {
  submitReport(
    userId: string,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<SafetyApplicationResult<ReportConfirmationDTO>>;

  blockUser(
    userId: string,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<SafetyApplicationResult<BlockUserResponse>>;

  unblockUser(
    userId: string,
    blockedId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<SafetyApplicationResult<UnblockUserResponse>>;

  getBlockedUsers(
    userId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<SafetyApplicationResult<BlockedUsersListResponse>>;
}

export class SafetyRateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  check(
    key: string,
    limit = 10,
    windowMs = 60000,
  ): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const list = this.timestamps.get(key) || [];
    const recent = list.filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      const oldest = recent[0];
      const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }
    recent.push(now);
    this.timestamps.set(key, recent);
    return { allowed: true };
  }

  reset() {
    this.timestamps.clear();
  }
}

export function createMarketplaceSafetyService(ports: {
  repository: MarketplaceSafetyRepository;
  security?: SafetySecurityAudit;
  rateLimiter?: SafetyRateLimiter;
}): MarketplaceSafetyService {
  const { repository, security } = ports;
  const inMemoryLimiter = ports.rateLimiter ?? new SafetyRateLimiter();

  async function checkSafetyRateLimit(
    userId: string,
    action: "submit_report" | "block_user" | "unblock_user",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    if (security?.checkRateLimit) {
      const result = await security.checkRateLimit(userId, action);
      if (!result.allowed) {
        return result;
      }
    }
    return inMemoryLimiter.check(`${userId}:${action}`, 10, 60000);
  }

  return {
    async submitReport(userId, input, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      // 1. Validation
      const parseResult = validateCreateReportInput(input);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
          message: parseResult.errors.join("; "),
        };
      }
      const reportData = parseResult.value;

      // 2. Domain check: cannot report own user account directly
      if (reportData.targetType === "user") {
        try {
          assertCanReport(userId, reportData.targetId);
        } catch (err) {
          if (err instanceof SelfReportError) {
            return {
              status: "cannot_report_self",
              message: "Users cannot report their own account or listing.",
            };
          }
        }
      }

      // 3. Rate limiting (10 actions/min)
      const rateLimit = await checkSafetyRateLimit(userId, "submit_report");
      if (!rateLimit.allowed) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "marketplace.report.submitted",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              targetType: reportData.targetType,
              targetId: reportData.targetId,
              outcome: "rate_limited",
            },
            timestamp: new Date().toISOString(),
          });
        }
        return {
          status: "rate_limited",
          retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
        };
      }

      // 4. Call repository
      const repoResult = await repository.submitReport(reportData);

      if (!repoResult.ok) {
        if (repoResult.code === "CANNOT_REPORT_SELF") {
          return {
            status: "cannot_report_self",
            message:
              repoResult.message ||
              "Users cannot report their own account or listing.",
          };
        }

        if (repoResult.code === "REPORT_ALREADY_PENDING") {
          return {
            status: "conflict",
            message:
              repoResult.message ||
              "A pending report already exists for this target.",
          };
        }

        if (repoResult.code === "NOT_FOUND") {
          return {
            status: "not_found",
            message: repoResult.message || "Target listing or user not found.",
          };
        }

        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }

        if (repoResult.code === "FORBIDDEN") {
          return {
            status: "forbidden",
            message: repoResult.message,
          };
        }

        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid input",
          };
        }

        return { status: "unavailable" };
      }

      // 5. Telemetry
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "marketplace.report.submitted",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            targetType: reportData.targetType,
            targetId: reportData.targetId,
            reason: reportData.reason,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async blockUser(userId, input, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      // 1. Validation
      const parseResult = validateBlockUserInput(input);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
          message: parseResult.errors.join("; "),
        };
      }
      const blockData = parseResult.value;

      // 2. Domain check: cannot block self
      try {
        assertCanBlock(userId, blockData.blockedId);
      } catch (err) {
        if (err instanceof SelfBlockError) {
          return {
            status: "cannot_block_self",
            message: "Users cannot block themselves.",
          };
        }
      }

      // 3. Rate limiting (10 actions/min)
      const rateLimit = await checkSafetyRateLimit(userId, "block_user");
      if (!rateLimit.allowed) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "marketplace.user.blocked",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              blockedId: blockData.blockedId,
              outcome: "rate_limited",
            },
            timestamp: new Date().toISOString(),
          });
        }
        return {
          status: "rate_limited",
          retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
        };
      }

      // 4. Call repository
      const repoResult = await repository.blockUser(blockData);

      if (!repoResult.ok) {
        if (repoResult.code === "CANNOT_BLOCK_SELF") {
          return {
            status: "cannot_block_self",
            message: repoResult.message || "Users cannot block themselves.",
          };
        }

        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }

        if (repoResult.code === "FORBIDDEN") {
          return {
            status: "forbidden",
            message: repoResult.message,
          };
        }

        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid input",
          };
        }

        return { status: "unavailable" };
      }

      // 5. Telemetry
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "marketplace.user.blocked",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            blockedId: blockData.blockedId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async unblockUser(userId, blockedId, context) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      // 1. Validation
      const parseResult = validateBlockedUserId(blockedId);
      if (!parseResult.ok) {
        return {
          status: "invalid",
          fieldErrors: parseResult.fieldErrors,
          message: parseResult.errors.join("; "),
        };
      }
      const validBlockedId = parseResult.value;

      // 2. Rate limiting (10 actions/min)
      const rateLimit = await checkSafetyRateLimit(userId, "unblock_user");
      if (!rateLimit.allowed) {
        if (security?.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "marketplace.user.unblocked",
            correlationId: context?.correlationId,
            metadata: {
              userId,
              blockedId: validBlockedId,
              outcome: "rate_limited",
            },
            timestamp: new Date().toISOString(),
          });
        }
        return {
          status: "rate_limited",
          retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
        };
      }

      // 3. Call repository
      const repoResult = await repository.unblockUser(validBlockedId);

      if (!repoResult.ok) {
        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }

        if (repoResult.code === "FORBIDDEN") {
          return {
            status: "forbidden",
            message: repoResult.message,
          };
        }

        if (repoResult.code === "INVALID_INPUT") {
          return {
            status: "invalid",
            message: repoResult.message || "Invalid input",
          };
        }

        return { status: "unavailable" };
      }

      // 4. Telemetry
      if (security?.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "marketplace.user.unblocked",
          correlationId: context?.correlationId,
          metadata: {
            userId,
            blockedId: validBlockedId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        status: "success",
        data: repoResult.value,
      };
    },

    async getBlockedUsers(userId) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const repoResult = await repository.getBlockedUsers();

      if (!repoResult.ok) {
        if (repoResult.code === "UNAUTHENTICATED") {
          return { status: "unauthenticated" };
        }

        if (repoResult.code === "FORBIDDEN") {
          return {
            status: "forbidden",
            message: repoResult.message,
          };
        }

        return { status: "unavailable" };
      }

      return {
        status: "success",
        data: {
          items: repoResult.value,
        },
      };
    },
  };
}
