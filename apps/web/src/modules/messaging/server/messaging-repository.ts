import "server-only";

import type {
  ConversationDTO,
  GetMessagesQuery,
  MessageDTO,
} from "@campusmarkt/types";
import { isConversationDTO, isMessageDTO } from "@campusmarkt/types";
import type { MarketplaceRpcClient } from "../../listings/server/repository";

export type MarketplaceMessagingErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CANNOT_MESSAGE_OWN_LISTING"
  | "INVALID_MESSAGE_CONTENT"
  | "INVALID_INPUT"
  | "RATE_LIMIT_EXCEEDED"
  | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE";

export type MarketplaceMessagingResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: MarketplaceMessagingErrorCode; message?: string };

export type MarketplaceMessagingClient = MarketplaceRpcClient;

export function mapRawMessageRowToDTO(raw: unknown): MessageDTO | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;

  const id = row.id ?? row.messageId;
  const conversationId = row.conversation_id ?? row.conversationId;
  const senderId = row.sender_id ?? row.senderId;
  const content = row.content;

  if (
    typeof id !== "string" ||
    typeof conversationId !== "string" ||
    typeof senderId !== "string" ||
    typeof content !== "string"
  ) {
    return null;
  }

  let createdAt: string;
  try {
    createdAt = new Date(String(row.created_at ?? row.createdAt)).toISOString();
  } catch {
    return null;
  }

  let readAt: string | null = null;
  if (row.read_at !== undefined && row.read_at !== null) {
    try {
      readAt = new Date(String(row.read_at)).toISOString();
    } catch {
      return null;
    }
  } else if (row.readAt !== undefined && row.readAt !== null) {
    try {
      readAt = new Date(String(row.readAt)).toISOString();
    } catch {
      return null;
    }
  }

  const candidate = {
    id,
    conversationId,
    senderId,
    content,
    createdAt,
    readAt,
  };

  if (!isMessageDTO(candidate)) {
    return null;
  }

  return candidate;
}

export function mapRawConversationDTO(raw: unknown): ConversationDTO | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const row = raw as Record<string, unknown>;

  const id = row.id ?? row.conversationId;
  const listingId = row.listing_id ?? row.listingId;
  const buyerId = row.buyer_id ?? row.buyerId;
  const sellerId = row.seller_id ?? row.sellerId;

  if (
    typeof id !== "string" ||
    typeof listingId !== "string" ||
    typeof buyerId !== "string" ||
    typeof sellerId !== "string"
  ) {
    return null;
  }

  let createdAt: string;
  try {
    createdAt = new Date(String(row.created_at ?? row.createdAt)).toISOString();
  } catch {
    return null;
  }

  let lastMessageAt: string;
  try {
    lastMessageAt = new Date(
      String(row.last_message_at ?? row.lastMessageAt ?? createdAt),
    ).toISOString();
  } catch {
    return null;
  }

  const candidate: Record<string, unknown> = {
    id,
    listingId,
    buyerId,
    sellerId,
    lastMessageAt,
    createdAt,
  };

  if (row.updated_at !== undefined && row.updated_at !== null) {
    try {
      candidate.updatedAt = new Date(String(row.updated_at)).toISOString();
    } catch {
      // ignore
    }
  } else if (row.updatedAt !== undefined && row.updatedAt !== null) {
    try {
      candidate.updatedAt = new Date(String(row.updatedAt)).toISOString();
    } catch {
      // ignore
    }
  }

  if (typeof row.unread_count === "number") {
    candidate.unreadCount = row.unread_count;
  } else if (typeof row.unreadCount === "number") {
    candidate.unreadCount = row.unreadCount;
  }

  if (row.listing !== undefined && row.listing !== null) {
    candidate.listing = row.listing;
  }

  if (row.partner !== undefined && row.partner !== null) {
    candidate.partner = row.partner;
  }

  if (row.lastMessage !== undefined && row.lastMessage !== null) {
    candidate.lastMessage = row.lastMessage;
  } else if (row.last_message !== undefined && row.last_message !== null) {
    candidate.lastMessage = row.last_message;
  }

  if (!isConversationDTO(candidate)) {
    return null;
  }

  return candidate;
}

export function mapMessagingDatabaseError(error: unknown): {
  code: MarketplaceMessagingErrorCode;
  message?: string;
} {
  const err = error as { code?: string; message?: string };
  const message = err.message || "";

  if (
    err.code === "P0001" ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("unauthenticated")
  ) {
    return { code: "UNAUTHENTICATED", message };
  }

  if (
    err.code === "P0002" ||
    message.includes("CONVERSATION_NOT_FOUND") ||
    message.includes("LISTING_NOT_FOUND") ||
    message.includes("not found")
  ) {
    return { code: "NOT_FOUND", message };
  }

  if (err.code === "P0003" || message.includes("CANNOT_MESSAGE_OWN_LISTING")) {
    return { code: "CANNOT_MESSAGE_OWN_LISTING", message };
  }

  if (err.code === "P0006" || message.includes("RATE_LIMIT_EXCEEDED")) {
    return { code: "RATE_LIMIT_EXCEEDED", message };
  }

  if (err.code === "P0004" || message.includes("INVALID_MESSAGE_CONTENT")) {
    return { code: "INVALID_MESSAGE_CONTENT", message };
  }

  if (
    err.code === "P0005" ||
    err.code === "42501" ||
    message.includes("FORBIDDEN") ||
    message.includes("permission denied")
  ) {
    return { code: "FORBIDDEN", message };
  }

  if (
    err.code === "22023" ||
    err.code === "22P02" ||
    message.includes("INVALID_INPUT") ||
    message.includes("invalid")
  ) {
    return { code: "INVALID_INPUT", message };
  }

  return { code: "DEPENDENCY_UNAVAILABLE", message };
}

async function callMarketplaceRpc(
  client: MarketplaceRpcClient,
  functionName: string,
  arguments_?: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  const target =
    typeof client.schema === "function"
      ? (client.schema("marketplace_api") as unknown as MarketplaceRpcClient)
      : client;

  return target.rpc(functionName, arguments_);
}

export interface MarketplaceMessagingRepository {
  getOrCreateConversation(
    listingId: string,
  ): Promise<MarketplaceMessagingResult<ConversationDTO>>;
  sendMessage(
    conversationId: string,
    content: string,
  ): Promise<MarketplaceMessagingResult<MessageDTO>>;
  markConversationRead(conversationId: string): Promise<
    MarketplaceMessagingResult<{
      conversationId: string;
      markedCount: number;
      readAt: string;
    }>
  >;
  getUserConversations(): Promise<
    MarketplaceMessagingResult<ConversationDTO[]>
  >;
  getConversationById(
    conversationId: string,
  ): Promise<MarketplaceMessagingResult<ConversationDTO>>;
  getMessages(
    conversationId: string,
    query?: GetMessagesQuery,
  ): Promise<MarketplaceMessagingResult<MessageDTO[]>>;
}

export function createMarketplaceMessagingRepository(clients: {
  service: MarketplaceMessagingClient;
}): MarketplaceMessagingRepository {
  const { service } = clients;

  return {
    async getOrCreateConversation(
      listingId: string,
    ): Promise<MarketplaceMessagingResult<ConversationDTO>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_or_create_conversation",
          { p_listing_id: listingId },
        );

        if (error) {
          return { ok: false, ...mapMessagingDatabaseError(error) };
        }

        const dto = mapRawConversationDTO(data);
        if (!dto) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "get_or_create_conversation returned unexpected format",
          };
        }

        return { ok: true, value: dto };
      } catch (err) {
        console.error(
          "[MarketplaceMessagingRepository: getOrCreateConversation]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async sendMessage(
      conversationId: string,
      content: string,
    ): Promise<MarketplaceMessagingResult<MessageDTO>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "send_message",
          {
            p_conversation_id: conversationId,
            p_content: content,
          },
        );

        if (error) {
          return { ok: false, ...mapMessagingDatabaseError(error) };
        }

        const dto = mapRawMessageRowToDTO(data);
        if (!dto) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "send_message RPC returned unexpected format",
          };
        }

        return { ok: true, value: dto };
      } catch (err) {
        console.error("[MarketplaceMessagingRepository: sendMessage]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async markConversationRead(conversationId: string): Promise<
      MarketplaceMessagingResult<{
        conversationId: string;
        markedCount: number;
        readAt: string;
      }>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "mark_conversation_read",
          { p_conversation_id: conversationId },
        );

        if (error) {
          return { ok: false, ...mapMessagingDatabaseError(error) };
        }

        const res = data as Record<string, unknown> | null;
        if (!res || typeof res.conversationId !== "string") {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "mark_conversation_read returned unexpected format",
          };
        }

        const readAt =
          res.readAt !== undefined && res.readAt !== null
            ? new Date(String(res.readAt)).toISOString()
            : new Date().toISOString();

        return {
          ok: true,
          value: {
            conversationId: res.conversationId,
            markedCount: Number(res.markedCount ?? 0),
            readAt,
          },
        };
      } catch (err) {
        console.error(
          "[MarketplaceMessagingRepository: markConversationRead]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getUserConversations(): Promise<
      MarketplaceMessagingResult<ConversationDTO[]>
    > {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_user_conversations",
          {},
        );

        if (error) {
          return { ok: false, ...mapMessagingDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "get_user_conversations returned non-array",
          };
        }

        const result: ConversationDTO[] = [];
        for (const item of data) {
          const dto = mapRawConversationDTO(item);
          if (dto) {
            result.push(dto);
          }
        }

        result.sort(
          (a, b) =>
            b.lastMessageAt.localeCompare(a.lastMessageAt) ||
            b.id.localeCompare(a.id),
        );
        return { ok: true, value: result };
      } catch (err) {
        console.error(
          "[MarketplaceMessagingRepository: getUserConversations]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getConversationById(
      conversationId: string,
    ): Promise<MarketplaceMessagingResult<ConversationDTO>> {
      try {
        const inboxRes = await this.getUserConversations();
        if (!inboxRes.ok) {
          return inboxRes;
        }
        const found = inboxRes.value.find((c) => c.id === conversationId);
        return found
          ? { ok: true, value: found }
          : {
              ok: false,
              code: "NOT_FOUND",
              message: "Conversation not found",
            };
      } catch (err) {
        console.error(
          "[MarketplaceMessagingRepository: getConversationById]",
          err,
        );
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },

    async getMessages(
      conversationId: string,
      query?: GetMessagesQuery,
    ): Promise<MarketplaceMessagingResult<MessageDTO[]>> {
      try {
        const { data, error } = await callMarketplaceRpc(
          service,
          "get_messages",
          {
            p_conversation_id: conversationId,
            p_before: query?.before ?? null,
            p_after: query?.after ?? null,
            p_limit: query?.limit ?? 50,
          },
        );

        if (error) {
          return { ok: false, ...mapMessagingDatabaseError(error) };
        }

        if (!Array.isArray(data)) {
          return {
            ok: false,
            code: "INVALID_PROVIDER_RESPONSE",
            message: "get_messages returned non-array",
          };
        }

        const messages: MessageDTO[] = [];
        for (const item of data) {
          const dto = mapRawMessageRowToDTO(item);
          if (dto) {
            messages.push(dto);
          }
        }

        return {
          ok: true,
          value: query?.after ? messages : messages.reverse(),
        };
      } catch (err) {
        console.error("[MarketplaceMessagingRepository: getMessages]", err);
        return { ok: false, code: "DEPENDENCY_UNAVAILABLE" };
      }
    },
  };
}
