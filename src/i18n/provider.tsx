'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { defaultLocale, type Locale } from './config';
import en from './messages/en.json';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, any>>(en);

  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale | null;
    const cookieLocale = document.cookie
      .split('; ')
      .find((r) => r.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;
    const initial = stored ?? cookieLocale ?? defaultLocale;
    setLocaleState(initial);
    loadLocaleMessages(initial);
  }, []);

  const loadLocaleMessages = async (loc: Locale) => {
    try {
      const mod = await import(`./messages/${loc}.json`);
      setMessages(mod.default);
    } catch {
      setMessages(en);
    }
  };

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem('locale', loc);
    document.cookie = `NEXT_LOCALE=${loc};path=/;max-age=31536000`;
    loadLocaleMessages(loc);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      const keys = key.split('.');
      let value: any = messages;
      for (const k of keys) {
        value = value?.[k];
      }
      if (typeof value !== 'string') return key;
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
          value,
        );
      }
      return value;
    },
    [messages],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
