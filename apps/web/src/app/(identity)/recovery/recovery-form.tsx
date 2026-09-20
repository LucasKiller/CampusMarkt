"use client";

import { useRef, useState, type FormEvent } from "react";

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string[] }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const errorList = [
    ...(fieldErrors.email || []),
    ...(generalError ? [generalError] : []),
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setFieldErrors({ email: ["Enter a valid email address."] });
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/identity/recoveries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        if (response.status === 429) {
          setGeneralError(
            "Too many recovery requests. Please try again later.",
          );
        } else if (payload?.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        } else {
          setGeneralError(
            "Unable to process recovery request. Please try again.",
          );
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setGeneralError(
        "Network error. Please check your connection and try again.",
      );
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setIsPending(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="info-card" role="status" aria-live="polite">
        <h2 style={{ marginTop: 0, fontSize: "1.25rem", color: "#1b4d3e" }}>
          Check your email
        </h2>
        <p style={{ color: "#3f5d49", lineHeight: 1.5 }}>
          If an account exists for <strong>{email}</strong>, we sent password
          reset instructions.
        </p>
        <p style={{ fontSize: "0.875rem", color: "#526b59" }}>
          Please click the link within <strong>30 minutes</strong> to reset your
          password. If you don&apos;t see the email, please check your spam
          folder.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <a href="/sign-in" className="auth-link">
            Return to sign in
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
            Recovery problem
          </h2>
          <ul className="error-summary-list">
            {errorList.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email && (
          <span id="email-error" className="form-error">
            {fieldErrors.email[0]}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Sending link..." : "Send reset link"}
      </button>

      <div className="auth-footer">
        Remember your password?{" "}
        <a href="/sign-in" className="auth-link">
          Sign in
        </a>
      </div>
    </form>
  );
}
