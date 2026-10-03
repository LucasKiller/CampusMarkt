"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  id: string;
  label: string;
};

export function PasswordInput({
  id,
  label,
  className = "",
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        {...props}
        id={id}
        type={isVisible ? "text" : "password"}
        className={`form-input password-input ${className}`.trim()}
      />
      <button
        type="button"
        className="password-visibility-button"
        aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((value) => !value)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.5" />
          {isVisible && <path d="M3 3l18 18" />}
        </svg>
        <span>{isVisible ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
}
