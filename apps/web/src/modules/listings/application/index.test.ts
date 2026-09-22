import { describe, expect, it, vi } from "vitest";

import {
  createListingApplicationService,
  type ListingAuditEvent,
  type ListingSecurityAudit,
} from "./index.ts";
import type { ListingRepository } from "../server/repository";
import type { ListingEntity } from "@campusmarkt/types";

describe("ListingApplicationService unit tests", () => {
  const callerId = "11111111-1111-4111-8111-111111111111";
  const listingId = "22222222-2222-4222-8222-222222222222";
  const correlationId = "33333333-3333-4333-8333-333333333333";

  const sampleListing: ListingEntity = {
    id: listingId,
    ownerId: callerId,
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
        id: "44444444-4444-4444-8444-444444444444",
        storagePath: `${callerId}/desk.webp`,
        position: 0,
      },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
  };

  function mockRepository(
    overrides: Partial<ListingRepository> = {},
  ): ListingRepository {
    return {
      createListing: vi.fn(async () => ({
        ok: true as const,
        value: sampleListing,
      })),
      updateListing: vi.fn(async () => ({
        ok: true as const,
        value: sampleListing,
      })),
      transitionListingStatus: vi.fn(async () => ({
        ok: true as const,
        value: {
          id: listingId,
          status: "reserved" as const,
          updatedAt: "2026-09-22T10:00:00.000Z",
        },
      })),
      getOwnerListing: vi.fn(async () => ({
        ok: true as const,
        value: sampleListing,
      })),
      listOwnerListings: vi.fn(async () => ({
        ok: true as const,
        value: [sampleListing],
      })),
      createSignedUploadUrl: vi.fn(async () => ({
        ok: true as const,
        value: {
          signedUploadUrl: "https://upload.example.com",
          storagePath: `${callerId}/img.webp`,
          expiresAt: "2026-09-22T11:00:00.000Z",
        },
      })),
      ...overrides,
    };
  }

  function mockSecurity(overrides: Partial<ListingSecurityAudit> = {}) {
    const audits: ListingAuditEvent[] = [];
    const security: ListingSecurityAudit = {
      recordAudit: vi.fn(async (event: ListingAuditEvent) => {
        audits.push(event);
      }),
      checkRateLimit: vi.fn(async () => ({ allowed: true })),
      ...overrides,
    };
    return { security, audits };
  }

  describe("createListing", () => {
    const validInput = {
      listingType: "SELL",
      title: "Wooden Study Desk",
      description: "Good condition wooden desk in central Braunschweig.",
      category: "furniture",
      pickupArea: "innenstadt",
      condition: "GOOD",
      priceCents: 5000,
      mediaStoragePaths: [`${callerId}/desk.webp`],
    };

    it("creates listing and emits audit event on success", async () => {
      const repository = mockRepository();
      const { security, audits } = mockSecurity();
      const service = createListingApplicationService({ repository, security });

      const result = await service.createListing(callerId, validInput, {
        correlationId,
      });

      expect(result).toEqual({ status: "success", data: sampleListing });
      expect(repository.createListing).toHaveBeenCalledWith(
        callerId,
        validInput,
      );
      expect(audits).toHaveLength(1);
      expect(audits[0].eventType).toBe("listing.created");
      expect(audits[0].listingId).toBe(listingId);
    });

    it("returns unauthenticated when callerId is empty", async () => {
      const repository = mockRepository();
      const service = createListingApplicationService({ repository });

      const result = await service.createListing("", validInput, {
        correlationId,
      });

      expect(result).toEqual({ status: "unauthenticated" });
      expect(repository.createListing).not.toHaveBeenCalled();
    });

    it("returns rate_limited and records audit when rate limit is exceeded", async () => {
      const repository = mockRepository();
      const { security, audits } = mockSecurity({
        checkRateLimit: vi.fn(async () => ({
          allowed: false,
          retryAfterSeconds: 1800,
        })),
      });
      const service = createListingApplicationService({ repository, security });

      const result = await service.createListing(callerId, validInput, {
        correlationId,
      });

      expect(result).toEqual({
        status: "rate_limited",
        retryAfterSeconds: 1800,
      });
      expect(repository.createListing).not.toHaveBeenCalled();
      expect(audits).toHaveLength(1);
      expect(audits[0].metadata?.outcome).toBe("rate_limited");
    });

    it("returns invalid when payload fails validation", async () => {
      const repository = mockRepository();
      const service = createListingApplicationService({ repository });

      const invalidInput = { ...validInput, title: "desk" }; // too short
      const result = await service.createListing(callerId, invalidInput, {
        correlationId,
      });

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.fieldErrors.title).toBeDefined();
      }
      expect(repository.createListing).not.toHaveBeenCalled();
    });

    it("maps repository account unavailable error", async () => {
      const repository = mockRepository({
        createListing: vi.fn(async () => ({
          ok: false as const,
          code: "ACCOUNT_UNAVAILABLE" as const,
          message: "account is not active or deletion is pending",
        })),
      });
      const service = createListingApplicationService({ repository });

      const result = await service.createListing(callerId, validInput, {
        correlationId,
      });

      expect(result).toEqual({
        status: "account_unavailable",
        message: "account is not active or deletion is pending",
      });
    });
  });

  describe("updateListing", () => {
    const validUpdate = {
      title: "Updated Study Desk",
      priceCents: 4500,
    };

    it("updates listing and emits audit event", async () => {
      const updatedListing = {
        ...sampleListing,
        title: "Updated Study Desk",
        priceCents: 4500,
      };
      const repository = mockRepository({
        updateListing: vi.fn(async () => ({
          ok: true as const,
          value: updatedListing,
        })),
      });
      const { security, audits } = mockSecurity();
      const service = createListingApplicationService({ repository, security });

      const result = await service.updateListing(
        callerId,
        listingId,
        validUpdate,
        { correlationId },
      );

      expect(result).toEqual({ status: "success", data: updatedListing });
      expect(repository.updateListing).toHaveBeenCalledWith(
        callerId,
        listingId,
        validUpdate,
      );
      expect(audits).toHaveLength(1);
      expect(audits[0].eventType).toBe("listing.updated");
    });

    it("returns not_found if listing does not exist", async () => {
      const repository = mockRepository({
        getOwnerListing: vi.fn(async () => ({
          ok: true as const,
          value: null,
        })),
      });
      const service = createListingApplicationService({ repository });

      const result = await service.updateListing(
        callerId,
        listingId,
        validUpdate,
        { correlationId },
      );

      expect(result).toEqual({ status: "not_found" });
      expect(repository.updateListing).not.toHaveBeenCalled();
    });

    it("returns invalid if trying to mutate listingType", async () => {
      const repository = mockRepository();
      const service = createListingApplicationService({ repository });

      const result = await service.updateListing(
        callerId,
        listingId,
        { listingType: "GIVE_AWAY" },
        { correlationId },
      );

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.fieldErrors.listingType).toBeDefined();
      }
      expect(repository.updateListing).not.toHaveBeenCalled();
    });
  });

  describe("transitionStatus", () => {
    it("transitions status and logs audit event", async () => {
      const transitionResult = {
        id: listingId,
        status: "reserved" as const,
        updatedAt: "2026-09-22T10:30:00.000Z",
      };
      const repository = mockRepository({
        transitionListingStatus: vi.fn(async () => ({
          ok: true as const,
          value: transitionResult,
        })),
      });
      const { security, audits } = mockSecurity();
      const service = createListingApplicationService({ repository, security });

      const result = await service.transitionStatus(
        callerId,
        listingId,
        { status: "reserved" },
        { correlationId },
      );

      expect(result).toEqual({ status: "success", data: transitionResult });
      expect(repository.transitionListingStatus).toHaveBeenCalledWith(
        callerId,
        listingId,
        "reserved",
      );
      expect(audits).toHaveLength(1);
      expect(audits[0].eventType).toBe("listing.status_changed");
    });

    it("returns conflict on invalid status transition from repository", async () => {
      const repository = mockRepository({
        transitionListingStatus: vi.fn(async () => ({
          ok: false as const,
          code: "CONFLICT" as const,
          message: "invalid status transition from sold to active",
        })),
      });
      const service = createListingApplicationService({ repository });

      const result = await service.transitionStatus(
        callerId,
        listingId,
        { status: "active" },
        { correlationId },
      );

      expect(result).toEqual({
        status: "conflict",
        message: "invalid status transition from sold to active",
      });
    });
  });

  describe("getOwnerListing & listOwnerListings", () => {
    it("returns listing on getOwnerListing", async () => {
      const repository = mockRepository();
      const service = createListingApplicationService({ repository });

      const result = await service.getOwnerListing(callerId, listingId);

      expect(result).toEqual({ status: "success", data: sampleListing });
    });

    it("returns listings on listOwnerListings", async () => {
      const repository = mockRepository();
      const service = createListingApplicationService({ repository });

      const result = await service.listOwnerListings(callerId);

      expect(result).toEqual({ status: "success", data: [sampleListing] });
    });
  });
});
