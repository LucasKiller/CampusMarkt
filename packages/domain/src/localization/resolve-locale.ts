import { dictionaries } from "./dictionaries/index.ts";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type Dictionary,
  type SupportedLocale,
} from "./types.ts";

const LOCALE_COOKIE_REGEX = /^(de|en)$/;

export function resolveLocale(
  cookieValue?: string | null,
  acceptLanguage?: string | null,
): SupportedLocale {
  if (cookieValue) {
    const trimmed = cookieValue.trim();
    if (LOCALE_COOKIE_REGEX.test(trimmed)) {
      return trimmed as SupportedLocale;
    }
  }

  if (acceptLanguage && typeof acceptLanguage === "string") {
    const preferences = acceptLanguage
      .split(",")
      .map((part) => {
        const [rawTag, rawQ] = part.split(";");
        const tag = rawTag?.trim().toLowerCase() ?? "";
        let q = 1.0;
        if (rawQ) {
          const match = /q=([0-9.]+)/.exec(rawQ);
          if (match && match[1]) {
            const parsed = parseFloat(match[1]);
            if (!Number.isNaN(parsed)) {
              q = parsed;
            }
          }
        }
        return { tag, q };
      })
      .filter((entry) => entry.tag.length > 0 && entry.q > 0)
      .sort((a, b) => b.q - a.q);

    for (const pref of preferences) {
      if (pref.tag === "*" || pref.tag === "") {
        continue;
      }
      if (pref.tag.startsWith("en")) {
        return "en";
      }
      if (pref.tag.startsWith("de")) {
        return "de";
      }
    }
  }

  return DEFAULT_LOCALE;
}

export function getDictionary(
  locale?: SupportedLocale | string | null,
): Dictionary {
  if (isSupportedLocale(locale)) {
    return dictionaries[locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}
