'use client';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

interface Balance {
  USD: number;
  RUB: number;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  // Balanslarni olish
  const { data: balances } = useQuery<Balance>({
    queryKey: ['header-currency-balances'],
    queryFn: async () => {
      const response = await axios.get('/currency-transfer/balance/all');
      return response.data.data;
    },
    refetchInterval: 30000, // Har 30 sekundda yangilash
    enabled: !!user // Faqat login qilgan bo'lsa
  });

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 lg:h-20 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-200/50">
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="px-4 border-r border-gray-200/50 text-gray-500 hover:text-gray-900 hover:bg-gray-50 focus:outline-none md:hidden transition-all duration-200"
        onClick={() => setSidebarOpen(true)}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
      
      <div className="flex-1 px-4 lg:px-8 flex justify-between items-center gap-4">
        {/* Left Side - Title */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="hidden md:block">
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t.common.appTitle}
            </h1>
            <p className="text-xs text-gray-500 mt-1">{t.common.systemSubtitleFull}</p>
          </div>
          
          {/* Mobile Title */}
          <div className="md:hidden">
            <h1 className="text-base font-bold text-gray-900">{t.common.systemName}</h1>
          </div>
        </div>
        
        {/* Right Side - Balances & User */}
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Currency Balances - Professional Cards */}
          {balances && (
            <div className="flex items-center gap-2 lg:gap-3">
              {/* USD Balance Card */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl px-3 lg:px-4 py-2 lg:py-2.5 hover:shadow-md transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl"></div>
                <div className="relative flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm lg:text-base">$</span>
                  </div>
                  <div>
                    <p className="text-[10px] lg:text-xs text-green-600 font-semibold">USD</p>
                    <p className="text-sm lg:text-base font-bold text-green-700">
                      {balances.USD?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* RUB Balance Card */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl px-3 lg:px-4 py-2 lg:py-2.5 hover:shadow-md transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
                <div className="relative flex items-center gap-2">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm lg:text-base">₽</span>
                  </div>
                  <div>
                    <p className="text-[10px] lg:text-xs text-blue-600 font-semibold">RUB</p>
                    <p className="text-sm lg:text-base font-bold text-blue-700">
                      {balances.RUB?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Language Switcher */}
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          
          {/* User Profile Card */}
          <div className="flex items-center gap-3 pl-3 lg:pl-6 border-l border-gray-200/50">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            
            <div className="relative group">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-base lg:text-lg shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            <button
              onClick={logout}
              className="p-2 lg:p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
              title={t.auth.logout}
            >
              <svg className="h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}