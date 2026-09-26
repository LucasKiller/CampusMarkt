"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { sanitizeSearchQuery, type SupportedLocale } from "@campusmarkt/domain";

export interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  locale?: SupportedLocale;
}

export function SearchBar({
  initialQuery = "",
  placeholder = "Was suchst du? (z.B. Fahrrad, Schreibtisch...)",
  onSearch,
  debounceMs = 300,
  className = "",
  autoFocus = false,
  locale = "de",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const triggerSearch = useCallback(
    (searchQuery: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const sanitized = sanitizeSearchQuery(searchQuery);
      onSearch?.(sanitized);
    },
    [onSearch],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceMs > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        triggerSearch(val);
      }, debounceMs);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    triggerSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <form
      role="search"
      aria-label={
        locale === "en" ? "Search marketplace" : "Marktplatz durchsuchen"
      }
      onSubmit={handleSubmit}
      className={`search-bar-form ${className}`}
      data-testid="search-form"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: "100%",
        maxWidth: "640px",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "0.875rem",
            color: "#6b7280",
            display: "inline-flex",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={100}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          data-testid="search-input"
          aria-label={locale === "en" ? "Search term" : "Suchbegriff"}
          style={{
            width: "100%",
            padding: "0.625rem 6.5rem 0.625rem 2.625rem",
            fontSize: "0.95rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            data-testid="search-clear-button"
            aria-label={locale === "en" ? "Clear search" : "Suche zurücksetzen"}
            style={{
              position: "absolute",
              right: "4.75rem",
              zIndex: 2,
              background: "none",
              border: "none",
              padding: "0.25rem",
              color: "#9ca3af",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <button
          type="submit"
          data-testid="search-submit-button"
          aria-label={locale === "en" ? "Search" : "Suchen"}
          style={{
            position: "absolute",
            right: "0.375rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.375rem",
            padding: "0.375rem 0.625rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Suchen
        </button>
      </div>
    </form>
  );
}
