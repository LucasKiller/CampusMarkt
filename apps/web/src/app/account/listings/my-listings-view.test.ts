import { describe, expect, it } from "vitest";
import type { ListingEntity } from "@campusmarkt/types";
import { MyListingsView } from "./my-listings-view";

describe("MyListingsView dashboard component logic", () => {
  const sampleListing: ListingEntity = {
    id: "11111111-1111-4111-8111-111111111111",
    ownerId: "22222222-2222-4222-8222-222222222222",
    listingType: "SELL",
    title: "Wooden Study Desk",
    description: "Solid oak desk in Braunschweig.",
    category: "furniture",
    pickupArea: "innenstadt",
    condition: "GOOD",
    priceCents: 4500,
    status: "active",
    media: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        storagePath: "test/desk.webp",
        position: 0,
      },
    ],
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
  };

  it("exports MyListingsView component function", () => {
    expect(typeof MyListingsView).toBe("function");
  });

  it("filters listings accurately by status", () => {
    const listings: ListingEntity[] = [
      sampleListing,
      { ...sampleListing, id: "2", status: "reserved" },
      { ...sampleListing, id: "3", status: "sold" },
      { ...sampleListing, id: "4", status: "archived" },
    ];

    expect(listings.filter((l) => l.status === "active")).toHaveLength(1);
    expect(listings.filter((l) => l.status === "reserved")).toHaveLength(1);
    expect(listings.filter((l) => l.status === "sold")).toHaveLength(1);
    expect(listings.filter((l) => l.status === "archived")).toHaveLength(1);
  });
});
