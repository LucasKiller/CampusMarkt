import { describe, expect, it } from "vitest";

import {
  isFeedCursor,
  isPublicFeedItem,
  isPublicFeedResponse,
  isPublicListingDetails,
  isPublicListingImage,
  isPublicListingSeller,
} from "./feed.ts";

describe("isFeedCursor", () => {
  const validCursor = {
    createdAt: "2026-09-23T10:00:00.000Z",
    id: "12345678-1234-1234-1234-123456789abc",
  };

  it("accepts valid cursor", () => {
    expect(isFeedCursor(validCursor)).toBe(true);
  });

  it("rejects non-object or null", () => {
    expect(isFeedCursor(null)).toBe(false);
    expect(isFeedCursor("some-string")).toBe(false);
    expect(isFeedCursor(123)).toBe(false);
  });

  it("rejects invalid id or non-ISO createdAt", () => {
    expect(isFeedCursor({ ...validCursor, id: "invalid-uuid" })).toBe(false);
    expect(isFeedCursor({ ...validCursor, createdAt: "not-a-date" })).toBe(
      false,
    );
  });

  it("rejects extraneous keys", () => {
    expect(isFeedCursor({ ...validCursor, extraKey: "forbidden" })).toBe(false);
  });
});

describe("isPublicListingSeller", () => {
  const validSeller = {
    publicId: "12345678-1234-1234-1234-123456789abc",
    displayName: "Jane Doe",
    avatarUrl: "/media/avatars/123/1.webp",
    universityBadge: {
      universityId: "tu-braunschweig",
      badgeLabel: "TU Braunschweig",
    },
  };

  it("accepts valid seller with badge", () => {
    expect(isPublicListingSeller(validSeller)).toBe(true);
  });

  it("accepts valid seller with null badge and null avatarUrl", () => {
    expect(
      isPublicListingSeller({
        ...validSeller,
        avatarUrl: null,
        universityBadge: null,
      }),
    ).toBe(true);
  });

  it("rejects seller with email or internal user id", () => {
    expect(
      isPublicListingSeller({
        ...validSeller,
        email: "jane@example.com",
      }),
    ).toBe(false);
    expect(
      isPublicListingSeller({
        ...validSeller,
        userId: "internal-id",
      }),
    ).toBe(false);
  });

  it("rejects invalid badge shape", () => {
    expect(
      isPublicListingSeller({
        ...validSeller,
        universityBadge: { invalid: "badge" },
      }),
    ).toBe(false);
  });
});

describe("isPublicListingImage", () => {
  it("accepts valid image", () => {
    expect(
      isPublicListingImage({
        storagePath: "listings/123/cover.webp",
        position: 0,
      }),
    ).toBe(true);
    expect(
      isPublicListingImage({
        storagePath: "listings/123/img7.webp",
        position: 7,
      }),
    ).toBe(true);
  });

  it("rejects invalid positions", () => {
    expect(
      isPublicListingImage({
        storagePath: "listings/123/cover.webp",
        position: -1,
      }),
    ).toBe(false);
    expect(
      isPublicListingImage({
        storagePath: "listings/123/cover.webp",
        position: 8,
      }),
    ).toBe(false);
    expect(
      isPublicListingImage({
        storagePath: "listings/123/cover.webp",
        position: 1.5,
      }),
    ).toBe(false);
  });

  it("rejects empty storagePath", () => {
    expect(
      isPublicListingImage({
        storagePath: "",
        position: 0,
      }),
    ).toBe(false);
  });
});

describe("isPublicFeedItem", () => {
  const validFeedItem = {
    id: "12345678-1234-1234-1234-123456789abc",
    listingType: "SELL",
    title: "Ergonomic Desk Chair",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T10:00:00.000Z",
    coverImage: "listings/123/cover.webp",
    seller: {
      publicId: "87654321-4321-4321-4321-cba987654321",
      displayName: "Max Mustermann",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
  };

  it("accepts valid active feed item", () => {
    expect(isPublicFeedItem(validFeedItem)).toBe(true);
  });

  it("accepts valid reserved feed item with null price and null coverImage", () => {
    expect(
      isPublicFeedItem({
        ...validFeedItem,
        listingType: "GIVE_AWAY",
        priceCents: null,
        status: "reserved",
        coverImage: null,
      }),
    ).toBe(true);
  });

  it("rejects sold or archived statuses in public feed", () => {
    expect(isPublicFeedItem({ ...validFeedItem, status: "sold" })).toBe(false);
    expect(isPublicFeedItem({ ...validFeedItem, status: "archived" })).toBe(
      false,
    );
  });

  it("rejects item with PII fields (email, ownerId, etc.)", () => {
    expect(
      isPublicFeedItem({
        ...validFeedItem,
        ownerId: "some-owner",
      }),
    ).toBe(false);
    expect(
      isPublicFeedItem({
        ...validFeedItem,
        email: "seller@test.de",
      }),
    ).toBe(false);
  });

  it("rejects invalid categories or pickup areas", () => {
    expect(
      isPublicFeedItem({
        ...validFeedItem,
        category: "vehicles",
      }),
    ).toBe(false);
    expect(
      isPublicFeedItem({
        ...validFeedItem,
        pickupArea: "hannover_mitte",
      }),
    ).toBe(false);
  });
});

describe("isPublicFeedResponse", () => {
  const validItem = {
    id: "12345678-1234-1234-1234-123456789abc",
    listingType: "SELL",
    title: "Ergonomic Desk Chair",
    priceCents: 4500,
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    status: "active",
    createdAt: "2026-09-23T10:00:00.000Z",
    coverImage: "listings/123/cover.webp",
    seller: {
      publicId: "87654321-4321-4321-4321-cba987654321",
      displayName: "Max Mustermann",
      avatarUrl: null,
      universityBadge: null,
    },
  };

  it("accepts valid feed response with items and nextCursor", () => {
    expect(
      isPublicFeedResponse({
        items: [validItem],
        nextCursor: "eyJjcmVhdGVkQXQiOiIyMDI2LTA5LTIzVDEwOjAwOjAwLjAwMFoifQ",
      }),
    ).toBe(true);
  });

  it("accepts valid feed response with nextCursor null", () => {
    expect(
      isPublicFeedResponse({
        items: [],
        nextCursor: null,
      }),
    ).toBe(true);
  });

  it("rejects invalid items or extraneous fields", () => {
    expect(
      isPublicFeedResponse({
        items: [{ invalid: "item" }],
        nextCursor: null,
      }),
    ).toBe(false);
    expect(
      isPublicFeedResponse({
        items: [],
        nextCursor: null,
        extra: true,
      }),
    ).toBe(false);
  });
});

describe("isPublicListingDetails", () => {
  const validDetails = {
    id: "12345678-1234-1234-1234-123456789abc",
    listingType: "SELL",
    title: "MacBook Air M2",
    description: "MacBook Air M2 in mint condition. Includes charger and box.",
    priceCents: 85000,
    category: "electronics",
    pickupArea: "campus_tu_altgebaeude",
    condition: "LIKE_NEW",
    status: "active",
    createdAt: "2026-09-23T10:00:00.000Z",
    coverImage: "listings/123/img-0.webp",
    seller: {
      publicId: "87654321-4321-4321-4321-cba987654321",
      displayName: "Tech Seller",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
    images: [
      { storagePath: "listings/123/img-0.webp", position: 0 },
      { storagePath: "listings/123/img-1.webp", position: 1 },
    ],
  };

  it("accepts valid listing details with photos and badge", () => {
    expect(isPublicListingDetails(validDetails)).toBe(true);
  });

  it("accepts sold and archived statuses for listing details", () => {
    expect(
      isPublicListingDetails({
        ...validDetails,
        status: "sold",
      }),
    ).toBe(true);
    expect(
      isPublicListingDetails({
        ...validDetails,
        status: "archived",
      }),
    ).toBe(true);
  });

  it("rejects missing description or images", () => {
    const { description, ...withoutDesc } = validDetails;
    void description;
    expect(isPublicListingDetails(withoutDesc)).toBe(false);

    const { images, ...withoutImages } = validDetails;
    void images;
    expect(isPublicListingDetails(withoutImages)).toBe(false);
  });

  it("rejects extraneous fields", () => {
    expect(
      isPublicListingDetails({
        ...validDetails,
        sellerEmail: "seller@tu-braunschweig.de",
      }),
    ).toBe(false);
  });
});
