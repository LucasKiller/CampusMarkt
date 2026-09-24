import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createMarketplacePickupRepository,
  mapRawTransactionReceiptDTO,
} from "./pickup-repository";
import type { MarketplaceRpcClient } from "./repository";

function mockClient(rpcData: unknown = null, rpcError: unknown = null) {
  const rpcCalls: Array<{
    functionName: string;
    arguments_?: Record<string, unknown>;
  }> = [];

  const rpc: MarketplaceRpcClient["rpc"] = async (functionName, arguments_) => {
    rpcCalls.push({ functionName, arguments_ });
    return { data: rpcData, error: rpcError };
  };

  const schema = vi.fn().mockReturnValue({ rpc });

  const client: MarketplaceRpcClient = {
    rpc,
    schema,
  };

  return { client, rpcCalls, schema };
}

describe("MarketplacePickupRepository", () => {
  const reservationId = "33333333-3333-4333-8333-333333333333";
  const listingId = "11111111-1111-4111-8111-111111111111";
  const buyerId = "44444444-4444-4444-8444-444444444444";
  const sellerId = "55555555-5555-4555-8555-555555555555";

  describe("completePickup", () => {
    it("calls complete_pickup RPC and returns success payload", async () => {
      const mockResult = {
        reservationId,
        listingId,
        status: "completed",
        agreedPriceCents: 3500,
        completedAt: "2026-09-25T10:00:00.000Z",
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId, "All good!");

      expect(result).toEqual({ ok: true, value: mockResult });
      expect(rpcCalls).toEqual([
        {
          functionName: "complete_pickup",
          arguments_: {
            p_reservation_id: reservationId,
            p_completion_note: "All good!",
          },
        },
      ]);
    });

    it("maps UNAUTHENTICATED error", async () => {
      const { client } = mockClient(null, {
        code: "P0001",
        message: "UNAUTHENTICATED",
      });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "UNAUTHENTICATED",
      });
    });

    it("maps RESERVATION_NOT_FOUND error to NOT_FOUND", async () => {
      const { client } = mockClient(null, {
        code: "P0002",
        message: "RESERVATION_NOT_FOUND",
      });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "RESERVATION_NOT_FOUND",
      });
    });

    it("maps FORBIDDEN error", async () => {
      const { client } = mockClient(null, {
        code: "P0003",
        message: "FORBIDDEN",
      });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "FORBIDDEN",
        message: "FORBIDDEN",
      });
    });

    it("maps RESERVATION_NOT_ACTIVE error", async () => {
      const { client } = mockClient(null, {
        code: "P0004",
        message: "RESERVATION_NOT_ACTIVE",
      });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "RESERVATION_NOT_ACTIVE",
        message: "RESERVATION_NOT_ACTIVE",
      });
    });

    it("maps RESERVATION_ALREADY_COMPLETED error", async () => {
      const { client } = mockClient(null, {
        code: "P0004",
        message: "RESERVATION_ALREADY_COMPLETED",
      });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "RESERVATION_ALREADY_COMPLETED",
        message: "RESERVATION_ALREADY_COMPLETED",
      });
    });

    it("maps INVALID_INPUT error", async () => {
      const { client } = mockClient(null, {
        code: "P0005",
        message: "INVALID_INPUT",
      });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "INVALID_INPUT",
        message: "INVALID_INPUT",
      });
    });

    it("returns INVALID_PROVIDER_RESPONSE on malformed RPC data", async () => {
      const { client } = mockClient({ unexpected: 123 });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });

    it("handles unexpected thrown exceptions", async () => {
      const client: MarketplaceRpcClient = {
        rpc: async () => {
          throw new Error("Network crash");
        },
      };
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.completePickup(reservationId);
      expect(result).toEqual({
        ok: false,
        code: "DEPENDENCY_UNAVAILABLE",
      });
    });
  });

  describe("getCompletedTransactions", () => {
    it("calls get_completed_transactions RPC and returns mapped DTOs", async () => {
      const mockTx = {
        reservationId,
        listingId,
        listingTitle: "Physics Textbook",
        listingType: "SELL",
        agreedPriceCents: 2000,
        status: "completed",
        pickupArea: "campus_nord_bienrode",
        completedAt: "2026-09-25T11:00:00.000Z",
        completionNote: "Smooth handover",
        role: "seller",
        partner: {
          id: buyerId,
          displayName: "Anna",
          avatarUrl: null,
          universityBadge: {
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          },
        },
      };

      const { client, rpcCalls } = mockClient([mockTx]);
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.getCompletedTransactions(25);

      expect(result).toEqual({ ok: true, value: [mockTx] });
      expect(rpcCalls).toEqual([
        {
          functionName: "get_completed_transactions",
          arguments_: {
            p_limit: 25,
          },
        },
      ]);
    });

    it("returns INVALID_PROVIDER_RESPONSE when returned data is not an array", async () => {
      const { client } = mockClient({ notAnArray: true });
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.getCompletedTransactions();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });

    it("returns INVALID_PROVIDER_RESPONSE when an array item cannot be mapped", async () => {
      const { client } = mockClient([{ invalidItem: true }]);
      const repo = createMarketplacePickupRepository({ service: client });

      const result = await repo.getCompletedTransactions();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_PROVIDER_RESPONSE");
      }
    });
  });

  describe("mapRawTransactionReceiptDTO", () => {
    it("maps snake_case database row to camelCase TransactionReceiptDTO", () => {
      const raw = {
        reservation_id: reservationId,
        listing_id: listingId,
        listing_title: "Calculus Book",
        listing_type: "SELL",
        agreed_price_cents: 1500,
        status: "completed",
        pickup_area: "campus_tu_altgebaeude",
        completed_at: "2026-09-25T12:00:00.000Z",
        completion_note: "Paid in cash",
        role: "buyer",
        partner: {
          id: sellerId,
          display_name: "Max Mustermann",
          avatar_url: "/media/avatars/seller.webp",
          university_badge: {
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          },
        },
      };

      const mapped = mapRawTransactionReceiptDTO(raw);
      expect(mapped).toEqual({
        reservationId,
        listingId,
        listingTitle: "Calculus Book",
        listingType: "SELL",
        agreedPriceCents: 1500,
        status: "completed",
        pickupArea: "campus_tu_altgebaeude",
        completedAt: "2026-09-25T12:00:00.000Z",
        completionNote: "Paid in cash",
        role: "buyer",
        partner: {
          id: sellerId,
          displayName: "Max Mustermann",
          avatarUrl: "/media/avatars/seller.webp",
          universityBadge: {
            universityId: "tu-braunschweig",
            badgeLabel: "TU Braunschweig",
          },
        },
      });
    });

    it("returns null for non-object or invalid data", () => {
      expect(mapRawTransactionReceiptDTO(null)).toBeNull();
      expect(mapRawTransactionReceiptDTO("not an object")).toBeNull();
      expect(mapRawTransactionReceiptDTO({ status: "active" })).toBeNull();
    });
  });
});
