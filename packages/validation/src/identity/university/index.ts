export interface ValidatedInstitutionalEmail {
  email: string;
  domain: string;
  universityId: string;
  address: string;
}

export type InstitutionalEmailResult =
  | { ok: true; value: ValidatedInstitutionalEmail }
  | { ok: false; errors: string[]; fieldErrors: Record<string, string[]> };

export const INSTITUTIONAL_DOMAINS: Record<string, string> = {
  "tu-braunschweig.de": "tu-braunschweig",
  "tu-bs.de": "tu-braunschweig",
};

export const INSTITUTIONAL_EMAIL_ERRORS = {
  required: "Enter an institutional email address.",
  syntax: "Enter a valid institutional email address.",
  length: "Institutional email address must not exceed 254 characters.",
  injection:
    "Institutional email address must not contain control characters or line breaks.",
  unsupportedDomain:
    "Enter an email address from a supported university (e.g. tu-braunschweig.de or tu-bs.de).",
} as const;

// RFC 5322 compatible local-part pattern (dot-atom without quotes)
const LOCAL_PART_REGEX =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/u;

// Standard domain label pattern
const DOMAIN_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/u;

function fail(error: string): InstitutionalEmailResult {
  return {
    ok: false,
    errors: [error],
    fieldErrors: { institutionalEmail: [error] },
  };
}

export function validateInstitutionalEmail(
  input: unknown,
): InstitutionalEmailResult {
  if (typeof input !== "string") {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.required);
  }

  // Reject CRLF, control characters, or header injection attempts before trimming
  if (/\p{Cc}/u.test(input)) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.injection);
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.required);
  }

  if (trimmed.length > 254) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.length);
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.syntax);
  }

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.syntax);
  }

  if (!LOCAL_PART_REGEX.test(localPart)) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.syntax);
  }

  const normalizedDomain = domainPart.toLowerCase();
  if (!DOMAIN_REGEX.test(normalizedDomain)) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.syntax);
  }

  const universityId = INSTITUTIONAL_DOMAINS[normalizedDomain];
  if (!universityId) {
    return fail(INSTITUTIONAL_EMAIL_ERRORS.unsupportedDomain);
  }

  const normalizedEmail = `${localPart.toLowerCase()}@${normalizedDomain}`;

  return {
    ok: true,
    value: {
      email: normalizedEmail,
      domain: normalizedDomain,
      universityId,
      address: normalizedEmail,
    },
  };
}
