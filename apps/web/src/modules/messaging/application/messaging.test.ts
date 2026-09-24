import { describe, expect, it, vi } from "vitest";

import {
  createMarketplaceMessagingService,
  type MessagingSecurityAudit,
  type MessagingTelemetryEvent,
} from "./messaging";
import type { MarketplaceMessagingRepository } from "../server/messaging-repository";
import type { ConversationDTO, MessageDTO } from "@campusmarkt/types";

function mockRepo() {
  return {
    getOrCreateConversation:
      vi.fn<MarketplaceMessagingRepository["getOrCreateConversation"]>(),
    sendMessage: vi.fn<MarketplaceMessagingRepository["sendMessage"]>(),
    markConversationRead:
      vi.fn<MarketplaceMessagingRepository["markConversationRead"]>(),
    getUserConversations:
      vi.fn<MarketplaceMessagingRepository["getUserConversations"]>(),
    getConversationById:
      vi.fn<MarketplaceMessagingRepository["getConversationById"]>(),
    getMessages: vi.fn<MarketplaceMessagingRepository["getMessages"]>(),
  };
}

describe("MarketplaceMessagingService", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const partnerId = "22222222-2222-4222-8222-222222222222";
  const listingId = "33333333-3333-4333-8333-333333333333";
  const conversationId = "44444444-4444-4444-8444-444444444444";
  const messageId = "55555555-5555-4555-8555-555555555555";
  const nowIso = "2026-09-24T20:00:00.000Z";

  describe("getOrCreateConversation", () => {
    it("validates input and returns invalid on malformed listingId", async () => {
      const repo = mockRepo();
      const service = createMarketplaceMessagingService({ repository: repo });

      const result = await service.getOrCreateConversation(userId, {
        listingId: "invalid-uuid",
      });

      expect(result.status).toBe("invalid");
      expect(repo.getOrCreateConversation).not.toHaveBeenCalled();
    });

    it("creates/retrieves conversation successfully and records telemetry", async () => {
      const repo = mockRepo();
      const conv: ConversationDTO = {
        id: conversationId,
        listingId,
        buyerId: userId,
        sellerId: partnerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      };
      repo.getOrCreateConversation.mockResolvedValue({
        ok: true,
        value: conv,
      });

      const telemetryEvents: MessagingTelemetryEvent[] = [];
      const security: MessagingSecurityAudit = {
        recordTelemetry: async (ev) => {
          telemetryEvents.push(ev);
        },
      };

      const service = createMarketplaceMessagingService({
        repository: repo,
        security,
      });

      const result = await service.getOrCreateConversation(
        userId,
        { listingId },
        { correlationId: "test-corr-id" },
      );

      expect(result).toEqual({ status: "success", data: conv });
      expect(repo.getOrCreateConversation).toHaveBeenCalledWith(listingId);
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0]?.eventType).toBe(
        "marketplace.conversation.created",
      );
    });

    it("prohibits self-messaging when repository reports CANNOT_MESSAGE_OWN_LISTING", async () => {
      const repo = mockRepo();
      repo.getOrCreateConversation.mockResolvedValue({
        ok: false,
        code: "CANNOT_MESSAGE_OWN_LISTING",
        message: "Users cannot message themselves on their own listings.",
      });

      const service = createMarketplaceMessagingService({ repository: repo });
      const result = await service.getOrCreateConversation(userId, {
        listingId,
      });

      expect(result).toEqual({
        status: "cannot_message_own_listing",
        message: "Users cannot message themselves on their own listings.",
      });
    });
  });

  describe("sendMessage", () => {
    it("validates input and rejects empty message content", async () => {
      const repo = mockRepo();
      const service = createMarketplaceMessagingService({ repository: repo });

      const result = await service.sendMessage(userId, conversationId, {
        content: "   ",
      });

      expect(result.status).toBe("invalid");
      expect(repo.sendMessage).not.toHaveBeenCalled();
    });

    it("enforces 30 messages/min rate limit per user", async () => {
      const repo = mockRepo();
      repo.sendMessage.mockResolvedValue({
        ok: true,
        value: {
          id: messageId,
          conversationId,
          senderId: userId,
          content: "Hello",
          createdAt: nowIso,
          readAt: null,
        },
      });

      const service = createMarketplaceMessagingService({
        repository: repo,
        rateLimitMaxMessages: 30,
        rateLimitWindowMs: 60_000,
      });

      // Send 30 messages successfully
      for (let i = 0; i < 30; i++) {
        const res = await service.sendMessage(userId, conversationId, {
          content: `Message ${i}`,
        });
        expect(res.status).toBe("success");
      }

      // 31st message must be rate limited
      const rateLimitedRes = await service.sendMessage(userId, conversationId, {
        content: "Message 31",
      });

      expect(rateLimitedRes.status).toBe("rate_limited");
      expect(rateLimitedRes).toHaveProperty("retryAfterSeconds");
      expect(repo.sendMessage).toHaveBeenCalledTimes(30);
    });

    it("respects security audit rate limit", async () => {
      const repo = mockRepo();
      const security: MessagingSecurityAudit = {
        checkRateLimit: async () => ({ allowed: false, retryAfterSeconds: 45 }),
      };
      const service = createMarketplaceMessagingService({
        repository: repo,
        security,
      });

      const res = await service.sendMessage(userId, conversationId, {
        content: "Test",
      });

      expect(res).toEqual({
        status: "rate_limited",
        retryAfterSeconds: 45,
      });
      expect(repo.sendMessage).not.toHaveBeenCalled();
    });

    it("sends message successfully and records telemetry", async () => {
      const repo = mockRepo();
      const msg: MessageDTO = {
        id: messageId,
        conversationId,
        senderId: userId,
        content: "Hi there!",
        createdAt: nowIso,
        readAt: null,
      };
      repo.sendMessage.mockResolvedValue({
        ok: true,
        value: msg,
      });

      const telemetryEvents: MessagingTelemetryEvent[] = [];
      const security: MessagingSecurityAudit = {
        recordTelemetry: async (ev) => {
          telemetryEvents.push(ev);
        },
      };

      const service = createMarketplaceMessagingService({
        repository: repo,
        security,
      });

      const result = await service.sendMessage(
        userId,
        conversationId,
        { content: "Hi there!" },
        { correlationId: "corr-123" },
      );

      expect(result).toEqual({ status: "success", data: msg });
      expect(repo.sendMessage).toHaveBeenCalledWith(
        conversationId,
        "Hi there!",
      );
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0]?.eventType).toBe("marketplace.message.sent");
    });
  });

  describe("markConversationRead", () => {
    it("marks conversation read and records telemetry", async () => {
      const repo = mockRepo();
      repo.markConversationRead.mockResolvedValue({
        ok: true,
        value: {
          conversationId,
          markedCount: 2,
          readAt: nowIso,
        },
      });

      const telemetryEvents: MessagingTelemetryEvent[] = [];
      const security: MessagingSecurityAudit = {
        recordTelemetry: async (ev) => {
          telemetryEvents.push(ev);
        },
      };

      const service = createMarketplaceMessagingService({
        repository: repo,
        security,
      });

      const result = await service.markConversationRead(userId, conversationId);

      expect(result).toEqual({
        status: "success",
        data: {
          conversationId,
          markedCount: 2,
          readAt: nowIso,
        },
      });
      expect(repo.markConversationRead).toHaveBeenCalledWith(conversationId);
      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0]?.eventType).toBe(
        "marketplace.conversation.read",
      );
    });
  });

  describe("getConversationById", () => {
    it("returns conversation when user is participant", async () => {
      const repo = mockRepo();
      const conv: ConversationDTO = {
        id: conversationId,
        listingId,
        buyerId: userId,
        sellerId: partnerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      };
      repo.getConversationById.mockResolvedValue({
        ok: true,
        value: conv,
      });

      const service = createMarketplaceMessagingService({ repository: repo });
      const result = await service.getConversationById(userId, conversationId);

      expect(result).toEqual({ status: "success", data: conv });
    });

    it("returns forbidden when user is not participant", async () => {
      const repo = mockRepo();
      const conv: ConversationDTO = {
        id: conversationId,
        listingId,
        buyerId: "stranger-1-4444-4444-8444-444444444444",
        sellerId: partnerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      };
      repo.getConversationById.mockResolvedValue({
        ok: true,
        value: conv,
      });

      const service = createMarketplaceMessagingService({ repository: repo });
      const result = await service.getConversationById(userId, conversationId);

      expect(result.status).toBe("forbidden");
    });
  });

  describe("getMessages", () => {
    it("returns paginated messages", async () => {
      const repo = mockRepo();
      const msg: MessageDTO = {
        id: messageId,
        conversationId,
        senderId: userId,
        content: "Hello",
        createdAt: nowIso,
        readAt: null,
      };
      repo.getMessages.mockResolvedValue({
        ok: true,
        value: [msg],
      });

      const service = createMarketplaceMessagingService({ repository: repo });
      const result = await service.getMessages(userId, conversationId, {
        limit: 10,
      });

      expect(result).toEqual({
        status: "success",
        data: {
          messages: [msg],
          hasMore: false,
          nextCursor: null,
        },
      });
      expect(repo.getMessages).toHaveBeenCalledWith(conversationId, {
        limit: 10,
        before: undefined,
        after: undefined,
      });
    });
  });
});
