import type { ListingType } from "@campusmarkt/domain";
import { LISTING_TYPES } from "@campusmarkt/domain";
import type { UniversityBadge } from "../identity/university.ts";
import { isUniversityBadge } from "../identity/university.ts";

export interface ConversationListingSummary {
  id: string;
  title: string;
  priceCents: number | null;
  listingType: ListingType;
  status: string;
  coverImage: string | null;
}

export interface ConversationPartnerProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  universityBadge: UniversityBadge | null;
}

export interface ConversationLastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationDTO {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt?: string;
  unreadCount?: number;
  listing?: ConversationListingSummary | null;
  partner?: ConversationPartnerProfile | null;
  lastMessage?: ConversationLastMessage | null;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  message: MessageDTO;
}

export interface GetOrCreateConversationRequest {
  listingId: string;
}

export interface GetOrCreateConversationResponse {
  conversation: ConversationDTO;
}

export interface GetMessagesQuery {
  before?: string;
  after?: string;
  limit?: number;
}

export interface GetMessagesResponse {
  messages: MessageDTO[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface ConversationsListResponse {
  conversations: ConversationDTO[];
}

export interface MarkConversationReadResponse {
  success: boolean;
  markedCount: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}

function isListingType(value: unknown): value is ListingType {
  return (
    typeof value === "string" && LISTING_TYPES.includes(value as ListingType)
  );
}

export function isConversationListingSummary(
  value: unknown,
): value is ConversationListingSummary {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "title",
      "priceCents",
      "listingType",
      "status",
      "coverImage",
    ])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (value.priceCents === null ||
      (typeof value.priceCents === "number" &&
        Number.isInteger(value.priceCents) &&
        value.priceCents >= 0)) &&
    isListingType(value.listingType) &&
    typeof value.status === "string" &&
    (value.coverImage === null || typeof value.coverImage === "string")
  );
}

export function isConversationPartnerProfile(
  value: unknown,
): value is ConversationPartnerProfile {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["id", "displayName", "avatarUrl", "universityBadge"])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.displayName === "string" &&
    value.displayName.trim().length > 0 &&
    (value.avatarUrl === null || typeof value.avatarUrl === "string") &&
    (value.universityBadge === null || isUniversityBadge(value.universityBadge))
  );
}

export function isConversationLastMessage(
  value: unknown,
): value is ConversationLastMessage {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["id", "content", "senderId", "createdAt", "readAt"])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.content === "string" &&
    typeof value.senderId === "string" &&
    UUID_PATTERN.test(value.senderId) &&
    isValidIsoDate(value.createdAt) &&
    (value.readAt === null || isValidIsoDate(value.readAt))
  );
}

export function isConversationDTO(value: unknown): value is ConversationDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      ["id", "listingId", "buyerId", "sellerId", "lastMessageAt", "createdAt"],
      ["updatedAt", "unreadCount", "listing", "partner", "lastMessage"],
    )
  ) {
    return false;
  }

  const validBase =
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.listingId === "string" &&
    UUID_PATTERN.test(value.listingId) &&
    typeof value.buyerId === "string" &&
    UUID_PATTERN.test(value.buyerId) &&
    typeof value.sellerId === "string" &&
    UUID_PATTERN.test(value.sellerId) &&
    value.buyerId !== value.sellerId &&
    isValidIsoDate(value.lastMessageAt) &&
    isValidIsoDate(value.createdAt);

  if (!validBase) {
    return false;
  }

  if (value.updatedAt !== undefined && !isValidIsoDate(value.updatedAt)) {
    return false;
  }

  if (
    value.unreadCount !== undefined &&
    (typeof value.unreadCount !== "number" ||
      !Number.isInteger(value.unreadCount) ||
      value.unreadCount < 0)
  ) {
    return false;
  }

  if (
    value.listing !== undefined &&
    value.listing !== null &&
    !isConversationListingSummary(value.listing)
  ) {
    return false;
  }

  if (
    value.partner !== undefined &&
    value.partner !== null &&
    !isConversationPartnerProfile(value.partner)
  ) {
    return false;
  }

  if (
    value.lastMessage !== undefined &&
    value.lastMessage !== null &&
    !isConversationLastMessage(value.lastMessage)
  ) {
    return false;
  }

  return true;
}

export function isMessageDTO(value: unknown): value is MessageDTO {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "conversationId",
      "senderId",
      "content",
      "createdAt",
      "readAt",
    ])
  ) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    UUID_PATTERN.test(value.id) &&
    typeof value.conversationId === "string" &&
    UUID_PATTERN.test(value.conversationId) &&
    typeof value.senderId === "string" &&
    UUID_PATTERN.test(value.senderId) &&
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= 2000 &&
    isValidIsoDate(value.createdAt) &&
    (value.readAt === null || isValidIsoDate(value.readAt))
  );
}

export function isSendMessageRequest(
  value: unknown,
): value is SendMessageRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["content"])) {
    return false;
  }

  return (
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= 2000
  );
}

export function isGetOrCreateConversationRequest(
  value: unknown,
): value is GetOrCreateConversationRequest {
  if (!isRecord(value) || !hasExactKeys(value, ["listingId"])) {
    return false;
  }

  return (
    typeof value.listingId === "string" && UUID_PATTERN.test(value.listingId)
  );
}
