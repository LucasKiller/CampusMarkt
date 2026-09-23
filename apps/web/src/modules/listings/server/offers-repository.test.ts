import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createMarketplaceOffersRepository,
  mapRawOfferRowToDTO,
  mapRawReservationRowToDTO,
} from "./offers-repository";
import type { MarketplaceOffersClient } from "./offers-repository";

function mockClient(
  rpcData: unknown = null,
  rpcError: unknown = null,
  tableData: unknown = null,
  tableError: unknown = null,
) {
  const rpcCalls: Array<{
    functionName: string;
    arguments_?: Record<string, unknown>;
  }> = [];

  const rpc: MarketplaceOffersClient["rpc"] = async (
    functionName,
    arguments_,
  ) => {
    rpcCalls.push({ functionName, arguments_ });
    return { data: rpcData, error: rpcError };
  };

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: tableData,
      error: tableError,
    })),
    then: (
      resolve?: ((value: { data: unknown; error: unknown }) => unknown) | null,
    ) => Promise.resolve({ data: tableData, error: tableError }).then(resolve),
  };

  const from = vi.fn().mockReturnValue(queryBuilder);
  const schema = vi.fn().mockReturnValue({ rpc, from });

  const client: MarketplaceOffersClient = {
    rpc,
    schema,
    from,
  };

  return { client, rpcCalls, queryBuilder, from };
}

describe("MarketplaceOffersRepository", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  const offerId = "22222222-2222-4222-8222-222222222222";
  const reservationId = "33333333-3333-4333-8333-333333333333";
  const buyerId = "44444444-4444-4444-8444-444444444444";
  const sellerId = "55555555-5555-4555-8555-555555555555";

  describe("createOffer", () => {
    it("calls create_offer RPC and returns success payload", async () => {
      const mockResult = {
        offerId,
        listingId,
        amountCents: 2500,
        status: "pending",
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.createOffer(listingId, 2500, "Interested!");

      expect(result).toEqual({ ok: true, value: mockResult });
      expect(rpcCalls).toEqual([
        {
          functionName: "create_offer",
          arguments_: {
            p_listing_id: listingId,
            p_amount_cents: 2500,
            p_message: "Interested!",
          },
        },
      ]);
    });

    it("maps UNAUTHENTICATED error", async () => {
      const { client } = mockClient(null, {
        code: "P0001",
        message: "UNAUTHENTICATED",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.createOffer(listingId, 2500);
      expect(result).toEqual({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "UNAUTHENTICATED",
      });
    });

    it("maps CANNOT_NEGOTIATE_OWN_LISTING error", async () => {
      const { client } = mockClient(null, {
        code: "P0003",
        message: "CANNOT_NEGOTIATE_OWN_LISTING",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.createOffer(listingId, 2500);
      expect(result).toEqual({
        ok: false,
        code: "CANNOT_NEGOTIATE_OWN_LISTING",
        message: "CANNOT_NEGOTIATE_OWN_LISTING",
      });
    });

    it("maps LISTING_NOT_ACTIVE error", async () => {
      const { client } = mockClient(null, {
        code: "P0004",
        message: "LISTING_NOT_ACTIVE",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.createOffer(listingId, 2500);
      expect(result).toEqual({
        ok: false,
        code: "LISTING_NOT_ACTIVE",
        message: "LISTING_NOT_ACTIVE",
      });
    });

    it("maps INVALID_OFFER_AMOUNT error", async () => {
      const { client } = mockClient(null, {
        code: "P0005",
        message: "INVALID_OFFER_AMOUNT",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.createOffer(listingId, 99999);
      expect(result).toEqual({
        ok: false,
        code: "INVALID_OFFER_AMOUNT",
        message: "INVALID_OFFER_AMOUNT",
      });
    });
  });

  describe("counterOffer", () => {
    it("calls counter_offer RPC and returns counter proposal", async () => {
      const mockResult = {
        offerId: "66666666-6666-4666-8666-666666666666",
        parentOfferId: offerId,
        listingId,
        amountCents: 3000,
        status: "pending",
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.counterOffer(offerId, 3000, "Can do 30?");

      expect(result).toEqual({ ok: true, value: mockResult });
      expect(rpcCalls).toEqual([
        {
          functionName: "counter_offer",
          arguments_: {
            p_parent_offer_id: offerId,
            p_amount_cents: 3000,
            p_message: "Can do 30?",
          },
        },
      ]);
    });

    it("maps FORBIDDEN error", async () => {
      const { client } = mockClient(null, {
        code: "P0006",
        message: "FORBIDDEN",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.counterOffer(offerId, 3000);
      expect(result).toEqual({
        ok: false,
        code: "FORBIDDEN",
        message: "FORBIDDEN",
      });
    });
  });

  describe("acceptOffer", () => {
    it("calls accept_offer RPC and returns reservation response", async () => {
      const mockResult = {
        reservationId,
        listingId,
        agreedPriceCents: 2500,
        status: "active",
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.acceptOffer(offerId);

      expect(result).toEqual({ ok: true, value: mockResult });
      expect(rpcCalls).toEqual([
        {
          functionName: "accept_offer",
          arguments_: {
            p_offer_id: offerId,
          },
        },
      ]);
    });

    it("maps LISTING_ALREADY_RESERVED error", async () => {
      const { client } = mockClient(null, {
        code: "P0008",
        message: "LISTING_ALREADY_RESERVED",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.acceptOffer(offerId);
      expect(result).toEqual({
        ok: false,
        code: "LISTING_ALREADY_RESERVED",
        message: "LISTING_ALREADY_RESERVED",
      });
    });
  });

  describe("cancelReservation", () => {
    it("calls cancel_reservation RPC and returns cancellation response", async () => {
      const mockResult = {
        reservationId,
        listingId,
        status: "cancelled",
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.cancelReservation(reservationId, "no_show");

      expect(result).toEqual({ ok: true, value: mockResult });
      expect(rpcCalls).toEqual([
        {
          functionName: "cancel_reservation",
          arguments_: {
            p_reservation_id: reservationId,
            p_reason: "no_show",
          },
        },
      ]);
    });

    it("maps RESERVATION_NOT_ACTIVE error", async () => {
      const { client } = mockClient(null, {
        code: "P0009",
        message: "RESERVATION_NOT_ACTIVE",
      });
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.cancelReservation(
        reservationId,
        "changed_mind",
      );
      expect(result).toEqual({
        ok: false,
        code: "RESERVATION_NOT_ACTIVE",
        message: "RESERVATION_NOT_ACTIVE",
      });
    });
  });

  describe("declineOffer and withdrawOffer", () => {
    it("calls decline_offer RPC", async () => {
      const mockResult = { offerId, status: "declined" };
      const { client } = mockClient(mockResult);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.declineOffer(offerId);
      expect(result).toEqual({ ok: true, value: mockResult });
    });

    it("calls withdraw_offer RPC", async () => {
      const mockResult = { offerId, status: "withdrawn" };
      const { client } = mockClient(mockResult);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.withdrawOffer(offerId);
      expect(result).toEqual({ ok: true, value: mockResult });
    });
  });

  describe("DTO mappers", () => {
    it("maps valid raw database offer row to typed OfferDTO", () => {
      const raw = {
        id: offerId,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        parent_offer_id: null,
        amount_cents: 2000,
        message: "Hello",
        status: "pending",
        created_at: "2026-09-23T18:00:00.000Z",
        updated_at: "2026-09-23T18:05:00.000Z",
      };

      const dto = mapRawOfferRowToDTO(raw);
      expect(dto).not.toBeNull();
      expect(dto).toEqual({
        id: offerId,
        listingId,
        buyerId,
        sellerId,
        parentOfferId: null,
        amountCents: 2000,
        message: "Hello",
        status: "pending",
        createdAt: "2026-09-23T18:00:00.000Z",
        updatedAt: "2026-09-23T18:05:00.000Z",
      });
    });

    it("maps valid raw database reservation row to typed ReservationDTO", () => {
      const raw = {
        id: reservationId,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        offer_id: offerId,
        agreed_price_cents: 2000,
        status: "active",
        cancellation_reason: null,
        cancelled_by: null,
        created_at: "2026-09-23T18:00:00.000Z",
      };

      const dto = mapRawReservationRowToDTO(raw);
      expect(dto).not.toBeNull();
      expect(dto).toEqual({
        id: reservationId,
        listingId,
        buyerId,
        sellerId,
        offerId,
        agreedPriceCents: 2000,
        status: "active",
        cancellationReason: null,
        cancelledBy: null,
        createdAt: "2026-09-23T18:00:00.000Z",
      });
    });

    it("returns null for malformed raw rows", () => {
      expect(mapRawOfferRowToDTO(null)).toBeNull();
      expect(mapRawOfferRowToDTO({ id: "invalid-uuid" })).toBeNull();
      expect(mapRawReservationRowToDTO(null)).toBeNull();
      expect(mapRawReservationRowToDTO({ id: "invalid-uuid" })).toBeNull();
    });
  });

  describe("table queries", () => {
    it("getOffersForListing retrieves and maps offers", async () => {
      const rawOffers = [
        {
          id: offerId,
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          amount_cents: 2000,
          message: null,
          status: "pending",
          created_at: "2026-09-23T18:00:00.000Z",
        },
      ];
      const { client } = mockClient(null, null, rawOffers);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.getOffersForListing(listingId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].id).toBe(offerId);
      }
    });

    it("getActiveReservationForListing retrieves active reservation", async () => {
      const rawReservation = {
        id: reservationId,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: sellerId,
        offer_id: offerId,
        agreed_price_cents: 2000,
        status: "active",
        created_at: "2026-09-23T18:00:00.000Z",
      };
      const { client } = mockClient(null, null, rawReservation);
      const repo = createMarketplaceOffersRepository({ service: client });

      const result = await repo.getActiveReservationForListing(listingId);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.id).toBe(reservationId);
      }
    });
  });
});
