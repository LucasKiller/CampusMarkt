import "server-only";

import type {
  AcceptOfferResponse,
  CancelReservationResponse,
  OfferDTO,
  OfferStatus,
  ReservationDTO,
  ReservationStatus,
} from "@campusmarkt/types";
import { isOfferDTO, isReservationDTO } from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "./repository";

export type OffersRepositoryErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CANNOT_NEGOTIATE_OWN_LISTING"
  | "LISTING_NOT_ACTIVE"
  | "LISTING_ALREADY_RESERVED"
  | "INVALID_OFFER_AMOUNT"
  | "OFFER_NOT_PENDING"
  | "RESERVATION_NOT_ACTIVE"
  | "INVALID_INPUT"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type OffersRepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: OffersRepositoryErrorCode; message?: string };

export interface MarketplaceOffersTableQuery {
  eq(column: string, value: unknown): MarketplaceOffersTableQuery;
  or(filters: string): MarketplaceOffersTableQuery;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): MarketplaceOffersTableQuery;
  maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: unknown;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}

export interface MarketplaceOffersTableBuilder {
  select(columns: string): MarketplaceOffersTableQuery;
}

export interface MarketplaceOffersClient extends MarketplaceRpcClient {
  from?(table: string): unknown;
  schema?(schema: string): unknown;
}

export function mapRawOfferRowToDTO(raw: unknown): OfferDTO | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;

  const candidate: Record<string, unknown> = {
    id: row.id,
    listingId: row.listing_id ?? row.listingId,
    buyerId: row.buyer_id ?? row.buyerId,
    sellerId: row.seller_id ?? row.sellerId,
    parentOfferId: row.parent_offer_id ?? row.parentOfferId ?? null,
    amountCents: row.amount_cents ?? row.amountCents,
    message: row.message ?? null,
    status: row.status,
    createdAt:
      row.created_at !== undefined
        ? new Date(String(row.created_at)).toISOString()
        : row.createdAt,
  };

  if (row.updated_at !== undefined || row.updatedAt !== undefined) {
    candidate.updatedAt =
      row.updated_at !== undefined
        ? new Date(String(row.updated_at)).toISOString()
        : row.updatedAt;
  }

  if (!isOfferDTO(candidate)) {
    return null;
  }

  return candidate;
}

export function mapRawReservationRowToDTO(raw: unknown): ReservationDTO | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;

  const candidate: Record<string, unknown> = {
    id: row.id,
    listingId: row.listing_id ?? row.listingId,
    buyerId: row.buyer_id ?? row.buyerId,
    sellerId: row.seller_id ?? row.sellerId,
    offerId: row.offer_id ?? row.offerId ?? null,
    agreedPriceCents: row.agreed_price_cents ?? row.agreedPriceCents,
    status: row.status,
    cancellationReason:
      row.cancellation_reason ?? row.cancellationReason ?? null,
    cancelledBy: row.cancelled_by ?? row.cancelledBy ?? null,
    createdAt:
      row.created_at !== undefined
        ? new Date(String(row.created_at)).toISOString()
        : row.createdAt,
  };

  if (row.updated_at !== undefined || row.updatedAt !== undefined) {
    candidate.updatedAt =
      row.updated_at !== undefined
        ? new Date(String(row.updated_at)).toISOString()
        : row.updatedAt;
  }

  if (!isReservationDTO(candidate)) {
    return null;
  }

  return candidate;
}

function mapDatabaseError(error: unknown): {
  code: OffersRepositoryErrorCode;
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
    message.includes("LISTING_NOT_FOUND") ||
    message.includes("OFFER_NOT_FOUND") ||
    message.includes("RESERVATION_NOT_FOUND") ||
    message.includes("not found")
  ) {
    return { code: "NOT_FOUND", message };
  }

  if (
    err.code === "P0003" ||
    message.includes("CANNOT_NEGOTIATE_OWN_LISTING")
  ) {
    return { code: "CANNOT_NEGOTIATE_OWN_LISTING", message };
  }

  if (message.includes("LISTING_NOT_ACTIVE")) {
    return { code: "LISTING_NOT_ACTIVE", message };
  }

  if (err.code === "P0005" || message.includes("INVALID_OFFER_AMOUNT")) {
    return { code: "INVALID_OFFER_AMOUNT", message };
  }

  if (
    err.code === "P0006" ||
    err.code === "42501" ||
    message.includes("FORBIDDEN") ||
    message.includes("permission denied")
  ) {
    return { code: "FORBIDDEN", message };
  }

  if (err.code === "P0007" || message.includes("OFFER_NOT_PENDING")) {
    return { code: "OFFER_NOT_PENDING", message };
  }

  if (
    err.code === "P0008" ||
    err.code === "23505" ||
    message.includes("LISTING_ALREADY_RESERVED") ||
    message.includes("idx_one_active_reservation_per_listing")
  ) {
    return { code: "LISTING_ALREADY_RESERVED", message };
  }

  if (err.code === "P0009" || message.includes("RESERVATION_NOT_ACTIVE")) {
    return { code: "RESERVATION_NOT_ACTIVE", message };
  }

  if (
    err.code === "P0004" ||
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

function getMarketplaceTable(
  client: MarketplaceOffersClient,
  table: string,
): MarketplaceOffersTableBuilder {
  if (typeof client.schema === "function") {
    const s = client.schema("marketplace") as
      { from?(t: string): MarketplaceOffersTableBuilder } | undefined;
    if (s && typeof s.from === "function") {
      return s.from(table) as MarketplaceOffersTableBuilder;
    }
  }
  if (typeof client.from === "function") {
    return client.from(table) as MarketplaceOffersTableBuilder;
  }
  throw new Error("Client does not support table querying via .from()");
}

export function createMarketplaceOffersRepository(clients: {
  service: MarketplaceOffersClient;
}) {
  const { service } = clients;

  return {
    async createOffer(
      listingId: string,
      amountCents: number,
      message?: string | null,
    ): Promise<
      OffersRepositoryResult<{
        offerId: string;
        listingId: string;
        amountCents: number;
        status: OfferStatus;
      }>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "create_offer",
          {
            p_listing_id: listingId,
            p_amount_cents: amountCents,
            p_message: message ?? null,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        const res = data as Record<string, unknown>;
        if (
          !res ||
          typeof res.offerId !== "string" ||
          typeof res.listingId !== "string" ||
          typeof res.amountCents !== "number" ||
          typeof res.status !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "create_offer RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            offerId: res.offerId,
            listingId: res.listingId,
            amountCents: res.amountCents,
            status: res.status as OfferStatus,
          },
        };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: createOffer]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async counterOffer(
      parentOfferId: string,
      amountCents: number,
      message?: string | null,
    ): Promise<
      OffersRepositoryResult<{
        offerId: string;
        parentOfferId: string;
        listingId: string;
        amountCents: number;
        status: OfferStatus;
      }>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "counter_offer",
          {
            p_parent_offer_id: parentOfferId,
            p_amount_cents: amountCents,
            p_message: message ?? null,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        const res = data as Record<string, unknown>;
        if (
          !res ||
          typeof res.offerId !== "string" ||
          typeof res.parentOfferId !== "string" ||
          typeof res.listingId !== "string" ||
          typeof res.amountCents !== "number" ||
          typeof res.status !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "counter_offer RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            offerId: res.offerId,
            parentOfferId: res.parentOfferId,
            listingId: res.listingId,
            amountCents: res.amountCents,
            status: res.status as OfferStatus,
          },
        };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: counterOffer]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async acceptOffer(
      offerId: string,
    ): Promise<OffersRepositoryResult<AcceptOfferResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "accept_offer",
          {
            p_offer_id: offerId,
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
          typeof res.status !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "accept_offer RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            reservationId: res.reservationId,
            listingId: res.listingId,
            agreedPriceCents: res.agreedPriceCents,
            status: res.status as ReservationStatus,
          },
        };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: acceptOffer]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async cancelReservation(
      reservationId: string,
      reason: string,
    ): Promise<OffersRepositoryResult<CancelReservationResponse>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "cancel_reservation",
          {
            p_reservation_id: reservationId,
            p_reason: reason,
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
          typeof res.status !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "cancel_reservation RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            reservationId: res.reservationId,
            listingId: res.listingId,
            status: res.status as ReservationStatus,
          },
        };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: cancelReservation]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async declineOffer(
      offerId: string,
    ): Promise<
      OffersRepositoryResult<{ offerId: string; status: OfferStatus }>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "decline_offer",
          {
            p_offer_id: offerId,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        const res = data as Record<string, unknown>;
        if (
          !res ||
          typeof res.offerId !== "string" ||
          typeof res.status !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "decline_offer RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            offerId: res.offerId,
            status: res.status as OfferStatus,
          },
        };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: declineOffer]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async withdrawOffer(
      offerId: string,
    ): Promise<
      OffersRepositoryResult<{ offerId: string; status: OfferStatus }>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "withdraw_offer",
          {
            p_offer_id: offerId,
          },
        );

        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        const res = data as Record<string, unknown>;
        if (
          !res ||
          typeof res.offerId !== "string" ||
          typeof res.status !== "string"
        ) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "withdraw_offer RPC returned unexpected format",
          };
        }

        return {
          ok: true,
          value: {
            offerId: res.offerId,
            status: res.status as OfferStatus,
          },
        };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: withdrawOffer]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getOffersForListing(
      listingId: string,
    ): Promise<OffersRepositoryResult<OfferDTO[]>> {
      try {
        const query = getMarketplaceTable(service, "offers")
          .select("*")
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Expected array of offers",
          };
        }

        const items: OfferDTO[] = [];
        for (const raw of data) {
          const dto = mapRawOfferRowToDTO(raw);
          if (!dto) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid offer record format",
            };
          }
          items.push(dto);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error(
          "[MarketplaceOffersRepository: getOffersForListing]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getOfferById(
      offerId: string,
    ): Promise<OffersRepositoryResult<OfferDTO | null>> {
      try {
        const query = getMarketplaceTable(service, "offers")
          .select("*")
          .eq("id", offerId)
          .maybeSingle();

        const { data, error } = await query;
        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!data) {
          return { ok: true, value: null };
        }

        const dto = mapRawOfferRowToDTO(data);
        if (!dto) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Invalid offer record format",
          };
        }

        return { ok: true, value: dto };
      } catch (err) {
        console.error("[MarketplaceOffersRepository: getOfferById]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getActiveReservationForListing(
      listingId: string,
    ): Promise<OffersRepositoryResult<ReservationDTO | null>> {
      try {
        const query = getMarketplaceTable(service, "reservations")
          .select("*")
          .eq("listing_id", listingId)
          .eq("status", "active")
          .maybeSingle();

        const { data, error } = await query;
        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!data) {
          return { ok: true, value: null };
        }

        const dto = mapRawReservationRowToDTO(data);
        if (!dto) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Invalid reservation record format",
          };
        }

        return { ok: true, value: dto };
      } catch (err) {
        console.error(
          "[MarketplaceOffersRepository: getActiveReservationForListing]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getUserReservations(
      userId: string,
    ): Promise<OffersRepositoryResult<ReservationDTO[]>> {
      try {
        const query = getMarketplaceTable(service, "reservations")
          .select("*")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) {
          return { ok: false, ...mapDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Expected array of reservations",
          };
        }

        const items: ReservationDTO[] = [];
        for (const raw of data) {
          const dto = mapRawReservationRowToDTO(raw);
          if (!dto) {
            return {
              ok: false,
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Invalid reservation record format",
            };
          }
          items.push(dto);
        }

        return { ok: true, value: items };
      } catch (err) {
        console.error(
          "[MarketplaceOffersRepository: getUserReservations]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}

export type MarketplaceOffersRepository = ReturnType<
  typeof createMarketplaceOffersRepository
>;
