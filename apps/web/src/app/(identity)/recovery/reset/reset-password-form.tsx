"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const initialInvalid = searchParams.get("status") === "invalid_link";

  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string[] }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isInvalidLink, setIsInvalidLink] = useState(initialInvalid);
  const [isPending, setIsPending] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const errorList = [
    ...(fieldErrors.password || []),
    ...(generalError ? [generalError] : []),
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);

    const localErrors: { password?: string[] } = {};
    if (!password || password.length < 10) {
      localErrors.password = ["Password must contain at least 10 characters."];
    } else if (password.length > 128) {
      localErrors.password = ["Password cannot exceed 128 characters."];
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setPassword(""); // Never retain password on error
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/identity/password-resets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setPassword(""); // Never retain password on error
        if (payload?.data?.status === "invalid_link") {
          setIsInvalidLink(true);
        } else if (payload?.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        } else {
          setGeneralError(
            "Unable to update password. Please try again or request a new reset link.",
          );
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      if (payload.data?.status === "invalid_link") {
        setPassword("");
        setIsInvalidLink(true);
        return;
      }

      setIsUpdated(true);
    } catch {
      setPassword("");
      setGeneralError(
        "Network error. Please check your connection and try again.",
      );
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setIsPending(false);
    }
  }

  if (isInvalidLink) {
    return (
      <div className="info-card" role="alert">
        <h2 style={{ marginTop: 0, fontSize: "1.25rem", color: "#b91c1c" }}>
          Recovery link expired or invalid
        </h2>
        <p style={{ color: "#526b59", lineHeight: 1.5 }}>
          This password reset link has expired, has already been used, or is
          invalid. For security, recovery links are one-time use and expire
          after 30 minutes.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <a
            href="/forgot-password"
            className="btn-primary"
            style={{ display: "inline-block", textAlign: "center" }}
          >
            Request a new reset link
          </a>
        </div>
      </div>
    );
  }

  if (isUpdated) {
    return (
      <div className="info-card" role="status" aria-live="polite">
        <h2 style={{ marginTop: 0, fontSize: "1.25rem", color: "#1b4d3e" }}>
          Password reset successful!
        </h2>
        <p style={{ color: "#3f5d49", lineHeight: 1.5 }}>
          Your password has been updated and any existing sessions have been
          signed out. You can now sign in with your new password.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <a
            href="/sign-in"
            className="btn-primary"
            style={{ display: "inline-block", textAlign: "center" }}
          >
            Continue to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="error-summary-heading"
          className="error-summary"
        >
          <h2 id="error-summary-heading" className="error-summary-title">
            Password problem
          </h2>
          <ul className="error-summary-list">
            {errorList.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-invalid={!!fieldErrors.password}
          aria-describedby={
            fieldErrors.password ? "password-error" : "password-hint"
          }
        />
        <span id="password-hint" className="form-hint">
          Must contain 10 to 128 characters.
        </span>
        {fieldErrors.password && (
          <span id="password-error" className="form-error">
            {fieldErrors.password[0]}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Updating password..." : "Reset password"}
      </button>

      <div className="auth-footer">
        <a href="/sign-in" className="auth-link">
          Back to sign in
        </a>
      </div>
    </form>
  );
}
