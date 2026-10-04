"use client";

import React, { useState } from "react";
import Link from "next/link";
import type {
  ConversationListingSummary,
  OfferDTO,
  ReservationDTO,
} from "@campusmarkt/types";
import { formatCurrencyEuros } from "@campusmarkt/domain";
import { listingMediaUrl } from "../../../modules/listings/media-url";

export interface NegotiationCardProps {
  listing: ConversationListingSummary;
  activeOffer?: OfferDTO | null;
  activeReservation?: ReservationDTO | null;
  currentUserId: string;
  onActionComplete?: () => void;
}

export function NegotiationCard({
  listing,
  activeOffer,
  activeReservation,
  currentUserId,
  onActionComplete,
}: NegotiationCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSeller =
    activeOffer?.sellerId === currentUserId ||
    activeReservation?.sellerId === currentUserId;

  const handleAcceptOffer = async (offerId: string) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/marketplace/offers/${offerId}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        throw new Error("Fehler beim Annehmen des Angebots.");
      }
      onActionComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler aufgetreten.";
      setActionError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/marketplace/reservations/${reservationId}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "cancelled_in_chat" }),
        },
      );
      if (!res.ok) {
        throw new Error("Fehler beim Stornieren der Reservierung.");
      }
      onActionComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler aufgetreten.";
      setActionError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      data-testid="negotiation-status-card"
      className="bg-card border-b border-border px-4 py-2.5 flex flex-col gap-2 shadow-2xs"
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/listings/${listing.id}`}
          className="flex items-center gap-3 hover:opacity-85 transition-opacity min-w-0"
        >
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0 text-xs font-semibold text-muted-foreground border border-border">
            {listing.coverImage ? (
              <img
                src={listingMediaUrl(listing.coverImage)}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              listing.title.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-foreground truncate">
              {listing.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {listing.priceCents !== null
                ? formatCurrencyEuros(listing.priceCents)
                : "Zu verschenken"}
            </p>
          </div>
        </Link>

        {/* Active Reservation Status */}
        {activeReservation && activeReservation.status === "active" && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              data-testid="negotiation-badge-reserved"
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
            >
              Reserviert (
              {formatCurrencyEuros(activeReservation.agreedPriceCents)})
            </span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleCancelReservation(activeReservation.id)}
              className="text-xs text-destructive hover:underline cursor-pointer disabled:opacity-50"
            >
              Stornieren
            </button>
          </div>
        )}

        {/* Active Offer Status */}
        {(!activeReservation || activeReservation.status !== "active") &&
          activeOffer &&
          activeOffer.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <span
                data-testid="negotiation-badge-offer"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
              >
                Angebot: {formatCurrencyEuros(activeOffer.amountCents)}
              </span>
              {isSeller ? (
                <button
                  type="button"
                  data-testid="accept-offer-button"
                  disabled={isProcessing}
                  onClick={() => handleAcceptOffer(activeOffer.id)}
                  className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md shadow-xs hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Annehmen
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Warte auf Verkäufer
                </span>
              )}
            </div>
          )}
      </div>

      {actionError && (
        <div className="text-xs text-destructive">{actionError}</div>
      )}
    </div>
  );
}
