import { describe, expect, it } from "vitest";

import {
  IDENTITY_API_FAILURE_CODES,
  isApiFailure,
  isApiSuccess,
  isPublicProfile,
  type ApiFailure,
  type ApiSuccess,
  type DeletionResult,
  type GenericAcceptedResult,
  type SessionResult,
} from "./index.js";

const CORRELATION_ID = "018f47a0-1234-7abc-8def-0123456789ab";

describe("public profile transport contract", () => {
  it("accepts exactly the four public profile fields", () => {
    const profile = {
      publicId: "018f47a0-1234-7abc-8def-0123456789ab",
      displayName: "Ada Lovelace",
      joinedMonth: "2026-09",
      avatarUrl: "/media/avatars/018f47a0-1234-7abc-8def-0123456789ab/3.webp",
    };

    expect(isPublicProfile(profile)).toBe(true);
    expect(Object.keys(profile).sort()).toEqual([
      "avatarUrl",
      "displayName",
      "joinedMonth",
      "publicId",
    ]);
  });

  it("accepts a profile without an avatar", () => {
    expect(
      isPublicProfile({
        publicId: "018f47a0-1234-7abc-8def-0123456789ab",
        displayName: "Ada Lovelace",
        joinedMonth: "2026-09",
        avatarUrl: null,
      }),
    ).toBe(true);
  });

  it.each([
    { email: "private@example.com" },
    { authUserId: "internal-user" },
    { consent: true },
    { sessionId: "private-session" },
  ])("rejects a public profile carrying private field %j", (privateField) => {
    expect(
      isPublicProfile({
        publicId: "018f47a0-1234-7abc-8def-0123456789ab",
        displayName: "Ada Lovelace",
        joinedMonth: "2026-09",
        avatarUrl: null,
        ...privateField,
      }),
    ).toBe(false);
  });

  it.each([
    { joinedMonth: "2026-13" },
    { avatarUrl: "https://cdn.example/avatar.webp" },
    { avatarUrl: "/uploads/source.jpg" },
    { displayName: null },
  ])("rejects malformed public field %j", (override) => {
    expect(
      isPublicProfile({
        publicId: "018f47a0-1234-7abc-8def-0123456789ab",
        displayName: "Ada Lovelace",
        joinedMonth: "2026-09",
        avatarUrl: null,
        ...override,
      }),
    ).toBe(false);
  });
});

describe("API response envelope", () => {
  it("exposes only the approved stable failure codes", () => {
    expect(IDENTITY_API_FAILURE_CODES).toEqual([
      "INVALID_INPUT",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "RATE_LIMITED",
      "DEPENDENCY_UNAVAILABLE",
      "CONFLICT",
    ]);
  });

  it("accepts an allowlisted failure with field errors", () => {
    const failure = {
      ok: false,
      code: "INVALID_INPUT",
      fieldErrors: { email: ["Enter a valid email address."] },
      correlationId: CORRELATION_ID,
    } satisfies ApiFailure;

    expect(isApiFailure(failure)).toBe(true);
  });

  it("accepts a rate-limit failure with integer retry seconds", () => {
    expect(
      isApiFailure({
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: 60,
        correlationId: CORRELATION_ID,
      }),
    ).toBe(true);
  });

  it.each([
    { providerMessage: "auth user disabled" },
    { secret: "service-role-value" },
    { authUserId: "internal-user" },
    { email: "private@example.com" },
  ])("rejects a failure carrying forbidden detail %j", (detail) => {
    expect(
      isApiFailure({
        ok: false,
        code: "DEPENDENCY_UNAVAILABLE",
        correlationId: CORRELATION_ID,
        ...detail,
      }),
    ).toBe(false);
  });

  it("rejects unknown provider codes and malformed retry values", () => {
    expect(
      isApiFailure({
        ok: false,
        code: "SUPABASE_AUTH_ERROR",
        correlationId: CORRELATION_ID,
      }),
    ).toBe(false);
    expect(
      isApiFailure({
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: 0.5,
        correlationId: CORRELATION_ID,
      }),
    ).toBe(false);
  });

  it("accepts an allowlisted generic success envelope", () => {
    const response = {
      ok: true,
      data: { status: "accepted" },
      correlationId: CORRELATION_ID,
    } satisfies ApiSuccess<GenericAcceptedResult>;

    expect(isApiSuccess(response)).toBe(true);
  });

  it("rejects success envelopes with unknown fields or malformed IDs", () => {
    expect(
      isApiSuccess({
        ok: true,
        data: { status: "accepted" },
        correlationId: CORRELATION_ID,
        token: "private-token",
      }),
    ).toBe(false);
    expect(
      isApiSuccess({
        ok: true,
        data: { status: "accepted" },
        correlationId: "not-a-uuid",
      }),
    ).toBe(false);
  });
});

describe("session and lifecycle result unions", () => {
  it("constructs token-free session, accepted, and deletion results", () => {
    const session = {
      status: "authenticated",
      returnTo: "/account",
      expiresAt: "2026-10-15T10:00:00.000Z",
    } satisfies SessionResult;
    const accepted = { status: "accepted" } satisfies GenericAcceptedResult;
    const deletion = {
      status: "deletion_pending",
    } satisfies DeletionResult;

    expect(session).toEqual({
      status: "authenticated",
      returnTo: "/account",
      expiresAt: "2026-10-15T10:00:00.000Z",
    });
    expect(accepted).toEqual({ status: "accepted" });
    expect(deletion).toEqual({ status: "deletion_pending" });
  });
});
