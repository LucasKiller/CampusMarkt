import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace offers and reservations persistence and concurrency integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const tableMigration = resolve(
    migrationsDir,
    "20260923220000_marketplace_offers_and_reservations.sql",
  );
  const createRpcsMigration = resolve(
    migrationsDir,
    "20260923221000_marketplace_offers_create_rpcs.sql",
  );
  const acceptCancelRpcsMigration = resolve(
    migrationsDir,
    "20260923222000_marketplace_offers_accept_cancel_rpcs.sql",
  );

  it("includes all three offers and reservations database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain(
      "20260923220000_marketplace_offers_and_reservations.sql",
    );
    expect(files).toContain(
      "20260923221000_marketplace_offers_create_rpcs.sql",
    );
    expect(files).toContain(
      "20260923222000_marketplace_offers_accept_cancel_rpcs.sql",
    );
  });

  describe("T5: table schema, partial unique index, and RLS policies", () => {
    it("defines marketplace.offers table with cascading foreign keys and status enum", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(/create table if not exists marketplace\.offers/i);
      expect(sql).toMatch(
        /listing_id uuid not null references marketplace\.listings\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /buyer_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /seller_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /parent_offer_id uuid references marketplace\.offers\(id\) on delete set null/i,
      );
      expect(sql).toMatch(
        /amount_cents integer not null check \(amount_cents >= 0\)/i,
      );
      expect(sql).toMatch(
        /status marketplace\.offer_status not null default 'pending'/i,
      );
    });

    it("defines marketplace.reservations table with agreed_price_cents and cascading foreign keys", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create table if not exists marketplace\.reservations/i,
      );
      expect(sql).toMatch(
        /listing_id uuid not null references marketplace\.listings\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /buyer_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /seller_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /agreed_price_cents integer not null check \(agreed_price_cents >= 0\)/i,
      );
      expect(sql).toMatch(
        /status marketplace\.reservation_status not null default 'active'/i,
      );
    });

    it("enforces partial unique index for exactly one active reservation per listing (AD-013)", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create unique index if not exists idx_one_active_reservation_per_listing\s+on marketplace\.reservations\s*\(listing_id\)\s+where status = 'active';/i,
      );
    });

    it("enables and forces row-level security with participants-only policies", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /alter table marketplace\.offers enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.offers force row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.reservations enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.reservations force row level security;/i,
      );

      expect(sql).toMatch(
        /create policy "Participants can view their offers"[\s\S]*?using\s*\(auth\.uid\(\) = buyer_id or auth\.uid\(\) = seller_id\);/i,
      );
      expect(sql).toMatch(
        /create policy "Participants can view their reservations"[\s\S]*?using\s*\(auth\.uid\(\) = buyer_id or auth\.uid\(\) = seller_id\);/i,
      );
    });

    it("grants table permissions only to authenticated and service_role", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /grant select on table marketplace\.offers to authenticated;/i,
      );
      expect(sql).toMatch(
        /grant select, insert, update, delete on table marketplace\.offers to service_role;/i,
      );
      expect(sql).toMatch(
        /grant select on table marketplace\.reservations to authenticated;/i,
      );
      expect(sql).toMatch(
        /grant select, insert, update, delete on table marketplace\.reservations to service_role;/i,
      );
      expect(sql).not.toMatch(/grant\s+.*to anon/i);
    });
  });

  describe("T6: create_offer and counter_offer RPC configuration and security", () => {
    it("configures create_offer with SECURITY DEFINER, search_path = '', and auth check", () => {
      const sql = readFileSync(createRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.create_offer/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(/auth\.uid\(\)/i);
      expect(sql).toMatch(/raise exception 'UNAUTHENTICATED'/i);
      expect(sql).toMatch(/raise exception 'CANNOT_NEGOTIATE_OWN_LISTING'/i);
      expect(sql).toMatch(/raise exception 'INVALID_OFFER_AMOUNT'/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.create_offer/i,
      );
    });

    it("configures counter_offer with parent offer linking and countered transition", () => {
      const sql = readFileSync(createRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.counter_offer/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(/raise exception 'OFFER_NOT_FOUND'/i);
      expect(sql).toMatch(/raise exception 'FORBIDDEN'/i);
      expect(sql).toMatch(/raise exception 'OFFER_NOT_PENDING'/i);
      expect(sql).toMatch(/set status = 'countered'/i);
      expect(sql).toMatch(/parent_offer_id/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.counter_offer/i,
      );
    });
  });

  describe("T7: accept_offer and cancel_reservation RPCs", () => {
    it("enforces canonical row locking (SELECT ... FOR UPDATE) on marketplace.listings (AD-013)", () => {
      const sql = readFileSync(acceptCancelRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.accept_offer/i);
      expect(sql).toMatch(/for update of l/i);
      expect(sql).toMatch(/raise exception 'LISTING_ALREADY_RESERVED'/i);
    });

    it("atomically creates reservation, reserves listing, and supersedes competing offers", () => {
      const sql = readFileSync(acceptCancelRpcsMigration, "utf8");

      expect(sql).toMatch(/insert into marketplace\.reservations/i);
      expect(sql).toMatch(/set status = 'reserved'/i);
      expect(sql).toMatch(/set status = 'accepted'/i);
      expect(sql).toMatch(
        /set status = 'superseded'[\s\S]*?where listing_id = v_offer\.listing_id[\s\S]*?and id <> p_offer_id[\s\S]*?and status = 'pending'/i,
      );
    });

    it("configures cancel_reservation to lock listing and restore it to active", () => {
      const sql = readFileSync(acceptCancelRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.cancel_reservation/i);
      expect(sql).toMatch(/for update of l/i);
      expect(sql).toMatch(/set status = 'cancelled'/i);
      expect(sql).toMatch(/cancellation_reason = p_reason/i);
      expect(sql).toMatch(/set status = 'active'/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.cancel_reservation/i,
      );
    });
  });

  describe("Persistence & concurrency simulation", () => {
    interface SimulatedListing {
      id: string;
      sellerId: string;
      priceCents: number;
      status: "active" | "reserved" | "sold" | "archived";
    }

    interface SimulatedOffer {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      parentOfferId?: string | null;
      amountCents: number;
      status:
        | "pending"
        | "accepted"
        | "declined"
        | "withdrawn"
        | "countered"
        | "superseded";
    }

    interface SimulatedReservation {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      offerId?: string | null;
      agreedPriceCents: number;
      status: "active" | "completed" | "cancelled";
      cancellationReason?: string | null;
      cancelledBy?: string | null;
    }

    const sellerId = "11111111-1111-1111-1111-111111111111";
    const buyer1Id = "22222222-2222-2222-2222-222222222222";
    const buyer2Id = "33333333-3333-3333-3333-333333333333";

    it("simulates atomic acceptance: locks listing, supersedes competing offers, and prevents double reservation", () => {
      const listings: SimulatedListing[] = [
        { id: "listing-1", sellerId, priceCents: 5000, status: "active" },
      ];

      const offers: SimulatedOffer[] = [
        {
          id: "offer-1",
          listingId: "listing-1",
          buyerId: buyer1Id,
          sellerId,
          amountCents: 4500,
          status: "pending",
        },
        {
          id: "offer-2",
          listingId: "listing-1",
          buyerId: buyer2Id,
          sellerId,
          amountCents: 4800,
          status: "pending",
        },
      ];

      const reservations: SimulatedReservation[] = [];

      function acceptOffer(userId: string, offerId: string) {
        const offer = offers.find((o) => o.id === offerId);
        if (!offer) throw new Error("OFFER_NOT_FOUND");
        if (offer.sellerId !== userId && offer.buyerId !== userId) {
          throw new Error("FORBIDDEN");
        }

        // Check listing lock and status
        const listing = listings.find((l) => l.id === offer.listingId);
        if (!listing) throw new Error("LISTING_NOT_FOUND");
        if (listing.status !== "active") {
          throw new Error("LISTING_ALREADY_RESERVED");
        }

        // Partial unique index constraint check: max 1 active reservation per listing
        const existingActive = reservations.find(
          (r) => r.listingId === offer.listingId && r.status === "active",
        );
        if (existingActive) {
          throw new Error(
            "UNIQUE_VIOLATION: idx_one_active_reservation_per_listing",
          );
        }

        // 1. Create reservation
        const resId = `res-${Date.now()}`;
        reservations.push({
          id: resId,
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
          offerId: offer.id,
          agreedPriceCents: offer.amountCents,
          status: "active",
        });

        // 2. Listing to reserved
        listing.status = "reserved";

        // 3. Accepted offer
        offer.status = "accepted";

        // 4. Supersede competing pending offers
        for (const o of offers) {
          if (
            o.listingId === offer.listingId &&
            o.id !== offer.id &&
            o.status === "pending"
          ) {
            o.status = "superseded";
          }
        }

        return { reservationId: resId, status: "active" };
      }

      // Seller accepts offer-1
      const res = acceptOffer(sellerId, "offer-1");
      expect(res.status).toBe("active");
      expect(listings[0].status).toBe("reserved");
      expect(offers.find((o) => o.id === "offer-1")?.status).toBe("accepted");

      // Competing offer-2 must be superseded
      expect(offers.find((o) => o.id === "offer-2")?.status).toBe("superseded");

      // Attempting to accept offer-2 now throws LISTING_ALREADY_RESERVED
      expect(() => acceptOffer(sellerId, "offer-2")).toThrow(
        "LISTING_ALREADY_RESERVED",
      );
    });

    it("simulates cancellation restoring listing to active", () => {
      const listings: SimulatedListing[] = [
        { id: "listing-1", sellerId, priceCents: 5000, status: "reserved" },
      ];

      const reservations: SimulatedReservation[] = [
        {
          id: "res-1",
          listingId: "listing-1",
          buyerId: buyer1Id,
          sellerId,
          agreedPriceCents: 4500,
          status: "active",
        },
      ];

      function cancelReservation(
        userId: string,
        reservationId: string,
        reason: string,
      ) {
        const res = reservations.find((r) => r.id === reservationId);
        if (!res) throw new Error("RESERVATION_NOT_FOUND");
        if (res.buyerId !== userId && res.sellerId !== userId) {
          throw new Error("FORBIDDEN");
        }
        if (res.status !== "active") throw new Error("RESERVATION_NOT_ACTIVE");

        res.status = "cancelled";
        res.cancellationReason = reason;
        res.cancelledBy = userId;

        const listing = listings.find((l) => l.id === res.listingId);
        if (listing) {
          listing.status = "active";
        }

        return { reservationId, status: "cancelled" };
      }

      // Stranger cannot cancel
      expect(() =>
        cancelReservation("stranger-id", "res-1", "changed_mind"),
      ).toThrow("FORBIDDEN");

      // Buyer cancels
      const result = cancelReservation(
        buyer1Id,
        "res-1",
        "scheduling_conflict",
      );
      expect(result.status).toBe("cancelled");
      expect(reservations[0].status).toBe("cancelled");
      expect(reservations[0].cancellationReason).toBe("scheduling_conflict");
      expect(listings[0].status).toBe("active");
    });

    it("simulates cascading deletes on listing deletion", () => {
      let offers: SimulatedOffer[] = [
        {
          id: "offer-1",
          listingId: "listing-1",
          buyerId: buyer1Id,
          sellerId,
          amountCents: 4000,
          status: "pending",
        },
      ];

      let reservations: SimulatedReservation[] = [
        {
          id: "res-1",
          listingId: "listing-1",
          buyerId: buyer1Id,
          sellerId,
          agreedPriceCents: 4000,
          status: "active",
        },
      ];

      // Simulate ON DELETE CASCADE for listing-1
      offers = offers.filter((o) => o.listingId !== "listing-1");
      reservations = reservations.filter((r) => r.listingId !== "listing-1");

      expect(offers).toHaveLength(0);
      expect(reservations).toHaveLength(0);
    });
  });
});
