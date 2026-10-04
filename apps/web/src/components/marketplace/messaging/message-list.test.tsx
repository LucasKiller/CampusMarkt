import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import {
  formatMessageTime,
  MessageBubble,
  MessageComposer,
  MessageList,
  MilestonePill,
} from "./message-list";
import type { MessageDTO } from "@campusmarkt/types";
import type { ConversationMilestone } from "@campusmarkt/domain";

describe("MessageList and Composer components (T13)", () => {
  const currentUserId = "11111111-1111-4111-8111-111111111111";
  const partnerId = "22222222-2222-4222-8222-222222222222";
  const conversationId = "33333333-3333-4333-8333-333333333333";
  const messageId1 = "44444444-4444-4444-8444-444444444444";
  const messageId2 = "55555555-5555-4555-8555-555555555555";

  const myMessage: MessageDTO = {
    id: messageId1,
    conversationId,
    senderId: currentUserId,
    content: "Hallo, steht das Fahrrad noch zum Verkauf?",
    createdAt: "2026-09-24T18:30:00.000Z",
    readAt: "2026-09-24T18:35:00.000Z",
  };

  const partnerMessage: MessageDTO = {
    id: messageId2,
    conversationId,
    senderId: partnerId,
    content: "Ja, es ist noch da! Abholung am Hauptcampus möglich.",
    createdAt: "2026-09-24T18:32:00.000Z",
    readAt: null,
  };

  const sampleMilestone: ConversationMilestone = {
    id: "milestone-offer-1",
    type: "offer_created",
    timestamp: "2026-09-24T18:31:00.000Z",
    label: "Angebot: €45.00",
  };

  describe("formatMessageTime", () => {
    it("formats ISO timestamps to HH:MM", () => {
      const formatted = formatMessageTime("2026-09-24T18:30:00.000Z");
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe("MessageBubble (MSG-02)", () => {
    it("renders current user message with distinct styling (data-sender='me')", () => {
      const html = renderToString(
        <MessageBubble message={myMessage} isCurrentUser={true} />,
      );

      expect(html).toContain('data-testid="message-bubble-' + messageId1 + '"');
      expect(html).toContain('data-sender="me"');
      expect(html).toContain('class="messages-bubble-row"');
      expect(html).toContain('class="messages-bubble"');
      expect(html).toContain("Hallo, steht das Fahrrad noch zum Verkauf?");
      expect(html).toContain('data-testid="message-read-receipt"');
      expect(html).toContain("✓✓"); // readAt is set
    });

    it("renders partner message with distinct styling (data-sender='partner') and partner name", () => {
      const html = renderToString(
        <MessageBubble
          message={partnerMessage}
          isCurrentUser={false}
          senderName="Lukas K."
        />,
      );

      expect(html).toContain('data-testid="message-bubble-' + messageId2 + '"');
      expect(html).toContain('data-sender="partner"');
      expect(html).toContain('class="messages-bubble-row"');
      expect(html).toContain('class="messages-bubble"');
      expect(html).toContain("Lukas K.");
      expect(html).toContain("Ja, es ist noch da!");
      expect(html).not.toContain('data-testid="message-read-receipt"');
    });
  });

  describe("MilestonePill (MSG-05)", () => {
    it("renders milestone event pill centered with label", () => {
      const html = renderToString(
        <MilestonePill milestone={sampleMilestone} />,
      );

      expect(html).toContain('data-testid="milestone-pill-milestone-offer-1"');
      expect(html).toContain("Angebot: €45.00");
    });
  });

  describe("MessageList (MSG-03)", () => {
    it("renders messages and milestones in chronological order", () => {
      const html = renderToString(
        <MessageList
          messages={[myMessage, partnerMessage]}
          milestones={[sampleMilestone]}
          currentUserId={currentUserId}
          partnerName="Lukas K."
          hasMore={true}
          onLoadOlder={() => {}}
        />,
      );

      expect(html).toContain('role="log"');
      expect(html).toContain("Ältere Nachrichten laden");
      expect(html).toContain(messageId1);
      expect(html).toContain(messageId2);
      expect(html).toContain("milestone-offer-1");

      // Verify order in HTML: myMessage (18:30) -> sampleMilestone (18:31) -> partnerMessage (18:32)
      const myIndex = html.indexOf(messageId1);
      const milestoneIndex = html.indexOf("milestone-offer-1");
      const partnerIndex = html.indexOf(messageId2);

      expect(myIndex).toBeLessThan(milestoneIndex);
      expect(milestoneIndex).toBeLessThan(partnerIndex);
    });

    it("renders accessible empty state when messages array is empty", () => {
      const html = renderToString(
        <MessageList messages={[]} currentUserId={currentUserId} />,
      );

      expect(html).toContain("Noch keine Nachrichten");
    });
  });

  describe("MessageComposer (MSG-02)", () => {
    it("renders composer form with character counter and keyboard hint", () => {
      const html = renderToString(
        <MessageComposer onSendMessage={() => {}} maxLength={2000} />,
      );

      expect(html).toContain('aria-label="Nachricht schreiben"');
      expect(html).toContain('aria-label="Nachricht senden"');
      expect(html).toContain("Drücke Strg+Enter zum Senden");
      expect(html).toContain('data-testid="composer-char-count"');
      expect(html).toContain("0 / 2000");
    });
  });
});
