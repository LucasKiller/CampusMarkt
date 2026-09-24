"use client";

import React, { useState } from "react";
import type { ReservationCancellationReason } from "@campusmarkt/types";
import { getPickupAreaLabel, type PickupArea } from "@campusmarkt/domain";
import { CompleteHandoverButton } from "../../../components/marketplace/pickup/complete-handover-modal";
import { SafePickupChecklist } from "../../../components/marketplace/pickup/safe-pickup-checklist";

export interface ReservationDashboardItem {
  id: string;
  listingId: string;
  listingTitle: string;
  agreedPriceCents: number;
  pickupArea: PickupArea;
  partnerRole: "buyer" | "seller";
  partnerId: string;
  partnerName: string;
  hasUniversityBadge: boolean;
  universityBadgeLabel: string | null;
  status: "active" | "cancelled" | "completed";
  createdAt: string;
}

export interface ReservationsViewProps {
  initialReservations: ReservationDashboardItem[];
  currentUserId: string;
  initialTab?: "all" | "active" | "completed" | "cancelled";
}

export const CANCELLATION_REASONS: Array<{
  value: ReservationCancellationReason;
  label: string;
}> = [
  {
    value: "no_show",
    label: "Partner ist nicht zum Treffpunkt erschienen (No-Show)",
  },
  {
    value: "changed_mind",
    label: "Meinung geändert / Artikel wird nicht mehr benötigt",
  },
  {
    value: "scheduling_conflict",
    label: "Terminkonflikt / Keine Einigung beim Treffen",
  },
  {
    value: "other",
    label: "Sonstiger Grund",
  },
];

export function ReservationsView({
  initialReservations,
  initialTab = "all",
}: ReservationsViewProps) {
  const [reservations, setReservations] =
    useState<ReservationDashboardItem[]>(initialReservations);
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "cancelled"
  >(initialTab);
  const [cancellingItem, setCancellingItem] =
    useState<ReservationDashboardItem | null>(null);
  const [selectedReason, setSelectedReason] =
    useState<ReservationCancellationReason>("no_show");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const filteredReservations = reservations.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const handleOpenCancelModal = (item: ReservationDashboardItem) => {
    setActionError(null);
    setSelectedReason("no_show");
    setCancellingItem(item);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingItem) return;

    setActionError(null);
    setIsProcessing(true);

    try {
      const res = await fetch(
        `/api/marketplace/reservations/${cancellingItem.id}/cancel`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ reason: selectedReason }),
        },
      );

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errorData.message || "Fehler beim Stornieren der Reservierung.",
        );
      }

      setReservations((prev) =>
        prev.map((r) =>
          r.id === cancellingItem.id
            ? { ...r, status: "cancelled" as const }
            : r,
        ),
      );

      setFeedbackSuccess(
        `Reservierung für "${cancellingItem.listingTitle}" wurde erfolgreich storniert. Das Inserat ist wieder als aktiv gelistet.`,
      );
      setCancellingItem(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionError(
        error.message || "Reservierung konnte nicht storniert werden.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="reservations-view"
      data-testid="reservations-dashboard-view"
    >
      {/* Header controls & filter tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            data-testid="filter-all-btn"
            onClick={() => setFilter("all")}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.875rem",
              fontWeight: filter === "all" ? 700 : 500,
              backgroundColor: filter === "all" ? "#1e293b" : "#ffffff",
              color: filter === "all" ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {`Alle (${reservations.length})`}
          </button>
          <button
            type="button"
            data-testid="filter-active-btn"
            onClick={() => setFilter("active")}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.875rem",
              fontWeight: filter === "active" ? 700 : 500,
              backgroundColor: filter === "active" ? "#1e293b" : "#ffffff",
              color: filter === "active" ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {`Aktiv (${reservations.filter((r) => r.status === "active").length})`}
          </button>
          <button
            type="button"
            data-testid="filter-completed-btn"
            onClick={() => setFilter("completed")}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.875rem",
              fontWeight: filter === "completed" ? 700 : 500,
              backgroundColor: filter === "completed" ? "#1e293b" : "#ffffff",
              color: filter === "completed" ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {`Abgeschlossen (${reservations.filter((r) => r.status === "completed").length})`}
          </button>
          <button
            type="button"
            data-testid="filter-cancelled-btn"
            onClick={() => setFilter("cancelled")}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.875rem",
              fontWeight: filter === "cancelled" ? 700 : 500,
              backgroundColor: filter === "cancelled" ? "#1e293b" : "#ffffff",
              color: filter === "cancelled" ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            {`Storniert (${reservations.filter((r) => r.status === "cancelled").length})`}
          </button>
        </div>
      </div>

      {/* Safe Pickup Checklist rendered above active reservations view */}
      {(filter === "active" || filter === "all") && (
        <div style={{ marginBottom: "1.5rem" }}>
          <SafePickupChecklist />
        </div>
      )}

      {/* Success banner */}
      {feedbackSuccess && (
        <div
          data-testid="cancellation-success"
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "0.5rem",
            color: "#166534",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          {feedbackSuccess}
        </div>
      )}

      {/* Reservation cards list */}
      {filteredReservations.length === 0 ? (
        <div
          data-testid="empty-reservations-notice"
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            borderRadius: "0.5rem",
            border: "1px dashed #cbd5e1",
            color: "#64748b",
          }}
        >
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 500 }}>
            Keine Reservierungen in dieser Ansicht gefunden.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {filteredReservations.map((item) => (
            <div
              key={item.id}
              data-testid={`reservation-card-${item.id}`}
              style={{
                padding: "1.25rem",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <a
                    href={`/listings/${item.listingId}`}
                    data-testid={`reservation-listing-title-${item.id}`}
                    style={{
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      textDecoration: "none",
                    }}
                  >
                    {item.listingTitle}
                  </a>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#64748b",
                      marginTop: "0.25rem",
                    }}
                  >
                    {`Vereinbarter Übergabeort: ${getPickupAreaLabel(item.pickupArea)}`}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    data-testid={`reservation-price-${item.id}`}
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {`€${(item.agreedPriceCents / 100).toFixed(2)}`}
                  </span>
                  <span
                    data-testid={`reservation-status-badge-${item.id}`}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      textTransform: "uppercase",
                      backgroundColor:
                        item.status === "active"
                          ? "#fef3c7"
                          : item.status === "completed"
                            ? "#dcfce7"
                            : "#f1f5f9",
                      color:
                        item.status === "active"
                          ? "#92400e"
                          : item.status === "completed"
                            ? "#166534"
                            : "#475569",
                    }}
                  >
                    {item.status === "active"
                      ? "Aktiv"
                      : item.status === "completed"
                        ? "Abgeschlossen"
                        : "Storniert"}
                  </span>
                </div>
              </div>

              {/* Partner profile bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ color: "#475569", fontWeight: 500 }}>
                    {item.partnerRole === "seller" ? "Verkäufer:" : "Käufer:"}
                  </span>
                  <span
                    data-testid={`reservation-partner-name-${item.id}`}
                    style={{ fontWeight: 600, color: "#1e293b" }}
                  >
                    {item.partnerName}
                  </span>
                  {item.hasUniversityBadge && (
                    <span
                      data-testid={`partner-trust-badge-${item.id}`}
                      style={{
                        padding: "0.125rem 0.375rem",
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#065f46",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: "0.25rem",
                      }}
                    >
                      {item.universityBadgeLabel || "Verifiziert"}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {/* Complete Handover Button for seller on active reservations */}
                  {item.status === "active" && item.partnerRole === "buyer" && (
                    <CompleteHandoverButton
                      reservationId={item.id}
                      listingTitle={item.listingTitle}
                      agreedPriceCents={item.agreedPriceCents}
                      onCompleted={() => {
                        setReservations((prev) =>
                          prev.map((r) =>
                            r.id === item.id
                              ? { ...r, status: "completed" as const }
                              : r,
                          ),
                        );
                        setFeedbackSuccess(
                          `Übergabe für "${item.listingTitle}" erfolgreich abgeschlossen! Das Inserat wurde als verkauft markiert.`,
                        );
                      }}
                    />
                  )}

                  {/* Cancel action button */}
                  {item.status === "active" && (
                    <button
                      type="button"
                      data-testid={`cancel-reservation-btn-${item.id}`}
                      onClick={() => handleOpenCancelModal(item)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "#dc2626",
                        backgroundColor: "#fff",
                        border: "1px solid #fecaca",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                      }}
                    >
                      Reservierung stornieren
                    </button>
                  )}

                  {/* Completed info indicator */}
                  {item.status === "completed" && item.createdAt && (
                    <span
                      data-testid={`reservation-completed-date-${item.id}`}
                      style={{
                        fontSize: "0.8125rem",
                        color: "#64748b",
                      }}
                    >
                      {`Abgeschlossen am ${new Date(item.createdAt).toLocaleDateString("de-DE")}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structured Cancellation Modal */}
      {cancellingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          data-testid="cancel-reservation-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "28rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div>
              <h2
                id="cancel-modal-title"
                style={{
                  margin: 0,
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Reservierung stornieren
              </h2>
              <p
                style={{
                  margin: "0.375rem 0 0",
                  fontSize: "0.875rem",
                  color: "#64748b",
                }}
              >
                {`Möchtest du die Reservierung für "${cancellingItem.listingTitle}" wirklich stornieren? Der Artikel wird wieder für andere Interessenten freigegeben.`}
              </p>
            </div>

            {/* Error display */}
            {actionError && (
              <div
                data-testid="cancellation-error"
                style={{
                  padding: "0.5rem 0.75rem",
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

            {/* Reason selector */}
            <div>
              <label
                htmlFor="cancel-reason-select"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "0.375rem",
                }}
              >
                Grund für die Stornierung
              </label>
              <select
                id="cancel-reason-select"
                data-testid="cancellation-reason-select"
                value={selectedReason}
                onChange={(e) =>
                  setSelectedReason(
                    e.target.value as ReservationCancellationReason,
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.375rem",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                }}
              >
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              <button
                type="button"
                data-testid="cancel-modal-abort-btn"
                onClick={() => setCancellingItem(null)}
                disabled={isProcessing}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#475569",
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                data-testid="confirm-cancel-reservation-btn"
                onClick={handleConfirmCancel}
                disabled={isProcessing}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#ffffff",
                  backgroundColor: "#dc2626",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  opacity: isProcessing ? 0.7 : 1,
                }}
              >
                {isProcessing ? "Wird storniert..." : "Ja, stornieren"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
