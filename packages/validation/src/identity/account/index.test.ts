import { describe, expect, it } from "vitest";

import {
  normalizePrimaryEmail,
  parseCredentials,
  parseDisplayName,
  parseRegistration,
} from "./index.js";

const CURRENT_POLICIES = {
  termsVersion: "terms-2026-09",
  privacyVersion: "privacy-2026-09",
} as const;

function validRegistration() {
  return {
    email: " User@Example.COM ",
    password: "correct horse battery staple",
    displayName: " Ada Lovelace ",
    adultDeclared: true,
    termsVersion: CURRENT_POLICIES.termsVersion,
    privacyVersion: CURRENT_POLICIES.privacyVersion,
  };
}

describe("primary email normalization", () => {
  it("trims the delivery address and lowercases the complete comparison key", () => {
    expect(normalizePrimaryEmail(" User.Name+Tag@Example.COM ")).toEqual({
      ok: true,
      value: {
        address: "User.Name+Tag@Example.COM",
        key: "user.name+tag@example.com",
      },
    });
  });

  it("accepts a syntactically valid address at 254 characters", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(186)}.de`;

    expect(email).toHaveLength(254);
    expect(normalizePrimaryEmail(email).ok).toBe(true);
  });

  it("rejects an address above 254 characters", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(187)}.de`;

    expect(email).toHaveLength(255);
    expect(normalizePrimaryEmail(email)).toEqual({
      ok: false,
      errors: ["Enter a valid email address."],
    });
  });

  it.each([
    "",
    "plain-address",
    "@example.com",
    "user@",
    "user name@example.com",
  ])("rejects the invalid address %j", (email) => {
    expect(normalizePrimaryEmail(email).ok).toBe(false);
  });

  it("rejects non-string email input", () => {
    expect(normalizePrimaryEmail(42).ok).toBe(false);
  });
});

describe("password validation", () => {
  it.each(["a".repeat(10), "a".repeat(128)])(
    "accepts a password at an inclusive length boundary",
    (password) => {
      expect(parseCredentials({ email: "user@example.com", password }).ok).toBe(
        true,
      );
    },
  );

  it.each(["a".repeat(9), "a".repeat(129)])(
    "rejects a password outside the 10-128 character bound",
    (password) => {
      const result = parseCredentials({ email: "user@example.com", password });

      expect(result).toEqual({
        ok: false,
        fieldErrors: {
          password: ["Password must contain 10 to 128 characters."],
        },
      });
      expect(JSON.stringify(result)).not.toContain(password);
    },
  );

  it("applies no composition rule to a valid passphrase length", () => {
    expect(
      parseCredentials({
        email: "user@example.com",
        password: "aaaaaaaaaa",
      }).ok,
    ).toBe(true);
  });
});

describe("display-name validation", () => {
  it("trims and normalizes a valid display name to Unicode NFC", () => {
    expect(parseDisplayName("  Ame\u0301lie  ")).toEqual({
      ok: true,
      value: "Amélie",
    });
  });

  it.each(["ab", "a".repeat(50), "😀😀"])(
    "accepts display-name code-point boundaries",
    (displayName) => {
      expect(parseDisplayName(displayName).ok).toBe(true);
    },
  );

  it.each(["a", "a".repeat(51)])(
    "rejects display names outside 2-50 Unicode code points",
    (displayName) => {
      expect(parseDisplayName(displayName).ok).toBe(false);
    },
  );

  it.each(["Ada\u0000Lovelace", "Ada\nLovelace", "<b>Ada</b>", "Ada > Bob"])(
    "rejects control characters or markup in %j",
    (displayName) => {
      expect(parseDisplayName(displayName)).toEqual({
        ok: false,
        errors: ["Enter a display name without control characters or markup."],
      });
    },
  );

  it("rejects a non-string display name", () => {
    expect(parseDisplayName(null).ok).toBe(false);
  });
});

describe("registration input", () => {
  it("returns normalized account and current consent values", () => {
    expect(parseRegistration(validRegistration(), CURRENT_POLICIES)).toEqual({
      ok: true,
      value: {
        email: "User@Example.COM",
        emailKey: "user@example.com",
        password: "correct horse battery staple",
        displayName: "Ada Lovelace",
        adultDeclared: true,
        termsVersion: "terms-2026-09",
        privacyVersion: "privacy-2026-09",
      },
    });
  });

  it("identifies every invalid field without echoing the password", () => {
    const password = "short";
    const result = parseRegistration(
      {
        email: "invalid",
        password,
        displayName: "x",
        adultDeclared: false,
        termsVersion: "old-terms",
        privacyVersion: "old-privacy",
      },
      CURRENT_POLICIES,
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        email: ["Enter a valid email address."],
        password: ["Password must contain 10 to 128 characters."],
        displayName: ["Display name must contain 2 to 50 characters."],
        adultDeclared: ["You must declare that you are at least 18."],
        termsVersion: ["Accept the current Terms version."],
        privacyVersion: ["Accept the current Privacy version."],
      },
    });
    expect(JSON.stringify(result)).not.toContain(password);
  });

  it.each(["adultDeclared", "termsVersion", "privacyVersion"] as const)(
    "rejects missing required consent field %s",
    (field) => {
      const input: Record<string, unknown> = validRegistration();
      delete input[field];

      const result = parseRegistration(input, CURRENT_POLICIES);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors).toHaveProperty(field);
      }
    },
  );

  it("rejects unknown registration fields", () => {
    expect(
      parseRegistration(
        { ...validRegistration(), authRole: "admin" },
        CURRENT_POLICIES,
      ),
    ).toEqual({
      ok: false,
      fieldErrors: {
        _form: ["Registration contains unknown fields."],
      },
    });
  });

  it("rejects non-object registration input", () => {
    expect(parseRegistration(null, CURRENT_POLICIES)).toEqual({
      ok: false,
      fieldErrors: { _form: ["Registration must be an object."] },
    });
  });
});
