import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';

export function useTranslatedNavigation() {
  const { t } = useLanguage();

  const navigation = useMemo(() => [
    { 
      name: t.sidebar.dashboard, 
      href: '/', 
      icon: <Icon name="dashboard" size="sm" />,
      gradient: 'from-blue-500 to-blue-600' 
    },
    { 
      name: t.sidebar.cash, 
      href: '/cash', 
      icon: <Icon name="cash" size="sm" />,
      gradient: 'from-green-500 to-green-600' 
    },
    { 
      name: t.sidebar.vagons, 
      href: '/vagon', 
      icon: <Icon name="vagons" size="sm" />,
      gradient: 'from-teal-500 to-teal-600' 
    },
    { 
      name: t.sidebar.expenses, 
      href: '/expense', 
      icon: <Icon name="expenses" size="sm" />,
      gradient: 'from-orange-500 to-orange-600' 
    },
    { 
      name: t.sidebar.vagonSales, 
      href: '/vagon-sale', 
      icon: <Icon name="sales" size="sm" />,
      gradient: 'from-emerald-500 to-emerald-600' 
    },
    { 
      name: t.sidebar.clients, 
      href: '/client', 
      icon: <Icon name="clients" size="sm" />,
      gradient: 'from-cyan-500 to-cyan-600' 
    },
    { 
      name: t.sidebar.reports, 
      href: '/reports', 
      icon: <Icon name="reports" size="sm" />,
      gradient: 'from-pink-500 to-pink-600' 
    },
    { 
      name: t.sidebar.exchangeRates, 
      href: '/exchange-rate', 
      icon: <Icon name="trending-up" size="sm" />,
      gradient: 'from-yellow-500 to-yellow-600' 
    },
    { 
      name: t.sidebar.calculator, 
      href: '/calculator', 
      icon: <Icon name="calculator" size="sm" />,
      gradient: 'from-indigo-500 to-indigo-600' 
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
