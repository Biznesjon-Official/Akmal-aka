import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export function useTranslatedNavigation() {
  const { t } = useLanguage();

  const navigation = useMemo(() => [
    { 
      name: t.sidebar.cash, 
      href: '/cash', 
      icon: 'dollar-sign',
      gradient: 'from-green-500 to-green-600' 
    },
    { 
      name: 'Valyuta O\'tkazish', 
      href: '/currency-transfer', 
      icon: 'repeat',
      gradient: 'from-blue-500 to-blue-600' 
    },
    { 
      name: 'Qarz Daftarcha', 
      href: '/debt', 
      icon: 'credit-card',
      gradient: 'from-red-500 to-red-600' 
    },
    { 
      name: t.sidebar.expenses, 
      href: '/expenses', 
      icon: 'trending-down',
      gradient: 'from-orange-500 to-orange-600' 
    },
    { 
      name: t.sidebar.warehouse, 
      href: '/warehouse', 
      icon: 'package',
      gradient: 'from-indigo-500 to-indigo-600' 
    },
    { 
      name: t.sidebar.vagons, 
      href: '/vagon', 
      icon: 'truck',
      gradient: 'from-teal-500 to-teal-600' 
    },
    { 
      name: t.sidebar.clients, 
      href: '/client', 
      icon: 'users',
      gradient: 'from-cyan-500 to-cyan-600' 
    },
    { 
      name: t.sidebar.delivery, 
      href: '/delivery', 
      icon: 'send',
      gradient: 'from-purple-500 to-purple-600' 
    },
  ], [t]);

  const adminNavigation = useMemo(() => [
    // Admin-only navigation items can be added here if needed
  ], [t]);

  return { navigation, adminNavigation };
}
