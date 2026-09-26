"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { UniversityVerificationStatusResponse } from "@campusmarkt/types";

export function UniversityVerificationSection() {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] =
    useState<UniversityVerificationStatusResponse | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showReverifyForm, setShowReverifyForm] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/identity/me/university-verification");
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          setStatusData(json.data);
        }
      }
    } catch {
      // Ignore network errors on initial load
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleInitiate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setFieldErrors({});
    setGeneralError(null);
    setSuccessNotice(null);

    const trimmed = emailInput.trim();
    if (!trimmed) {
      setFieldErrors({
        institutionalEmail: ["Enter an institutional email address."],
      });
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/identity/university-verifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionalEmail: trimmed }),
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 202 || (response.ok && payload?.ok)) {
        setSuccessNotice(
          "Verification email sent! Check your university inbox within 24 hours to complete verification.",
        );
        setEmailInput("");
        setShowReverifyForm(false);
        await loadStatus();
        return;
      }

      if (payload?.code === "INVALID_INPUT" && payload.fieldErrors) {
        setFieldErrors(payload.fieldErrors);
      } else if (payload?.code === "CONFLICT") {
        setGeneralError(
          "This institutional email is already actively linked to an account.",
        );
      } else if (payload?.code === "RATE_LIMITED") {
        const retry = payload.retryAfterSeconds
          ? ` Please wait ${Math.ceil(payload.retryAfterSeconds / 60)} minutes.`
          : "";
        setGeneralError(`Verification rate limit exceeded.${retry}`);
      } else {
        setGeneralError(
          "Failed to send verification email. Please try again later.",
        );
      }
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } catch {
      setGeneralError("Network error. Please try again later.");
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setGeneralError(null);

    try {
      const res = await fetch("/api/identity/me/university-verification", {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDisconnectModal(false);
        setSuccessNotice("University verification disconnected successfully.");
        await loadStatus();
      } else {
        setGeneralError(
          "Failed to disconnect verification. Please try again later.",
        );
      }
    } catch {
      setGeneralError("Network error. Please try again later.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  const allErrors = [
    ...(fieldErrors.institutionalEmail || []),
    ...(generalError ? [generalError] : []),
  ];

  if (loading) {
    return (
      <div className="info-card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
          University Verification
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
          Loading verification status...
        </p>
      </div>
    );
  }

  const status = statusData?.status ?? "none";

  return (
    <div
      className="info-card"
      style={{ marginTop: "1.5rem" }}
      data-testid="university-verification-section"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
          University Verification
        </h2>
        {status === "verified" && (
          <span
            className="status-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              backgroundColor: "#e6f4ea",
              color: "#137333",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            Verified · {statusData?.badgeLabel ?? "TU Braunschweig"}
          </span>
        )}
        {status === "pending" && (
          <span
            className="status-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#fef3c7",
              color: "#92400e",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            Verification Pending
          </span>
        )}
        {status === "expired" && (
          <span
            className="status-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            Affiliation Expired
          </span>
        )}
      </div>

      <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
        Verify your affiliation with TU Braunschweig to display an official
        trust badge on your listings and profile. Verification lasts 12 calendar
        months.
      </p>

      {successNotice && (
        <div
          role="status"
          style={{
            backgroundColor: "#edf7ed",
            color: "#1e4620",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {successNotice}
        </div>
      )}

      {allErrors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          style={{
            backgroundColor: "#fdeded",
            color: "#5f2120",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {allErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified State */}
      {status === "verified" && (
        <div>
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>
              🎓 {statusData?.badgeLabel ?? "TU Braunschweig"}
            </p>
            <p
              style={{
                margin: "0 0 0.25rem 0",
                fontSize: "0.875rem",
                color: "#475569",
              }}
            >
              Affiliation is active and visible on your public profile.
            </p>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
              Remaining validity: {statusData?.daysRemaining ?? 0} days
              {statusData?.expiresAt &&
                ` (until ${new Date(statusData.expiresAt).toLocaleDateString()})`}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginTop: "0.75rem",
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowReverifyForm(!showReverifyForm)}
            >
              {showReverifyForm ? "Cancel renewal" : "Reverify / Renew"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
              onClick={() => setShowDisconnectModal(true)}
            >
              Disconnect badge
            </button>
          </div>
        </div>
      )}

      {/* Expired State */}
      {status === "expired" && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "6px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem 0",
              fontWeight: 600,
              color: "#92400e",
            }}
          >
            Your affiliation has expired
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#78350f" }}>
            The TU Braunschweig trust badge has been removed from your profile
            and listings. Re-verify your student email to renew it for another 6
            months.
          </p>
        </div>
      )}

      {/* Pending State */}
      {status === "pending" && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem 0",
              fontWeight: 600,
              color: "#166534",
            }}
          >
            Verification link sent
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#15803d" }}>
            We sent a verification link to your university inbox. Please click
            the link within 24 hours to confirm.
          </p>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => setShowReverifyForm(!showReverifyForm)}
          >
            {showReverifyForm ? "Hide form" : "Send new verification email"}
          </button>
        </div>
      )}

      {/* Initiation Form (Shown for none, expired, or when reverify toggled) */}
      {(status === "none" ||
        status === "expired" ||
        (status === "verified" && showReverifyForm) ||
        (status === "pending" && showReverifyForm)) && (
        <form
          onSubmit={handleInitiate}
          style={{ marginTop: "1rem" }}
          noValidate
        >
          <div className="form-group">
            <label
              htmlFor="institutional-email"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              Institutional Email Address
            </label>
            <input
              id="institutional-email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. s.mustermann@tu-braunschweig.de"
              disabled={isSubmitting}
              aria-describedby="institutional-email-hint"
              aria-invalid={!!fieldErrors.institutionalEmail}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
                boxSizing: "border-box",
              }}
            />
            <span
              id="institutional-email-hint"
              style={{
                display: "block",
                marginTop: "0.25rem",
                fontSize: "0.75rem",
                color: "#64748b",
              }}
            >
              Supported domains: @tu-braunschweig.de or @tu-bs.de
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ marginTop: "0.75rem" }}
          >
            {isSubmitting ? "Sending link..." : "Send Verification Email"}
          </button>
        </form>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="disconnect-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "1.5rem",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              id="disconnect-modal-title"
              style={{ marginTop: 0, fontSize: "1.125rem", color: "#0f172a" }}
            >
              Disconnect University Badge?
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#475569",
                lineHeight: "1.4",
              }}
            >
              This will remove the TU Braunschweig trust badge from your public
              profile and listings immediately. You can re-verify at any time.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                marginTop: "1.25rem",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={isDisconnecting}
                onClick={() => setShowDisconnectModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={isDisconnecting}
                style={{ backgroundColor: "#dc2626", borderColor: "#dc2626" }}
                onClick={handleDisconnect}
              >
                {isDisconnecting ? "Disconnecting..." : "Confirm Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
