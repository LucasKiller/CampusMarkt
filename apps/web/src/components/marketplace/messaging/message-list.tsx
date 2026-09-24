"use client";

import React, { useState } from "react";
import type { ConversationMilestone } from "@campusmarkt/domain";
import type { MessageDTO } from "@campusmarkt/types";

export interface MessageBubbleProps {
  message: MessageDTO;
  isCurrentUser: boolean;
  senderName?: string;
}

export function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function MessageBubble({
  message,
  isCurrentUser,
  senderName,
}: MessageBubbleProps) {
  return (
    <div
      data-testid={`message-bubble-${message.id}`}
      data-sender={isCurrentUser ? "me" : "partner"}
      className={`flex w-full ${isCurrentUser ? "justify-end" : "justify-start"} my-1`}
    >
      <div
        className={`max-w-[75%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-foreground border border-border/50 rounded-bl-none"
        }`}
      >
        {!isCurrentUser && senderName && (
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            {senderName}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
        <div
          className={`flex items-center gap-1.5 mt-1 text-[11px] ${
            isCurrentUser
              ? "text-primary-foreground/75 justify-end"
              : "text-muted-foreground justify-start"
          }`}
        >
          <time dateTime={message.createdAt}>
            {formatMessageTime(message.createdAt)}
          </time>
          {isCurrentUser && (
            <span
              data-testid="message-read-receipt"
              title={message.readAt ? "Gelesen" : "Gesendet"}
              className="inline-block text-[11px]"
            >
              {message.readAt ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export interface MilestonePillProps {
  milestone: ConversationMilestone;
}

export function MilestonePill({ milestone }: MilestonePillProps) {
  return (
    <div
      data-testid={`milestone-pill-${milestone.id}`}
      className="flex justify-center my-3 w-full"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-muted/60 text-muted-foreground border border-border/40 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 inline-block" />
        <span className="font-medium">{milestone.label}</span>
        {milestone.description && (
          <span className="text-[11px] opacity-80">
            ({milestone.description})
          </span>
        )}
      </div>
    </div>
  );
}

export interface MessageListProps {
  messages: MessageDTO[];
  currentUserId: string;
  milestones?: ConversationMilestone[];
  partnerName?: string;
  hasMore?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
}

type TimelineItem =
  | { type: "message"; data: MessageDTO; timestamp: string }
  | { type: "milestone"; data: ConversationMilestone; timestamp: string };

export function MessageList({
  messages,
  currentUserId,
  milestones = [],
  partnerName,
  hasMore = false,
  isLoadingOlder = false,
  onLoadOlder,
}: MessageListProps) {
  // Merge messages and milestones into unified chronological timeline
  const items: TimelineItem[] = [
    ...messages.map((m) => ({
      type: "message" as const,
      data: m,
      timestamp: m.createdAt,
    })),
    ...milestones.map((ms) => ({
      type: "milestone" as const,
      data: ms,
      timestamp: ms.timestamp,
    })),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div
      role="log"
      aria-label="Nachrichtenverlauf"
      aria-live="polite"
      className="flex flex-col flex-1 overflow-y-auto px-4 py-3 space-y-1"
    >
      {hasMore && onLoadOlder && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={isLoadingOlder}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoadingOlder
              ? "Lade ältere Nachrichten..."
              : "Ältere Nachrichten laden"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
          Noch keine Nachrichten. Schreibe die erste Nachricht!
        </div>
      ) : (
        items.map((item) => {
          if (item.type === "milestone") {
            return <MilestonePill key={item.data.id} milestone={item.data} />;
          }
          const isCurrentUser =
            item.data.senderId.trim().toLowerCase() ===
            currentUserId.trim().toLowerCase();
          return (
            <MessageBubble
              key={item.data.id}
              message={item.data}
              isCurrentUser={isCurrentUser}
              senderName={partnerName}
            />
          );
        })
      )}
    </div>
  );
}

export interface MessageComposerProps {
  onSendMessage: (content: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function MessageComposer({
  onSendMessage,
  disabled = false,
  placeholder = "Nachricht schreiben...",
  maxLength = 2000,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = content.trim();
  const canSend =
    !disabled &&
    !isSubmitting &&
    trimmed.length > 0 &&
    content.length <= maxLength;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSubmitting(true);
    try {
      await onSendMessage(trimmed);
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSend();
      }}
      className="p-3 border-t border-border bg-background flex flex-col gap-2"
    >
      <div className="relative flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled || isSubmitting}
          rows={2}
          aria-label="Nachricht schreiben"
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Nachricht senden"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 transition-colors cursor-pointer"
        >
          {isSubmitting ? "Senden..." : "Senden"}
        </button>
      </div>
      <div className="flex justify-between items-center px-1 text-[11px] text-muted-foreground">
        <span>Drücke Strg+Enter zum Senden</span>
        <span
          data-testid="composer-char-count"
          className={
            content.length > maxLength ? "text-destructive font-semibold" : ""
          }
        >
          {`${content.length} / ${maxLength}`}
        </span>
      </div>
    </form>
  );
}
