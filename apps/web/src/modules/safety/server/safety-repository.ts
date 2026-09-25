import "server-only";

import type {
  BlockUserRequest,
  BlockUserResponse,
  CreateReportRequest,
  ReportConfirmationDTO,
  UnblockUserResponse,
  UserBlockDTO,
} from "@campusmarkt/types";
import { isReportConfirmationDTO, isUserBlockDTO } from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "../../listings/server/repository";
export type { MarketplaceRpcClient };

export type MarketplaceSafetyErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CANNOT_REPORT_SELF"
  | "CANNOT_BLOCK_SELF"
  | "REPORT_ALREADY_PENDING"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type MarketplaceSafetyResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MarketplaceSafetyErrorCode; message?: string };

export interface MarketplaceSafetyRepository {
  submitReport(
    request: CreateReportRequest,
  ): Promise<MarketplaceSafetyResult<ReportConfirmationDTO>>;
  blockUser(
    request: BlockUserRequest,
  ): Promise<MarketplaceSafetyResult<BlockUserResponse>>;
  unblockUser(
    blockedId: string,
  ): Promise<MarketplaceSafetyResult<UnblockUserResponse>>;
  getBlockedUsers(): Promise<MarketplaceSafetyResult<UserBlockDTO[]>>;
}

export type MarketplaceSafetyClient =
  MarketplaceRpcClient | { service: MarketplaceRpcClient };

function getClient(
  clientOrClients: MarketplaceSafetyClient,
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

export function mapSafetyDatabaseError(error: unknown): {
  code: MarketplaceSafetyErrorCode;
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (err.code === "P0001" || message.includes("UNAUTHENTICATED")) {
    return { code: "UNAUTHENTICATED", message };
  }

  if (message.includes("CANNOT_REPORT_SELF")) {
    return { code: "CANNOT_REPORT_SELF", message };
  }

  if (message.includes("CANNOT_BLOCK_SELF")) {
    return { code: "CANNOT_BLOCK_SELF", message };
  }

  if (err.code === "P0004" || message.includes("REPORT_ALREADY_PENDING")) {
    return { code: "REPORT_ALREADY_PENDING", message };
  }

  if (err.code === "P0003" || message.includes("LISTING_NOT_FOUND")) {
    return { code: "NOT_FOUND", message };
  }

  if (
    err.code === "42501" ||
    message.includes("not authorized") ||
    message.includes("permission denied")
  ) {
    return { code: "FORBIDDEN", message };
  }

  if (
    err.code === "P0005" ||
    err.code === "22023" ||
    err.code === "22P02" ||
    message.includes("INVALID_INPUT") ||
    message.includes("invalid")
  ) {
    return { code: "INVALID_INPUT", message };
  }

  return { code: "DEPENDENCY_UNAVAILABLE", message };
}

export function createMarketplaceSafetyRepository(
  clientOrClients: MarketplaceSafetyClient,
): MarketplaceSafetyRepository {
  const client = getClient(clientOrClients);

  return {
    async submitReport(
      request: CreateReportRequest,
    ): Promise<MarketplaceSafetyResult<ReportConfirmationDTO>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "submit_report",
          {
            p_target_type: request.targetType,
            p_target_id: request.targetId,
            p_reason: request.reason,
            p_details: request.details ?? null,
          },
        );

        if (error) {
          return { ok: false, ...mapSafetyDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (!res || typeof res !== "object") {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "submit_report RPC returned non-object response",
          };
        }

        let createdAt: string;
        try {
          createdAt = new Date(String(res.createdAt)).toISOString();
        } catch {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Invalid createdAt in submit_report response",
          };
        }

        const candidate = {
          reportId: res.reportId,
          status: res.status,
          createdAt,
        };

        if (!isReportConfirmationDTO(candidate)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "submit_report RPC returned unexpected format",
          };
        }

        return { ok: true, value: candidate };
      } catch (err) {
        console.error("[MarketplaceSafetyRepository: submitReport]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async blockUser(
      request: BlockUserRequest,
    ): Promise<MarketplaceSafetyResult<BlockUserResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(client, "block_user", {
          p_blocked_id: request.blockedId,
        });

        if (error) {
          return { ok: false, ...mapSafetyDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (!res || typeof res !== "object") {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "block_user RPC returned non-object response",
          };
        }

        let createdAt: string;
        try {
          createdAt = new Date(String(res.createdAt)).toISOString();
        } catch {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Invalid createdAt in block_user response",
          };
        }

        if (
          typeof res.blockId !== "string" ||
          typeof res.blockedId !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "block_user RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            blockId: res.blockId,
            blockedId: res.blockedId,
            createdAt,
          },
        };
      } catch (err) {
        console.error("[MarketplaceSafetyRepository: blockUser]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async unblockUser(
      blockedId: string,
    ): Promise<MarketplaceSafetyResult<UnblockUserResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "unblock_user",
          {
            p_blocked_id: blockedId,
          },
        );

        if (error) {
          return { ok: false, ...mapSafetyDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (
          !res ||
          typeof res !== "object" ||
          typeof res.unblockedId !== "string" ||
          typeof res.success !== "boolean"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "unblock_user RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            unblockedId: res.unblockedId,
            success: res.success,
          },
        };
      } catch (err) {
        console.error("[MarketplaceSafetyRepository: unblockUser]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getBlockedUsers(): Promise<MarketplaceSafetyResult<UserBlockDTO[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          client,
          "get_blocked_users",
          {},
        );

        if (error) {
          return { ok: false, ...mapSafetyDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "get_blocked_users RPC returned non-array",
          };
        }

        const items: UserBlockDTO[] = [];
        for (const item of data) {
          if (isUserBlockDTO(item)) {
            items.push(item);
          } else {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid item in get_blocked_users response",
            };
          }
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error("[MarketplaceSafetyRepository: getBlockedUsers]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}
