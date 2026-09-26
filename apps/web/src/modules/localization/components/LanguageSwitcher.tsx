"use client";

import React, { useTransition } from "react";
import { useTranslation } from "./LanguageProvider";

export interface LanguageSwitcherProps {
  className?: string;
  id?: string;
}

export function LanguageSwitcher({
  className = "",
  id,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const isDe = locale === "de";
  const targetLocale = isDe ? "en" : "de";
  const ariaLabel = isDe ? "Zu Englisch wechseln" : "Switch to German";

  const handleToggle = () => {
    startTransition(async () => {
      await setLocale(targetLocale);
    });
  };

  const handleSelect = (nextLocale: "de" | "en") => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextLocale !== locale) {
      startTransition(async () => {
        await setLocale(nextLocale);
      });
    }
  };

  return (
    <div
      className={`language-switcher-wrapper ${className}`}
      data-testid="language-switcher-container"
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      <button
        type="button"
        id={id}
        data-testid="language-switcher"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={ariaLabel}
        aria-pressed={!isDe}
        title={ariaLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          background: "transparent",
          border: "1px solid #cbd5e1",
          borderRadius: "0.375rem",
          padding: "0.25rem 0.5rem",
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#3f5d49",
          cursor: "pointer",
          transition: "all 0.15s ease-in-out",
        }}
      >
        <span
          data-testid="language-btn-de"
          onClick={handleSelect("de")}
          style={{
            fontWeight: isDe ? 800 : 500,
            textDecoration: isDe ? "underline" : "none",
            color: isDe ? "#0f172a" : "#64748b",
          }}
        >
          DE
        </span>
        <span aria-hidden="true" style={{ color: "#94a3b8" }}>
          ·
        </span>
        <span
          data-testid="language-btn-en"
          onClick={handleSelect("en")}
          style={{
            fontWeight: !isDe ? 800 : 500,
            textDecoration: !isDe ? "underline" : "none",
            color: !isDe ? "#0f172a" : "#64748b",
          }}
        >
          EN
        </span>
      </button>
    </div>
  );
}
