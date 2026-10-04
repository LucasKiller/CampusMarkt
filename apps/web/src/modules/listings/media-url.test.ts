import { describe, expect, it } from "vitest";
import { listingMediaUrl } from "./media-url";

describe("listingMediaUrl", () => {
  it("resolves a stored object through the public listing bucket", () => {
    expect(listingMediaUrl("owner/photo.webp")).toBe(
      "/storage/v1/object/public/listing-media/owner/photo.webp",
    );
  });

  it("encodes file names while preserving folder separators", () => {
    expect(listingMediaUrl("owner/my photo #1.webp")).toBe(
      "/storage/v1/object/public/listing-media/owner/my%20photo%20%231.webp",
    );
  });

  it("preserves existing absolute photo URLs", () => {
    expect(listingMediaUrl("https://example.org/photo.webp")).toBe(
      "https://example.org/photo.webp",
    );
  });
});
