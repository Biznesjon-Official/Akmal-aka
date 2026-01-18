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

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white/95 backdrop-blur-md shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-200"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Sidebar yopish</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-4 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <div className="flex items-center">
                <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg">
                  A
                </div>
                <div className="ml-3">
                  <h2 className="text-base font-bold text-gray-900">{t.common.systemName}</h2>
                  <p className="text-xs text-gray-500">{t.common.systemSubtitle}</p>
                </div>
              </div>
            </div>
            
            <nav className="px-3 space-y-1">
              {allNavigation.map((item, idx) => {
                const icons = [
                  <svg key="dashboard" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>,
                  <svg key="clients" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>,
                  <svg key="vagons" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>,
                  <svg key="sales" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>,
                  <svg key="transport" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>,
                  <svg key="expenses" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
                  <svg key="cash" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
                  <svg key="reports" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>,
                  <svg key="calculator" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.97 4.06L14.09 6l1.41 1.41L16.91 6l1.06 1.06-1.41 1.41 1.41 1.41-1.06 1.06-1.41-1.4-1.41 1.41-1.06-1.06 1.41-1.41-1.41-1.42zM7 7.72h5v1.5H7V7.72zM18 17.5H6v-1.5h12v1.5zm-1.5-3.5h-1.75v1.75h-1.5V14H11.5v-1.5h1.75V10.75h1.5V12.5H16.5V14z" /></svg>,
                  <svg key="usd" className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
                ];
                
                const gradientMap: { [key: string]: string } = {
                  'from-blue-500 to-blue-600': 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                  'from-cyan-500 to-cyan-600': 'linear-gradient(to bottom right, #06b6d4, #0891b2)',
                  'from-teal-500 to-teal-600': 'linear-gradient(to bottom right, #14b8a6, #0d9488)',
                  'from-emerald-500 to-emerald-600': 'linear-gradient(to bottom right, #10b981, #059669)',
                  'from-purple-500 to-purple-600': 'linear-gradient(to bottom right, #a855f7, #9333ea)',
                  'from-orange-500 to-orange-600': 'linear-gradient(to bottom right, #f97316, #ea580c)',
                  'from-indigo-500 to-indigo-600': 'linear-gradient(to bottom right, #6366f1, #4f46e5)',
                  'from-green-500 to-green-600': 'linear-gradient(to bottom right, #22c55e, #16a34a)',
                  'from-pink-500 to-pink-600': 'linear-gradient(to bottom right, #ec4899, #db2777)',
                  'from-yellow-500 to-yellow-600': 'linear-gradient(to bottom right, #eab308, #ca8a04)',
                };
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-item group ${pathname === item.href ? 'active' : ''}`}
                  >
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg mr-3 flex-shrink-0"
                      style={{
                        background: gradientMap[item.gradient] || '#3b82f6'
                      }}
                    >
                      {icons[idx] || icons[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72">
          <div className="flex flex-col h-0 flex-1 bg-white/80 backdrop-blur-md border-r border-gray-200/50 shadow-lg">
            <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-6 mb-8">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    A
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-gray-900">{t.common.systemName}</h2>
                    <p className="text-sm text-gray-500">{t.common.systemSubtitleFull}</p>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 px-4 space-y-2">
                {allNavigation.map((item, idx) => {
                  const icons = [
                    <svg key="dashboard" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>,
                    <svg key="clients" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>,
                    <svg key="vagons" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>,
                    <svg key="sales" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>,
                    <svg key="transport" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>,
                    <svg key="expenses" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
                    <svg key="calculator" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.97 4.06L14.09 6l1.41 1.41L16.91 6l1.06 1.06-1.41 1.41 1.41 1.41-1.06 1.06-1.41-1.4-1.41 1.41-1.06-1.06 1.41-1.41-1.41-1.42zM7 7.72h5v1.5H7V7.72zM18 17.5H6v-1.5h12v1.5zm-1.5-3.5h-1.75v1.75h-1.5V14H11.5v-1.5h1.75V10.75h1.5V12.5H16.5V14z" /></svg>,
                    <svg key="cash" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
                    <svg key="reports" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>,
                    <svg key="usd" className="w-6 h-6" viewBox="0 0 24 24" fill="white"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
                  ];
                  
                  const gradientMap: { [key: string]: string } = {
                    'from-blue-500 to-blue-600': 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                    'from-cyan-500 to-cyan-600': 'linear-gradient(to bottom right, #06b6d4, #0891b2)',
                    'from-teal-500 to-teal-600': 'linear-gradient(to bottom right, #14b8a6, #0d9488)',
                    'from-emerald-500 to-emerald-600': 'linear-gradient(to bottom right, #10b981, #059669)',
                    'from-purple-500 to-purple-600': 'linear-gradient(to bottom right, #a855f7, #9333ea)',
                    'from-orange-500 to-orange-600': 'linear-gradient(to bottom right, #f97316, #ea580c)',
                    'from-indigo-500 to-indigo-600': 'linear-gradient(to bottom right, #6366f1, #4f46e5)',
                    'from-green-500 to-green-600': 'linear-gradient(to bottom right, #22c55e, #16a34a)',
                    'from-pink-500 to-pink-600': 'linear-gradient(to bottom right, #ec4899, #db2777)',
                    'from-yellow-500 to-yellow-600': 'linear-gradient(to bottom right, #eab308, #ca8a04)',
                  };
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`sidebar-item group ${pathname === item.href ? 'active' : ''}`}
                    >
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg mr-4 group-hover:shadow-xl transition-all duration-300 flex-shrink-0"
                        style={{
                          background: gradientMap[item.gradient] || '#3b82f6'
                        }}
                      >
                        {icons[idx] || icons[0]}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-base">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
              
              {/* User info */}
              <div className="px-4 mt-6">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl flex items-center justify-center text-white font-bold">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}