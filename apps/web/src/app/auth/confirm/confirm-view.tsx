"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ConfirmView() {
  const searchParams = useSearchParams();
  const initialInvalid = searchParams.get("status") === "invalid_link";

  const [isPending, setIsPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [invalid, setInvalid] = useState(initialInvalid);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendResult, setResendResult] = useState<string | null>(null);

  async function handleConfirm() {
    if (isPending) return;
    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/identity/confirmations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.ok && payload?.data?.status === "confirmed") {
        setConfirmed(true);
      } else if (
        payload?.data?.status === "invalid_link" ||
        response.status === 400 ||
        response.status === 404
      ) {
        setInvalid(true);
      } else {
        setErrorMessage(
          "We could not confirm your email right now. Please try again or request a new link.",
        );
      }
    } catch {
      setErrorMessage(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (resendPending) return;
    setResendPending(true);
    setResendResult(null);

    try {
      const response = await fetch("/api/identity/confirmation-resends", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });

      if (response.status === 429) {
        setResendResult(
          "Too many requests. Please wait a while before trying again.",
        );
      } else {
        setResendResult(
          "If an unconfirmed account exists for that email, a new link has been sent.",
        );
      }
    } catch {
      setResendResult("Error sending confirmation email. Please try again.");
    } finally {
      setResendPending(false);
    }
  }

  if (confirmed) {
    return (
      <div className="success-card" role="status" aria-live="polite">
        <h2 style={{ marginTop: 0 }}>Email confirmed!</h2>
        <p>
          Your email address has been verified. Your CampusMarkt account is now
          fully active.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <a
            href="/sign-in"
            className="btn-primary"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            Continue to sign in
          </a>
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="info-card">
        <h2 style={{ marginTop: 0, color: "#991b1b" }}>
          Link invalid or expired
        </h2>
        <p>
          This confirmation link is expired, invalid, or has already been used.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #9aab9d",
            margin: "1.5rem 0",
          }}
        />
        <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>Need a new link?</h3>
        <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
          Enter your email below to receive a new confirmation link.
        </p>
        <form
          onSubmit={handleResend}
          className="auth-form"
          style={{ maxWidth: "24rem" }}
        >
          <div className="form-group">
            <label htmlFor="resendEmail" className="form-label">
              Email address
            </label>
            <input
              id="resendEmail"
              name="resendEmail"
              type="email"
              required
              className="form-input"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="name@example.test"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={resendPending}
          >
            {resendPending ? "Sending..." : "Send new link"}
          </button>
          {resendResult && (
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 500,
                marginTop: "0.5rem",
              }}
            >
              {resendResult}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="info-card">
      <h2 style={{ marginTop: 0 }}>Confirm your email address</h2>
      <p>
        Please click the button below to confirm your email and activate your
        CampusMarkt account.
      </p>

      {errorMessage && (
        <div
          className="error-summary"
          style={{ marginBottom: "1rem" }}
          role="alert"
        >
          <p style={{ margin: 0, color: "#b91c1c", fontWeight: 500 }}>
            {errorMessage}
          </p>
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        onClick={handleConfirm}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Confirming..." : "Confirm Email"}
      </button>
    </div>
  );
}
