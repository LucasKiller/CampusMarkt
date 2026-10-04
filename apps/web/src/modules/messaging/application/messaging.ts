import {
  assertCanMessage,
  canMessage,
  resolveConversationPartner,
  formatOfferMilestone,
  formatReservationMilestone,
  SelfMessagingError,
} from "@campusmarkt/domain";
import type {
  ConversationDTO,
  GetMessagesQuery,
  GetMessagesResponse,
  GetOrCreateConversationRequest,
  MessageDTO,
  SendMessageRequest,
} from "@campusmarkt/types";
import {
  validateConversationIdParam,
  validateGetMessagesQuery,
  validateGetOrCreateConversationInput,
  validateSendMessageInput,
} from "@campusmarkt/validation";
import type {
  MarketplaceMessagingRepository,
  MarketplaceMessagingResult,
} from "../server/messaging-repository";

export {
  assertCanMessage,
  canMessage,
  resolveConversationPartner,
  formatOfferMilestone,
  formatReservationMilestone,
  SelfMessagingError,
};

export type {
  ConversationDTO,
  MessageDTO,
  SendMessageRequest,
  GetOrCreateConversationRequest,
  GetMessagesQuery,
  GetMessagesResponse,
};

export type MessagingTelemetryEvent = {
  eventType:
    | "marketplace.message.sent"
    | "marketplace.conversation.read"
    | "marketplace.conversation.created"
    | "marketplace.conversation.retrieved";
  correlationId?: string;
  metadata?: {
    conversationId?: string;
    listingId?: string;
    senderId?: string;
    userId?: string;
    outcome?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

export type MessagingSecurityAudit = {
  recordTelemetry?(event: MessagingTelemetryEvent): Promise<void>;
  checkRateLimit?(
    userId: string,
    action: "send_message" | "start_conversation",
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
};

export type MessagingApplicationResult<T> =
  | { status: "success"; data: T }
  | {
      status: "invalid";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { status: "rate_limited"; retryAfterSeconds: number }
  | { status: "cannot_message_own_listing"; message: string }
  | { status: "forbidden"; message?: string }
  | { status: "not_found"; message?: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export interface MarketplaceMessagingService {
  getOrCreateConversation(
    userId: string,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<MessagingApplicationResult<ConversationDTO>>;

  sendMessage(
    userId: string,
    conversationIdInput: unknown,
    input: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<MessagingApplicationResult<MessageDTO>>;

  markConversationRead(
    userId: string,
    conversationIdInput: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<
    MessagingApplicationResult<{
      conversationId: string;
      markedCount: number;
      readAt: string;
    }>
  >;

  getUserConversations(
    userId: string,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<MessagingApplicationResult<ConversationDTO[]>>;

  getConversationById(
    userId: string,
    conversationIdInput: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<MessagingApplicationResult<ConversationDTO>>;

  getMessages(
    userId: string,
    conversationIdInput: unknown,
    queryInput?: unknown,
    context?: { correlationId?: string; clientIp?: string },
  ): Promise<MessagingApplicationResult<GetMessagesResponse>>;
}

export function createMarketplaceMessagingService(ports: {
  repository: MarketplaceMessagingRepository;
  security?: MessagingSecurityAudit;
}): MarketplaceMessagingService {
  const { repository, security = {} } = ports;

  function mapRepoResult<T>(
    result: MarketplaceMessagingResult<T>,
  ): MessagingApplicationResult<T> {
    if (result.ok) {
      return { status: "success", data: result.value };
    }

    switch (result.code) {
      case "UNAUTHENTICATED":
        return { status: "unauthenticated" };
      case "FORBIDDEN":
        return { status: "forbidden", message: result.message };
      case "NOT_FOUND":
        return { status: "not_found", message: result.message };
      case "CANNOT_MESSAGE_OWN_LISTING":
        return {
          status: "cannot_message_own_listing",
          message:
            result.message ||
            "Users cannot message themselves on their own listings.",
        };
      case "INVALID_MESSAGE_CONTENT":
      case "INVALID_INPUT":
        return {
          status: "invalid",
          fieldErrors: { _form: [result.message || "Invalid input."] },
          message: result.message,
        };
      case "RATE_LIMIT_EXCEEDED":
        return { status: "rate_limited", retryAfterSeconds: 60 };
      default:
        return { status: "unavailable" };
    }
  }

  return {
    async getOrCreateConversation(userId, input, context) {
      const validation = validateGetOrCreateConversationInput(input);
      if (!validation.ok) {
        return {
          status: "invalid",
          fieldErrors: validation.fieldErrors,
          message: validation.errors.join("; "),
        };
      }

      if (security.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(
          userId,
          "start_conversation",
        );
        if (!rateLimit.allowed) {
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      const res = await repository.getOrCreateConversation(
        validation.value.listingId,
      );

      if (res.ok) {
        // Enforce self-messaging domain check as defense-in-depth
        if (res.value.sellerId === userId && res.value.buyerId === userId) {
          return {
            status: "cannot_message_own_listing",
            message: "Users cannot message themselves on their own listings.",
          };
        }

        if (security.recordTelemetry) {
          await security.recordTelemetry({
            eventType: "marketplace.conversation.created",
            correlationId: context?.correlationId,
            metadata: {
              conversationId: res.value.id,
              listingId: res.value.listingId,
              userId,
              outcome: "success",
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      return mapRepoResult(res);
    },

    async sendMessage(userId, conversationIdInput, input, context) {
      const convValidation = validateConversationIdParam(conversationIdInput);
      if (!convValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: convValidation.fieldErrors,
          message: convValidation.errors.join("; "),
        };
      }

      const bodyValidation = validateSendMessageInput(input);
      if (!bodyValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: bodyValidation.fieldErrors,
          message: bodyValidation.errors.join("; "),
        };
      }

      // Check external security audit rate limit
      if (security.checkRateLimit) {
        const rateLimit = await security.checkRateLimit(userId, "send_message");
        if (!rateLimit.allowed) {
          return {
            status: "rate_limited",
            retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60,
          };
        }
      }

      const res = await repository.sendMessage(
        convValidation.value,
        bodyValidation.value.content,
      );

      if (res.ok && security.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "marketplace.message.sent",
          correlationId: context?.correlationId,
          metadata: {
            conversationId: convValidation.value,
            senderId: userId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return mapRepoResult(res);
    },

    async markConversationRead(userId, conversationIdInput, context) {
      const convValidation = validateConversationIdParam(conversationIdInput);
      if (!convValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: convValidation.fieldErrors,
          message: convValidation.errors.join("; "),
        };
      }

      const res = await repository.markConversationRead(convValidation.value);

      if (res.ok && security.recordTelemetry) {
        await security.recordTelemetry({
          eventType: "marketplace.conversation.read",
          correlationId: context?.correlationId,
          metadata: {
            conversationId: convValidation.value,
            userId,
            outcome: "success",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return mapRepoResult(res);
    },

    async getUserConversations(userId) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const res = await repository.getUserConversations();
      return mapRepoResult(res);
    },

    async getConversationById(userId, conversationIdInput) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const convValidation = validateConversationIdParam(conversationIdInput);
      if (!convValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: convValidation.fieldErrors,
          message: convValidation.errors.join("; "),
        };
      }

      const res = await repository.getConversationById(convValidation.value);
      if (!res.ok) {
        return mapRepoResult(res);
      }

      // Prohibit non-participants
      const conv = res.value;
      if (conv.buyerId !== userId && conv.sellerId !== userId) {
        return {
          status: "forbidden",
          message: "You are not a participant in this conversation.",
        };
      }

      return { status: "success", data: conv };
    },

    async getMessages(userId, conversationIdInput, queryInput) {
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        return { status: "unauthenticated" };
      }

      const convValidation = validateConversationIdParam(conversationIdInput);
      if (!convValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: convValidation.fieldErrors,
          message: convValidation.errors.join("; "),
        };
      }

      const queryValidation = validateGetMessagesQuery(queryInput ?? {});
      if (!queryValidation.ok) {
        return {
          status: "invalid",
          fieldErrors: queryValidation.fieldErrors,
          message: queryValidation.errors.join("; "),
        };
      }

      const limit = queryValidation.value.limit ?? 50;
      const res = await repository.getMessages(convValidation.value, {
        ...queryValidation.value,
        limit: limit + 1,
      });

      if (!res.ok) {
        return mapRepoResult(res);
      }

      const hasMore = res.value.length > limit;
      const messages = hasMore
        ? queryValidation.value.after
          ? res.value.slice(0, limit)
          : res.value.slice(-limit)
        : res.value;
      const nextCursor =
        hasMore && messages.length > 0
          ? ((queryValidation.value.after
              ? messages[messages.length - 1]?.id
              : messages[0]?.id) ?? null)
          : null;

      return {
        status: "success",
        data: {
          messages,
          hasMore,
          nextCursor,
        },
      };
    },
  };
}
