"use client";

import React, { useState } from "react";
import type { OfferDTO, ReservationDTO } from "@campusmarkt/types";
import { OfferModal } from "./offer-modal";

export interface NegotiationBarProps {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  askingPriceCents: number | null;
  listingType?: string;
  listingStatus?: string;
  currentUserId?: string | null;
  isListingOwner?: boolean;
  initialOffers?: OfferDTO[];
  initialReservation?: ReservationDTO | null;
  onNavigate?: (url: string) => void;
}

export function NegotiationBar({
  listingId,
  listingTitle,
  sellerId,
  askingPriceCents,
  listingType = "SELL",
  listingStatus = "active",
  currentUserId = null,
  isListingOwner = false,
  initialOffers = [],
  initialReservation = null,
  onNavigate,
}: NegotiationBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"buy" | "offer">("buy");
  const [offers, setOffers] = useState<OfferDTO[]>(initialOffers);
  const [reservation, setReservation] = useState<ReservationDTO | null>(
    initialReservation,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Counter proposal state
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState<string>("");

  const isSeller =
    isListingOwner ||
    Boolean(
      currentUserId &&
      sellerId &&
      currentUserId.trim().toLowerCase() === sellerId.trim().toLowerCase(),
    );

  const isReserved = listingStatus === "reserved" || Boolean(reservation);
  const isInactive = listingStatus === "sold" || listingStatus === "archived";

  const navigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };

  const handleOpenModal = (tab: "buy" | "offer") => {
    if (!currentUserId) {
      const next = encodeURIComponent(
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/listings/${listingId}`,
      );
      navigate(`/login?next=${next}`);
      return;
    }
    setModalTab(tab);
    setModalOpen(true);
  };

  const handleSubmitOffer = async (payload: {
    amountCents: number;
    message?: string;
  }) => {
    const res = await fetch("/api/marketplace/offers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        listingId,
        amountCents: payload.amountCents,
        message: payload.message,
      }),
    });

    if (!res.ok) {
      const errorJson = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(errorJson.message || "Fehler beim Senden der Anfrage.");
    }

    const data = (await res.json()) as {
      data: { offerId: string; amountCents: number };
    };
    const newOffer: OfferDTO = {
      id: data.data.offerId,
      listingId,
      buyerId: currentUserId || "buyer",
      sellerId,
      amountCents: data.data.amountCents,
      message: payload.message ?? null,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setOffers((prev) => [newOffer, ...prev]);
  };

  const handleAcceptOffer = async (offerId: string) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/marketplace/offers/${offerId}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errJson.message || "Angebot konnte nicht angenommen werden.",
        );
      }

      const resJson = (await res.json()) as {
        data: {
          reservationId: string;
          listingId: string;
          agreedPriceCents: number;
          status: "active";
        };
      };

      setReservation({
        id: resJson.data.reservationId,
        listingId: resJson.data.listingId,
        buyerId: "buyer",
        sellerId,
        offerId,
        agreedPriceCents: resJson.data.agreedPriceCents,
        status: "active",
        createdAt: new Date().toISOString(),
      });

      setOffers((prev) =>
        prev.map((o) =>
          o.id === offerId
            ? { ...o, status: "accepted" as const }
            : o.status === "pending"
              ? { ...o, status: "superseded" as const }
              : o,
        ),
      );
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionError(error.message || "Fehler beim Annehmen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/marketplace/offers/${offerId}/decline`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (res.ok) {
        setOffers((prev) =>
          prev.map((o) =>
            o.id === offerId ? { ...o, status: "declined" as const } : o,
          ),
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionError(error.message || "Fehler beim Ablehnen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounterSubmit = async (parentOfferId: string) => {
    setActionError(null);
    const amountEuros = Number.parseFloat(counterAmount);
    if (Number.isNaN(amountEuros) || amountEuros <= 0) {
      setActionError("Bitte einen gültigen Gegenpreis eingeben.");
      return;
    }

    const amountCents = Math.round(amountEuros * 100);
    setIsProcessing(true);
    try {
      const res = await fetch(
        `/api/marketplace/offers/${parentOfferId}/counter`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ amountCents }),
        },
      );

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errJson.message || "Gegenangebot fehlgeschlagen.");
      }

      const resJson = (await res.json()) as {
        data: {
          offerId: string;
          parentOfferId: string;
          amountCents: number;
        };
      };

      setOffers((prev) => [
        {
          id: resJson.data.offerId,
          parentOfferId: resJson.data.parentOfferId,
          listingId,
          buyerId: "buyer",
          sellerId,
          amountCents: resJson.data.amountCents,
          message: null,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        ...prev.map((o) =>
          o.id === parentOfferId ? { ...o, status: "countered" as const } : o,
        ),
      ]);
      setCounterOfferId(null);
      setCounterAmount("");
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionError(error.message || "Fehler beim Gegenangebot.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Find active buyer offer if buyer is logged in
  const myPendingOffer =
    !isSeller && currentUserId
      ? offers.find(
          (o) =>
            o.buyerId === currentUserId &&
            (o.status === "pending" || o.status === "countered"),
        )
      : null;

  return (
    <div
      className="negotiation-bar"
      data-testid="negotiation-bar"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        width: "100%",
      }}
    >
      {/* Action Error Banner */}
      {actionError && (
        <div
          data-testid="negotiation-action-error"
          style={{
            padding: "0.625rem 0.875rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.375rem",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {actionError}
        </div>
      )}

      {/* Reserved Notice */}
      {isReserved && (
        <div
          data-testid="listing-reserved-badge"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "0.5rem",
            color: "#92400e",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          <span>
            {isSeller
              ? "Dieser Artikel ist aktuell reserviert."
              : "Dieser Artikel ist bereits für einen Käufer reserviert."}
          </span>
          <a
            href="/account/reservations"
            style={{
              fontWeight: 600,
              color: "#b45309",
              textDecoration: "underline",
            }}
          >
            Zu Reservierungen
          </a>
        </div>
      )}

      {/* Seller View: Incoming Active Offers */}
      {isSeller && !isInactive && !isReserved && (
        <div
          data-testid="seller-offers-card"
          style={{
            padding: "1rem",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "0.875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#475569",
              marginBottom: "0.75rem",
              marginTop: 0,
            }}
          >
            {`Eingehende Anfragen (${offers.filter((o) => o.status === "pending").length})`}
          </h3>

          {offers.filter((o) => o.status === "pending").length === 0 ? (
            <p
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                margin: 0,
              }}
            >
              Aktuell liegen keine offenen Kaufanfragen vor.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {offers
                .filter((o) => o.status === "pending")
                .map((offer) => (
                  <div
                    key={offer.id}
                    data-testid={`seller-offer-row-${offer.id}`}
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.375rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                        {`€${(offer.amountCents / 100).toFixed(2)}`}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#64748b",
                        }}
                      >
                        {new Date(offer.createdAt).toLocaleDateString("de-DE")}
                      </span>
                    </div>

                    {offer.message && (
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "#334155",
                          fontStyle: "italic",
                          margin: 0,
                        }}
                      >
                        {`"${offer.message}"`}
                      </p>
                    )}

                    {/* Counter input expand */}
                    {counterOfferId === offer.id ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          placeholder="Gegenpreis €"
                          data-testid="counter-price-input"
                          value={counterAmount}
                          onChange={(e) => setCounterAmount(e.target.value)}
                          style={{
                            width: "7rem",
                            padding: "0.375rem 0.5rem",
                            fontSize: "0.875rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.25rem",
                          }}
                        />
                        <button
                          type="button"
                          data-testid="submit-counter-btn"
                          disabled={isProcessing}
                          onClick={() => handleCounterSubmit(offer.id)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                          }}
                        >
                          Senden
                        </button>
                        <button
                          type="button"
                          onClick={() => setCounterOfferId(null)}
                          style={{
                            padding: "0.375rem 0.5rem",
                            fontSize: "0.8125rem",
                            color: "#64748b",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                          marginTop: "0.25rem",
                        }}
                      >
                        <button
                          type="button"
                          data-testid="seller-accept-btn"
                          disabled={isProcessing}
                          onClick={() => handleAcceptOffer(offer.id)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "#ffffff",
                            backgroundColor: "#16a34a",
                            border: "none",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                          }}
                        >
                          Annehmen
                        </button>
                        <button
                          type="button"
                          data-testid="seller-counter-btn"
                          disabled={isProcessing}
                          onClick={() => {
                            setCounterOfferId(offer.id);
                            setCounterAmount(
                              (offer.amountCents / 100).toFixed(2),
                            );
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.8125rem",
                            fontWeight: 500,
                            color: "#2563eb",
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "0.25rem",
                            cursor: "pointer",
                          }}
                        >
                          Gegenangebot
                        </button>
                        <button
                          type="button"
                          data-testid="seller-decline-btn"
                          disabled={isProcessing}
                          onClick={() => handleDeclineOffer(offer.id)}
                          style={{
                            padding: "0.375rem 0.5rem",
                            fontSize: "0.8125rem",
                            color: "#dc2626",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Ablehnen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Buyer View: Buyer's active proposal status */}
      {!isSeller && myPendingOffer && !isReserved && (
        <div
          data-testid="buyer-pending-offer-card"
          style={{
            padding: "0.875rem 1rem",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#1e40af",
              }}
            >
              {`Deine Kaufanfrage: €${(myPendingOffer.amountCents / 100).toFixed(2)}`}
            </span>
            <span
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#3b82f6",
                marginTop: "0.125rem",
              }}
            >
              Status: Ausstehend beim Verkäufer
            </span>
          </div>
        </div>
      )}

      {/* Buyer Action CTAs (Guest or Authenticated Non-Seller) */}
      {!isSeller && !isReserved && !isInactive && (
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          <button
            type="button"
            data-testid="cta-buy-now"
            onClick={() => handleOpenModal("buy")}
            style={{
              flex: 1,
              minWidth: "10rem",
              padding: "0.75rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "#2563eb",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <span>Kaufanfrage senden</span>
          </button>

          {listingType !== "GIVE_AWAY" &&
            askingPriceCents !== null &&
            askingPriceCents > 0 && (
              <button
                type="button"
                data-testid="cta-make-offer"
                onClick={() => handleOpenModal("offer")}
                style={{
                  flex: 1,
                  minWidth: "10rem",
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <span>Preis vorschlagen</span>
              </button>
            )}
        </div>
      )}

      {/* Negotiation Offer Modal */}
      <OfferModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
        askingPriceCents={askingPriceCents}
        listingType={listingType}
        initialTab={modalTab}
        onSubmitOffer={handleSubmitOffer}
      />
    </div>
  );
}
