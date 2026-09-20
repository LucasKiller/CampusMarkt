"use client";

import { useRef, useState, type FormEvent } from "react";

type ProfileEditorProps = {
  initialDisplayName?: string;
};

export function ProfileEditor({
  initialDisplayName = "User",
}: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [lastSavedName, setLastSavedName] = useState(initialDisplayName);
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string[] }>(
    {},
  );
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const errorList = [
    ...(fieldErrors.displayName || []),
    ...(generalError ? [generalError] : []),
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const trimmed = displayName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setFieldErrors({
        displayName: ["Display name must contain 2 to 50 characters."],
      });
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    if (/\p{Cc}|[<>]/u.test(trimmed)) {
      setFieldErrors({
        displayName: [
          "Enter a display name without control characters or markup.",
        ],
      });
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/identity/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        if (payload?.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        } else if (response.status === 401) {
          setGeneralError("Please sign in to update your profile.");
        } else {
          setGeneralError("Failed to update display name. Please try again.");
        }
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
        return;
      }

      // Last successful write display-name behavior
      const updatedName = payload.data?.profile?.displayName || trimmed;
      setDisplayName(updatedName);
      setLastSavedName(updatedName);
      setSuccessMessage("Display name updated successfully!");
    } catch {
      setGeneralError("Network error. Please check your connection.");
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <p
        style={{ fontSize: "0.875rem", color: "#526b59", marginBottom: "1rem" }}
      >
        Current display name: <strong>{lastSavedName}</strong>
      </p>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: "4px",
            color: "#065f46",
          }}
        >
          {successMessage}
        </div>
      )}

      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="profile-error-summary"
          className="error-summary"
        >
          <h2 id="profile-error-summary" className="error-summary-title">
            Profile update problem
          </h2>
          <ul className="error-summary-list">
            {errorList.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="displayName" className="form-label">
            Public display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            aria-invalid={!!fieldErrors.displayName}
            aria-describedby={
              fieldErrors.displayName ? "displayName-error" : "displayName-hint"
            }
          />
          <span id="displayName-hint" className="form-hint">
            2 to 50 characters. Visible to everyone on CampusMarkt.
          </span>
          {fieldErrors.displayName && (
            <span id="displayName-error" className="form-error">
              {fieldErrors.displayName[0]}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
