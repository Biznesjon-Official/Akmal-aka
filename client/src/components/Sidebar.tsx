'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslatedNavigation } from '@/hooks/useTranslatedNavigation';
import { useLanguage } from '@/context/LanguageContext';
import { 
  DollarSign, 
  CreditCard, 
  TrendingDown, 
  Package, 
  Truck, 
  Users, 
  Send, 
  Repeat,
  X 
} from 'lucide-react';

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

  // Icon mapping
  const iconMap: { [key: string]: any } = {
    'dollar-sign': DollarSign,
    'credit-card': CreditCard,
    'trending-down': TrendingDown,
    'package': Package,
    'truck': Truck,
    'users': Users,
    'send': Send,
    'repeat': Repeat,
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || DollarSign;
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-linear duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setSidebarOpen(false)} 
        />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ease-in-out duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">{t.common.systemName}</h1>
            </div>
            <nav className="mt-5 px-2 space-y-2">
              {allNavigation.map((item) => {
                const isActive = pathname === item.href || (pathname === '/' && item.href === '/cash');
                const IconComponent = getIconComponent(item.icon);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className={`mr-3 flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/20 backdrop-blur-sm' 
                        : 'bg-gray-100 group-hover:bg-white'
                    }`}>
                      <IconComponent className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}`} />
                    </div>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {user && (
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <div className="inline-block h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">{user.username?.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.username}</p>
                  <p className="text-xs font-medium text-gray-500">{user.role === 'admin' ? 'Administrator' : 'Foydalanuvchi'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-2xl font-bold text-gray-900">{t.common.systemName}</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-white space-y-2">
              {allNavigation.map((item) => {
                const isActive = pathname === item.href || (pathname === '/' && item.href === '/cash');
                const IconComponent = getIconComponent(item.icon);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className={`mr-3 flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/20 backdrop-blur-sm' 
                        : 'bg-gray-100 group-hover:bg-white'
                    }`}>
                      <IconComponent className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}`} />
                    </div>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {user && (
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div>
                  <div className="inline-block h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">{user.username?.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.username}</p>
                  <p className="text-xs font-medium text-gray-500">{user.role === 'admin' ? 'Administrator' : 'Foydalanuvchi'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
