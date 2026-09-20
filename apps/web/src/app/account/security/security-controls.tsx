"use client";

import { useState } from "react";

export function SecurityControls() {
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSignOutCurrent() {
    if (isPending) return;
    setIsPending(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/identity/sessions/current", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      if (res.ok) {
        window.location.href = "/sign-in";
      } else {
        setStatusMessage("Failed to sign out. Please try again.");
      }
    } catch {
      setStatusMessage("Network error during sign out.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSignOutAll() {
    if (isPending) return;
    setIsPending(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/identity/sessions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      if (res.ok) {
        window.location.href = "/sign-in";
      } else {
        setStatusMessage("Failed to sign out all sessions. Please try again.");
      }
    } catch {
      setStatusMessage("Network error during sign out.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="auth-form" style={{ marginTop: "1rem" }}>
      {statusMessage && (
        <div className="error-summary" role="alert">
          <p style={{ margin: 0, color: "#b91c1c" }}>{statusMessage}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleSignOutCurrent}
          disabled={isPending}
        >
          {isPending ? "Signing out..." : "Sign out this device"}
        </button>

        <button
          type="button"
          className="btn-secondary"
          style={{ borderColor: "#b91c1c", color: "#b91c1c" }}
          onClick={handleSignOutAll}
          disabled={isPending}
        >
          {isPending ? "Signing out..." : "Sign out all devices"}
        </button>
      </div>
    </div>
  );
}
