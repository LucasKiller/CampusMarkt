"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function SignInForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string[];
    password?: string[];
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const errorList = [
    ...(fieldErrors.email || []),
    ...(fieldErrors.password || []),
    ...(generalError ? [generalError] : []),
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);

    const localErrors: { email?: string[]; password?: string[] } = {};
    if (!email.trim() || !email.includes("@")) {
      localErrors.email = ["Enter a valid email address."];
    }
    if (!password) {
      localErrors.password = ["Enter your password."];
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setPassword(""); // Never retain password on error
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/identity/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          returnTo,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setPassword(""); // Never retain password on failure
        if (response.status === 429) {
          setGeneralError("Too many sign-in attempts. Please try again later.");
        } else if (response.status === 401) {
          setGeneralError(
            "Invalid email or password, or account is unconfirmed.",
          );
        } else if (payload?.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        } else {
          setGeneralError("Sign-in failed. Please try again.");
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      // Successful sign-in
      const destination = payload.data.returnTo || "/account";
      window.location.href = destination;
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
            Sign-in problem
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

      <div className="form-group">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <a
            href="/forgot-password"
            style={{
              fontSize: "0.8125rem",
              color: "#3f5d49",
              textDecoration: "underline",
            }}
          >
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
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
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <div className="auth-footer">
        Don&apos;t have an account?{" "}
        <a href="/register" className="auth-link">
          Create an account
        </a>
      </div>
    </form>
  );
}
