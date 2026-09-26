"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  type Dictionary,
  type SupportedLocale,
  getDictionary,
} from "@campusmarkt/domain";

export interface LanguageContextValue {
  locale: SupportedLocale;
  dictionary: Dictionary;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export interface LanguageProviderProps {
  initialLocale: SupportedLocale;
  initialDictionary?: Dictionary;
  children: React.ReactNode;
}

export function LanguageProvider({
  initialLocale,
  initialDictionary,
  children,
}: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    // Router might not be mounted in isolated test environments
  }

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const dictionary = useMemo(() => {
    if (initialDictionary && locale === initialLocale) {
      return initialDictionary;
    }
    return getDictionary(locale);
  }, [locale, initialLocale, initialDictionary]);

  const setLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      if (newLocale === locale) return;
      const previousLocale = locale;
      setLocaleState(newLocale);

      try {
        const response = await fetch("/api/localization/locale", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: newLocale }),
        });

        if (!response.ok) {
          setLocaleState(previousLocale);
          return;
        }

        if (typeof document !== "undefined") {
          document.documentElement.lang = newLocale;
        }
        if (router?.refresh) {
          router.refresh();
        }
      } catch (err) {
        setLocaleState(previousLocale);
        console.error("Failed to switch locale", err);
      }
    },
    [locale, router],
  );

  const value = useMemo(
    () => ({
      locale,
      dictionary,
      setLocale,
    }),
    [locale, dictionary, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: "de",
      dictionary: getDictionary("de"),
      setLocale: async () => {},
    };
  }
  return context;
}
