import { de } from "./de.ts";
import { en } from "./en.ts";
import type { Dictionary, SupportedLocale } from "../types.ts";

export { de } from "./de.ts";
export { en } from "./en.ts";

export const dictionaries: Readonly<Record<SupportedLocale, Dictionary>> = {
  de,
  en,
};
