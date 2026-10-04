import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicFeedItem } from "@campusmarkt/types";
import { HomeHeroShowcase } from "./home-hero-showcase";

const noPhotoItem: PublicFeedItem = {
  id: "00000000-0000-4000-8000-000000000001",
  listingType: "WANTED",
  title: "Looking for a bike lock",
  priceCents: 1500,
  category: "bicycles_mobility",
  pickupArea: "innenstadt",
  condition: "GOOD",
  status: "active",
  createdAt: "2026-09-27T08:00:00.000Z",
  coverImage: null,
  seller: {
    publicId: "seller-1",
    displayName: "Mira",
    avatarUrl: null,
    universityBadge: null,
  },
};

describe("HomeHeroShowcase", () => {
  it("renders stored listing photos from the public bucket", () => {
    const html = renderToStaticMarkup(
      <HomeHeroShowcase
        items={[{ ...noPhotoItem, coverImage: "owner/cover.webp" }]}
        locale="en"
      />,
    );

    expect(html).toContain(
      'src="/storage/v1/object/public/listing-media/owner/cover.webp"',
    );
  });

  it("uses a textual tile when a live listing has no photo", () => {
    const html = renderToStaticMarkup(
      <HomeHeroShowcase items={[noPhotoItem]} locale="en" />,
    );

    expect(html).toContain("Looking for a bike lock");
    expect(html).toContain(
      'href="/listings/00000000-0000-4000-8000-000000000001"',
    );
    expect(html).not.toContain("<img");
  });

  it("uses marketplace actions rather than invented listings when the feed is empty", () => {
    const html = renderToStaticMarkup(
      <HomeHeroShowcase items={[]} locale="en" />,
    );

    expect(html).toContain('href="/search?listingType=SELL"');
    expect(html).toContain('href="/search?listingType=GIVE_AWAY"');
    expect(html).toContain('href="/search?listingType=WANTED"');
    expect(html).not.toContain('href="/listings/');
    expect(html).not.toContain("<img");
  });
});
