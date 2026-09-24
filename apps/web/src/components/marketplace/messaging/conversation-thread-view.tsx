"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  initialOffers?: OfferDTO[];
  initialReservation?: ReservationDTO | null;
}

export function ConversationThreadView({
  conversation,
  currentUserId,
  initialMessages = [],
  initialOffers = [],
  initialReservation = null,
}: ConversationThreadViewProps) {
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages);
  const [offers] = useState<OfferDTO[]>(initialOffers);
  const [reservation] = useState<ReservationDTO | null>(initialReservation);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partner = conversation.partner;
  const listing = conversation.listing;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mark conversation read on mount
  useEffect(() => {
    let isCancelled = false;
    const markRead = async () => {
      try {
        setIsMarkingRead(true);
        await fetch(`/api/marketplace/conversations/${conversation.id}/read`, {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
      } catch (err) {
        if (!isCancelled) {
          console.error("[ConversationThreadView: markRead]", err);
        }
      } finally {
        if (!isCancelled) {
          setIsMarkingRead(false);
        }
      }
    };

    void markRead();
    return () => {
      isCancelled = true;
    };
  }, [conversation.id]);

  // Keyset hydration for live updates
  const fetchNewMessages = useCallback(async () => {
    if (messages.length === 0) return;
    const latestTimestamp = messages[messages.length - 1]?.createdAt;
    if (!latestTimestamp) return;

    try {
      const res = await fetch(
        `/api/marketplace/conversations/${conversation.id}/messages?after=${encodeURIComponent(
          latestTimestamp,
        )}`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: { messages?: MessageDTO[] };
      };
      const incoming = json.data?.messages ?? [];
      if (incoming.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const toAdd = incoming.filter((m) => !existingIds.has(m.id));
          if (toAdd.length === 0) return prev;
          return [...prev, ...toAdd];
        });
        scrollToBottom();
      }
    } catch {
      // offline / transient failure
    }
  }, [conversation.id, messages]);

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
      throw new Error(errorJson.message || "Fehler beim Senden der Nachricht.");
    }

    const json = (await res.json()) as {
      data?: { message: MessageDTO };
    };
    if (json.data?.message) {
      setMessages((prev) => [...prev, json.data!.message]);
      scrollToBottom();
    }
  };

  // Convert offers and reservations to read-only milestones
  const milestones: ConversationMilestone[] = [
    ...offers.map((o) => formatOfferMilestone(o)),
    ...(reservation ? [formatReservationMilestone(reservation)] : []),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto bg-background border-x border-border shadow-sm">
      {/* Sticky Header: Partner & Trust Badge */}
      <header
        data-testid="conversation-header"
        className="sticky top-0 z-20 bg-background/95 backdrop-blur-xs border-b border-border px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/messages"
            aria-label="Zurück zum Postfach"
            className="p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>

          {/* Partner Avatar */}
          <div
            data-testid="partner-avatar"
            className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-border"
          >
            {partner?.avatarUrl ? (
              <img
                src={partner.avatarUrl}
                alt={partner.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              (partner?.displayName ?? "U").slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex items-center gap-2">
            <span
              data-testid="partner-name"
              className="font-semibold text-sm text-foreground truncate"
            >
              {partner?.displayName ?? "CampusMarkt Nutzer"}
            </span>
            {partner?.universityBadge && (
              <div data-testid="partner-badge" className="shrink-0">
                <TrustBadge badge={partner.universityBadge} />
              </div>
            )}
          </div>
        </div>

        {isMarkingRead && (
          <span className="text-[11px] text-muted-foreground">
            Aktualisiere...
          </span>
        )}
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
        />
      )}

      {/* Message Stream */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          milestones={milestones}
          partnerName={partner?.displayName}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input */}
      <MessageComposer onSendMessage={handleSendMessage} />
    </div>
  );
}
