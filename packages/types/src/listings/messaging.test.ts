import { describe, expect, it } from "vitest";

import {
  isConversationDTO,
  isConversationLastMessage,
  isConversationListingSummary,
  isConversationPartnerProfile,
  isGetOrCreateConversationRequest,
  isMessageDTO,
  isSendMessageRequest,
  type ConversationDTO,
  type MessageDTO,
} from "./messaging.ts";

describe("messaging types and predicates", () => {
  const validConversation: ConversationDTO = {
    id: "11111111-1111-1111-1111-111111111111",
    listingId: "22222222-2222-2222-2222-222222222222",
    buyerId: "33333333-3333-3333-3333-333333333333",
    sellerId: "44444444-4444-4444-4444-444444444444",
    lastMessageAt: "2026-09-24T20:00:00.000Z",
    createdAt: "2026-09-24T19:00:00.000Z",
    updatedAt: "2026-09-24T20:00:00.000Z",
    unreadCount: 2,
    listing: {
      id: "22222222-2222-2222-2222-222222222222",
      title: "Calculus Textbook",
      priceCents: 2500,
      listingType: "SELL",
      status: "active",
      coverImage: "/images/textbook.jpg",
    },
    partner: {
      id: "44444444-4444-4444-4444-444444444444",
      displayName: "Max Mustermann",
      avatarUrl: null,
      universityBadge: {
        universityId: "tu-braunschweig",
        badgeLabel: "TU Braunschweig",
      },
    },
    lastMessage: {
      id: "55555555-5555-5555-5555-555555555555",
      content: "Is it still available?",
      senderId: "33333333-3333-3333-3333-333333333333",
      createdAt: "2026-09-24T20:00:00.000Z",
      readAt: null,
    },
  };

  const validMessage: MessageDTO = {
    id: "55555555-5555-5555-5555-555555555555",
    conversationId: "11111111-1111-1111-1111-111111111111",
    senderId: "33333333-3333-3333-3333-333333333333",
    content: "Hallo, ich interessiere mich für das Buch!",
    createdAt: "2026-09-24T20:00:00.000Z",
    readAt: null,
  };

  describe("isConversationDTO", () => {
    it("accepts a fully-populated conversation DTO", () => {
      expect(isConversationDTO(validConversation)).toBe(true);
    });

    it("accepts a minimal conversation DTO without optional fields", () => {
      const minimal: ConversationDTO = {
        id: "11111111-1111-1111-1111-111111111111",
        listingId: "22222222-2222-2222-2222-222222222222",
        buyerId: "33333333-3333-3333-3333-333333333333",
        sellerId: "44444444-4444-4444-4444-444444444444",
        lastMessageAt: "2026-09-24T20:00:00.000Z",
        createdAt: "2026-09-24T19:00:00.000Z",
      };
      expect(isConversationDTO(minimal)).toBe(true);
    });

    it("rejects non-objects and null", () => {
      expect(isConversationDTO(null)).toBe(false);
      expect(isConversationDTO(undefined)).toBe(false);
      expect(isConversationDTO("conversation")).toBe(false);
    });

    it("rejects when buyerId equals sellerId (self-conversation prohibited)", () => {
      expect(
        isConversationDTO({
          ...validConversation,
          buyerId: "44444444-4444-4444-4444-444444444444",
          sellerId: "44444444-4444-4444-4444-444444444444",
        }),
      ).toBe(false);
    });

    it("rejects invalid UUIDs", () => {
      expect(isConversationDTO({ ...validConversation, id: "bad-uuid" })).toBe(
        false,
      );
      expect(
        isConversationDTO({ ...validConversation, listingId: "bad-uuid" }),
      ).toBe(false);
    });

    it("rejects negative unreadCount", () => {
      expect(isConversationDTO({ ...validConversation, unreadCount: -1 })).toBe(
        false,
      );
    });

    it("rejects invalid dates", () => {
      expect(
        isConversationDTO({ ...validConversation, createdAt: "not-a-date" }),
      ).toBe(false);
      expect(
        isConversationDTO({
          ...validConversation,
          lastMessageAt: "not-a-date",
        }),
      ).toBe(false);
    });
  });

  describe("isMessageDTO", () => {
    it("accepts a valid message DTO", () => {
      expect(isMessageDTO(validMessage)).toBe(true);
    });

    it("accepts a message with readAt set to a valid timestamp", () => {
      expect(
        isMessageDTO({
          ...validMessage,
          readAt: "2026-09-24T20:05:00.000Z",
        }),
      ).toBe(true);
    });

    it("rejects whitespace-only or empty content", () => {
      expect(isMessageDTO({ ...validMessage, content: "" })).toBe(false);
      expect(isMessageDTO({ ...validMessage, content: "   \n\t  " })).toBe(
        false,
      );
    });

    it("rejects content exceeding 2000 characters", () => {
      expect(isMessageDTO({ ...validMessage, content: "a".repeat(2001) })).toBe(
        false,
      );
    });

    it("accepts content exactly 2000 characters", () => {
      expect(isMessageDTO({ ...validMessage, content: "a".repeat(2000) })).toBe(
        true,
      );
    });

    it("rejects invalid message UUIDs", () => {
      expect(isMessageDTO({ ...validMessage, id: "invalid-id" })).toBe(false);
      expect(
        isMessageDTO({ ...validMessage, conversationId: "invalid-id" }),
      ).toBe(false);
      expect(isMessageDTO({ ...validMessage, senderId: "invalid-id" })).toBe(
        false,
      );
    });
  });

  describe("isSendMessageRequest", () => {
    it("accepts valid message content", () => {
      expect(isSendMessageRequest({ content: "Guten Tag!" })).toBe(true);
    });

    it("rejects empty or whitespace-only content", () => {
      expect(isSendMessageRequest({ content: "" })).toBe(false);
      expect(isSendMessageRequest({ content: "   " })).toBe(false);
    });

    it("rejects content over 2000 characters", () => {
      expect(isSendMessageRequest({ content: "x".repeat(2001) })).toBe(false);
    });

    it("rejects extra unknown fields", () => {
      expect(isSendMessageRequest({ content: "Hallo", extraField: 123 })).toBe(
        false,
      );
    });
  });

  describe("isGetOrCreateConversationRequest", () => {
    it("accepts valid listingId", () => {
      expect(
        isGetOrCreateConversationRequest({
          listingId: "22222222-2222-2222-2222-222222222222",
        }),
      ).toBe(true);
    });

    it("rejects non-uuid listingId", () => {
      expect(
        isGetOrCreateConversationRequest({ listingId: "not-a-uuid" }),
      ).toBe(false);
    });
  });

  describe("helper predicates", () => {
    it("validates conversation listing summary", () => {
      expect(isConversationListingSummary(validConversation.listing)).toBe(
        true,
      );
      expect(
        isConversationListingSummary({
          ...validConversation.listing,
          priceCents: -50,
        }),
      ).toBe(false);
    });

    it("validates conversation partner profile", () => {
      expect(isConversationPartnerProfile(validConversation.partner)).toBe(
        true,
      );
      expect(
        isConversationPartnerProfile({
          ...validConversation.partner,
          displayName: "",
        }),
      ).toBe(false);
    });

    it("validates conversation last message", () => {
      expect(isConversationLastMessage(validConversation.lastMessage)).toBe(
        true,
      );
      expect(
        isConversationLastMessage({
          ...validConversation.lastMessage,
          senderId: "bad-id",
        }),
      ).toBe(false);
    });
  });
});
