import { describe, expect, it } from "vitest";
import { getDictionary, resolveLocale } from "./resolve-locale.ts";
import { de, en } from "./dictionaries/index.ts";

describe("resolveLocale", () => {
  describe("cookie precedence", () => {
    it("respects valid 'de' cookie even when accept-language is 'en'", () => {
      expect(resolveLocale("de", "en-US,en;q=0.9")).toBe("de");
    });

    it("respects valid 'en' cookie even when accept-language is 'de'", () => {
      expect(resolveLocale("en", "de-DE,de;q=0.9")).toBe("en");
    });

    it("handles whitespace around valid cookie cleanly", () => {
      expect(resolveLocale("  en  ", "de")).toBe("en");
      expect(resolveLocale("  de  ", "en")).toBe("de");
    });
  });

  describe("malformed or invalid cookie sanitization", () => {
    it("ignores unsupported locale codes in cookie and falls back to Accept-Language", () => {
      expect(resolveLocale("fr", "en-US,en;q=0.9")).toBe("en");
      expect(resolveLocale("es", "de-DE,de;q=0.9")).toBe("de");
    });

    it("ignores XSS or injection payloads in cookie and falls back safely", () => {
      expect(resolveLocale("<script>alert(1)</script>", "en")).toBe("en");
      expect(resolveLocale("de;path=/", "en")).toBe("en");
      expect(resolveLocale("en\r\nSet-Cookie: evil=1", "de")).toBe("de");
      expect(resolveLocale("../../../etc/passwd", "en")).toBe("en");
    });

    it("falls back to Accept-Language when cookie is empty, null, or undefined", () => {
      expect(resolveLocale("", "en")).toBe("en");
      expect(resolveLocale(null, "en")).toBe("en");
      expect(resolveLocale(undefined, "en")).toBe("en");
    });
  });

  describe("Accept-Language parsing and prioritization", () => {
    it("resolves primary English language tags", () => {
      expect(resolveLocale(null, "en-US,en;q=0.9")).toBe("en");
      expect(resolveLocale(null, "en-GB,en;q=0.8")).toBe("en");
      expect(resolveLocale(null, "en")).toBe("en");
    });

    it("resolves primary German language tags", () => {
      expect(resolveLocale(null, "de-DE,de;q=0.9")).toBe("de");
      expect(resolveLocale(null, "de-AT,de;q=0.8")).toBe("de");
      expect(resolveLocale(null, "de-CH")).toBe("de");
      expect(resolveLocale(null, "de")).toBe("de");
    });

    it("prioritizes higher quality weight (q-factor)", () => {
      expect(resolveLocale(null, "de;q=0.5,en;q=0.9")).toBe("en");
      expect(resolveLocale(null, "en;q=0.4,de;q=0.8")).toBe("de");
    });

    it("skips unsupported languages and selects first supported match by preference", () => {
      expect(resolveLocale(null, "fr-FR,fr;q=0.9,en;q=0.8,de;q=0.5")).toBe(
        "en",
      );
      expect(resolveLocale(null, "zh-CN,zh;q=0.9,de;q=0.7,en;q=0.6")).toBe(
        "de",
      );
    });

    it("falls back to default 'de' when Accept-Language contains only wildcard or unsupported tags", () => {
      expect(resolveLocale(null, "*")).toBe("de");
      expect(resolveLocale(null, "*;q=0.8")).toBe("de");
      expect(resolveLocale(null, "es-ES,es;q=0.9,it;q=0.8")).toBe("de");
    });

    it("falls back to default 'de' when all inputs are missing or empty", () => {
      expect(resolveLocale()).toBe("de");
      expect(resolveLocale(null, null)).toBe("de");
      expect(resolveLocale(undefined, undefined)).toBe("de");
      expect(resolveLocale("", "")).toBe("de");
      expect(resolveLocale("   ", "   ")).toBe("de");
    });
  });
});

describe("getDictionary", () => {
  it("returns German dictionary for 'de'", () => {
    expect(getDictionary("de")).toBe(de);
  });

  it("returns English dictionary for 'en'", () => {
    expect(getDictionary("en")).toBe(en);
  });

  it("falls back to German dictionary for unknown, empty, or null locale", () => {
    expect(getDictionary("fr")).toBe(de);
    expect(getDictionary("")).toBe(de);
    expect(getDictionary(null)).toBe(de);
    expect(getDictionary(undefined)).toBe(de);
    expect(getDictionary()).toBe(de);
  });
});
