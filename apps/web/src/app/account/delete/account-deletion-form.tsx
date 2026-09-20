"use client";

import { useState } from "react";

type DeletionStep = "confirm" | "reauthenticate" | "deleted";

export function AccountDeletionForm() {
  const [step, setStep] = useState<DeletionStep>("confirm");
  const [confirmation, setConfirmation] = useState("");
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successNote, setSuccessNote] = useState<string | null>(null);

  async function handleDelete() {
    if (isPending) return;
    if (confirmation !== "DELETE") {
      setFieldErrors({
        confirmation: ["Type DELETE to confirm account deletion."],
      });
      return;
    }

    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/identity/me/deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json && !json.ok) {
          if (json.fieldErrors) {
            setFieldErrors(json.fieldErrors);
          } else {
            setErrorMessage(
              "Unable to complete deletion request. Please try again.",
            );
          }
        } else {
          setErrorMessage("Failed to delete account. Please try again.");
        }
        return;
      }

      if (json && json.ok && json.data) {
        if (json.data.status === "reauthentication_required") {
          setStep("reauthenticate");
          setErrorMessage(
            "Recent authentication is required. Please verify your credentials before deleting your account.",
          );
          return;
        }

        if (json.data.status === "deletion_pending") {
          setStep("deleted");
          return;
        }
      }

      setErrorMessage("Unexpected response from server.");
    } catch {
      setErrorMessage("Network error during deletion request.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleReauthenticate() {
    if (isPending) return;
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/identity/me/reauthentication", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: reauthEmail,
          password: reauthPassword,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json && !json.ok) {
          if (json.fieldErrors) {
            setFieldErrors(json.fieldErrors);
          } else if (json.code === "UNAUTHENTICATED") {
            setErrorMessage("Invalid email or password.");
          } else {
            setErrorMessage("Reauthentication failed. Please try again.");
          }
        } else {
          setErrorMessage(
            "Reauthentication failed. Please check your credentials.",
          );
        }
        return;
      }

      if (json && json.ok && json.data?.status === "reauthenticated") {
        setReauthPassword("");
        setSuccessNote(
          "Identity verified successfully. You may now confirm deletion.",
        );
        setStep("confirm");
        return;
      }

      setErrorMessage("Unexpected response during reauthentication.");
    } catch {
      setErrorMessage("Network error during reauthentication.");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "deleted") {
    return (
      <div className="auth-form" style={{ marginTop: "1rem" }}>
        <div
          className="info-card"
          style={{
            borderColor: "#16a34a",
            backgroundColor: "#f0fdf4",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#166534", fontSize: "1.25rem" }}>
            Account Deletion Pending
          </h2>
          <p style={{ color: "#14532d", lineHeight: 1.6 }}>
            Your account deletion request has been submitted. All active
            sessions have been signed out and your public profile and avatar are
            no longer visible. Your account data will be permanently purged
            within 30 days.
          </p>
          <div style={{ marginTop: "1.5rem" }}>
            <a
              href="/sign-in"
              className="btn-primary"
              style={{ display: "inline-block" }}
            >
              Return to Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === "reauthenticate") {
    return (
      <div className="auth-form" style={{ marginTop: "1rem" }}>
        {errorMessage && (
          <div
            className="error-summary"
            role="alert"
            style={{ marginBottom: "1rem" }}
          >
            <p style={{ margin: 0, color: "#b91c1c" }}>{errorMessage}</p>
          </div>
        )}

        <div className="info-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.125rem" }}>
            Reauthentication Required
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
            For your security, please confirm your primary email address and
            password before proceeding with account deletion.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <div className="form-group">
              <label htmlFor="reauth-email">Primary Email</label>
              <input
                id="reauth-email"
                type="email"
                className="input-text"
                autoComplete="email"
                value={reauthEmail}
                onChange={(e) => setReauthEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isPending}
                aria-invalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <span
                  className="field-error"
                  style={{ color: "#b91c1c", fontSize: "0.875rem" }}
                >
                  {fieldErrors.email[0]}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reauth-password">Password</label>
              <input
                id="reauth-password"
                type="password"
                className="input-text"
                autoComplete="current-password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                disabled={isPending}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <span
                  className="field-error"
                  style={{ color: "#b91c1c", fontSize: "0.875rem" }}
                >
                  {fieldErrors.password[0]}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleReauthenticate}
                disabled={isPending}
              >
                {isPending ? "Verifying..." : "Verify password"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setErrorMessage(null);
                  setFieldErrors({});
                  setStep("confirm");
                }}
                disabled={isPending}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form" style={{ marginTop: "1rem" }}>
      {successNote && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            color: "#166534",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {successNote}
        </div>
      )}

      {errorMessage && (
        <div
          className="error-summary"
          role="alert"
          style={{ marginBottom: "1rem" }}
        >
          <p style={{ margin: 0, color: "#b91c1c" }}>{errorMessage}</p>
        </div>
      )}

      <div
        className="info-card"
        style={{
          border: "1px solid #fca5a5",
          backgroundColor: "#fef2f2",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#991b1b", fontSize: "1.125rem" }}>
          Warning: This action is permanent
        </h2>
        <ul
          style={{
            color: "#7f1d1d",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            paddingLeft: "1.25rem",
          }}
        >
          <li>Your public profile and avatar will be hidden immediately.</li>
          <li>
            All active sessions across all devices will be revoked immediately.
          </li>
          <li>Your account data will be permanently purged within 30 days.</li>
          <li>Once initiated, this deletion request cannot be canceled.</li>
        </ul>
      </div>

      <div className="info-card">
        <div className="form-group">
          <label htmlFor="delete-confirmation" style={{ fontWeight: 600 }}>
            Type DELETE to confirm account deletion
          </label>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#526b59",
              margin: "0.25rem 0 0.75rem",
            }}
          >
            Please type <strong style={{ color: "#b91c1c" }}>DELETE</strong> in
            uppercase to proceed.
          </p>
          <input
            id="delete-confirmation"
            type="text"
            className="input-text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            disabled={isPending}
            aria-invalid={!!fieldErrors.confirmation}
          />
          {fieldErrors.confirmation && (
            <span
              className="field-error"
              style={{
                color: "#b91c1c",
                fontSize: "0.875rem",
                display: "block",
                marginTop: "0.25rem",
              }}
            >
              {fieldErrors.confirmation[0]}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            style={{
              borderColor: "#b91c1c",
              backgroundColor:
                confirmation === "DELETE" ? "#b91c1c" : "transparent",
              color: confirmation === "DELETE" ? "#ffffff" : "#b91c1c",
              cursor: isPending ? "wait" : "pointer",
            }}
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting account..." : "Permanently delete account"}
          </button>

          <a
            href="/account"
            className="btn-secondary"
            style={{ textAlign: "center", textDecoration: "none" }}
          >
            Cancel and return to account
          </a>
        </div>
      </div>
    </div>
  );
}
