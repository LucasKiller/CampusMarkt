import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createMarketplaceMessagingRepository,
  mapRawConversationDTO,
  mapRawMessageRowToDTO,
} from "./messaging-repository";
import type { MarketplaceMessagingClient } from "./messaging-repository";

function mockClient(
  rpcData: unknown = null,
  rpcError: unknown = null,
  tableData: unknown = null,
  tableError: unknown = null,
) {
  const rpcCalls: Array<{
    functionName: string;
    arguments_?: Record<string, unknown>;
  }> = [];

  const rpc: MarketplaceMessagingClient["rpc"] = async (
    functionName,
    arguments_,
  ) => {
    rpcCalls.push({ functionName, arguments_ });
    return { data: rpcData, error: rpcError };
  };

  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: tableData,
      error: tableError,
    })),
    then: (
      resolve?: ((value: { data: unknown; error: unknown }) => unknown) | null,
    ) => Promise.resolve({ data: tableData, error: tableError }).then(resolve),
  };

  const from = vi.fn().mockReturnValue(queryBuilder);
  const schema = vi.fn().mockReturnValue({ rpc, from });

  const client: MarketplaceMessagingClient = {
    rpc,
    schema,
    from,
  };

  return { client, rpcCalls, queryBuilder, from };
}

describe("MarketplaceMessagingRepository", () => {
  const listingId = "11111111-1111-4111-8111-111111111111";
  const conversationId = "22222222-2222-4222-8222-222222222222";
  const buyerId = "33333333-3333-4333-8333-333333333333";
  const sellerId = "44444444-4444-4444-8444-444444444444";
  const messageId = "55555555-5555-4555-8555-555555555555";
  const nowIso = "2026-09-24T20:00:00.000Z";

  describe("getOrCreateConversation", () => {
    it("calls get_or_create_conversation RPC and returns ConversationDTO", async () => {
      const mockResult = {
        conversationId,
        listingId,
        buyerId,
        sellerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.getOrCreateConversation(listingId);

      expect(result).toEqual({
        ok: true,
        value: {
          id: conversationId,
          listingId,
          buyerId,
          sellerId,
          createdAt: nowIso,
          lastMessageAt: nowIso,
        },
      });
      expect(rpcCalls).toEqual([
        {
          functionName: "get_or_create_conversation",
          arguments_: { p_listing_id: listingId },
        },
      ]);
    });

    it("maps CANNOT_MESSAGE_OWN_LISTING error", async () => {
      const { client } = mockClient(null, {
        code: "P0003",
        message: "CANNOT_MESSAGE_OWN_LISTING",
      });
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.getOrCreateConversation(listingId);
      expect(result).toEqual({
        ok: false,
        code: "CANNOT_MESSAGE_OWN_LISTING",
        message: "CANNOT_MESSAGE_OWN_LISTING",
      });
    });

    it("maps UNAUTHENTICATED error", async () => {
      const { client } = mockClient(null, {
        code: "P0001",
        message: "UNAUTHENTICATED",
      });
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.getOrCreateConversation(listingId);
      expect(result).toEqual({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "UNAUTHENTICATED",
      });
    });
  });

  describe("sendMessage", () => {
    it("calls send_message RPC and returns MessageDTO", async () => {
      const mockResult = {
        messageId,
        conversationId,
        senderId: buyerId,
        content: "Hallo, ist der Artikel noch da?",
        createdAt: nowIso,
        readAt: null,
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.sendMessage(
        conversationId,
        "Hallo, ist der Artikel noch da?",
      );

      expect(result).toEqual({
        ok: true,
        value: {
          id: messageId,
          conversationId,
          senderId: buyerId,
          content: "Hallo, ist der Artikel noch da?",
          createdAt: nowIso,
          readAt: null,
        },
      });
      expect(rpcCalls).toEqual([
        {
          functionName: "send_message",
          arguments_: {
            p_conversation_id: conversationId,
            p_content: "Hallo, ist der Artikel noch da?",
          },
        },
      ]);
    });

    it("maps INVALID_MESSAGE_CONTENT error", async () => {
      const { client } = mockClient(null, {
        code: "P0004",
        message: "INVALID_MESSAGE_CONTENT",
      });
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.sendMessage(conversationId, "");
      expect(result).toEqual({
        ok: false,
        code: "INVALID_MESSAGE_CONTENT",
        message: "INVALID_MESSAGE_CONTENT",
      });
    });

    it("maps FORBIDDEN error", async () => {
      const { client } = mockClient(null, {
        code: "P0005",
        message: "FORBIDDEN",
      });
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.sendMessage(conversationId, "Test");
      expect(result).toEqual({
        ok: false,
        code: "FORBIDDEN",
        message: "FORBIDDEN",
      });
    });
  });

  describe("markConversationRead", () => {
    it("calls mark_conversation_read RPC and returns marked count", async () => {
      const mockResult = {
        conversationId,
        markedCount: 3,
        readAt: nowIso,
      };
      const { client, rpcCalls } = mockClient(mockResult);
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.markConversationRead(conversationId);

      expect(result).toEqual({
        ok: true,
        value: {
          conversationId,
          markedCount: 3,
          readAt: nowIso,
        },
      });
      expect(rpcCalls).toEqual([
        {
          functionName: "mark_conversation_read",
          arguments_: { p_conversation_id: conversationId },
        },
      ]);
    });
  });

  describe("getUserConversations", () => {
    it("calls get_user_conversations RPC and maps array of ConversationDTOs", async () => {
      const mockConversations = [
        {
          id: conversationId,
          listingId,
          buyerId,
          sellerId,
          lastMessageAt: nowIso,
          createdAt: nowIso,
          unreadCount: 2,
          listing: {
            id: listingId,
            title: "Fahrrad",
            priceCents: 5000,
            listingType: "SELL",
            status: "active",
            coverImage: null,
          },
          partner: {
            id: sellerId,
            displayName: "Max Mustermann",
            avatarUrl: null,
            universityBadge: {
              universityId: "tu-braunschweig",
              badgeLabel: "TU Braunschweig",
            },
          },
          lastMessage: {
            id: messageId,
            content: "Ja, noch verfügbar",
            senderId: sellerId,
            createdAt: nowIso,
            readAt: null,
          },
        },
      ];
      const { client, rpcCalls } = mockClient(mockConversations);
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.getUserConversations();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.id).toBe(conversationId);
        expect(result.value[0]?.unreadCount).toBe(2);
        expect(result.value[0]?.listing?.title).toBe("Fahrrad");
        expect(result.value[0]?.partner?.displayName).toBe("Max Mustermann");
      }
      expect(rpcCalls).toEqual([
        {
          functionName: "get_user_conversations",
          arguments_: {},
        },
      ]);
    });
  });

  describe("getMessages", () => {
    it("queries messages table with cursor filtering", async () => {
      const mockMessages = [
        {
          id: messageId,
          conversation_id: conversationId,
          sender_id: buyerId,
          content: "Erste Nachricht",
          created_at: nowIso,
          read_at: null,
        },
      ];
      const { client, queryBuilder } = mockClient(null, null, mockMessages);
      const repo = createMarketplaceMessagingRepository({ service: client });

      const result = await repo.getMessages(conversationId, {
        limit: 20,
        after: "2026-09-24T19:00:00.000Z",
      });

      expect(result).toEqual({
        ok: true,
        value: [
          {
            id: messageId,
            conversationId,
            senderId: buyerId,
            content: "Erste Nachricht",
            createdAt: nowIso,
            readAt: null,
          },
        ],
      });
      expect(queryBuilder.eq).toHaveBeenCalledWith(
        "conversation_id",
        conversationId,
      );
      expect(queryBuilder.gt).toHaveBeenCalledWith(
        "created_at",
        "2026-09-24T19:00:00.000Z",
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(20);
    });
  });

  describe("DTO mappers", () => {
    it("mapRawMessageRowToDTO handles valid and invalid rows", () => {
      expect(mapRawMessageRowToDTO(null)).toBeNull();
      expect(mapRawMessageRowToDTO({})).toBeNull();
      expect(
        mapRawMessageRowToDTO({
          id: messageId,
          conversation_id: conversationId,
          sender_id: buyerId,
          content: "Hello",
          created_at: nowIso,
        }),
      ).toEqual({
        id: messageId,
        conversationId,
        senderId: buyerId,
        content: "Hello",
        createdAt: nowIso,
        readAt: null,
      });
    });

    it("mapRawConversationDTO handles valid rows", () => {
      expect(mapRawConversationDTO(null)).toBeNull();
      expect(
        mapRawConversationDTO({
          id: conversationId,
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          created_at: nowIso,
          last_message_at: nowIso,
        }),
      ).toEqual({
        id: conversationId,
        listingId,
        buyerId,
        sellerId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
      });
    });
  });
});
