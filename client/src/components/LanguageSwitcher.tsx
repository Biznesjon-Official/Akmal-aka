'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const handleLanguageChange = (lang: 'uz' | 'ru') => {
    setLanguage(lang);
    // Force full page reload to update all components
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <button
        onClick={() => handleLanguageChange('uz')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'uz'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        O'zbekcha
      </button>
      <button
        onClick={() => handleLanguageChange('ru')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'ru'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        Русский
      </button>
    </div>
  );
}
