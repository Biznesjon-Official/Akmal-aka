'use client';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="relative z-10 flex-shrink-0 flex h-14 sm:h-16 lg:h-20 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50">
      <button
        type="button"
        className="px-2 sm:px-3 lg:px-4 border-r border-gray-200/50 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden transition-colors duration-200"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Sidebar ochish</span>
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      </button>
      
      <div className="flex-1 px-2 sm:px-4 lg:px-6 flex justify-between items-center gap-2 sm:gap-4">
        <div className="flex-1 flex items-center min-w-0">
          <div className="hidden md:block">
            <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent truncate">
              {t.common.appTitle}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 lg:mt-1 truncate">{t.common.systemSubtitleFull}</p>
          </div>
          {/* Mobile title */}
          <div className="md:hidden">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">{t.common.systemName}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
          {/* Language Switcher */}
          <div className="scale-75 sm:scale-90 lg:scale-100 origin-right">
            <LanguageSwitcher />
          </div>
          
          {/* Notifications - hidden on small screens */}
          <button className="hidden lg:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200">
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.5a6 6 0 0 1 6 6v2l1.5 3h-15l1.5-3v-2a6 6 0 0 1 6-6z" />
            </svg>
          </button>
          
          {/* User menu */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg lg:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm lg:text-base shadow-md flex-shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            
            <button
              onClick={logout}
              className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group flex-shrink-0"
              title={t.auth.logout}
            >
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-200"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}