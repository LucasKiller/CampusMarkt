"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ConfirmationState =
  "checking" | "verified" | "invalid" | "conflict" | "error";

export function UniversityConfirmationView() {
  const searchParams = useSearchParams();
  const initialInvalid = searchParams.get("status") === "invalid_link";
  const [state, setState] = useState<ConfirmationState>(
    initialInvalid ? "invalid" : "checking",
  );
  const [badgeLabel, setBadgeLabel] = useState("");
  const started = useRef(false);

  const confirm = useCallback(async () => {
    setState("checking");

    try {
      const response = await fetch(
        "/api/identity/university-verifications/confirm",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({}),
        },
      );
      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.ok && payload.data?.status === "verified") {
        setBadgeLabel(payload.data.badgeLabel);
        setState("verified");
      } else if (
        payload?.data?.status === "invalid_link" ||
        response.status === 400
      ) {
        setState("invalid");
      } else if (response.status === 409 || response.status === 403) {
        setState("conflict");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (initialInvalid || started.current) return;
    started.current = true;
    void confirm();
  }, [confirm, initialInvalid]);

  if (state === "checking") {
    return <p role="status">Checking your university verification...</p>;
  }

  if (state === "verified") {
    return (
      <div className="success-card" role="status" aria-live="polite">
        <h2>University verification complete</h2>
        <p>Your {badgeLabel} badge is now active on your public profile.</p>
        <a href="/account" className="btn-primary">
          View account
        </a>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="info-card">
        <h2>Verification link invalid or expired</h2>
        <p>This link has expired, is invalid, or has already been used.</p>
        <a href="/account" className="btn-primary">
          Request a new link
        </a>
      </div>
    );
  }

  if (state === "conflict") {
    return (
      <div className="info-card" role="alert">
        <h2>University verification unavailable</h2>
        <p>This university address cannot be linked to this account.</p>
        <a href="/account" className="btn-primary">
          Return to account
        </a>
      </div>
    );
  }

  return (
    <div className="info-card" role="alert">
      <h2>University verification interrupted</h2>
      <p>We could not verify your university right now.</p>
      <button
        type="button"
        className="btn-primary"
        onClick={() => void confirm()}
      >
        Try again
      </button>
    </div>
  );
}
