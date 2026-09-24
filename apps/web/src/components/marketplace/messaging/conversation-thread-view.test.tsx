import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { ConversationThreadView } from "./conversation-thread-view";
import type {
  ConversationDTO,
  MessageDTO,
  OfferDTO,
  ReservationDTO,
} from "@campusmarkt/types";

describe("ConversationThreadView component (T14)", () => {
  const currentUserId = "buyer-1111-4111-8111-111111111111";
  const sellerId = "seller-2222-4222-8222-222222222222";
  const conversationId = "conv-3333-4333-8333-333333333333";
  const listingId = "listing-4444-4444-8444-444444444444";

  const conversation: ConversationDTO = {
    id: conversationId,
    listingId,
    buyerId: currentUserId,
    sellerId,
    createdAt: "2026-09-24T18:00:00.000Z",
    lastMessageAt: "2026-09-24T18:05:00.000Z",
    partner: {
      id: sellerId,
      displayName: "Marie Curie",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
    listing: {
      id: listingId,
      title: "Physik 1 Lehrbuch",
      priceCents: 2000,
      listingType: "SELL",
      status: "active",
      coverImage: null,
    },
  };

  const sampleMessages: MessageDTO[] = [
    {
      id: "msg-1",
      conversationId,
      senderId: currentUserId,
      content: "Hallo Marie, ist das Buch noch da?",
      createdAt: "2026-09-24T18:01:00.000Z",
      readAt: "2026-09-24T18:02:00.000Z",
    },
    {
      id: "msg-2",
      conversationId,
      senderId: sellerId,
      content: "Ja, noch verfügbar!",
      createdAt: "2026-09-24T18:03:00.000Z",
      readAt: null,
    },
  ];

  it("renders partner profile with name, avatar and university trust badge (MSG-03)", () => {
    const html = renderToString(
      <ConversationThreadView
        conversation={conversation}
        currentUserId={currentUserId}
        initialMessages={sampleMessages}
      />,
    );

    expect(html).toContain('data-testid="conversation-header"');
    expect(html).toContain('data-testid="partner-name"');
    expect(html).toContain("Marie Curie");
    expect(html).toContain('data-testid="partner-avatar"');
    expect(html).toContain('data-testid="partner-badge"');
    expect(html).toContain("TU Braunschweig");
  });

  it("renders negotiation card with active offer status (MSG-05)", () => {
    const activeOffer: OfferDTO = {
      id: "offer-1",
      listingId,
      buyerId: currentUserId,
      sellerId,
      amountCents: 1500,
      message: null,
      status: "pending",
      createdAt: "2026-09-24T18:02:00.000Z",
    };

    const html = renderToString(
      <ConversationThreadView
        conversation={conversation}
        currentUserId={currentUserId}
        initialMessages={sampleMessages}
        initialOffers={[activeOffer]}
      />,
    );

    expect(html).toContain('data-testid="negotiation-status-card"');
    expect(html).toContain('data-testid="negotiation-badge-offer"');
    expect(html).toContain("€15.00");
  });

  it("renders negotiation card with active reservation status and cancel button (MSG-05)", () => {
    const activeReservation: ReservationDTO = {
      id: "res-1",
      listingId,
      buyerId: currentUserId,
      sellerId,
      offerId: "offer-1",
      agreedPriceCents: 2000,
      status: "active",
      createdAt: "2026-09-24T18:05:00.000Z",
    };

    const html = renderToString(
      <ConversationThreadView
        conversation={conversation}
        currentUserId={currentUserId}
        initialMessages={sampleMessages}
        initialReservation={activeReservation}
      />,
    );

    expect(html).toContain('data-testid="negotiation-status-card"');
    expect(html).toContain('data-testid="negotiation-badge-reserved"');
    expect(html).toContain("Reserviert");
    expect(html).toContain("€20.00");
    expect(html).toContain("Stornieren");
  });

  it("renders messages list and composer form", () => {
    const html = renderToString(
      <ConversationThreadView
        conversation={conversation}
        currentUserId={currentUserId}
        initialMessages={sampleMessages}
      />,
    );

    expect(html).toContain('role="log"');
    expect(html).toContain("Hallo Marie, ist das Buch noch da?");
    expect(html).toContain("Ja, noch verfügbar!");
    expect(html).toContain('aria-label="Nachricht schreiben"');
    expect(html).toContain('aria-label="Nachricht senden"');
  });
});
