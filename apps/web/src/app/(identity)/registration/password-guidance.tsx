const milestones = [
  { length: 10, label: "10 characters (required)" },
  { length: 14, label: "14 characters (recommended)" },
  { length: 20, label: "20 characters (long passphrase)" },
];

export function PasswordGuidance({ password }: { password: string }) {
  const length = Array.from(password).length;
  const completed = milestones.filter((item) => length >= item.length).length;

  return (
    <div id="password-guidance" className="password-guidance">
      <div className="password-progress" aria-hidden="true">
        {milestones.map((item) => (
          <span
            key={item.length}
            className={length >= item.length ? "is-complete" : ""}
          />
        ))}
      </div>
      <p className="password-progress-label" aria-live="polite">
        {completed === 0
          ? "Enter at least 10 characters"
          : completed === 1
            ? "Minimum length reached"
            : completed === 2
              ? "Longer password"
              : "Long passphrase length"}
      </p>
      <ul className="password-milestones">
        {milestones.map((item) => (
          <li
            key={item.length}
            className={length >= item.length ? "is-complete" : ""}
          >
            <span aria-hidden="true">{length >= item.length ? "✓" : "○"}</span>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="form-hint">
        Length alone isn&apos;t a security score. Use a unique password or
        passphrase (up to 128 characters).
      </p>
    </div>
  );
}
