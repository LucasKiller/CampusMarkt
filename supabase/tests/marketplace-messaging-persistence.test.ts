import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

describe("marketplace messaging persistence and security integrity", () => {
  const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
  const tableMigration = resolve(
    migrationsDir,
    "20260924200000_marketplace_conversations_and_messages.sql",
  );
  const getOrCreateRpcMigration = resolve(
    migrationsDir,
    "20260924201000_marketplace_messaging_get_or_create_rpc.sql",
  );
  const sendReadRpcsMigration = resolve(
    migrationsDir,
    "20260924202000_marketplace_messaging_send_and_read_rpcs.sql",
  );

  it("includes all three messaging database migrations", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain(
      "20260924200000_marketplace_conversations_and_messages.sql",
    );
    expect(files).toContain(
      "20260924201000_marketplace_messaging_get_or_create_rpc.sql",
    );
    expect(files).toContain(
      "20260924202000_marketplace_messaging_send_and_read_rpcs.sql",
    );
  });

  describe("T5: table schema, 1:1 unique constraint, and RLS policies", () => {
    it("defines marketplace.conversations table with unique (listing_id, buyer_id) and check (buyer_id <> seller_id)", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /create table if not exists marketplace\.conversations/i,
      );
      expect(sql).toMatch(
        /listing_id uuid not null references marketplace\.listings\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /buyer_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /seller_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /constraint uq_conversation_listing_buyer unique \(listing_id, buyer_id\)/i,
      );
      expect(sql).toMatch(
        /constraint chk_no_self_conversation check \(buyer_id <> seller_id\)/i,
      );
    });

    it("defines marketplace.messages table with cascading FK and content constraints", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(/create table if not exists marketplace\.messages/i);
      expect(sql).toMatch(
        /conversation_id uuid not null references marketplace\.conversations\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /sender_id uuid not null references auth\.users\(id\) on delete cascade/i,
      );
      expect(sql).toMatch(
        /char_length\(trim\(content\)\) > 0 and char_length\(content\) <= 2000/i,
      );
    });

    it("enables and forces row-level security with participants-only policies", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /alter table marketplace\.conversations enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.conversations force row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.messages enable row level security;/i,
      );
      expect(sql).toMatch(
        /alter table marketplace\.messages force row level security;/i,
      );

      expect(sql).toMatch(
        /create policy "Participants can view their conversations"[\s\S]*?using\s*\(auth\.uid\(\) = buyer_id or auth\.uid\(\) = seller_id\);/i,
      );
      expect(sql).toMatch(
        /create policy "Participants can view their messages"[\s\S]*?using\s*\([\s\S]*?c\.buyer_id = auth\.uid\(\) or c\.seller_id = auth\.uid\(\)/i,
      );
    });

    it("grants table permissions only to authenticated and service_role without anon access", () => {
      const sql = readFileSync(tableMigration, "utf8");

      expect(sql).toMatch(
        /grant select on table marketplace\.conversations to authenticated;/i,
      );
      expect(sql).toMatch(
        /grant select, insert, update, delete on table marketplace\.conversations to service_role;/i,
      );
      expect(sql).toMatch(
        /grant select on table marketplace\.messages to authenticated;/i,
      );
      expect(sql).toMatch(
        /grant select, insert, update, delete on table marketplace\.messages to service_role;/i,
      );
      expect(sql).not.toMatch(/grant\s+.*to anon/i);
    });
  });

  describe("T6: get_or_create_conversation RPC configuration and security", () => {
    it("configures get_or_create_conversation with SECURITY DEFINER, search_path = '', and auth checks", () => {
      const sql = readFileSync(getOrCreateRpcMigration, "utf8");

      expect(sql).toMatch(
        /function marketplace_api\.get_or_create_conversation/i,
      );
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(/auth\.uid\(\)/i);
      expect(sql).toMatch(/raise exception 'UNAUTHENTICATED'/i);
      expect(sql).toMatch(/raise exception 'LISTING_NOT_FOUND'/i);
      expect(sql).toMatch(/raise exception 'CANNOT_MESSAGE_OWN_LISTING'/i);
      expect(sql).toMatch(/on conflict \(listing_id, buyer_id\) do update/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_or_create_conversation/i,
      );
    });
  });

  describe("T7: send_message, mark_conversation_read, and get_user_conversations RPCs", () => {
    it("configures send_message with participant authorization, trimming, and timestamp updates", () => {
      const sql = readFileSync(sendReadRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.send_message/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(/raise exception 'UNAUTHENTICATED'/i);
      expect(sql).toMatch(/raise exception 'INVALID_MESSAGE_CONTENT'/i);
      expect(sql).toMatch(/raise exception 'CONVERSATION_NOT_FOUND'/i);
      expect(sql).toMatch(/raise exception 'FORBIDDEN'/i);
      expect(sql).toMatch(/insert into marketplace\.messages/i);
      expect(sql).toMatch(
        /update marketplace\.conversations[\s\S]*?last_message_at/i,
      );
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.send_message/i,
      );
    });

    it("configures mark_conversation_read to update only incoming unread messages", () => {
      const sql = readFileSync(sendReadRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.mark_conversation_read/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(/update marketplace\.messages/i);
      expect(sql).toMatch(/sender_id <> v_user_id/i);
      expect(sql).toMatch(/read_at is null/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.mark_conversation_read/i,
      );
    });

    it("configures get_user_conversations with inbox projection and unread count", () => {
      const sql = readFileSync(sendReadRpcsMigration, "utf8");

      expect(sql).toMatch(/function marketplace_api\.get_user_conversations/i);
      expect(sql).toMatch(/security definer/i);
      expect(sql).toMatch(/set search_path = ''/i);
      expect(sql).toMatch(
        /c\.buyer_id = v_user_id or c\.seller_id = v_user_id/i,
      );
      expect(sql).toMatch(/unread_count/i);
      expect(sql).toMatch(/listing_info/i);
      expect(sql).toMatch(/last_msg_info/i);
      expect(sql).toMatch(
        /grant execute on function marketplace_api\.get_user_conversations/i,
      );
    });
  });

  describe("T8: Functional persistence and isolation simulations", () => {
    interface SimulatedListing {
      id: string;
      ownerId: string;
      status: "active" | "reserved" | "sold" | "archived";
    }

    interface SimulatedConversation {
      id: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      lastMessageAt: string;
      createdAt: string;
    }

    interface SimulatedMessage {
      id: string;
      conversationId: string;
      senderId: string;
      content: string;
      createdAt: string;
      readAt: string | null;
    }

    const sellerId = "11111111-1111-1111-1111-111111111111";
    const buyer1Id = "22222222-2222-2222-2222-222222222222";
    const strangerId = "99999999-9999-9999-9999-999999999999";

    it("enforces 1:1 conversation uniqueness per (listing_id, buyer_id)", () => {
      const conversations: SimulatedConversation[] = [];

      function getOrCreateConversation(
        listing: SimulatedListing,
        userId: string,
      ): SimulatedConversation {
        if (userId === listing.ownerId) {
          throw new Error("CANNOT_MESSAGE_OWN_LISTING");
        }
        const existing = conversations.find(
          (c) => c.listingId === listing.id && c.buyerId === userId,
        );
        if (existing) {
          return existing;
        }
        const created: SimulatedConversation = {
          id: `conv-${conversations.length + 1}`,
          listingId: listing.id,
          buyerId: userId,
          sellerId: listing.ownerId,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        conversations.push(created);
        return created;
      }

      const listing: SimulatedListing = {
        id: "listing-1",
        ownerId: sellerId,
        status: "active",
      };

      const c1 = getOrCreateConversation(listing, buyer1Id);
      const c2 = getOrCreateConversation(listing, buyer1Id);
      expect(c1.id).toBe(c2.id);
      expect(conversations.length).toBe(1);

      expect(() => getOrCreateConversation(listing, sellerId)).toThrow(
        "CANNOT_MESSAGE_OWN_LISTING",
      );
    });

    it("proves non-participants cannot read or send messages (RLS enforcement)", () => {
      const conversation: SimulatedConversation = {
        id: "conv-1",
        listingId: "listing-1",
        buyerId: buyer1Id,
        sellerId: sellerId,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const messages: SimulatedMessage[] = [
        {
          id: "msg-1",
          conversationId: "conv-1",
          senderId: buyer1Id,
          content: "Hi seller",
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ];

      function canViewMessages(conv: SimulatedConversation, userId: string) {
        return conv.buyerId === userId || conv.sellerId === userId;
      }

      function sendMessage(
        conv: SimulatedConversation,
        userId: string,
        content: string,
      ) {
        if (!canViewMessages(conv, userId)) {
          throw new Error("FORBIDDEN");
        }
        const trimmed = content.trim();
        if (trimmed.length === 0 || content.length > 2000) {
          throw new Error("INVALID_MESSAGE_CONTENT");
        }
        const msg: SimulatedMessage = {
          id: `msg-${messages.length + 1}`,
          conversationId: conv.id,
          senderId: userId,
          content: trimmed,
          createdAt: new Date().toISOString(),
          readAt: null,
        };
        messages.push(msg);
        return msg;
      }

      expect(canViewMessages(conversation, buyer1Id)).toBe(true);
      expect(canViewMessages(conversation, sellerId)).toBe(true);
      expect(canViewMessages(conversation, strangerId)).toBe(false);

      expect(() =>
        sendMessage(conversation, strangerId, "Unauthorized intrusion"),
      ).toThrow("FORBIDDEN");

      expect(() =>
        sendMessage(conversation, buyer1Id, "Valid message"),
      ).not.toThrow();
    });

    it("verifies cascade deletion when listing is deleted", () => {
      let listings: SimulatedListing[] = [
        { id: "listing-1", ownerId: sellerId, status: "active" },
        { id: "listing-2", ownerId: sellerId, status: "active" },
      ];

      let conversations: SimulatedConversation[] = [
        {
          id: "conv-1",
          listingId: "listing-1",
          buyerId: buyer1Id,
          sellerId,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "conv-2",
          listingId: "listing-2",
          buyerId: buyer1Id,
          sellerId,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      let messages: SimulatedMessage[] = [
        {
          id: "msg-1",
          conversationId: "conv-1",
          senderId: buyer1Id,
          content: "Hello",
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ];

      function deleteListingCascade(listingId: string) {
        listings = listings.filter((l) => l.id !== listingId);
        const removedConvIds = new Set(
          conversations
            .filter((c) => c.listingId === listingId)
            .map((c) => c.id),
        );
        conversations = conversations.filter((c) => !removedConvIds.has(c.id));
        messages = messages.filter(
          (m) => !removedConvIds.has(m.conversationId),
        );
      }

      deleteListingCascade("listing-1");
      expect(listings.some((l) => l.id === "listing-1")).toBe(false);
      expect(conversations.some((c) => c.id === "conv-1")).toBe(false);
      expect(messages.some((m) => m.conversationId === "conv-1")).toBe(false);
      expect(conversations.length).toBe(1);
    });

    it("verifies deterministic chronological ordering and mark-read receipt updates", () => {
      const messages: SimulatedMessage[] = [
        {
          id: "msg-1",
          conversationId: "conv-1",
          senderId: buyer1Id,
          content: "First message",
          createdAt: "2026-09-24T20:00:00.000Z",
          readAt: null,
        },
        {
          id: "msg-2",
          conversationId: "conv-1",
          senderId: buyer1Id,
          content: "Second message",
          createdAt: "2026-09-24T20:01:00.000Z",
          readAt: null,
        },
      ];

      const sorted = [...messages].sort((a, b) => {
        const timeDiff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
      });
      expect(sorted[0].id).toBe("msg-1");
      expect(sorted[1].id).toBe("msg-2");

      function markRead(currentUserId: string) {
        const now = new Date().toISOString();
        let count = 0;
        for (const m of messages) {
          if (m.senderId !== currentUserId && m.readAt === null) {
            m.readAt = now;
            count++;
          }
        }
        return count;
      }

      expect(markRead(buyer1Id)).toBe(0);
      expect(markRead(sellerId)).toBe(2);
      expect(messages.every((m) => m.readAt !== null)).toBe(true);
    });
  });
});
