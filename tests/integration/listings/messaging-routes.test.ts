import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createCreateConversationHandler,
  createGetConversationsHandler,
} from "../../../apps/web/src/app/api/marketplace/conversations/route.ts";
import type { MarketplaceMessagingService } from "../../../apps/web/src/modules/messaging/server/index.ts";
import type { ConversationDTO } from "@campusmarkt/types";

const canonicalOrigin = "https://markt.example.test";
const buyerId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const conversationId = "44444444-4444-4444-8444-444444444444";
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

describe("marketplace conversations routes integration (T11)", () => {
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
});
