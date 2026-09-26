import "server-only";
import { cookies } from "next/headers";
import {
  resolveLocale,
  getDictionary,
  type SupportedLocale,
  type Dictionary,
} from "@campusmarkt/domain";

export async function getServerLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  return resolveLocale(cookieLocale);
}

export async function getServerDictionary(
  locale?: SupportedLocale | null,
): Promise<Dictionary> {
  const resolved = locale ?? (await getServerLocale());
  return getDictionary(resolved);
}

export async function getServerLocaleAndDictionary(): Promise<{
  locale: SupportedLocale;
  dictionary: Dictionary;
}> {
  const locale = await getServerLocale();
  return {
    locale,
    dictionary: getDictionary(locale),
  };
}
