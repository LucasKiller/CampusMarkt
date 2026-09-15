export interface PolicyVersions {
  termsVersion: string;
  privacyVersion: string;
}

export interface NormalizedEmail {
  address: string;
  key: string;
}

export interface RegistrationInput {
  email: string;
  emailKey: string;
  password: string;
  displayName: string;
  adultDeclared: true;
  termsVersion: string;
  privacyVersion: string;
}

export interface CredentialsInput {
  email: string;
  emailKey: string;
  password: string;
}

export type ParseResult<T> =
  { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string[]> };

export type ValueResult<T> =
  { ok: true; value: T } | { ok: false; errors: string[] };

const EMAIL_ERROR = "Enter a valid email address.";
const PASSWORD_ERROR = "Password must contain 10 to 128 characters.";
const DISPLAY_NAME_LENGTH_ERROR =
  "Display name must contain 2 to 50 characters.";
const DISPLAY_NAME_CONTENT_ERROR =
  "Enter a display name without control characters or markup.";

const REGISTRATION_FIELDS = new Set([
  "email",
  "password",
  "displayName",
  "adultDeclared",
  "termsVersion",
  "privacyVersion",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function passwordError(value: unknown): string[] | undefined {
  if (
    typeof value !== "string" ||
    codePointLength(value) < 10 ||
    codePointLength(value) > 128
  ) {
    return [PASSWORD_ERROR];
  }

  return undefined;
}

export function normalizePrimaryEmail(
  value: unknown,
): ValueResult<NormalizedEmail> {
  if (typeof value !== "string") {
    return { ok: false, errors: [EMAIL_ERROR] };
  }

  const address = value.trim();
  if (
    address.length === 0 ||
    address.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address)
  ) {
    return { ok: false, errors: [EMAIL_ERROR] };
  }

  return {
    ok: true,
    value: { address, key: address.toLocaleLowerCase("en-US") },
  };
}

export function parseDisplayName(value: unknown): ValueResult<string> {
  if (typeof value !== "string") {
    return { ok: false, errors: [DISPLAY_NAME_LENGTH_ERROR] };
  }

  const displayName = value.normalize("NFC").trim();
  const length = codePointLength(displayName);
  if (length < 2 || length > 50) {
    return { ok: false, errors: [DISPLAY_NAME_LENGTH_ERROR] };
  }

  if (/\p{Cc}|[<>]/u.test(displayName)) {
    return { ok: false, errors: [DISPLAY_NAME_CONTENT_ERROR] };
  }

  return { ok: true, value: displayName };
}

export function parseCredentials(
  input: unknown,
): ParseResult<CredentialsInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Credentials must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const email = normalizePrimaryEmail(input.email);
  const password = passwordError(input.password);

  if (!email.ok) fieldErrors.email = email.errors;
  if (password) fieldErrors.password = password;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      email: email.ok ? email.value.address : "",
      emailKey: email.ok ? email.value.key : "",
      password: input.password as string,
    },
  };
}

export function parseRegistration(
  input: unknown,
  policies: PolicyVersions,
): ParseResult<RegistrationInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      fieldErrors: { _form: ["Registration must be an object."] },
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const unknownFields = Object.keys(input).filter(
    (field) => !REGISTRATION_FIELDS.has(field),
  );
  const email = normalizePrimaryEmail(input.email);
  const password = passwordError(input.password);
  const displayName = parseDisplayName(input.displayName);

  if (unknownFields.length > 0) {
    fieldErrors._form = ["Registration contains unknown fields."];
  }
  if (!email.ok) fieldErrors.email = email.errors;
  if (password) fieldErrors.password = password;
  if (!displayName.ok) fieldErrors.displayName = displayName.errors;
  if (input.adultDeclared !== true) {
    fieldErrors.adultDeclared = ["You must declare that you are at least 18."];
  }
  if (input.termsVersion !== policies.termsVersion) {
    fieldErrors.termsVersion = ["Accept the current Terms version."];
  }
  if (input.privacyVersion !== policies.privacyVersion) {
    fieldErrors.privacyVersion = ["Accept the current Privacy version."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      email: email.ok ? email.value.address : "",
      emailKey: email.ok ? email.value.key : "",
      password: input.password as string,
      displayName: displayName.ok ? displayName.value : "",
      adultDeclared: true,
      termsVersion: policies.termsVersion,
      privacyVersion: policies.privacyVersion,
    },
  };
}
