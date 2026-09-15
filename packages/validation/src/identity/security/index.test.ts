import { describe, expect, it } from "vitest";

import {
  parseActionToken,
  parseAvatarCrop,
  parseDeclaredAvatarMediaType,
  parseLocalReturnPath,
  parsePublicProfileId,
} from "./index.js";

const ORIGIN = "https://campusmarkt.example";
const FALLBACK = "/account";

describe("same-origin return path", () => {
  it.each([
    "/listings",
    "/account/profile?section=name",
    "/profiles/018f47a0-1234-7abc-8def-0123456789ab#listings",
  ])("accepts the local root-relative destination %s", (returnTo) => {
    expect(parseLocalReturnPath(returnTo, ORIGIN, FALLBACK)).toBe(returnTo);
  });

  it.each([
    "https://attacker.example/account",
    "//attacker.example/account",
    "/\\attacker.example/account",
    "/account\u0000/settings",
    "https://campusmarkt.example:444/account",
    "https://other.campusmarkt.example/account",
    "not a url",
    "",
    null,
  ])("uses the safe fallback for unsafe destination %j", (returnTo) => {
    expect(parseLocalReturnPath(returnTo, ORIGIN, FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    "/sign-in",
    "/register",
    "/forgot-password",
    "/auth/confirm",
    "/reset-password",
    "/auth/action/email_confirmation",
  ])("uses the safe fallback for identity loop %s", (returnTo) => {
    expect(parseLocalReturnPath(returnTo, ORIGIN, FALLBACK)).toBe(FALLBACK);
  });
});

describe("public profile identifier", () => {
  it("accepts a canonical opaque UUID", () => {
    expect(
      parsePublicProfileId("018f47a0-1234-7abc-8def-0123456789ab"),
    ).toEqual({
      ok: true,
      value: "018f47a0-1234-7abc-8def-0123456789ab",
    });
  });

  it.each([
    "",
    "018f47a012347abc8def0123456789ab",
    "018F47A0-1234-7ABC-8DEF-0123456789AB",
    "018f47a0-1234-7abc-8def-0123456789ab-extra",
    null,
  ])("rejects malformed or unbounded public ID %j", (publicId) => {
    expect(parsePublicProfileId(publicId)).toEqual({
      ok: false,
      errors: ["Enter a valid public profile ID."],
    });
  });
});

describe("action token", () => {
  it("accepts a 256-bit Base64URL token", () => {
    const token = "a".repeat(43);

    expect(parseActionToken(token)).toEqual({ ok: true, value: token });
  });

  it.each([
    "a".repeat(42),
    "a".repeat(129),
    `${"a".repeat(42)}+`,
    `${"a".repeat(42)}=`,
    "",
    undefined,
  ])("rejects malformed or unbounded token input", (token) => {
    expect(parseActionToken(token)).toEqual({
      ok: false,
      errors: ["This action link is invalid."],
    });
  });
});

describe("declared avatar media type", () => {
  it.each(["image/jpeg", "image/png", "image/webp"] as const)(
    "accepts supported declaration %s",
    (mediaType) => {
      expect(parseDeclaredAvatarMediaType(mediaType)).toEqual({
        ok: true,
        value: mediaType,
      });
    },
  );

  it.each(["image/svg+xml", "image/gif", "text/html", "", 42])(
    "rejects unsupported media declaration %j",
    (mediaType) => {
      expect(parseDeclaredAvatarMediaType(mediaType)).toEqual({
        ok: false,
        errors: ["Choose a JPEG, PNG, or WebP image."],
      });
    },
  );
});

describe("square avatar crop", () => {
  it.each([
    { x: 0, y: 0, size: 1 },
    { x: 0.25, y: 0.5, size: 0.5 },
    { x: 0.9, y: 0.9, size: 0.1 },
  ])("accepts bounded normalized square crop %j", (crop) => {
    expect(parseAvatarCrop(crop)).toEqual({ ok: true, value: crop });
  });

  it.each([
    { x: -0.1, y: 0, size: 0.5 },
    { x: 0, y: -0.1, size: 0.5 },
    { x: 0, y: 0, size: 0 },
    { x: 0, y: 0, size: 1.1 },
    { x: 0.6, y: 0, size: 0.5 },
    { x: 0, y: 0.6, size: 0.5 },
    { x: Number.NaN, y: 0, size: 0.5 },
    { x: 0, y: Number.POSITIVE_INFINITY, size: 0.5 },
    { x: 0, y: 0, size: 0.5, authUserId: "crafted" },
    { x: 0, y: 0 },
    null,
  ])("rejects invalid, non-finite, or unknown crop values %j", (crop) => {
    expect(parseAvatarCrop(crop)).toEqual({
      ok: false,
      errors: ["Choose a valid square crop."],
    });
  });
});
