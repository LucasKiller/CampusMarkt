import { describe, expect, it } from "vitest";

import {
  ALLOWED_MEDIA_CONTENT_TYPES,
  LISTING_API_FAILURE_CODES,
  isCreateListingRequest,
  isItemCondition,
  isListingCategory,
  isListingEntity,
  isListingMediaItem,
  isListingStatus,
  isListingType,
  isMediaUploadIntentRequest,
  isPickupArea,
  isTransitionStatusRequest,
  isUpdateListingRequest,
} from "./index.ts";

describe("listing type predicates", () => {
  it("validates listing types", () => {
    expect(isListingType("SELL")).toBe(true);
    expect(isListingType("GIVE_AWAY")).toBe(true);
    expect(isListingType("WANTED")).toBe(true);
    expect(isListingType("SWAP")).toBe(false);
    expect(isListingType(123)).toBe(false);
  });

  it("validates listing statuses", () => {
    expect(isListingStatus("active")).toBe(true);
    expect(isListingStatus("reserved")).toBe(true);
    expect(isListingStatus("sold")).toBe(true);
    expect(isListingStatus("archived")).toBe(true);
    expect(isListingStatus("deleted")).toBe(false);
  });

  it("validates categories", () => {
    expect(isListingCategory("furniture")).toBe(true);
    expect(isListingCategory("electronics")).toBe(true);
    expect(isListingCategory("books_studies")).toBe(true);
    expect(isListingCategory("bicycles_mobility")).toBe(true);
    expect(isListingCategory("clothing")).toBe(true);
    expect(isListingCategory("home_kitchen")).toBe(true);
    expect(isListingCategory("other")).toBe(true);
    expect(isListingCategory("cars")).toBe(false);
  });

  it("validates pickup areas", () => {
    expect(isPickupArea("innenstadt")).toBe(true);
    expect(isPickupArea("campus_tu_altgebaeude")).toBe(true);
    expect(isPickupArea("berlin_mitte")).toBe(false);
  });

  it("validates item conditions", () => {
    expect(isItemCondition("NEW")).toBe(true);
    expect(isItemCondition("LIKE_NEW")).toBe(true);
    expect(isItemCondition("GOOD")).toBe(true);
    expect(isItemCondition("FAIR")).toBe(true);
    expect(isItemCondition("POOR")).toBe(false);
  });

  it("exposes failure codes and allowed media content types", () => {
    expect(LISTING_API_FAILURE_CODES).toContain("INVALID_INPUT");
    expect(ALLOWED_MEDIA_CONTENT_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});

describe("isListingMediaItem", () => {
  const validMedia = {
    id: "12345678-1234-1234-1234-123456789abc",
    storagePath: "listings/123/img.webp",
    position: 0,
    createdAt: "2026-09-22T10:00:00.000Z",
  };

  it("accepts valid media item", () => {
    expect(isListingMediaItem(validMedia)).toBe(true);
  });

  it("accepts valid media item without optional createdAt", () => {
    const { createdAt, ...rest } = validMedia;
    void createdAt;
    expect(isListingMediaItem(rest)).toBe(true);
  });

  it("rejects extraneous keys", () => {
    expect(isListingMediaItem({ ...validMedia, extra: "malicious" })).toBe(
      false,
    );
  });

  it("rejects invalid id or position", () => {
    expect(isListingMediaItem({ ...validMedia, id: "invalid-uuid" })).toBe(
      false,
    );
    expect(isListingMediaItem({ ...validMedia, position: -1 })).toBe(false);
    expect(isListingMediaItem({ ...validMedia, position: 8 })).toBe(false);
    expect(isListingMediaItem({ ...validMedia, position: 1.5 })).toBe(false);
  });
});

describe("isListingEntity", () => {
  const validListing = {
    id: "12345678-1234-1234-1234-123456789abc",
    ownerId: "87654321-4321-4321-4321-cba987654321",
    listingType: "SELL",
    title: "Vintage Oak Table",
    description: "Solid wood table in good condition for studying.",
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    priceCents: 4500,
    status: "active",
    media: [
      {
        id: "11111111-2222-3333-4444-555555555555",
        storagePath: "listings/img-1.webp",
        position: 0,
      },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
  };

  it("accepts valid listing entity", () => {
    expect(isListingEntity(validListing)).toBe(true);
  });

  it("accepts listing entity with null priceCents", () => {
    expect(
      isListingEntity({
        ...validListing,
        listingType: "GIVE_AWAY",
        priceCents: null,
      }),
    ).toBe(true);
  });

  it("rejects extraneous keys", () => {
    expect(isListingEntity({ ...validListing, extraProp: "forbidden" })).toBe(
      false,
    );
  });

  it("rejects invalid owner or id", () => {
    expect(isListingEntity({ ...validListing, id: "bad" })).toBe(false);
    expect(isListingEntity({ ...validListing, ownerId: "bad" })).toBe(false);
  });
});

describe("isCreateListingRequest", () => {
  const validRequest = {
    listingType: "SELL",
    title: "Physics Textbook 10th Edition",
    description: "Comprehensive physics book required for TU BS semester 1.",
    category: "books_studies",
    pickupArea: "campus_tu_altgebaeude",
    condition: "LIKE_NEW",
    priceCents: 2500,
    mediaStoragePaths: ["listings/uploads/img1.webp"],
  };

  it("accepts valid create listing request", () => {
    expect(isCreateListingRequest(validRequest)).toBe(true);
  });

  it("accepts request without priceCents or with null priceCents", () => {
    const { priceCents, ...rest } = validRequest;
    void priceCents;
    expect(
      isCreateListingRequest({
        ...rest,
        listingType: "GIVE_AWAY",
      }),
    ).toBe(true);
    expect(
      isCreateListingRequest({
        ...rest,
        listingType: "GIVE_AWAY",
        priceCents: null,
      }),
    ).toBe(true);
  });

  it("rejects extraneous keys", () => {
    expect(isCreateListingRequest({ ...validRequest, spam: true })).toBe(false);
  });

  it("rejects invalid media storage paths", () => {
    expect(
      isCreateListingRequest({
        ...validRequest,
        mediaStoragePaths: ["valid", 123],
      }),
    ).toBe(false);
  });
});

describe("isUpdateListingRequest", () => {
  it("accepts valid update fields", () => {
    expect(
      isUpdateListingRequest({
        title: "Updated Title",
        priceCents: 3000,
      }),
    ).toBe(true);
    expect(
      isUpdateListingRequest({
        description: "New description text here.",
        condition: "GOOD",
      }),
    ).toBe(true);
  });

  it("rejects empty object", () => {
    expect(isUpdateListingRequest({})).toBe(false);
  });

  it("rejects extraneous fields like listingType", () => {
    expect(
      isUpdateListingRequest({
        title: "Updated",
        listingType: "WANTED",
      }),
    ).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isUpdateListingRequest({ priceCents: -50.2 })).toBe(false);
    expect(isUpdateListingRequest({ category: "cars" })).toBe(false);
  });
});

describe("isTransitionStatusRequest", () => {
  it("accepts valid transition request", () => {
    expect(isTransitionStatusRequest({ status: "reserved" })).toBe(true);
    expect(isTransitionStatusRequest({ status: "sold" })).toBe(true);
    expect(isTransitionStatusRequest({ status: "archived" })).toBe(true);
  });

  it("rejects extraneous keys or invalid status", () => {
    expect(isTransitionStatusRequest({ status: "reserved", extra: true })).toBe(
      false,
    );
    expect(isTransitionStatusRequest({ status: "deleted" })).toBe(false);
  });
});

describe("isMediaUploadIntentRequest", () => {
  it("accepts valid media upload intent", () => {
    expect(
      isMediaUploadIntentRequest({
        contentType: "image/jpeg",
        fileSizeBytes: 1024 * 1024,
      }),
    ).toBe(true);
  });

  it("rejects unsupported MIME type", () => {
    expect(
      isMediaUploadIntentRequest({
        contentType: "image/gif",
        fileSizeBytes: 1024,
      }),
    ).toBe(false);
  });

  it("rejects file larger than 5MB", () => {
    expect(
      isMediaUploadIntentRequest({
        contentType: "image/png",
        fileSizeBytes: 5 * 1024 * 1024 + 1,
      }),
    ).toBe(false);
  });

  it("rejects zero or negative file size", () => {
    expect(
      isMediaUploadIntentRequest({
        contentType: "image/webp",
        fileSizeBytes: 0,
      }),
    ).toBe(false);
  });
});
