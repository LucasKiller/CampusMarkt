import { dictionaries } from "./dictionaries/index.ts";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type Dictionary,
  type SupportedLocale,
} from "./types.ts";

const LOCALE_COOKIE_REGEX = /^(de|en)$/;

export function resolveLocale(cookieValue?: string | null): SupportedLocale {
  if (cookieValue) {
    const trimmed = cookieValue.trim();
    if (LOCALE_COOKIE_REGEX.test(trimmed)) {
      return trimmed as SupportedLocale;
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
