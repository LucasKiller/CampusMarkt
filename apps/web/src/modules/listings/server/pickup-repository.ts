import "server-only";

import type {
  PublicProfileDTO,
  TransactionReceiptDTO,
} from "@campusmarkt/types";
import { isTransactionReceiptDTO } from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "./repository";

export type PickupRepositoryErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RESERVATION_NOT_ACTIVE"
  | "RESERVATION_ALREADY_COMPLETED"
  | "INVALID_INPUT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type PickupRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: PickupRepositoryErrorCode; message?: string };

export interface CompletePickupResult {
  reservationId: string;
  listingId: string;
  status: "completed";
  agreedPriceCents: number;
  completedAt: string;
}

export function mapRawTransactionReceiptDTO(
  raw: unknown,
): TransactionReceiptDTO | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const partnerRaw = row.partner as Record<string, unknown> | undefined;

  let partner: PublicProfileDTO | null = null;
  if (partnerRaw && typeof partnerRaw === "object") {
    partner = {
      id: String(partnerRaw.id ?? partnerRaw.auth_user_id ?? ""),
      displayName: String(
        partnerRaw.displayName ?? partnerRaw.display_name ?? "CampusMarkt User",
      ),
      avatarUrl: (partnerRaw.avatarUrl ?? partnerRaw.avatar_url ?? null) as
        string | null,
      universityBadge: (partnerRaw.universityBadge ??
        partnerRaw.university_badge ??
        null) as PublicProfileDTO["universityBadge"],
    };
  }

  const completedAtRaw = row.completedAt ?? row.completed_at ?? row.updated_at;
  let completedAt: string | undefined;
  if (completedAtRaw !== undefined && completedAtRaw !== null) {
    const parsed = new Date(String(completedAtRaw));
    if (!Number.isNaN(parsed.getTime())) {
      completedAt = parsed.toISOString();
    }
  }

  const candidate: Record<string, unknown> = {
    reservationId: row.reservationId ?? row.reservation_id,
    listingId: row.listingId ?? row.listing_id,
    listingTitle: row.listingTitle ?? row.listing_title ?? row.title,
    listingType: row.listingType ?? row.listing_type,
    agreedPriceCents: row.agreedPriceCents ?? row.agreed_price_cents,
    status: row.status,
    partner,
    pickupArea: row.pickupArea ?? row.pickup_area,
    completedAt,
    completionNote: row.completionNote ?? row.completion_note ?? null,
  };

  if (row.role === "buyer" || row.role === "seller") {
    candidate.role = row.role;
  }

  if (!isTransactionReceiptDTO(candidate)) {
    return null;
  }

  return candidate;
}

function mapDatabaseError(error: unknown): {
  code: PickupRepositoryErrorCode;
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (
    err.code === "P0001" ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("unauthenticated")
  ) {
    return { code: "UNAUTHENTICATED", message };
  }

  if (
    err.code === "P0002" ||
    message.includes("RESERVATION_NOT_FOUND") ||
    message.includes("not found")
  ) {
    return { code: "NOT_FOUND", message };
  }

  if (
    err.code === "P0003" ||
    err.code === "42501" ||
    message.includes("FORBIDDEN") ||
    message.includes("permission denied")
  ) {
    return { code: "FORBIDDEN", message };
  }

  if (message.includes("RESERVATION_ALREADY_COMPLETED")) {
    return { code: "RESERVATION_ALREADY_COMPLETED", message };
  }

  if (err.code === "P0004" || message.includes("RESERVATION_NOT_ACTIVE")) {
    return { code: "RESERVATION_NOT_ACTIVE", message };
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

export function createMarketplacePickupRepository(clients: {
  service: MarketplaceRpcClient;
}) {
  const { service } = clients;

  return {
    async completePickup(
      reservationId: string,
      completionNote?: string | null,
    ): Promise<PickupRepositoryResult<CompletePickupResult>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "complete_pickup",
          {
            p_reservation_id: reservationId,
            p_completion_note: completionNote ?? null,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        const res = data as Record<string, unknown>;
        if (
          !res ||
          typeof res.reservationId !== "string" ||
          typeof res.listingId !== "string" ||
          typeof res.agreedPriceCents !== "number" ||
          res.status !== "completed" ||
          typeof res.completedAt !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "complete_pickup RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            reservationId: res.reservationId,
            listingId: res.listingId,
            status: "completed",
            agreedPriceCents: res.agreedPriceCents,
            completedAt: new Date(String(res.completedAt)).toISOString(),
          },
        };
      } catch (err) {
        console.error("[MarketplacePickupRepository: completePickup]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getCompletedTransactions(
      limit: number = 50,
    ): Promise<PickupRepositoryResult<TransactionReceiptDTO[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_completed_transactions",
          {
            p_limit: limit,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Expected array of completed transactions",
          };
        }

        const items: TransactionReceiptDTO[] = [];
        for (const raw of data) {
          const dto = mapRawTransactionReceiptDTO(raw);
          if (!dto) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid transaction receipt record format",
            };
          }
          items.push(dto);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error(
          "[MarketplacePickupRepository: getCompletedTransactions]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export type MarketplacePickupRepository = ReturnType<
  typeof createMarketplacePickupRepository
>;
