import { describe, expect, it } from "vitest";
import {
  INSTITUTIONAL_EMAIL_ERRORS,
  validateInstitutionalEmail,
} from "./index.ts";

describe("validateInstitutionalEmail", () => {
  it("accepts valid TU Braunschweig email addresses with tu-braunschweig.de", () => {
    const result = validateInstitutionalEmail("student@tu-braunschweig.de");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("student@tu-braunschweig.de");
      expect(result.value.domain).toBe("tu-braunschweig.de");
      expect(result.value.universityId).toBe("tu-braunschweig");
    }
  });

  it("accepts valid TU Braunschweig email addresses with tu-bs.de", () => {
    const result = validateInstitutionalEmail("max.mustermann@tu-bs.de");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("max.mustermann@tu-bs.de");
      expect(result.value.domain).toBe("tu-bs.de");
      expect(result.value.universityId).toBe("tu-braunschweig");
    }
  });

  it("normalizes casing and trims whitespace", () => {
    const result = validateInstitutionalEmail(
      "  Max.Mustermann@TU-Braunschweig.DE  ",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("max.mustermann@tu-braunschweig.de");
      expect(result.value.domain).toBe("tu-braunschweig.de");
    }
  });

  it("rejects unsupported institutional domains", () => {
    const cases = [
      "user@gmail.com",
      "user@uni-hannover.de",
      "user@tu-clausthal.de",
      "user@braunschweig.de",
      "user@tu-braunschweig.com",
    ];

    for (const email of cases) {
      const result = validateInstitutionalEmail(email);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(
          INSTITUTIONAL_EMAIL_ERRORS.unsupportedDomain,
        );
        expect(result.fieldErrors.institutionalEmail).toBeDefined();
      }
    }
  });

  it("rejects header injection and control characters", () => {
    const attacks = [
      "user\r\nBcc: victim@example.com@tu-braunschweig.de",
      "user\n@tu-braunschweig.de",
      "user\r@tu-braunschweig.de",
      "user\0@tu-braunschweig.de",
      "user\x1b@tu-braunschweig.de",
    ];

    for (const attack of attacks) {
      const result = validateInstitutionalEmail(attack);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain(INSTITUTIONAL_EMAIL_ERRORS.injection);
      }
    }
  });

  it("rejects malformed syntax, multiple @, or missing parts", () => {
    const malformed = [
      "",
      "   ",
      "notanemail",
      "@tu-braunschweig.de",
      "user@",
      "user@@tu-braunschweig.de",
      "user@domain@tu-braunschweig.de",
      "user..name@tu-braunschweig.de",
      ".user@tu-braunschweig.de",
      "user.@tu-braunschweig.de",
    ];

    for (const input of malformed) {
      const result = validateInstitutionalEmail(input);
      expect(result.ok).toBe(false);
    }
  });

  it("rejects emails longer than 254 characters", () => {
    const longLocal = "a".repeat(250);
    const result = validateInstitutionalEmail(`${longLocal}@tu-bs.de`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(INSTITUTIONAL_EMAIL_ERRORS.length);
    }
  });

  it("rejects non-string inputs", () => {
    expect(validateInstitutionalEmail(null).ok).toBe(false);
    expect(validateInstitutionalEmail(undefined).ok).toBe(false);
    expect(validateInstitutionalEmail(123).ok).toBe(false);
    expect(validateInstitutionalEmail({}).ok).toBe(false);
  });
});
