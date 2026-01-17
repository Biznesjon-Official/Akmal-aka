'use client';

import { LanguageProvider } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import RealTimeDashboard from '@/components/dashboard/RealTimeDashboard';

export default function RealTimeDashboardPage() {
  return (
    <LanguageProvider>
      <Layout>
        <RealTimeDashboard />
      </Layout>
    </LanguageProvider>
  );
}