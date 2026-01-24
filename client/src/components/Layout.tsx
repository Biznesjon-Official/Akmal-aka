'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastProvider from './ToastProvider';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <LanguageProvider>
      <ToastProvider />
      <div className="min-h-screen bg-gray-50">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <div className="md:pl-72">
          {/* Fixed Header */}
          <div className="fixed top-0 right-0 left-0 md:left-72 z-30">
            <Header setSidebarOpen={setSidebarOpen} />
          </div>
          
          {/* Main content with top padding to account for fixed header */}
          <main className="pt-14 sm:pt-16 lg:pt-20">
            <div className="py-2 sm:py-4 lg:py-6">
              {/* Mobile va tablet uchun container, desktop uchun to'liq kenglik */}
              <div className="px-4 sm:px-6 lg:px-4">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
