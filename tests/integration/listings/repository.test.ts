import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createListingRepository,
  type MarketplaceRpcClient,
  type MarketplaceStorageClient,
} from "../../../apps/web/src/modules/listings/server/repository.ts";
import type {
  CreateListingRequest,
  ListingEntity,
  UpdateListingRequest,
} from "@campusmarkt/types";

function mockRpcClient(data: unknown = null, error: unknown = null) {
  const calls: Array<{
    functionName: string;
    arguments_?: Record<string, unknown>;
  }> = [];
  const rpc: MarketplaceRpcClient["rpc"] = async (functionName, arguments_) => {
    calls.push({ functionName, arguments_ });
    return { data, error };
  };
  return { calls, rpc };
}

function mockStorageClient(
  data: { signedUrl: string; token: string; path: string } | null = null,
  error: unknown = null,
) {
  const uploadCalls: Array<{ path: string; options?: { upsert?: boolean } }> =
    [];
  const storage: MarketplaceStorageClient = {
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path, options) => {
          uploadCalls.push({ path, options });
          return { data, error };
        },
      }),
    },
  };
  return { uploadCalls, storage };
}

describe("ListingRepository integration", () => {
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const listingId = "22222222-2222-4222-8222-222222222222";

  const sampleListing: ListingEntity = {
    id: listingId,
    ownerId,
    listingType: "SELL",
    title: "Vintage Wooden Desk",
    description: "Solid oak study desk in good condition.",
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    priceCents: 4500,
    status: "active",
    media: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        storagePath: `${ownerId}/cover.webp`,
        position: 0,
        createdAt: "2026-09-22T10:00:00.000Z",
      },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
  };

  describe("createListing", () => {
    const payload: CreateListingRequest = {
      listingType: "SELL",
      title: "Vintage Wooden Desk",
      description: "Solid oak study desk in good condition.",
      category: "furniture",
      pickupArea: "innenstadt",
      condition: "GOOD",
      priceCents: 4500,
      mediaStoragePaths: [`${ownerId}/cover.webp`],
    };

    it("successfully creates a listing and returns entity", async () => {
      const client = mockRpcClient(sampleListing);
      const repo = createListingRepository({ service: client });

      const result = await repo.createListing(ownerId, payload);

      expect(result).toEqual({ ok: true, value: sampleListing });
      expect(client.calls).toEqual([
        {
          functionName: "create_listing",
          arguments_: {
            p_owner_id: ownerId,
            p_payload: payload,
          },
        },
      ]);
    });

    it("maps 28000 account not active error to ACCOUNT_UNAVAILABLE", async () => {
      const client = mockRpcClient(null, {
        code: "28000",
        message: "account is not active or deletion is pending",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.createListing(ownerId, payload);

      expect(result).toEqual({
        ok: false,
        code: "ACCOUNT_UNAVAILABLE",
        message: "account is not active or deletion is pending",
      });
    });

    it("maps 28000 unauthenticated owner error to UNAUTHENTICATED", async () => {
      const client = mockRpcClient(null, {
        code: "28000",
        message: "unauthenticated owner",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.createListing(ownerId, payload);

      expect(result).toEqual({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "unauthenticated owner",
      });
    });

    it("maps 22023 constraint violation to INVALID_INPUT", async () => {
      const client = mockRpcClient(null, {
        code: "22023",
        message: "offerings require between 1 and 8 images",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.createListing(ownerId, payload);

      expect(result).toEqual({
        ok: false,
        code: "INVALID_INPUT",
        message: "offerings require between 1 and 8 images",
      });
    });
  });

  describe("updateListing", () => {
    const updatePayload: UpdateListingRequest = {
      title: "Updated Desk Title",
      priceCents: 4000,
    };

    it("successfully updates listing and returns updated entity", async () => {
      const updatedEntity = {
        ...sampleListing,
        title: "Updated Desk Title",
        priceCents: 4000,
      };
      const client = mockRpcClient(updatedEntity);
      const repo = createListingRepository({ service: client });

      const result = await repo.updateListing(
        ownerId,
        listingId,
        updatePayload,
      );

      expect(result).toEqual({ ok: true, value: updatedEntity });
      expect(client.calls).toEqual([
        {
          functionName: "update_listing",
          arguments_: {
            p_caller_id: ownerId,
            p_listing_id: listingId,
            p_payload: updatePayload,
          },
        },
      ]);
    });

    it("maps 42501 unauthorized error to FORBIDDEN", async () => {
      const client = mockRpcClient(null, {
        code: "42501",
        message: "caller is not authorized to edit this listing",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.updateListing(
        "different-user",
        listingId,
        updatePayload,
      );

      expect(result).toEqual({
        ok: false,
        code: "FORBIDDEN",
        message: "caller is not authorized to edit this listing",
      });
    });

    it("maps P0002 not found error to NOT_FOUND", async () => {
      const client = mockRpcClient(null, {
        code: "P0002",
        message: "listing not found",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.updateListing(
        ownerId,
        listingId,
        updatePayload,
      );

      expect(result).toEqual({
        ok: false,
        code: "NOT_FOUND",
        message: "listing not found",
      });
    });

    it("maps listing intent change rejection to INVALID_INPUT", async () => {
      const client = mockRpcClient(null, {
        code: "22023",
        message: "listing intent cannot be changed",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.updateListing(
        ownerId,
        listingId,
        updatePayload,
      );

      expect(result).toEqual({
        ok: false,
        code: "INVALID_INPUT",
        message: "listing intent cannot be changed",
      });
    });
  });

  describe("transitionListingStatus", () => {
    it("successfully transitions listing status", async () => {
      const transitionResult = {
        id: listingId,
        status: "reserved" as const,
        updatedAt: "2026-09-22T10:30:00.000Z",
      };
      const client = mockRpcClient(transitionResult);
      const repo = createListingRepository({ service: client });

      const result = await repo.transitionListingStatus(
        ownerId,
        listingId,
        "reserved",
      );

      expect(result).toEqual({ ok: true, value: transitionResult });
      expect(client.calls).toEqual([
        {
          functionName: "transition_listing_status",
          arguments_: {
            p_caller_id: ownerId,
            p_listing_id: listingId,
            p_target_status: "reserved",
          },
        },
      ]);
    });

    it("maps invalid status transition to CONFLICT", async () => {
      const client = mockRpcClient(null, {
        code: "22023",
        message: "invalid status transition from sold to active",
      });
      const repo = createListingRepository({ service: client });

      const result = await repo.transitionListingStatus(
        ownerId,
        listingId,
        "active",
      );

      expect(result).toEqual({
        ok: false,
        code: "CONFLICT",
        message: "invalid status transition from sold to active",
      });
    });
  });

  describe("getOwnerListing", () => {
    it("returns listing when found", async () => {
      const client = mockRpcClient(sampleListing);
      const repo = createListingRepository({ service: client });

      const result = await repo.getOwnerListing(ownerId, listingId);

      expect(result).toEqual({ ok: true, value: sampleListing });
      expect(client.calls).toEqual([
        {
          functionName: "get_owner_listing",
          arguments_: {
            p_caller_id: ownerId,
            p_listing_id: listingId,
          },
        },
      ]);
    });

    it("returns null when not found", async () => {
      const client = mockRpcClient(null);
      const repo = createListingRepository({ service: client });

      const result = await repo.getOwnerListing(ownerId, listingId);

      expect(result).toEqual({ ok: true, value: null });
    });
  });

  describe("listOwnerListings", () => {
    it("returns array of user listings", async () => {
      const client = mockRpcClient([sampleListing]);
      const repo = createListingRepository({ service: client });

      const result = await repo.listOwnerListings(ownerId);

      expect(result).toEqual({ ok: true, value: [sampleListing] });
      expect(client.calls).toEqual([
        {
          functionName: "list_owner_listings",
          arguments_: {
            p_caller_id: ownerId,
          },
        },
      ]);
    });
  });

  describe("createSignedUploadUrl", () => {
    it("returns signed upload url from storage adapter", async () => {
      const storageMock = mockStorageClient({
        signedUrl: "https://storage.example.test/signed/123",
        token: "token123",
        path: `${ownerId}/photo1.webp`,
      });
      const client = mockRpcClient();
      const repo = createListingRepository({
        service: client,
        storage: storageMock.storage,
      });

      const result = await repo.createSignedUploadUrl(`${ownerId}/photo1.webp`);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.signedUploadUrl).toBe(
          "https://storage.example.test/signed/123",
        );
        expect(result.value.storagePath).toBe(`${ownerId}/photo1.webp`);
        expect(result.value.expiresAt).toBeDefined();
      }
    });

    it("returns DEPENDENCY_UNAVAILABLE when storage client is not provided", async () => {
      const client = mockRpcClient();
      const repo = createListingRepository({ service: client });

      const result = await repo.createSignedUploadUrl(`${ownerId}/photo1.webp`);

      expect(result).toEqual({
        ok: false,
        code: "DEPENDENCY_UNAVAILABLE",
      });
    });
  });
});
