"use client";

import { useRef, useState, type FormEvent } from "react";
import { PasswordInput } from "../password-input";
import { PasswordGuidance } from "./password-guidance";

interface FieldErrors {
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
  displayName?: string[];
  adultDeclared?: string[];
  termsVersion?: string[];
  privacyVersion?: string[];
  general?: string[];
}

export function RegistrationForm() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adultDeclared, setAdultDeclared] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const errorList = [
    ...(fieldErrors.email || []),
    ...(fieldErrors.displayName || []),
    ...(fieldErrors.password || []),
    ...(fieldErrors.confirmPassword || []),
    ...(fieldErrors.adultDeclared || []),
    ...(fieldErrors.termsVersion || []),
    ...(fieldErrors.privacyVersion || []),
    ...(generalError ? [generalError] : []),
  ];

  function clearPasswords() {
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);

    // Client-side quick checks
    const localErrors: FieldErrors = {};
    if (!adultDeclared) {
      localErrors.adultDeclared = [
        "You must be at least 18 years old to register.",
      ];
    }
    if (!termsAccepted) {
      localErrors.termsVersion = [
        "You must accept the Terms of Service and Privacy Policy.",
      ];
    }
    if (!confirmPassword) {
      localErrors.confirmPassword = ["Confirm your password."];
    } else if (password !== confirmPassword) {
      localErrors.confirmPassword = ["Passwords do not match."];
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      clearPasswords();
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/identity/registrations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          password,
          adultDeclared: true,
          termsVersion: "terms-2026-09",
          privacyVersion: "privacy-2026-09",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        clearPasswords();
        if (response.status === 429) {
          setGeneralError(
            "Too many registration attempts. Please try again later.",
          );
        } else if (payload?.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        } else {
          setGeneralError(
            "An error occurred while creating your account. Please try again.",
          );
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      // Success
      setIsSubmitted(true);
      clearPasswords();
    } catch {
      clearPasswords();
      setGeneralError(
        "Network error. Please check your connection and try again.",
      );
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (resendPending) return;
    setResendPending(true);
    setResendStatus(null);

    try {
      const response = await fetch("/api/identity/confirmation-resends", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (response.status === 429) {
        setResendStatus(
          "Rate limit exceeded. Please wait before requesting another email.",
        );
      } else {
        setResendStatus(
          "A new confirmation email has been sent if an unconfirmed account exists.",
        );
      }
    } catch {
      setResendStatus("Unable to resend email. Please try again later.");
    } finally {
      setResendPending(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="success-card" role="status" aria-live="polite">
        <h2 style={{ marginTop: 0 }}>Check your inbox</h2>
        <p>
          We have sent a confirmation link to <strong>{email}</strong>. Please
          click the link within 24 hours to confirm your account and sign in.
        </p>
        <p style={{ color: "#526b59", fontSize: "0.875rem" }}>
          Didn’t receive the email? Check your spam folder or request a new
          link.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleResend}
          disabled={resendPending}
        >
          {resendPending ? "Sending..." : "Resend confirmation email"}
        </button>
        {resendStatus && (
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {resendStatus}
          </p>
        )}
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
            There is a problem with your registration
          </h2>
          <ul className="error-summary-list">
            {errorList.map((errorMsg, idx) => (
              <li key={idx}>{errorMsg}</li>
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
        <label htmlFor="displayName" className="form-label">
          Display name (public)
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="nickname"
          className="form-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          maxLength={50}
          aria-invalid={!!fieldErrors.displayName}
          aria-describedby={
            fieldErrors.displayName ? "displayName-error" : "displayName-hint"
          }
        />
        <span
          id="displayName-hint"
          style={{ fontSize: "0.75rem", color: "#526b59" }}
        >
          2 to 50 characters. This name is visible to others in Braunschweig.
        </span>
        {fieldErrors.displayName && (
          <span id="displayName-error" className="form-error">
            {fieldErrors.displayName[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={10}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={
            fieldErrors.password
              ? "password-guidance password-error"
              : "password-guidance"
          }
        />
        <PasswordGuidance password={password} />
        {fieldErrors.password && (
          <span id="password-error" className="form-error">
            {fieldErrors.password[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword" className="form-label">
          Confirm password
        </label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          aria-invalid={!!fieldErrors.confirmPassword}
          aria-describedby={
            fieldErrors.confirmPassword ? "confirmPassword-error" : undefined
          }
        />
        {fieldErrors.confirmPassword && (
          <span id="confirmPassword-error" className="form-error">
            {fieldErrors.confirmPassword[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-checkbox-label" htmlFor="adultDeclared">
          <input
            id="adultDeclared"
            name="adultDeclared"
            type="checkbox"
            checked={adultDeclared}
            onChange={(e) => setAdultDeclared(e.target.checked)}
            required
            aria-invalid={!!fieldErrors.adultDeclared}
            aria-describedby={
              fieldErrors.adultDeclared ? "adultDeclared-error" : undefined
            }
          />
          <span>I confirm that I am at least 18 years old.</span>
        </label>
        {fieldErrors.adultDeclared && (
          <span id="adultDeclared-error" className="form-error">
            {fieldErrors.adultDeclared[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-checkbox-label" htmlFor="termsConsent">
          <input
            id="termsConsent"
            name="termsConsent"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            aria-invalid={!!fieldErrors.termsVersion}
            aria-describedby={
              fieldErrors.termsVersion ? "termsConsent-error" : undefined
            }
          />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>
        {fieldErrors.termsVersion && (
          <span id="termsConsent-error" className="form-error">
            {fieldErrors.termsVersion[0]}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>

      <div className="auth-footer">
        Already have an account?{" "}
        <a href="/sign-in" className="auth-link">
          Sign in
        </a>
      </div>
    </form>
  );
}
