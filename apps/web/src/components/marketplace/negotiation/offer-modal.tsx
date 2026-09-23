"use client";

import React, { useState, useEffect, useRef } from "react";

export interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  askingPriceCents: number | null;
  listingType?: string;
  initialTab?: "buy" | "offer";
  onSubmitOffer?: (payload: {
    amountCents: number;
    message?: string;
  }) => Promise<void> | void;
}

export function validateOfferAmount(
  amountEuros: number,
  askingPriceCents: number | null,
): { valid: boolean; error?: string; cents?: number } {
  if (
    Number.isNaN(amountEuros) ||
    !Number.isFinite(amountEuros) ||
    amountEuros <= 0
  ) {
    return {
      valid: false,
      error: "Der Preisvorschlag muss größer als 0 € sein.",
    };
  }

  const cents = Math.round(amountEuros * 100);

  if (askingPriceCents !== null && askingPriceCents > 0) {
    if (cents > askingPriceCents) {
      const maxFormatted = (askingPriceCents / 100).toFixed(2);
      return {
        valid: false,
        error: `Der Preisvorschlag darf den Festpreis von €${maxFormatted} nicht überschreiten.`,
      };
    }
  }

  return { valid: true, cents };
}

export function OfferModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  askingPriceCents,
  listingType = "SELL",
  initialTab = "buy",
  onSubmitOffer,
}: OfferModalProps) {
  const isGiveaway = listingType === "GIVE_AWAY" || askingPriceCents === 0;
  const [activeTab, setActiveTab] = useState<"buy" | "offer">(
    isGiveaway ? "buy" : initialTab,
  );
  const [offerEuroInput, setOfferEuroInput] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setActiveTab(isGiveaway ? "buy" : initialTab);
      setOfferEuroInput("");
      setMessage("");
      setValidationError(null);
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialTab, isGiveaway]);

  // Focus trap and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus first element on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable) {
        focusable.focus();
      }
    } else if (!isOpen && previousActiveElement.current) {
      (previousActiveElement.current as HTMLElement).focus?.();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const askingPriceDisplay =
    askingPriceCents !== null && askingPriceCents > 0
      ? `€${(askingPriceCents / 100).toFixed(2)}`
      : isGiveaway
        ? "Kostenlos"
        : "VB";

  const handleEuroInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOfferEuroInput(val);
    setSubmitError(null);

    if (val.trim() === "") {
      setValidationError(null);
      return;
    }

    const num = Number.parseFloat(val);
    const result = validateOfferAmount(num, askingPriceCents);
    if (!result.valid) {
      setValidationError(result.error ?? null);
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    let amountCents: number;

    if (activeTab === "buy" || isGiveaway) {
      amountCents = askingPriceCents ?? 0;
    } else {
      const num = Number.parseFloat(offerEuroInput);
      const validation = validateOfferAmount(num, askingPriceCents);
      if (!validation.valid || validation.cents === undefined) {
        setValidationError(
          validation.error || "Bitte gib einen gültigen Preis ein.",
        );
        return;
      }
      amountCents = validation.cents;
    }

    if (onSubmitOffer) {
      try {
        setIsSubmitting(true);
        await onSubmitOffer({
          amountCents,
          message: message.trim() ? message.trim() : undefined,
        });
        onClose();
      } catch (err: unknown) {
        const error = err as { message?: string };
        setSubmitError(
          error.message ||
            "Fehler beim Senden der Anfrage. Bitte versuche es erneut.",
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-modal-title"
      data-testid="offer-modal-dialog"
      data-listing-id={listingId}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(2px)",
        padding: "1rem",
      }}
    >
      {/* Backdrop click */}
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={modalRef}
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "32rem",
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div>
            <h2
              id="offer-modal-title"
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#111827",
                margin: 0,
              }}
            >
              {isGiveaway ? "Artikel anfragen" : "Kaufanfrage & Preisvorschlag"}
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginTop: "0.25rem",
                marginBottom: 0,
              }}
            >
              {listingTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-modal-btn"
            aria-label="Schließen"
            style={{
              padding: "0.5rem",
              color: "#9ca3af",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "1.25rem",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation (only if not a free giveaway) */}
        {!isGiveaway && (
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <button
              type="button"
              data-testid="tab-buy"
              onClick={() => {
                setActiveTab("buy");
                setValidationError(null);
                setSubmitError(null);
              }}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: activeTab === "buy" ? 600 : 500,
                color: activeTab === "buy" ? "#2563eb" : "#4b5563",
                borderBottom:
                  activeTab === "buy"
                    ? "2px solid #2563eb"
                    : "2px solid transparent",
                backgroundColor:
                  activeTab === "buy" ? "#ffffff" : "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer",
              }}
            >
              Zum Festpreis ({askingPriceDisplay})
            </button>
            <button
              type="button"
              data-testid="tab-offer"
              onClick={() => {
                setActiveTab("offer");
                setSubmitError(null);
              }}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: activeTab === "offer" ? 600 : 500,
                color: activeTab === "offer" ? "#2563eb" : "#4b5563",
                borderBottom:
                  activeTab === "offer"
                    ? "2px solid #2563eb"
                    : "2px solid transparent",
                backgroundColor:
                  activeTab === "offer" ? "#ffffff" : "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer",
              }}
            >
              Preis vorschlagen
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {/* Error Banner */}
          {submitError && (
            <div
              data-testid="offer-modal-error"
              style={{
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.375rem",
                color: "#b91c1c",
                fontSize: "0.875rem",
              }}
            >
              {submitError}
            </div>
          )}

          {activeTab === "buy" || isGiveaway ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "0.875rem 1rem",
                  backgroundColor: "#eff6ff",
                  borderRadius: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#1e40af",
                  }}
                >
                  Vereinbarter Preis:
                </span>
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#1e3a8a",
                  }}
                  data-testid="direct-buy-price"
                >
                  {askingPriceDisplay}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Mit deiner Anfrage bekundest du verbindliches Kaufinteresse zum
                Festpreis. Nach Annahme durch den Verkäufer wird der Artikel
                reserviert.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="offer-amount-input"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Dein Preisvorschlag in Euro (€)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="offer-amount-input"
                  data-testid="offer-amount-input"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="z. B. 15.00"
                  value={offerEuroInput}
                  onChange={handleEuroInputChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={
                    validationError ? "offer-amount-error" : undefined
                  }
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    fontSize: "1rem",
                    border: `1px solid ${validationError ? "#ef4444" : "#d1d5db"}`,
                    borderRadius: "0.375rem",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              {validationError && (
                <p
                  id="offer-amount-error"
                  data-testid="offer-amount-error"
                  style={{
                    fontSize: "0.8125rem",
                    color: "#dc2626",
                    marginTop: "0.375rem",
                    marginBottom: 0,
                  }}
                >
                  {validationError}
                </p>
              )}

              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                  marginBottom: 0,
                }}
              >
                Der Verkäufer kann deinen Vorschlag annehmen, ablehnen oder ein
                Gegenangebot machen.
              </p>
            </div>
          )}

          {/* Optional Message Field */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="offer-message-input"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Nachricht an den Verkäufer (optional)
            </label>
            <textarea
              id="offer-message-input"
              data-testid="offer-message-input"
              rows={3}
              maxLength={500}
              placeholder="z. B. Wann wäre eine Abholung am Hauptcampus möglich?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                fontSize: "0.875rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                boxSizing: "border-box",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                fontSize: "0.75rem",
                color: "#9ca3af",
                marginTop: "0.25rem",
              }}
            >
              {message.length}/500 Zeichen
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              data-testid="cancel-modal-btn"
              disabled={isSubmitting}
              style={{
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              data-testid={
                activeTab === "buy" ? "submit-intent-btn" : "submit-offer-btn"
              }
              disabled={isSubmitting || Boolean(validationError)}
              style={{
                padding: "0.625rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#ffffff",
                backgroundColor:
                  isSubmitting || Boolean(validationError)
                    ? "#93c5fd"
                    : "#2563eb",
                border: "none",
                borderRadius: "0.375rem",
                cursor:
                  isSubmitting || Boolean(validationError)
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isSubmitting
                ? "Wird gesendet..."
                : activeTab === "buy"
                  ? "Kaufanfrage senden"
                  : "Preisvorschlag senden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
