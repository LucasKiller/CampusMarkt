import "server-only";

import type {
  ExecuteModerationActionResponse,
  ModerationActionDTO,
  ModerationActionType,
  ModerationQueueItemDTO,
  ReportStatus,
  ReportTargetType,
} from "@campusmarkt/types";
import {
  isModerationActionDTO,
  isModerationQueueItemDTO,
} from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "../../listings/server/repository";
export type { MarketplaceRpcClient };

export type MarketplaceModerationErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_INPUT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type MarketplaceModerationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MarketplaceModerationErrorCode; message?: string };

export interface MarketplaceModerationRepository {
  isModerator(userId?: string): Promise<MarketplaceModerationResult<boolean>>;
  getModerationQueue(): Promise<
    MarketplaceModerationResult<ModerationQueueItemDTO[]>
  >;
  dismissReport(
    reportId: string,
    reason: string,
  ): Promise<MarketplaceModerationResult<ExecuteModerationActionResponse>>;
  removeListing(
    listingId: string,
    reason: string,
    reportId?: string | null,
  ): Promise<MarketplaceModerationResult<ExecuteModerationActionResponse>>;
  suspendUser(
    userId: string,
    reason: string,
    reportId?: string | null,
  ): Promise<MarketplaceModerationResult<ExecuteModerationActionResponse>>;
  getAuditLog(
    limit?: number,
    offset?: number,
  ): Promise<MarketplaceModerationResult<ModerationActionDTO[]>>;
}

export type MarketplaceModerationClient =
  MarketplaceRpcClient | { service: MarketplaceRpcClient };

function getClient(
  clientOrClients: MarketplaceModerationClient,
): MarketplaceRpcClient {
  if ("service" in clientOrClients && clientOrClients.service) {
    return clientOrClients.service;
  }
  return clientOrClients as MarketplaceRpcClient;
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

export function mapModerationDatabaseError(error: unknown): {
  code: MarketplaceModerationErrorCode;
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (message.includes("UNAUTHENTICATED")) {
    return { code: "UNAUTHENTICATED", message };
  }

  if (
    err.code === "P0001" ||
    err.code === "42501" ||
    message.includes("FORBIDDEN") ||
    message.includes("not authorized") ||
    message.includes("permission denied")
  ) {
    return { code: "FORBIDDEN", message };
  }

  if (
    err.code === "P0002" ||
    err.code === "P0004" ||
    message.includes("REPORT_NOT_FOUND") ||
    message.includes("LISTING_NOT_FOUND") ||
    message.includes("USER_NOT_FOUND")
  ) {
    return { code: "NOT_FOUND", message };
  }

  if (err.code === "P0003" || message.includes("REPORT_ALREADY_RESOLVED")) {
    return { code: "CONFLICT", message };
  }

  if (
    err.code === "P0005" ||
    err.code === "22023" ||
    err.code === "22P02" ||
    message.includes("INVALID_JUSTIFICATION") ||
    message.includes("INVALID_INPUT") ||
    message.includes("invalid")
  ) {
    return { code: "INVALID_INPUT", message };
  }

  return { code: "DEPENDENCY_UNAVAILABLE", message };
}

export function createMarketplaceModerationRepository(
  clientOrClients: MarketplaceModerationClient,
): MarketplaceModerationRepository {
  const client = getClient(clientOrClients);

  return {
    async isModerator(
      userId?: string,
    ): Promise<MarketplaceModerationResult<boolean>> {
      try {
        const args = userId ? { p_user_id: userId } : {};
        const { data, error } = await callMarketplaceRpc(
          client,
          "is_moderator",
          args,
        );

        if (error) {
          return { ok: false, ...mapModerationDatabaseError(error) };
        }

        return { ok: true, value: Boolean(data) };
      } catch (err) {
        console.error("[MarketplaceModerationRepository: isModerator]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getModerationQueue(): Promise<
      MarketplaceModerationResult<ModerationQueueItemDTO[]>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "get_moderation_queue",
          {},
        );

        if (error) {
          return { ok: false, ...mapModerationDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "get_moderation_queue RPC returned non-array response",
          };
        }

        const items: ModerationQueueItemDTO[] = [];
        for (const raw of data) {
          if (!raw || typeof raw !== "object") {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid item in get_moderation_queue response",
            };
          }

          const record = raw as Record<string, unknown>;
          let createdAt: string;
          try {
            createdAt = new Date(String(record.createdAt)).toISOString();
          } catch {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid createdAt in queue item",
            };
          }

          const candidate: ModerationQueueItemDTO = {
            id: String(record.id),
            targetType: record.targetType as ReportTargetType,
            targetId: String(record.targetId),
            reason: String(record.reason),
            status: record.status as ReportStatus,
            createdAt,
          };

          if (record.reporterId) {
            candidate.reporterId = String(record.reporterId);
          }
          if (record.details) {
            candidate.details = String(record.details);
          }
          if (record.listingTitle) {
            candidate.listingTitle = String(record.listingTitle);
          }
          if (record.listingStatus) {
            candidate.listingStatus = String(record.listingStatus);
          }
          if (record.userName) {
            candidate.userName = String(record.userName);
          }

          if (!isModerationQueueItemDTO(candidate)) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Moderation queue item failed DTO validation",
            };
          }

          items.push(candidate);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error(
          "[MarketplaceModerationRepository: getModerationQueue]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async dismissReport(
      reportId: string,
      reason: string,
    ): Promise<MarketplaceModerationResult<ExecuteModerationActionResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "dismiss_report",
          {
            p_report_id: reportId,
            p_reason: reason,
          },
        );

        if (error) {
          return { ok: false, ...mapModerationDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (!res || typeof res !== "object" || typeof res.status !== "string") {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "dismiss_report returned invalid format",
          };
        }

        return {
          ok: true,
          value: {
            success: Boolean(res.success),
            status: String(res.status),
          },
        };
      } catch (err) {
        console.error("[MarketplaceModerationRepository: dismissReport]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async removeListing(
      listingId: string,
      reason: string,
      reportId?: string | null,
    ): Promise<MarketplaceModerationResult<ExecuteModerationActionResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "remove_listing_moderator",
          {
            p_report_id: reportId ?? null,
            p_listing_id: listingId,
            p_reason: reason,
          },
        );

        if (error) {
          return { ok: false, ...mapModerationDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (!res || typeof res !== "object" || typeof res.status !== "string") {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "remove_listing_moderator returned invalid format",
          };
        }

        return {
          ok: true,
          value: {
            success: Boolean(res.success),
            status: String(res.status),
          },
        };
      } catch (err) {
        console.error("[MarketplaceModerationRepository: removeListing]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async suspendUser(
      userId: string,
      reason: string,
      reportId?: string | null,
    ): Promise<MarketplaceModerationResult<ExecuteModerationActionResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "suspend_user_moderator",
          {
            p_report_id: reportId ?? null,
            p_user_id: userId,
            p_reason: reason,
          },
        );

        if (error) {
          return { ok: false, ...mapModerationDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (!res || typeof res !== "object" || typeof res.status !== "string") {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "suspend_user_moderator returned invalid format",
          };
        }

        return {
          ok: true,
          value: {
            success: Boolean(res.success),
            status: String(res.status),
          },
        };
      } catch (err) {
        console.error("[MarketplaceModerationRepository: suspendUser]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getAuditLog(
      limit?: number,
      offset?: number,
    ): Promise<MarketplaceModerationResult<ModerationActionDTO[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "get_moderation_audit_log",
          {
            p_limit: limit ?? 50,
            p_offset: offset ?? 0,
          },
        );

        if (error) {
          return { ok: false, ...mapModerationDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "get_moderation_audit_log returned non-array response",
          };
        }

        const items: ModerationActionDTO[] = [];
        for (const raw of data) {
          if (!raw || typeof raw !== "object") {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid item in get_moderation_audit_log response",
            };
          }

          const record = raw as Record<string, unknown>;
          let createdAt: string;
          try {
            createdAt = new Date(String(record.createdAt)).toISOString();
          } catch {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid createdAt in audit log item",
            };
          }

          const candidate: ModerationActionDTO = {
            id: String(record.id),
            moderatorId: String(record.moderatorId),
            actionType: record.actionType as ModerationActionType,
            targetType: String(record.targetType),
            targetId: String(record.targetId),
            reason: String(record.reason),
            createdAt,
          };

          if (record.reportId) {
            candidate.reportId = String(record.reportId);
          }

          if (!isModerationActionDTO(candidate)) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Audit action item failed DTO validation",
            };
          }

          items.push(candidate);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error("[MarketplaceModerationRepository: getAuditLog]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}
