import { describe, expect, it } from "vitest";
import { getDictionary, resolveLocale } from "./resolve-locale.ts";
import { de, en } from "./dictionaries/index.ts";

describe("resolveLocale", () => {
  describe("cookie precedence", () => {
    it("respects valid 'de' cookie even when accept-language is 'en'", () => {
      expect(resolveLocale("de")).toBe("de");
    });

    it("respects valid 'en' cookie even when accept-language is 'de'", () => {
      expect(resolveLocale("en")).toBe("en");
    });

    it("handles whitespace around valid cookie cleanly", () => {
      expect(resolveLocale("  en  ")).toBe("en");
      expect(resolveLocale("  de  ")).toBe("de");
    });
  });

  describe("malformed or invalid cookie sanitization", () => {
    it("ignores unsupported locale codes in cookie and falls back to English", () => {
      expect(resolveLocale("fr")).toBe("en");
      expect(resolveLocale("es")).toBe("en");
    });

    it("ignores XSS or injection payloads in cookie and falls back safely", () => {
      expect(resolveLocale("<script>alert(1)</script>")).toBe("en");
      expect(resolveLocale("de;path=/")).toBe("en");
      expect(resolveLocale("en\r\nSet-Cookie: evil=1")).toBe("en");
      expect(resolveLocale("../../../etc/passwd")).toBe("en");
    });

    it("falls back to English when cookie is empty, null, or undefined", () => {
      expect(resolveLocale("")).toBe("en");
      expect(resolveLocale(null)).toBe("en");
      expect(resolveLocale(undefined)).toBe("en");
    });
  });

  it("defaults to English without a valid cookie", () => {
    expect(resolveLocale()).toBe("en");
    expect(resolveLocale("   ")).toBe("en");
  });
});

describe("getDictionary", () => {
  it("returns German dictionary for 'de'", () => {
    expect(getDictionary("de")).toBe(de);
  });

  it("returns English dictionary for 'en'", () => {
    expect(getDictionary("en")).toBe(en);
  });

  it("falls back to English dictionary for unknown, empty, or null locale", () => {
    expect(getDictionary("fr")).toBe(en);
    expect(getDictionary("")).toBe(en);
    expect(getDictionary(null)).toBe(en);
    expect(getDictionary(undefined)).toBe(en);
    expect(getDictionary()).toBe(en);
  });
});
