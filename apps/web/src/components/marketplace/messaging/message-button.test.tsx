import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { MessageButton } from "./message-button";

describe("MessageButton component (T15)", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  const sellerId = "seller-2222-4222-8222-222222222222";
  const buyerId = "buyer-3333-4333-8333-333333333333";

  it("renders Nachricht schreiben CTA button for prospective buyer", () => {
    const html = renderToString(
      <MessageButton
        listingId={listingId}
        sellerId={sellerId}
        currentUserId={buyerId}
      />,
    );

    expect(html).toContain('data-testid="cta-send-message"');
    expect(html).toContain("Nachricht schreiben");
  });

  it("renders Nachricht schreiben CTA button for guest/unauthenticated user", () => {
    const html = renderToString(
      <MessageButton
        listingId={listingId}
        sellerId={sellerId}
        currentUserId={null}
      />,
    );

    expect(html).toContain('data-testid="cta-send-message"');
    expect(html).toContain("Nachricht schreiben");
  });

  it("does not render for listing owner (prohibits self-messaging entry point)", () => {
    const html = renderToString(
      <MessageButton
        listingId={listingId}
        sellerId={sellerId}
        currentUserId={sellerId}
      />,
    );

    expect(html).toBe("");
  });

  it("hides the CTA when the owner's public ID differs from their auth ID", () => {
    const html = renderToString(
      <MessageButton
        listingId={listingId}
        sellerId={sellerId}
        currentUserId="auth-user-id"
        isListingOwner={true}
      />,
    );

    expect(html).toBe("");
  });

  it("uses English on an English listing", () => {
    const html = renderToString(
      <MessageButton
        listingId={listingId}
        sellerId={sellerId}
        currentUserId={buyerId}
        locale="en"
      />,
    );

    expect(html).toContain("Message seller");
  });
});
