import { useState, useEffect } from 'react';
import type { Language } from '@/lib/i18n';

export type { Language };

const LANGUAGE_STORAGE_KEY = 'strangerchat_language';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    const detected = detectBrowserLanguage();
    const initial = stored || detected || 'en';
    setLanguage(initial);
    setIsLoading(false);
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  return { language, changeLanguage, isLoading };
}

function detectBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  const validLanguages: Language[] = ['en', 'es', 'fr', 'de', 'zh', 'ar', 'ja', 'pt', 'ru', 'hi', 'sw'];
  return validLanguages.includes(browserLang as Language) ? (browserLang as Language) : 'en';
}
