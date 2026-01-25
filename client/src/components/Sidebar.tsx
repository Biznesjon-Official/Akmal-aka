'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslatedNavigation } from '@/hooks/useTranslatedNavigation';
import { useLanguage } from '@/context/LanguageContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactElement;
  gradient: string;
  badge?: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { navigation, adminNavigation } = useTranslatedNavigation();
  const { t } = useLanguage();

  const allNavigation = user?.role === 'admin' 
    ? [...navigation, ...adminNavigation] 
    : navigation;

  // Icon components for each navigation item
  const getIcon = (index: number, isActive: boolean) => {
    const iconColor = isActive ? 'white' : 'white';
    const icons = [
      // Dashboard
      <svg key="dashboard" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>,
      // Clients
      <svg key="clients" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>,
      // Vagons
      <svg key="vagons" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
      </svg>,
      // Sales
      <svg key="sales" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
      </svg>,
      // Vagon Sales
      <svg key="vagon-sales" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
      </svg>,
      // Expenses
      <svg key="expenses" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>,
      // Cash
      <svg key="cash" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
      </svg>,
      // Reports
      <svg key="reports" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
      </svg>,
      // Calculator
      <svg key="calculator" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.97 4.06L14.09 6l1.41 1.41L16.91 6l1.06 1.06-1.41 1.41 1.41 1.41-1.06 1.06-1.41-1.4-1.41 1.41-1.06-1.06 1.41-1.41-1.41-1.42zM7 7.72h5v1.5H7V7.72zM18 17.5H6v-1.5h12v1.5zm-1.5-3.5h-1.75v1.75h-1.5V14H11.5v-1.5h1.75V10.75h1.5V12.5H16.5V14z" />
      </svg>,
      // USD/Exchange
      <svg key="usd" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>,
    ];
    
    return icons[index] || icons[0];
  };

  // Color mapping for different navigation items
  const getBackgroundColor = (index: number, isActive: boolean) => {
    const colors = [
      '#3b82f6', // blue - Dashboard
      '#06b6d4', // cyan - Clients  
      '#14b8a6', // teal - Vagons
      '#10b981', // emerald - Sales
      '#a855f7', // purple - Vagon Sales
      '#f97316', // orange - Expenses
      '#22c55e', // green - Cash
      '#ec4899', // pink - Reports
      '#6366f1', // indigo - Calculator
      '#eab308', // yellow - USD
    ];
    
    if (isActive) {
      return colors[index] || colors[0];
    }
    
    return colors[index] || colors[0];
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">{t.common.closeSidebar}</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Header section - fixed */}
          <div className="flex-shrink-0 pt-6 pb-4">
            <div className="flex items-center flex-shrink-0 px-5">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-base">
                  A
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-bold text-gray-900">{t.common.systemName}</h2>
                  <p className="text-sm text-gray-500">{t.common.systemSubtitle}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation section - scrollable */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-4 space-y-3 pb-4">
              {allNavigation.map((item, idx) => {
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-4 py-4 text-base font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div 
                      className="mr-4 flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: getBackgroundColor(idx, isActive)
                      }}
                    >
                      {getIcon(idx, isActive)}
                    </div>
                    <span className="font-medium text-base">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        {/* Header section - fixed */}
        <div className="flex-shrink-0 pt-4 lg:pt-6 pb-3 lg:pb-4">
          <div className="flex items-center flex-shrink-0 px-3 lg:px-5">
            <div className="flex items-center">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm lg:text-base">
                A
              </div>
              <div className="ml-3 lg:ml-4 min-w-0 flex-1">
                <h2 className="text-sm lg:text-base font-bold text-gray-900 truncate">{t.common.systemName}</h2>
                <p className="text-xs lg:text-sm text-gray-500 truncate">{t.common.systemSubtitleFull}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation section - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 lg:px-4 space-y-2 lg:space-y-3 pb-4">
            {allNavigation.map((item, idx) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 lg:px-4 py-3 lg:py-4 text-sm lg:text-base font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div 
                    className="mr-3 lg:mr-4 flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: getBackgroundColor(idx, isActive)
                    }}
                  >
                    {getIcon(idx, isActive)}
                  </div>
                  <span className="font-medium truncate text-sm lg:text-base">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}