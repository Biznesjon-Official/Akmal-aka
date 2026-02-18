import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';

export function useTranslatedNavigation() {
  const { t } = useLanguage();

  const navigation = useMemo(() => [
    { 
      name: t.sidebar.cash, 
      href: '/cash', 
      icon: <Icon name="cash" size="sm" />,
      gradient: 'from-green-500 to-green-600' 
    },
    { 
      name: 'Valyuta O\'tkazish', 
      href: '/currency-transfer', 
      icon: <Icon name="exchange" size="sm" />,
      gradient: 'from-blue-500 to-blue-600' 
    },
    { 
      name: 'Qarz Daftarcha', 
      href: '/debt', 
      icon: <Icon name="credit-card" size="sm" />,
      gradient: 'from-red-500 to-red-600' 
    },
    { 
      name: t.sidebar.expenses, 
      href: '/expenses', 
      icon: <Icon name="expenses" size="sm" />,
      gradient: 'from-orange-500 to-orange-600' 
    },
    { 
      name: t.sidebar.warehouse, 
      href: '/warehouse', 
      icon: <Icon name="warehouse" size="sm" />,
      gradient: 'from-indigo-500 to-indigo-600' 
    },
    { 
      name: t.sidebar.vagons, 
      href: '/vagon', 
      icon: <Icon name="vagons" size="sm" />,
      gradient: 'from-teal-500 to-teal-600' 
    },
    { 
      name: t.sidebar.clients, 
      href: '/client', 
      icon: <Icon name="clients" size="sm" />,
      gradient: 'from-cyan-500 to-cyan-600' 
    },
    { 
      name: t.sidebar.delivery, 
      href: '/delivery', 
      icon: <Icon name="transport" size="sm" />,
      gradient: 'from-purple-500 to-purple-600' 
    },
  ], [t]);

  const adminNavigation = useMemo(() => [
    // Admin-only navigation items can be added here if needed
  ], [t]);

  return { navigation, adminNavigation };
}
