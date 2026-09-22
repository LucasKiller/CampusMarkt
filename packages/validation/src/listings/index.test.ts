import { describe, expect, it } from "vitest";

import {
  parseCategory,
  parseCondition,
  parseCreateListingInput,
  parseDescription,
  parseListingType,
  parseMediaUploadIntentInput,
  parsePickupArea,
  parseStoragePath,
  parseTitle,
  parseTransitionStatusInput,
  parseUpdateListingInput,
  sanitizeListingText,
} from "./index.ts";

describe("sanitization and bounds", () => {
  it("strips script tags and html markup from text", () => {
    const raw =
      "<script>alert('xss')</script>Hello <b>World</b>! <img src='x' onerror='alert(1)' />";
    expect(sanitizeListingText(raw)).toBe("Hello World!");
  });

  it("validates title bounds and sanitizes content", () => {
    expect(parseTitle("Valid Title").ok).toBe(true);
    expect(parseTitle("    ").ok).toBe(false);
    expect(parseTitle("tiny").ok).toBe(false); // < 5 chars
    expect(parseTitle("<script>alert('xss')</script>tiny").ok).toBe(false); // sanitized length < 5
    expect(parseTitle("A".repeat(101)).ok).toBe(false); // > 100 chars
    expect(parseTitle(123).ok).toBe(false);

    const titleWithHtml = parseTitle("<h1>Vintage Bicycle</h1>");
    expect(titleWithHtml.ok).toBe(true);
    if (titleWithHtml.ok) {
      expect(titleWithHtml.value).toBe("Vintage Bicycle");
    }
  });

  it("validates description bounds and sanitizes content", () => {
    expect(parseDescription("Short desc").ok).toBe(true); // 10 chars
    expect(parseDescription("Too short").ok).toBe(false); // 9 chars
    expect(parseDescription(" ").ok).toBe(false);
    expect(parseDescription("D".repeat(2001)).ok).toBe(false);
    expect(parseDescription(null).ok).toBe(false);

    const descWithTags = parseDescription(
      "<div>This is a very solid wooden desk in great shape.</div>",
    );
    expect(descWithTags.ok).toBe(true);
    if (descWithTags.ok) {
      expect(descWithTags.value).toBe(
        "This is a very solid wooden desk in great shape.",
      );
    }
  });
});

describe("field parsers", () => {
  it("validates category", () => {
    expect(parseCategory("furniture").ok).toBe(true);
    expect(parseCategory("electronics").ok).toBe(true);
    expect(parseCategory("invalid_cat").ok).toBe(false);
    expect(parseCategory(null).ok).toBe(false);
  });

  it("validates pickup area", () => {
    expect(parsePickupArea("innenstadt").ok).toBe(true);
    expect(parsePickupArea("campus_nord_bienrode").ok).toBe(true);
    expect(parsePickupArea("hamburg").ok).toBe(false);
  });

  it("validates condition", () => {
    expect(parseCondition("NEW").ok).toBe(true);
    expect(parseCondition("FAIR").ok).toBe(true);
    expect(parseCondition("BROKEN").ok).toBe(false);
  });

  it("validates listing type", () => {
    expect(parseListingType("SELL").ok).toBe(true);
    expect(parseListingType("GIVE_AWAY").ok).toBe(true);
    expect(parseListingType("WANTED").ok).toBe(true);
    expect(parseListingType("RENT").ok).toBe(false);
  });

  it("validates storage path format", () => {
    expect(parseStoragePath("listings/user1/image.webp").ok).toBe(true);
    expect(parseStoragePath("user1/avatar.jpg").ok).toBe(true);
    expect(parseStoragePath("user1/photo.png").ok).toBe(true);
    expect(parseStoragePath("../traversal.webp").ok).toBe(false);
    expect(parseStoragePath("listings/image.gif").ok).toBe(false);
    expect(parseStoragePath("listings/image.exe").ok).toBe(false);
    expect(parseStoragePath("").ok).toBe(false);
  });
});

describe("parseCreateListingInput", () => {
  const validSellPayload = {
    listingType: "SELL",
    title: "Ergonomic Office Chair",
    description:
      "Fully adjustable office chair, barely used, excellent lumbar support.",
    category: "furniture",
    pickupArea: "campus_tu_altgebaeude",
    condition: "LIKE_NEW",
    priceCents: 4500,
    mediaStoragePaths: ["listings/user1/chair.webp"],
  };

  it("accepts valid SELL payload", () => {
    const result = parseCreateListingInput(validSellPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Ergonomic Office Chair");
      expect(result.value.priceCents).toBe(4500);
    }
  });

  it("accepts valid GIVE_AWAY payload with null or 0 price", () => {
    const result = parseCreateListingInput({
      ...validSellPayload,
      listingType: "GIVE_AWAY",
      priceCents: null,
    });
    expect(result.ok).toBe(true);

    const resultZero = parseCreateListingInput({
      ...validSellPayload,
      listingType: "GIVE_AWAY",
      priceCents: 0,
    });
    expect(resultZero.ok).toBe(true);
  });

  it("rejects GIVE_AWAY with positive price", () => {
    const result = parseCreateListingInput({
      ...validSellPayload,
      listingType: "GIVE_AWAY",
      priceCents: 500,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.priceCents).toBeDefined();
    }
  });

  it("accepts valid WANTED payload without images or price", () => {
    const result = parseCreateListingInput({
      ...validSellPayload,
      listingType: "WANTED",
      priceCents: null,
      mediaStoragePaths: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects SELL without images", () => {
    const result = parseCreateListingInput({
      ...validSellPayload,
      mediaStoragePaths: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.mediaStoragePaths).toBeDefined();
    }
  });

  it("rejects invalid storage path in mediaStoragePaths", () => {
    const result = parseCreateListingInput({
      ...validSellPayload,
      mediaStoragePaths: ["listings/bad.exe"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.mediaStoragePaths).toBeDefined();
    }
  });

  it("rejects non-object or payload with unknown fields", () => {
    expect(parseCreateListingInput("string").ok).toBe(false);
    const withExtra = parseCreateListingInput({
      ...validSellPayload,
      hack: "attempt",
    });
    expect(withExtra.ok).toBe(false);
  });
});

describe("parseUpdateListingInput", () => {
  it("accepts valid partial updates", () => {
    const result = parseUpdateListingInput({
      title: "Updated Chair Title",
      priceCents: 3500,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Updated Chair Title");
      expect(result.value.priceCents).toBe(3500);
    }
  });

  it("rejects mutation of listingType", () => {
    const result = parseUpdateListingInput({
      title: "Updated Chair Title",
      listingType: "GIVE_AWAY",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.listingType).toBeDefined();
      expect(result.fieldErrors.listingType[0]).toContain("cannot be changed");
    }
  });

  it("rejects empty update payload", () => {
    const result = parseUpdateListingInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors._form).toBeDefined();
    }
  });

  it("enforces type-specific rules when existingType is supplied", () => {
    const result = parseUpdateListingInput({ priceCents: 500 }, "GIVE_AWAY");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.priceCents).toBeDefined();
    }
  });
});

describe("parseTransitionStatusInput", () => {
  it("accepts valid target status", () => {
    expect(parseTransitionStatusInput({ status: "reserved" }).ok).toBe(true);
    expect(parseTransitionStatusInput({ status: "sold" }).ok).toBe(true);
    expect(parseTransitionStatusInput({ status: "archived" }).ok).toBe(true);
    expect(parseTransitionStatusInput({ status: "active" }).ok).toBe(true);
  });

  it("rejects invalid status", () => {
    const res = parseTransitionStatusInput({ status: "deleted" });
    expect(res.ok).toBe(false);
  });

  it("rejects extra fields or non-object", () => {
    expect(parseTransitionStatusInput("active").ok).toBe(false);
    expect(
      parseTransitionStatusInput({ status: "reserved", other: true }).ok,
    ).toBe(false);
  });
});

describe("parseMediaUploadIntentInput", () => {
  it("accepts valid intent", () => {
    const res = parseMediaUploadIntentInput({
      contentType: "image/webp",
      fileSizeBytes: 2 * 1024 * 1024,
    });
    expect(res.ok).toBe(true);
  });

  it("rejects unsupported MIME type", () => {
    const res = parseMediaUploadIntentInput({
      contentType: "image/svg+xml",
      fileSizeBytes: 1024,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors.contentType).toBeDefined();
    }
  });

  it("rejects file exceeding 5MB", () => {
    const res = parseMediaUploadIntentInput({
      contentType: "image/jpeg",
      fileSizeBytes: 5 * 1024 * 1024 + 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors.fileSizeBytes).toBeDefined();
    }
  });
});
