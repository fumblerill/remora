"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  Locale,
  dictionaries,
  isLocale,
} from "@/lib/i18n/dictionaries";

const LOCALE_STORAGE_KEY = "remora_locale";

type TranslationParams = Record<string, string | number>;

export type TranslateFn = (key: string, params?: TranslationParams) => string;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: TranslateFn;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function resolvePath(dictionary: Record<string, any>, key: string): string | undefined {
  return key
    .split(".")
    .reduce<any>((acc, segment) => (acc && typeof acc === "object" ? acc[segment] : undefined), dictionary);
}

function applyParams(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, token) => {
    const value = params[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = typeof window === "undefined" ? null : window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isLocale(stored) && stored !== locale) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    if (!isLocale(initialLocale)) return;
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.cookie = `remora_locale=${next}; path=/; max-age=31536000`;
    }
  }, []);

  const dictionary = useMemo(() => dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE], [locale]);

  const t = useCallback<TranslateFn>(
    (key, params) => {
      const fallbackDictionary = dictionaries[DEFAULT_LOCALE];
      const template = resolvePath(dictionary, key) ?? resolvePath(fallbackDictionary, key) ?? key;
      if (typeof template !== "string") {
        return key;
      }
      return applyParams(template, params);
    },
    [dictionary],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LocaleProvider");
  }
  return context;
}
