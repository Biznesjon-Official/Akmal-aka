'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <button
        onClick={() => setLanguage('uz')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'uz'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        O'zbekcha
      </button>
      <button
        onClick={() => setLanguage('ru')}
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
