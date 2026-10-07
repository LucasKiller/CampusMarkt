type GeneratedAvatarProps = {
  displayName: string;
  className?: string;
};

export function GeneratedAvatar({
  displayName,
  className,
}: GeneratedAvatarProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Default avatar for ${displayName}`}
      data-testid="generated-avatar"
      className={`generated-avatar${className ? ` ${className}` : ""}`}
    >
      <circle cx="50" cy="50" r="50" fill="#F7F8F5" />
      <circle cx="74" cy="28" r="13" fill="#E8BB64" />
      <path
        d="M0 75C17 53 30 52 46 60c13 6 22 5 33-2 8-5 16-6 21-5v47H0Z"
        fill="#B6D9CE"
      />
      <path
        d="M0 94C21 70 31 43 49 39c17-4 27 8 27 22 0 11-7 19-13 28-2 3-4 7-5 11H0Z"
        fill="#0B665E"
      />
      <path
        d="M55 100c2-17 9-26 23-34 11-7 17-15 22-27v61H55Z"
        fill="#DDEBE3"
      />
      <path
        d="M73 72c-11 7-17 15-19 28"
        fill="none"
        stroke="#0B665E"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity=".55"
      />
      <circle cx="24" cy="29" r="1.6" fill="#0B665E" opacity=".42" />
      <circle cx="28" cy="34" r=".8" fill="#0B665E" opacity=".42" />
      <circle cx="19" cy="35" r=".8" fill="#0B665E" opacity=".42" />
    </svg>
  );
}
