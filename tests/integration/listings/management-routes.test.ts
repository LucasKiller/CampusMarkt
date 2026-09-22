import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createListMyListingsHandler } from "../../../apps/web/src/app/api/listings/mine/route.ts";
import { createManageListingHandler } from "../../../apps/web/src/app/api/listings/[id]/manage/route.ts";
import { createUpdateListingHandler } from "../../../apps/web/src/app/api/listings/[id]/route.ts";
import { createListingStatusHandler } from "../../../apps/web/src/app/api/listings/[id]/status/route.ts";
import type { ListingApplicationService } from "../../../apps/web/src/modules/listings/server/index.ts";
import type { ListingEntity } from "@campusmarkt/types";

const canonicalOrigin = "https://markt.example.test";
const authUserId = "11111111-1111-4111-8111-111111111111";
const listingId = "22222222-2222-4222-8222-222222222222";

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
}

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId },
) {
  return () =>
    ({
      async requireActiveIdentity() {
        if (!activeIdentity) {
          throw new Error("UNAUTHENTICATED");
        }
        return activeIdentity;
      },
    }) as never;
}

describe("listings management and status routes integration (T12)", () => {
  const sampleListing: ListingEntity = {
    id: listingId,
    ownerId: authUserId,
    listingType: "SELL",
    title: "Wooden Study Desk",
    description: "Good condition wooden desk in central Braunschweig.",
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    priceCents: 5000,
    status: "active",
    media: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        storagePath: `${authUserId}/desk.webp`,
        position: 0,
      },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
  };

  describe("GET /api/listings/mine", () => {
    it("returns 200 with list of user listings", async () => {
      const mockService: Partial<ListingApplicationService> = {
        listOwnerListings: vi.fn(async () => ({
          status: "success" as const,
          data: [sampleListing],
        })),
      };

      const handler = createListMyListingsHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest("GET", `${canonicalOrigin}/api/listings/mine`);
      const res = await handler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual([sampleListing]);
      expect(mockService.listOwnerListings).toHaveBeenCalledWith(authUserId);
    });

    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<ListingApplicationService> = {
        listOwnerListings: vi.fn(),
      };

      const handler = createListMyListingsHandler(
        mockService as ListingApplicationService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest("GET", `${canonicalOrigin}/api/listings/mine`);
      const res = await handler(req);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/listings/[id]/manage", () => {
    it("returns 200 with owner listing details", async () => {
      const mockService: Partial<ListingApplicationService> = {
        getOwnerListing: vi.fn(async () => ({
          status: "success" as const,
          data: sampleListing,
        })),
      };

      const handler = createManageListingHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/listings/${listingId}/manage`,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: listingId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual(sampleListing);
    });

    it("returns 404 when listing does not exist or not owned", async () => {
      const mockService: Partial<ListingApplicationService> = {
        getOwnerListing: vi.fn(async () => ({
          status: "not_found" as const,
        })),
      };

      const handler = createManageListingHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "GET",
        `${canonicalOrigin}/api/listings/${listingId}/manage`,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: listingId }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/listings/[id]", () => {
    const updatePayload = {
      title: "Updated Study Desk",
      priceCents: 4500,
    };

    it("returns 200 when update succeeds", async () => {
      const updatedListing = {
        ...sampleListing,
        title: "Updated Study Desk",
        priceCents: 4500,
      };
      const mockService: Partial<ListingApplicationService> = {
        updateListing: vi.fn(async () => ({
          status: "success" as const,
          data: updatedListing,
        })),
      };

      const handler = createUpdateListingHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "PATCH",
        `${canonicalOrigin}/api/listings/${listingId}`,
        updatePayload,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: listingId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.title).toBe("Updated Study Desk");
    });

    it("returns 403 when user is not owner", async () => {
      const mockService: Partial<ListingApplicationService> = {
        updateListing: vi.fn(async () => ({
          status: "forbidden" as const,
        })),
      };

      const handler = createUpdateListingHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "PATCH",
        `${canonicalOrigin}/api/listings/${listingId}`,
        updatePayload,
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: listingId }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/listings/[id]/status", () => {
    it("returns 200 when status transition succeeds", async () => {
      const transitionResult = {
        id: listingId,
        status: "reserved" as const,
        updatedAt: "2026-09-22T10:30:00.000Z",
      };
      const mockService: Partial<ListingApplicationService> = {
        transitionStatus: vi.fn(async () => ({
          status: "success" as const,
          data: transitionResult,
        })),
      };

      const handler = createListingStatusHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/listings/${listingId}/status`,
        { status: "reserved" },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: listingId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.status).toBe("reserved");
    });

    it("returns 409 when status transition is invalid", async () => {
      const mockService: Partial<ListingApplicationService> = {
        transitionStatus: vi.fn(async () => ({
          status: "conflict" as const,
          message: "invalid status transition from sold to active",
        })),
      };

      const handler = createListingStatusHandler(
        mockService as ListingApplicationService,
        mockSessionDal(),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/listings/${listingId}/status`,
        { status: "active" },
      );
      const res = await handler(req, {
        params: Promise.resolve({ id: listingId }),
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe("CONFLICT");
    });
  });
});
