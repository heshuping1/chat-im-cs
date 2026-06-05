import { createContext, useMemo, useState, type ReactNode } from 'react';
import {
  formatMessage,
  messages,
  resolveMessage,
  type TranslationParams,
} from './dictionary';
import { defaultLocale, normalizeLocale, type AppLocale } from './locales';

const localeStorageKey = 'lpp.pc.locale';

export interface I18nContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(readInitialLocale);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
        persistLocale(nextLocale);
      },
      t(key, params) {
        return formatMessage(
          resolveMessage(messages[locale], messages[defaultLocale], key),
          params,
        );
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function readInitialLocale() {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    return normalizeLocale(window.localStorage.getItem(localeStorageKey));
  } catch {
    return defaultLocale;
  }
}

function persistLocale(locale: AppLocale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    // localStorage can be unavailable in restricted renderer contexts.
  }
}
