"use client";

import React, { useState } from "react";
import type { ConversationMilestone } from "@campusmarkt/domain";
import type { MessageDTO } from "@campusmarkt/types";
import type { SupportedLocale } from "@campusmarkt/domain";
import { getMessagesCopy } from "./messages-copy";

export interface MessageBubbleProps {
  message: MessageDTO;
  isCurrentUser: boolean;
  senderName?: string;
  locale?: SupportedLocale;
}

export function formatMessageTime(
  isoString: string,
  locale: SupportedLocale = "de",
): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(locale === "en" ? "en-GB" : "de-DE", {
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
  locale = "de",
}: MessageBubbleProps) {
  const copy = getMessagesCopy(locale);
  return (
    <div
      data-testid={`message-bubble-${message.id}`}
      data-sender={isCurrentUser ? "me" : "partner"}
      className="messages-bubble-row"
    >
      <div className="messages-bubble">
        {!isCurrentUser && senderName && (
          <div className="messages-bubble-sender">{senderName}</div>
        )}
        <p className="messages-bubble-content">{message.content}</p>
        <div className="messages-bubble-meta">
          <time dateTime={message.createdAt}>
            {formatMessageTime(message.createdAt, locale)}
          </time>
          {isCurrentUser && (
            <span
              data-testid="message-read-receipt"
              title={message.readAt ? copy.read : copy.sent}
              className="messages-read-receipt"
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
      className="messages-milestone-row"
    >
      <div className="messages-milestone">
        <span className="messages-milestone-dot" aria-hidden="true" />
        <span className="messages-milestone-label">{milestone.label}</span>
        {milestone.description && (
          <span className="messages-milestone-description">
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
  locale?: SupportedLocale;
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
  locale = "de",
}: MessageListProps) {
  const copy = getMessagesCopy(locale);
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
      aria-label={copy.history}
      aria-live="polite"
      className="messages-timeline"
    >
      {hasMore && onLoadOlder && (
        <div className="messages-older-row">
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={isLoadingOlder}
            className="messages-older-button"
          >
            {isLoadingOlder ? copy.loadingOlder : copy.older}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="messages-timeline-empty">{copy.noMessages}</div>
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
              locale={locale}
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
  locale?: SupportedLocale;
}

export function MessageComposer({
  onSendMessage,
  disabled = false,
  placeholder,
  maxLength = 2000,
  locale = "de",
}: MessageComposerProps) {
  const copy = getMessagesCopy(locale);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const trimmed = content.trim();
  const canSend =
    !disabled &&
    !isSubmitting &&
    trimmed.length > 0 &&
    content.length <= maxLength;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSubmitting(true);
    setSendError(null);
    try {
      await onSendMessage(trimmed);
      setContent("");
    } catch {
      setSendError(copy.sendError);
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
      className="messages-composer"
    >
      <div className="messages-composer-row">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? copy.placeholder}
          maxLength={maxLength}
          disabled={disabled || isSubmitting}
          rows={2}
          aria-label={
            locale === "en" ? "Write a message" : "Nachricht schreiben"
          }
          className="messages-composer-input"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={locale === "en" ? "Send message" : "Nachricht senden"}
          className="messages-composer-send"
        >
          {isSubmitting ? copy.sending : copy.send}
        </button>
      </div>
      <div className="messages-composer-meta">
        <span>{copy.sendHint}</span>
        <span
          data-testid="composer-char-count"
          className={
            content.length > maxLength ? "messages-char-count-error" : ""
          }
        >
          {`${content.length} / ${maxLength}`}
        </span>
      </div>
      {sendError && (
        <p role="alert" className="messages-send-error">
          {sendError}
        </p>
      )}
    </form>
  );
}
