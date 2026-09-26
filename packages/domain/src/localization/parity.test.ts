import { describe, expect, it } from "vitest";
import { de, en, dictionaries } from "./dictionaries/index.ts";

function getAllKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function findEmptyOrUndefinedValues(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const badKeys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === undefined || value === null) {
      badKeys.push(`${fullKey} (is ${String(value)})`);
    } else if (typeof value === "string") {
      if (value.trim() === "") {
        badKeys.push(`${fullKey} (is empty string)`);
      }
    } else if (typeof value === "object" && !Array.isArray(value)) {
      badKeys.push(
        ...findEmptyOrUndefinedValues(
          value as Record<string, unknown>,
          fullKey,
        ),
      );
    }
  }
  return badKeys;
}

describe("dictionary parity & completeness", () => {
  it("has exact 100% key parity between German and English dictionaries", () => {
    const deKeys = getAllKeys(de as unknown as Record<string, unknown>);
    const enKeys = getAllKeys(en as unknown as Record<string, unknown>);

    const missingInEn = deKeys.filter((k) => !enKeys.includes(k));
    const missingInDe = enKeys.filter((k) => !deKeys.includes(k));

    expect(missingInEn).toEqual([]);
    expect(missingInDe).toEqual([]);
    expect(deKeys).toEqual(enKeys);
  });

  it("contains zero undefined, null, or empty values in German dictionary", () => {
    const emptyOrUndefined = findEmptyOrUndefinedValues(
      de as unknown as Record<string, unknown>,
    );
    expect(emptyOrUndefined).toEqual([]);
  });

  it("contains zero undefined, null, or empty values in English dictionary", () => {
    const emptyOrUndefined = findEmptyOrUndefinedValues(
      en as unknown as Record<string, unknown>,
    );
    expect(emptyOrUndefined).toEqual([]);
  });

  it("covers all required namespaces: common, nav, listings, messaging, negotiation, safety, moderation, legal", () => {
    const requiredNamespaces = [
      "common",
      "nav",
      "listings",
      "messaging",
      "negotiation",
      "safety",
      "moderation",
      "legal",
    ];

    for (const ns of requiredNamespaces) {
      expect(de).toHaveProperty(ns);
      expect(en).toHaveProperty(ns);
      expect(typeof (de as unknown as Record<string, unknown>)[ns]).toBe(
        "object",
      );
      expect(typeof (en as unknown as Record<string, unknown>)[ns]).toBe(
        "object",
      );
    }
  });

  it("exports dictionaries mapping matching supported locales", () => {
    expect(dictionaries.de).toBe(de);
    expect(dictionaries.en).toBe(en);
  });
});
