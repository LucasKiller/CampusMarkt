"use client";

import React, { useState } from "react";
import Link from "next/link";
import type {
  ConversationListingSummary,
  OfferDTO,
  ReservationDTO,
} from "@campusmarkt/types";
import { formatCurrencyEuros, type SupportedLocale } from "@campusmarkt/domain";
import { listingMediaUrl } from "../../../modules/listings/media-url";
import { getMessagesCopy } from "./messages-copy";

export interface NegotiationCardProps {
  listing: ConversationListingSummary;
  activeOffer?: OfferDTO | null;
  activeReservation?: ReservationDTO | null;
  currentUserId: string;
  onActionComplete?: () => void;
  locale?: SupportedLocale;
}

export function NegotiationCard({
  listing,
  activeOffer,
  activeReservation,
  currentUserId,
  onActionComplete,
  locale = "de",
}: NegotiationCardProps) {
  const copy = getMessagesCopy(locale);
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
        throw new Error(
          locale === "en"
            ? "Could not accept the offer."
            : "Fehler beim Annehmen des Angebots.",
        );
      }
      onActionComplete?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Something went wrong."
            : "Fehler aufgetreten.";
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
        throw new Error(
          locale === "en"
            ? "Could not cancel the reservation."
            : "Fehler beim Stornieren der Reservierung.",
        );
      }
      onActionComplete?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Something went wrong."
            : "Fehler aufgetreten.";
      setActionError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div data-testid="negotiation-status-card" className="messages-negotiation">
      <div className="messages-negotiation-main">
        <Link
          href={`/listings/${listing.id}`}
          className="messages-negotiation-listing"
        >
          <div className="messages-negotiation-photo">
            {listing.coverImage ? (
              <img
                src={listingMediaUrl(listing.coverImage)}
                alt={listing.title}
                className="messages-negotiation-image"
              />
            ) : (
              listing.title.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="messages-negotiation-info">
            <h3>{listing.title}</h3>
            <p>
              {listing.priceCents !== null
                ? formatCurrencyEuros(listing.priceCents)
                : copy.free}
            </p>
          </div>
        </Link>

        {/* Active Reservation Status */}
        {activeReservation && activeReservation.status === "active" && (
          <div className="messages-negotiation-action">
            <span
              data-testid="negotiation-badge-reserved"
              className="messages-negotiation-status"
            >
              {copy.reserved} (
              {formatCurrencyEuros(activeReservation.agreedPriceCents)})
            </span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleCancelReservation(activeReservation.id)}
              className="messages-negotiation-button"
            >
              {copy.cancel}
            </button>
          </div>
        )}

        {/* Active Offer Status */}
        {(!activeReservation || activeReservation.status !== "active") &&
          activeOffer &&
          activeOffer.status === "pending" && (
            <div className="messages-negotiation-action">
              <span
                data-testid="negotiation-badge-offer"
                className="messages-negotiation-status"
              >
                {copy.offer}: {formatCurrencyEuros(activeOffer.amountCents)}
              </span>
              {isSeller ? (
                <button
                  type="button"
                  data-testid="accept-offer-button"
                  disabled={isProcessing}
                  onClick={() => handleAcceptOffer(activeOffer.id)}
                  className="messages-negotiation-button"
                >
                  {copy.accept}
                </button>
              ) : (
                <span className="messages-negotiation-waiting">
                  {copy.waiting}
                </span>
              )}
            </div>
          )}
      </div>

      {actionError && (
        <div className="messages-send-error" role="alert">
          {actionError}
        </div>
      )}
    </div>
  );
}
