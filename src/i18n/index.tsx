import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { appEnglish } from './app.en';
import { workbenchEnglish } from './workbench.en';
import { domainEnglish, translateDomain } from './domain.en';

export type Locale = 'en' | 'zh';
export const LOCALE_KEY = 'shouyihuo.locale.v1';
const english: Record<string, string> = { ...domainEnglish, ...workbenchEnglish, ...appEnglish };

/** Presentation only: legacy records retain their original, schema-v1 content. */
export function translate(text: string, locale: Locale): string {
  if (locale === 'zh' || !text) return text;
  const exact = english[text];
  if (exact !== undefined) return exact;
  const trimmed = text.trim();
  if (english[trimmed] !== undefined) return text.replace(trimmed, english[trimmed]);
  return translateDomain(text, value => value === text ? value : translate(value, locale)) ?? text;
}

export function readLocale(storage?: Pick<Storage, 'getItem'>): Locale {
  try { return storage?.getItem(LOCALE_KEY) === 'zh' ? 'zh' : 'en'; }
  catch { return 'en'; }
}

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (text: string) => string };
const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {}, t: text => translate(text, 'en') });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return readLocale(window.localStorage); } catch { return 'en'; }
  });
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    document.title = locale === 'en' ? 'Shouyihuo · 3D Training Lab' : '手艺活 · 本地维修实训';
    try { window.localStorage.setItem(LOCALE_KEY, locale); } catch { /* Session-only preference when storage is unavailable. */ }
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (text: string) => translate(text, locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }
