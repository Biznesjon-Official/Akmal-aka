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
      // Cash
      <svg key="cash" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>,
      // Debt
      <svg key="debt" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>,
      // Expenses
      <svg key="expenses" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" />
      </svg>,
      // Warehouse
      <svg key="warehouse" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 2.69L18.31 12H17v6H7v-6H5.69L12 5.69zM9 14h2v4H9v-4zm4 0h2v4h-2v-4z" />
      </svg>,
      // Vagons
      <svg key="vagons" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
      </svg>,
      // Clients
      <svg key="clients" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>,
      // Delivery
      <svg key="delivery" className="w-6 h-6" viewBox="0 0 24 24" fill={iconColor}>
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
      </svg>,
    ];
    
    return icons[index] || icons[0];
  };

  // Color mapping for different navigation items
  const getBackgroundColor = (index: number, isActive: boolean) => {
    const colors = [
      '#22c55e', // green - Cash
      '#ef4444', // red - Debt
      '#f97316', // orange - Expenses
      '#6366f1', // indigo - Warehouse
      '#14b8a6', // teal - Vagons
      '#06b6d4', // cyan - Clients
      '#a855f7', // purple - Delivery
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
          {/* Header section with close button - fixed */}
          <div className="flex-shrink-0 pt-4 pb-4">
            <div className="flex items-center justify-between px-4 mb-4">
              <div className="flex items-center flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  A
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <h2 className="text-base font-bold text-gray-900 truncate">{t.common.systemName}</h2>
                  <p className="text-xs text-gray-500 truncate">{t.common.systemSubtitle}</p>
                </div>
              </div>
              
              {/* Close button - inside sidebar */}
              <button
                type="button"
                className="ml-2 flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">{t.common.closeSidebar}</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Navigation section - scrollable */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-4 space-y-3 pb-4">
              {allNavigation.map((item, idx) => {
                const isActive = pathname === item.href || (pathname === '/' && item.href === '/cash');
                
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
              const isActive = pathname === item.href || (pathname === '/' && item.href === '/cash');
              
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