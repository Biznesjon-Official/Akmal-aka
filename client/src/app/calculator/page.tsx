'use client';

import Layout from '@/components/Layout';
import Calculator from '@/components/calculator/Calculator';
import { useLanguage } from '@/context/LanguageContext';

export default function CalculatorPage() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {t.calculator.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {t.calculator.subtitle}
            </p>
          </div>

          {/* Calculator */}
          <Calculator />
        </div>
      </div>
    </Layout>
  );
}
