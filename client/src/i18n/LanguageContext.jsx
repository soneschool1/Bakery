import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { en } from './locales/en';
import { am } from './locales/am';
import { om } from './locales/om';

export const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', dialect: 'Standard', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', short: 'አማ', dialect: 'ኢትዮጵያ', flag: '🇪🇹' },
  { code: 'om', label: 'Afaan Oromoo', short: 'ORO', dialect: 'Loqoda Shawa', flag: '🌳' },
];

const dictionaries = {
  en,
  am,
  om,
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('harbuu_language');
      if (saved && dictionaries[saved]) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang) => {
    if (dictionaries[newLang]) {
      setLanguageState(newLang);
      try {
        localStorage.setItem('harbuu_language', newLang);
      } catch {
        // ignore
      }
    }
  }, []);

  // Synchronize document language and typography classes
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      if (language === 'am') {
        document.body.classList.add('font-amharic');
      } else {
        document.body.classList.remove('font-amharic');
      }
    } catch {
      // ignore SSR or test environments
    }
  }, [language]);

  // Translation lookup helper supporting nested dot notation (e.g. 'baker.doughWeightStep')
  const t = useCallback((path, fallback = '') => {
    if (!path) return '';

    const keys = path.split('.');
    let current = dictionaries[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }

    if (current !== undefined && typeof current === 'string') {
      return current;
    }

    // Fallback to English dictionary if key was missing in active language
    if (language !== 'en') {
      let enCurrent = dictionaries.en;
      for (const key of keys) {
        if (enCurrent && typeof enCurrent === 'object' && key in enCurrent) {
          enCurrent = enCurrent[key];
        } else {
          enCurrent = undefined;
          break;
        }
      }
      if (enCurrent !== undefined && typeof enCurrent === 'string') {
        return enCurrent;
      }
    }

    return fallback || path;
  }, [language]);

  const currentLangMeta = useMemo(() => {
    return AVAILABLE_LANGUAGES.find(l => l.code === language) || AVAILABLE_LANGUAGES[0];
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    languages: AVAILABLE_LANGUAGES,
    currentLangMeta,
  }), [language, setLanguage, t, currentLangMeta]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for non-context usages
    return {
      t: (k, fb) => fb || k,
      language: 'en',
      setLanguage: () => {},
    };
  }
  return {
    t: context.t,
    language: context.language,
    setLanguage: context.setLanguage,
    currentLangMeta: context.currentLangMeta,
    languages: context.languages,
  };
}
