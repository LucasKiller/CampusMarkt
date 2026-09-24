import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createCreateConversationHandler,
  createGetConversationsHandler,
} from "../../../apps/web/src/app/api/marketplace/conversations/route.ts";
import {
  createGetMessagesHandler,
  createSendMessageHandler,
} from "../../../apps/web/src/app/api/marketplace/conversations/[id]/messages/route.ts";
import { createMarkConversationReadHandler } from "../../../apps/web/src/app/api/marketplace/conversations/[id]/read/route.ts";
import type { MarketplaceMessagingService } from "../../../apps/web/src/modules/messaging/server/index.ts";
import type { ConversationDTO, MessageDTO } from "@campusmarkt/types";

const canonicalOrigin = "https://markt.example.test";
const buyerId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const conversationId = "44444444-4444-4444-8444-444444444444";
const messageId = "55555555-5555-4555-8555-555555555555";
const nowIso = "2026-09-24T20:00:00.000Z";

function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      origin: canonicalOrigin,
      ...headers,
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
}

function mockSessionDal(
  activeIdentity: { authUserId: string } | null = { authUserId: buyerId },
) {
  return () =>
    ({
      async requireActiveIdentity() {
        if (!activeIdentity) {
          throw new Error("UNAUTHENTICATED");
        }
        return activeIdentity;
      },
    }) as never;
}

describe("marketplace messaging routes integration (T11 & T12)", () => {
  describe("GET /api/marketplace/conversations", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        getUserConversations: vi.fn(),
      };

      const handler = createGetConversationsHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations`,
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe("UNAUTHENTICATED");
      expect(mockService.getUserConversations).not.toHaveBeenCalled();
    });

    it("returns 200 with conversations list when authenticated", async () => {
      const mockConv: ConversationDTO = {
        id: conversationId,
        listingId,
        buyerId,
        sellerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      };

      const mockService: Partial<MarketplaceMessagingService> = {
        getUserConversations: vi.fn().mockResolvedValue({
          status: "success",
          data: [mockConv],
        }),
      };

      const handler = createGetConversationsHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations`,
      );
      const res = await handler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.conversations).toHaveLength(1);
      expect(data.data.conversations[0]?.id).toBe(conversationId);
      expect(mockService.getUserConversations).toHaveBeenCalledWith(buyerId, {
        correlationId: expect.any(String),
      });
    });
  });

  describe("POST /api/marketplace/conversations", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        getOrCreateConversation: vi.fn(),
      };

      const handler = createCreateConversationHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations`,
        { listingId },
      );
      const res = await handler(req);

      expect(res.status).toBe(401);
      expect(mockService.getOrCreateConversation).not.toHaveBeenCalled();
    });

    it("returns 403 when CSRF origin check fails", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        getOrCreateConversation: vi.fn(),
      };

      const handler = createCreateConversationHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://evil-attacker.example.com",
          },
          body: JSON.stringify({ listingId }),
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe("FORBIDDEN");
      expect(mockService.getOrCreateConversation).not.toHaveBeenCalled();
    });

    it("accepts request when origin matches dynamic request origin (Constraint 2)", async () => {
      const mockConv: ConversationDTO = {
        id: conversationId,
        listingId,
        buyerId,
        sellerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      };

      const mockService: Partial<MarketplaceMessagingService> = {
        getOrCreateConversation: vi.fn().mockResolvedValue({
          status: "success",
          data: mockConv,
        }),
      };

      const handler = createCreateConversationHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        "https://canonical.production.url", // different canonical
      );

      const dynamicPortUrl =
        "http://127.0.0.1:41234/api/marketplace/conversations";
      const req = new Request(dynamicPortUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:41234",
        },
        body: JSON.stringify({ listingId }),
      });

      const res = await handler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.conversation.id).toBe(conversationId);
    });

    it("returns 403 when self-messaging is rejected", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        getOrCreateConversation: vi.fn().mockResolvedValue({
          status: "cannot_message_own_listing",
          message: "Users cannot message themselves on their own listings.",
        }),
      };

      const handler = createCreateConversationHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: sellerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations`,
        { listingId },
      );
      const res = await handler(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("returns 400 when body has invalid format", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        getOrCreateConversation: vi.fn(),
      };

      const handler = createCreateConversationHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: canonicalOrigin,
          },
          body: "not-json-content",
        },
      );
      const res = await handler(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });

  describe("GET /api/marketplace/conversations/[id]/messages (T12)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        getMessages: vi.fn(),
      };

      const handler = createGetMessagesHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/messages`,
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(401);
      expect(mockService.getMessages).not.toHaveBeenCalled();
    });

    it("returns 200 with messages and cursor pagination", async () => {
      const mockMsg: MessageDTO = {
        id: messageId,
        conversationId,
        senderId: buyerId,
        content: "Hallo, ist der Artikel noch da?",
        createdAt: nowIso,
        readAt: null,
      };

      const mockService: Partial<MarketplaceMessagingService> = {
        getMessages: vi.fn().mockResolvedValue({
          status: "success",
          data: {
            messages: [mockMsg],
            hasMore: false,
            nextCursor: null,
          },
        }),
      };

      const handler = createGetMessagesHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/messages?limit=20`,
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.messages).toHaveLength(1);
      expect(data.data.messages[0]?.id).toBe(messageId);
      expect(mockService.getMessages).toHaveBeenCalledWith(
        buyerId,
        conversationId,
        expect.objectContaining({ limit: "20" }),
        expect.any(Object),
      );
    });
  });

  describe("POST /api/marketplace/conversations/[id]/messages (T12)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        sendMessage: vi.fn(),
      };

      const handler = createSendMessageHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/messages`,
        { content: "Hello" },
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(401);
      expect(mockService.sendMessage).not.toHaveBeenCalled();
    });

    it("returns 403 when CSRF check fails", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        sendMessage: vi.fn(),
      };

      const handler = createSendMessageHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = new Request(
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://evil.attacker.com",
          },
          body: JSON.stringify({ content: "Hello" }),
        },
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(403);
      expect(mockService.sendMessage).not.toHaveBeenCalled();
    });

    it("returns 429 when rate limited", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        sendMessage: vi.fn().mockResolvedValue({
          status: "rate_limited",
          retryAfterSeconds: 30,
        }),
      };

      const handler = createSendMessageHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/messages`,
        { content: "Hello" },
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("RATE_LIMITED");
      expect(data.retryAfterSeconds).toBe(30);
    });

    it("returns 201 when message is posted successfully", async () => {
      const mockMsg: MessageDTO = {
        id: messageId,
        conversationId,
        senderId: buyerId,
        content: "Hello there!",
        createdAt: nowIso,
        readAt: null,
      };

      const mockService: Partial<MarketplaceMessagingService> = {
        sendMessage: vi.fn().mockResolvedValue({
          status: "success",
          data: mockMsg,
        }),
      };

      const handler = createSendMessageHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/messages`,
        { content: "Hello there!" },
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.message.id).toBe(messageId);
      expect(data.data.message.content).toBe("Hello there!");
    });
  });

  describe("POST /api/marketplace/conversations/[id]/read (T12)", () => {
    it("returns 401 when unauthenticated", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        markConversationRead: vi.fn(),
      };

      const handler = createMarkConversationReadHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal(null),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/read`,
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(401);
      expect(mockService.markConversationRead).not.toHaveBeenCalled();
    });

    it("returns 200 with marked count when successfully marked read", async () => {
      const mockService: Partial<MarketplaceMessagingService> = {
        markConversationRead: vi.fn().mockResolvedValue({
          status: "success",
          data: {
            conversationId,
            markedCount: 3,
            readAt: nowIso,
          },
        }),
      };

      const handler = createMarkConversationReadHandler(
        mockService as MarketplaceMessagingService,
        mockSessionDal({ authUserId: buyerId }),
        canonicalOrigin,
      );

      const req = jsonRequest(
        "POST",
        `${canonicalOrigin}/api/marketplace/conversations/${conversationId}/read`,
      );
      const res = await handler(req, { params: { id: conversationId } });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.data.success).toBe(true);
      expect(data.data.markedCount).toBe(3);
      expect(mockService.markConversationRead).toHaveBeenCalledWith(
        buyerId,
        conversationId,
        expect.any(Object),
      );
    });
  });
});
