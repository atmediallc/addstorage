'use client';

import { useI18n } from '@/i18n/provider';
import { locales, type Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function LocaleSwitcher() {
  const { locale: currentLocale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        title="Language"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium uppercase">{currentLocale}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => {
                setLocale(locale);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                locale === currentLocale
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <span className="w-5 text-center text-xs font-bold uppercase">{locale}</span>
              <span>{localeLabels[locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
