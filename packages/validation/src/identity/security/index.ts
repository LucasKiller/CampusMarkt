import type { ValueResult } from "../account/index.js";

export type AvatarMediaType = "image/jpeg" | "image/png" | "image/webp";

export interface SquareCrop {
  x: number;
  y: number;
  size: number;
}

const IDENTITY_LOOP_PATHS = new Set([
  "/sign-in",
  "/register",
  "/forgot-password",
  "/auth/confirm",
  "/reset-password",
]);

const PUBLIC_PROFILE_ID_ERROR = "Enter a valid public profile ID.";
const ACTION_TOKEN_ERROR = "This action link is invalid.";
const AVATAR_MEDIA_ERROR = "Choose a JPEG, PNG, or WebP image.";
const AVATAR_CROP_ERROR = "Choose a valid square crop.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

export function parseLocalReturnPath(
  value: unknown,
  canonicalOrigin: string,
  fallback: string,
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    containsControlCharacter(value)
  ) {
    return fallback;
  }

  try {
    const destination = new URL(value, canonicalOrigin);
    if (
      destination.origin !== new URL(canonicalOrigin).origin ||
      IDENTITY_LOOP_PATHS.has(destination.pathname) ||
      destination.pathname.startsWith("/auth/action/")
    ) {
      return fallback;
    }

    return value;
  } catch {
    return fallback;
  }
}

export function parsePublicProfileId(value: unknown): ValueResult<string> {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(
      value,
    )
  ) {
    return { ok: false, errors: [PUBLIC_PROFILE_ID_ERROR] };
  }

  return { ok: true, value };
}

export function parseActionToken(value: unknown): ValueResult<string> {
  if (
    typeof value !== "string" ||
    value.length < 43 ||
    value.length > 128 ||
    !/^[A-Za-z0-9_-]+$/u.test(value)
  ) {
    return { ok: false, errors: [ACTION_TOKEN_ERROR] };
  }

  return { ok: true, value };
}

export function parseDeclaredAvatarMediaType(
  value: unknown,
): ValueResult<AvatarMediaType> {
  if (
    value !== "image/jpeg" &&
    value !== "image/png" &&
    value !== "image/webp"
  ) {
    return { ok: false, errors: [AVATAR_MEDIA_ERROR] };
  }

  return { ok: true, value };
}

export function parseAvatarCrop(value: unknown): ValueResult<SquareCrop> {
  if (!isRecord(value) || Object.keys(value).length !== 3) {
    return { ok: false, errors: [AVATAR_CROP_ERROR] };
  }

  const { x, y, size } = value;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof size !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(size) ||
    x < 0 ||
    y < 0 ||
    size <= 0 ||
    size > 1 ||
    x + size > 1 ||
    y + size > 1
  ) {
    return { ok: false, errors: [AVATAR_CROP_ERROR] };
  }

  return { ok: true, value: { x, y, size } };
}
