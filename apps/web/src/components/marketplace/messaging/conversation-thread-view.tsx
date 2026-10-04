"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SupportedLocale } from "@campusmarkt/domain";
import { getMessagesCopy } from "./messages-copy";
import { TrustBadge } from "../feed";
import { NegotiationCard } from "./negotiation-card";
import { MessageComposer, MessageList } from "./message-list";
import type {
  ConversationDTO,
  MessageDTO,
  OfferDTO,
  ReservationDTO,
} from "@campusmarkt/types";
import {
  formatOfferMilestone,
  formatReservationMilestone,
  type ConversationMilestone,
} from "@campusmarkt/domain";

export interface ConversationThreadViewProps {
  conversation: ConversationDTO;
  currentUserId: string;
  initialMessages?: MessageDTO[];
  initialHasMore?: boolean;
  initialOffers?: OfferDTO[];
  initialReservation?: ReservationDTO | null;
  locale?: SupportedLocale;
}

export function ConversationThreadView({
  conversation,
  currentUserId,
  initialMessages = [],
  initialHasMore = false,
  initialOffers = [],
  initialReservation = null,
  locale = "de",
}: ConversationThreadViewProps) {
  const copy = getMessagesCopy(locale);
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [offers] = useState<OfferDTO[]>(initialOffers);
  const [reservation] = useState<ReservationDTO | null>(initialReservation);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchingMessagesRef = useRef(false);
  const markingReadRef = useRef(false);
  const needsReadSyncRef = useRef(true);
  const readSyncVersionRef = useRef(0);

  const partner = conversation.partner;
  const listing = conversation.listing;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  const markConversationRead = useCallback(async () => {
    if (markingReadRef.current) return;
    markingReadRef.current = true;
    setIsMarkingRead(true);
    const requestedVersion = readSyncVersionRef.current;
    try {
      const response = await fetch(
        `/api/marketplace/conversations/${conversation.id}/read`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
        },
      );
      needsReadSyncRef.current =
        !response.ok || requestedVersion !== readSyncVersionRef.current;
    } catch {
      needsReadSyncRef.current = true;
    } finally {
      markingReadRef.current = false;
      setIsMarkingRead(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    void markConversationRead();
  }, [markConversationRead]);

  // Keyset hydration for live updates
  const fetchNewMessages = useCallback(async () => {
    if (fetchingMessagesRef.current) return;
    fetchingMessagesRef.current = true;
    try {
      let cursor = messages[messages.length - 1]?.id ?? conversation.createdAt;
      const incoming: MessageDTO[] = [];
      let hasMore = false;
      do {
        const res = await fetch(
          `/api/marketplace/conversations/${conversation.id}/messages?after=${encodeURIComponent(cursor)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { messages?: MessageDTO[]; hasMore?: boolean };
        };
        const page = json.data?.messages ?? [];
        incoming.push(...page);
        const nextCursor = page[page.length - 1]?.id;
        hasMore = Boolean(
          json.data?.hasMore && nextCursor && nextCursor !== cursor,
        );
        cursor = nextCursor ?? cursor;
      } while (hasMore);

      if (incoming.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const toAdd = incoming.filter((m) => !existingIds.has(m.id));
          if (toAdd.length === 0) return prev;
          return [...prev, ...toAdd];
        });
        requestAnimationFrame(scrollToBottom);
        readSyncVersionRef.current += 1;
        needsReadSyncRef.current = true;
      }

      if (
        messages
          .slice(-50)
          .some(
            (message) => message.senderId === currentUserId && !message.readAt,
          )
      ) {
        const receiptResponse = await fetch(
          `/api/marketplace/conversations/${conversation.id}/messages?limit=50`,
        );
        if (receiptResponse.ok) {
          const receiptJson = (await receiptResponse.json()) as {
            data?: { messages?: MessageDTO[] };
          };
          const readAtById = new Map(
            (receiptJson.data?.messages ?? []).map((message) => [
              message.id,
              message.readAt,
            ]),
          );
          setMessages((prev) =>
            prev.map((message) => {
              const readAt = readAtById.get(message.id);
              return readAt && readAt !== message.readAt
                ? { ...message, readAt }
                : message;
            }),
          );
        }
      }

      if (needsReadSyncRef.current) {
        await markConversationRead();
      }
    } catch {
      // offline / transient failure
    } finally {
      fetchingMessagesRef.current = false;
    }
  }, [
    conversation.createdAt,
    conversation.id,
    currentUserId,
    markConversationRead,
    messages,
  ]);

  // Periodic polling for live updates and on window focus
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchNewMessages();
    }, 4000);

    const handleFocus = () => {
      void fetchNewMessages();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNewMessages]);

  const loadOlderMessages = async () => {
    const oldestMessageId = messages[0]?.id;
    if (!oldestMessageId || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/marketplace/conversations/${conversation.id}/messages?before=${encodeURIComponent(oldestMessageId)}`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: { messages?: MessageDTO[]; hasMore?: boolean };
      };
      const older = json.data?.messages ?? [];
      setMessages((prev) => {
        const known = new Set(prev.map((message) => message.id));
        return [...older.filter((message) => !known.has(message.id)), ...prev];
      });
      setHasMore(Boolean(json.data?.hasMore));
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    const res = await fetch(
      `/api/marketplace/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );

    if (!res.ok) {
      const errorJson = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(errorJson.message || copy.sendError);
    }

    const json = (await res.json()) as {
      data?: { message: MessageDTO };
    };
    if (json.data?.message) {
      setMessages((prev) =>
        prev.some((message) => message.id === json.data!.message.id)
          ? prev
          : [...prev, json.data!.message],
      );
      requestAnimationFrame(scrollToBottom);
    }
  };

  // Convert offers and reservations to read-only milestones
  const milestones: ConversationMilestone[] = [
    ...offers.map((o) => formatOfferMilestone(o)),
    ...(reservation ? [formatReservationMilestone(reservation)] : []),
  ];

  return (
    <div className="messages-thread">
      {/* Sticky Header: Partner & Trust Badge */}
      <header
        data-testid="conversation-header"
        className="messages-thread-header"
      >
        <div className="messages-thread-partner">
          <Link
            href="/messages"
            aria-label={copy.back}
            className="messages-thread-back"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          {/* Partner Avatar */}
          <div data-testid="partner-avatar" className="messages-avatar">
            {partner?.avatarUrl ? (
              <img src={partner.avatarUrl} alt={partner.displayName} />
            ) : (
              (partner?.displayName ?? "U").slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="messages-thread-name">
            <span data-testid="partner-name" className="messages-partner-name">
              {partner?.displayName ?? copy.unknownUser}
            </span>
            {partner?.universityBadge && (
              <div data-testid="partner-badge">
                <TrustBadge badge={partner.universityBadge} />
              </div>
            )}
          </div>
        </div>

        {isMarkingRead && <span className="sr-only">{copy.updating}</span>}
      </header>

      {/* Sticky Negotiation Bar / Card */}
      {listing && (
        <NegotiationCard
          listing={listing}
          activeOffer={offers.find((o) => o.status === "pending")}
          activeReservation={reservation}
          currentUserId={currentUserId}
          onActionComplete={() => {
            void fetchNewMessages();
          }}
          locale={locale}
        />
      )}

      {/* Message Stream */}
      <div className="messages-stream">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          milestones={milestones}
          partnerName={partner?.displayName}
          hasMore={hasMore}
          isLoadingOlder={isLoadingOlder}
          onLoadOlder={loadOlderMessages}
          locale={locale}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input */}
      <MessageComposer onSendMessage={handleSendMessage} locale={locale} />
    </div>
  );
}
