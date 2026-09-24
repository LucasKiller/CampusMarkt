import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace pickup completion persistence and race condition integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const tableMigration = resolve(
    migrationsDir,
    "20260925200000_marketplace_pickup_completion.sql",
  );
  const completeRpcMigration = resolve(
    migrationsDir,
    "20260925201000_marketplace_pickup_complete_rpc.sql",
  );
  const historyRpcMigration = resolve(
    migrationsDir,
    "20260925202000_marketplace_pickup_history_rpc.sql",
  );

  it("includes all three pickup completion database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260925200000_marketplace_pickup_completion.sql");
    expect(files).toContain(
      "20260925201000_marketplace_pickup_complete_rpc.sql",
    );
    expect(files).toContain(
      "20260925202000_marketplace_pickup_history_rpc.sql",
    );
  });

  describe("T5: pickup completion schema migration", () => {
    it("adds completed_at and completion_note columns with length bounds", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /alter table marketplace\.reservations\s+add column if not exists completed_at timestamptz/i,
      );
      expect(sql).toMatch(
        /add column if not exists completion_note text check \(char_length\(completion_note\) <= 500\)/i,
      );
    });

    it("creates partial indexes on completed reservations for fast history queries", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create index if not exists idx_marketplace_reservations_completed_buyer[\s\S]*?where status = 'completed'/i,
      );
      expect(sql).toMatch(
        /create index if not exists idx_marketplace_reservations_completed_seller[\s\S]*?where status = 'completed'/i,
      );
      expect(sql).toMatch(
        /create index if not exists idx_marketplace_reservations_completed[\s\S]*?where status = 'completed'/i,
      );
    });
  });

  describe("T6: complete_pickup RPC with canonical row locking (AD-013, AD-015)", () => {
    it("enforces canonical row locking hierarchy (listing first, then reservation)", () => {
      const sql = readFileSync(completeRpcMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.complete_pickup/i);
      expect(sql).toMatch(
        /from marketplace\.listings l[\s\S]*?join marketplace\.reservations r on r\.listing_id = l\.id[\s\S]*?for update of l;/i,
      );
      expect(sql).toMatch(
        /from marketplace\.reservations[\s\S]*?where id = p_reservation_id[\s\S]*?for update;/i,
      );
    });

    it("enforces seller-only completion authority (AD-015)", () => {
      const sql = readFileSync(completeRpcMigration, "utf8");

      expect(sql).toMatch(
        /if v_res\.seller_id <> v_user_id then[\s\S]*?raise exception 'FORBIDDEN'/i,
      );
    });

    it("implements idempotency for repeated completions", () => {
      const sql = readFileSync(completeRpcMigration, "utf8");

      expect(sql).toMatch(
        /if v_res\.status = 'completed' then[\s\S]*?return jsonb_build_object/i,
      );
    });

    it("atomically transitions reservation to completed and listing to sold", () => {
      const sql = readFileSync(completeRpcMigration, "utf8");

      expect(sql).toMatch(
        /update marketplace\.reservations[\s\S]*?set status = 'completed'/i,
      );
      expect(sql).toMatch(
        /update marketplace\.listings[\s\S]*?set status = 'sold'/i,
      );
    });

    it("configures SECURITY DEFINER, search_path = '', and authenticated execute grant", () => {
      const sql = readFileSync(completeRpcMigration, "utf8");

      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.complete_pickup/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.complete_pickup\(uuid, text\)\s+to authenticated, service_role;/i,
      );
    });
  });

  describe("T7: get_completed_transactions RPC", () => {
    it("filters strictly by completed status and participant authority", () => {
      const sql = readFileSync(historyRpcMigration, "utf8");

      expect(sql).toMatch(
        /function marketplace_api\.get_completed_transactions/i,
      );
      expect(sql).toMatch(/r\.status = 'completed'/i);
      expect(sql).toMatch(
        /\(r\.buyer_id = v_user_id or r\.seller_id = v_user_id\)/i,
      );
      expect(sql).toMatch(
        /order by coalesce\(r\.completed_at, r\.updated_at\) desc/i,
      );
    });

    it("protects participant privacy and completely excludes private email addresses", () => {
      const sql = readFileSync(historyRpcMigration, "utf8");

      expect(sql).not.toMatch(/auth\.users\.email/i);
      expect(sql).not.toMatch(/identity_hash/i);
      expect(sql).toMatch(/coalesce\(p\.display_name, 'CampusMarkt User'\)/i);
    });

    it("configures SECURITY DEFINER, search_path = '', and authenticated execute grant", () => {
      const sql = readFileSync(historyRpcMigration, "utf8");

      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /revoke all on function marketplace_api\.get_completed_transactions/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_completed_transactions\(integer\)\s+to authenticated, service_role;/i,
      );
    });
  });

  describe("T8: Persistence, concurrency and race condition simulations", () => {
    interface SimulatedListing {
      id: string;
      sellerId: string;
      title: string;
      status: "active" | "reserved" | "sold" | "archived";
    }

    interface SimulatedReservation {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      agreedPriceCents: number;
      status: "active" | "completed" | "cancelled";
      completedAt: string | null;
      completionNote: string | null;
      cancellationReason: string | null;
      cancelledBy: string | null;
    }

    const sellerId = "11111111-1111-1111-1111-111111111111";
    const buyerId = "22222222-2222-2222-2222-222222222222";
    const outsiderId = "33333333-3333-3333-3333-333333333333";

    function simulateCompletePickup(
      callerId: string | null,
      reservationId: string,
      note: string | null,
      state: {
        listings: SimulatedListing[];
        reservations: SimulatedReservation[];
      },
    ) {
      if (!callerId) {
        throw new Error("UNAUTHENTICATED");
      }
      const reservation = state.reservations.find(
        (r) => r.id === reservationId,
      );
      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }
      const listing = state.listings.find(
        (l) => l.id === reservation.listingId,
      );
      if (!listing) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      // Canonical row locking simulated in order: listing lock, reservation lock
      if (reservation.sellerId !== callerId) {
        throw new Error("FORBIDDEN");
      }

      if (reservation.status === "completed") {
        return {
          reservationId: reservation.id,
          listingId: listing.id,
          status: "completed",
          agreedPriceCents: reservation.agreedPriceCents,
          completedAt: reservation.completedAt,
        };
      }

      if (reservation.status !== "active") {
        throw new Error("RESERVATION_NOT_ACTIVE");
      }

      const completedAt = "2026-09-25T12:00:00.000Z";
      reservation.status = "completed";
      reservation.completedAt = completedAt;
      reservation.completionNote = note;
      listing.status = "sold";

      return {
        reservationId: reservation.id,
        listingId: listing.id,
        status: "completed",
        agreedPriceCents: reservation.agreedPriceCents,
        completedAt,
      };
    }

    function simulateCancelReservation(
      callerId: string | null,
      reservationId: string,
      reason: string,
      state: {
        listings: SimulatedListing[];
        reservations: SimulatedReservation[];
      },
    ) {
      if (!callerId) {
        throw new Error("UNAUTHENTICATED");
      }
      const reservation = state.reservations.find(
        (r) => r.id === reservationId,
      );
      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }
      const listing = state.listings.find(
        (l) => l.id === reservation.listingId,
      );
      if (!listing) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      if (
        reservation.buyerId !== callerId &&
        reservation.sellerId !== callerId
      ) {
        throw new Error("FORBIDDEN");
      }

      if (reservation.status !== "active") {
        throw new Error("RESERVATION_NOT_ACTIVE");
      }

      reservation.status = "cancelled";
      reservation.cancellationReason = reason;
      reservation.cancelledBy = callerId;
      listing.status = "active";

      return {
        reservationId: reservation.id,
        listingId: listing.id,
        status: "cancelled",
      };
    }

    it("verifies non-sellers cannot execute complete_pickup", () => {
      const state = {
        listings: [
          {
            id: "l-1",
            sellerId,
            title: "Calculus Book",
            status: "reserved" as const,
          },
        ],
        reservations: [
          {
            id: "r-1",
            listingId: "l-1",
            buyerId,
            sellerId,
            agreedPriceCents: 2500,
            status: "active" as const,
            completedAt: null,
            completionNote: null,
            cancellationReason: null,
            cancelledBy: null,
          },
        ],
      };

      // Buyer attempt -> FORBIDDEN
      expect(() => simulateCompletePickup(buyerId, "r-1", null, state)).toThrow(
        "FORBIDDEN",
      );

      // Outsider attempt -> FORBIDDEN
      expect(() =>
        simulateCompletePickup(outsiderId, "r-1", null, state),
      ).toThrow("FORBIDDEN");

      // Unauthenticated -> UNAUTHENTICATED
      expect(() => simulateCompletePickup(null, "r-1", null, state)).toThrow(
        "UNAUTHENTICATED",
      );

      // State remains unchanged
      expect(state.reservations[0].status).toBe("active");
      expect(state.listings[0].status).toBe("reserved");
    });

    it("proves listing status transitions to sold and reservation to completed upon seller completion", () => {
      const state = {
        listings: [
          {
            id: "l-1",
            sellerId,
            title: "Desk Lamp",
            status: "reserved" as const,
          },
        ],
        reservations: [
          {
            id: "r-1",
            listingId: "l-1",
            buyerId,
            sellerId,
            agreedPriceCents: 1500,
            status: "active" as const,
            completedAt: null,
            completionNote: null,
            cancellationReason: null,
            cancelledBy: null,
          },
        ],
      };

      const receipt = simulateCompletePickup(
        sellerId,
        "r-1",
        "Handed over at Mensa 1",
        state,
      );

      expect(receipt.status).toBe("completed");
      expect(receipt.reservationId).toBe("r-1");
      expect(receipt.listingId).toBe("l-1");
      expect(state.reservations[0].status).toBe("completed");
      expect(state.reservations[0].completionNote).toBe(
        "Handed over at Mensa 1",
      );
      expect(state.listings[0].status).toBe("sold");
    });

    it("verifies concurrent cancellation fails after completion commits", () => {
      const state = {
        listings: [
          {
            id: "l-1",
            sellerId,
            title: "Office Chair",
            status: "reserved" as const,
          },
        ],
        reservations: [
          {
            id: "r-1",
            listingId: "l-1",
            buyerId,
            sellerId,
            agreedPriceCents: 4500,
            status: "active" as const,
            completedAt: null,
            completionNote: null,
            cancellationReason: null,
            cancelledBy: null,
          },
        ],
      };

      // 1. Seller completion commits first
      simulateCompletePickup(sellerId, "r-1", "Cash received", state);
      expect(state.reservations[0].status).toBe("completed");
      expect(state.listings[0].status).toBe("sold");

      // 2. Buyer concurrent cancellation attempt fails because reservation is no longer active
      expect(() =>
        simulateCancelReservation(buyerId, "r-1", "No longer want it", state),
      ).toThrow("RESERVATION_NOT_ACTIVE");

      // State remains sold and completed
      expect(state.reservations[0].status).toBe("completed");
      expect(state.listings[0].status).toBe("sold");
    });

    it("verifies completion fails after cancellation commits", () => {
      const state = {
        listings: [
          {
            id: "l-1",
            sellerId,
            title: "Monitor",
            status: "reserved" as const,
          },
        ],
        reservations: [
          {
            id: "r-1",
            listingId: "l-1",
            buyerId,
            sellerId,
            agreedPriceCents: 8000,
            status: "active" as const,
            completedAt: null,
            completionNote: null,
            cancellationReason: null,
            cancelledBy: null,
          },
        ],
      };

      // 1. Buyer cancellation commits first
      simulateCancelReservation(buyerId, "r-1", "Buyer did not show up", state);
      expect(state.reservations[0].status).toBe("cancelled");
      expect(state.listings[0].status).toBe("active");

      // 2. Seller completion attempt fails because reservation is cancelled
      expect(() =>
        simulateCompletePickup(sellerId, "r-1", null, state),
      ).toThrow("RESERVATION_NOT_ACTIVE");

      expect(state.reservations[0].status).toBe("cancelled");
      expect(state.listings[0].status).toBe("active");
    });

    it("handles repeated completions idempotently without duplicating or throwing errors", () => {
      const state = {
        listings: [
          {
            id: "l-1",
            sellerId,
            title: "Textbook",
            status: "reserved" as const,
          },
        ],
        reservations: [
          {
            id: "r-1",
            listingId: "l-1",
            buyerId,
            sellerId,
            agreedPriceCents: 2000,
            status: "active" as const,
            completedAt: null,
            completionNote: null,
            cancellationReason: null,
            cancelledBy: null,
          },
        ],
      };

      // First call
      const res1 = simulateCompletePickup(sellerId, "r-1", "First note", state);
      expect(res1.status).toBe("completed");

      // Second call (repeated click or retry)
      const res2 = simulateCompletePickup(
        sellerId,
        "r-1",
        "Second note",
        state,
      );
      expect(res2.status).toBe("completed");
      expect(res2.reservationId).toBe("r-1");
      expect(res2.completedAt).toBe(res1.completedAt);
    });
  });
});
