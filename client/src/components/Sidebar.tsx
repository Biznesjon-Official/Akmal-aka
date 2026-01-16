'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslatedNavigation } from '@/hooks/useTranslatedNavigation';

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

  const allNavigation = user?.role === 'admin' 
    ? [...navigation, ...adminNavigation] 
    : navigation;

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white/95 backdrop-blur-md">
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
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  W
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-bold text-gray-900">Wood System</h2>
                  <p className="text-xs text-gray-500">Import/Export</p>
                </div>
              </div>
            </div>
            
            <nav className="px-4 space-y-2">
              {allNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`sidebar-item group ${pathname === item.href ? 'active' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${item.gradient} flex items-center justify-center text-white text-sm shadow-md mr-3`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              ))}
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
                    W
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-gray-900">Wood System</h2>
                    <p className="text-sm text-gray-500">Import/Export Management</p>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 px-4 space-y-2">
                {allNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`sidebar-item group ${pathname === item.href ? 'active' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${item.gradient} flex items-center justify-center text-white shadow-md mr-4 group-hover:shadow-lg transition-all duration-200`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  </Link>
                ))}
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