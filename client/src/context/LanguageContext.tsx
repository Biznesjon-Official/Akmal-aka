'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { uz, ru } from '@/i18n';

type Language = 'uz' | 'ru';
type Translations = typeof uz;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = {
  uz,
  ru,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default til rus
  const [language, setLanguageState] = useState<Language>('ru');

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'uz' || savedLanguage === 'ru')) {
      setLanguageState(savedLanguage);
    } else {
      // Agar localStorage da til yo'q bo'lsa, rus tilini saqlash
      localStorage.setItem('language', 'ru');
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  const value: LanguageContextType = useMemo(() => ({
    language,
    setLanguage,
    t: translations[language],
  }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
