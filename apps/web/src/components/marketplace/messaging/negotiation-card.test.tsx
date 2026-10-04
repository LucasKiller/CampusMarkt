import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NegotiationCard } from "./negotiation-card";

describe("NegotiationCard listing photo", () => {
  it("loads a conversation listing cover from the public Storage route", () => {
    const html = renderToString(
      <NegotiationCard
        listing={{
          id: "listing-1",
          title: "Desk lamp",
          priceCents: 1000,
          listingType: "SELL",
          status: "active",
          coverImage: "owner/lamp.webp",
        }}
        currentUserId="buyer-1"
      />,
    );

    expect(html).toContain(
      'src="/storage/v1/object/public/listing-media/owner/lamp.webp"',
    );
  });
});
