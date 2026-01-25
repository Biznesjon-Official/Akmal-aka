'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { Skeleton } from '@/components/ui/Skeleton';

interface SimpleDashboardData {
  // MOLIYAVIY HOLAT
  cash_balance: {
    USD: number;
    RUB: number;
  };
  cash_details: {
    USD: { income: number; expenses: number };
    RUB: { income: number; expenses: number };
  };
  today_stats: {
    revenue: number;
    expenses: number;
    profit: number;
    transactions: number;
  };
  monthly_stats: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  
  // VAGON HOLATI
  vagon_summary: {
    active: number;
    closed: number;
    total_volume: number;
    sold_volume: number;
    remaining_volume: number;
    total_revenue_usd: number;
    total_revenue_rub: number;
  };
  
  // MIJOZLAR
  client_summary: {
    total_clients: number;
    clients_with_usd_debt: number;
    clients_with_rub_debt: number;
    clients_with_delivery_debt: number;
    total_usd_debt: number;
    total_rub_debt: number;
    total_delivery_debt: number;
    total_volume_received: number;
  };
  top_debtors: Array<{
    _id: string;
    name: string;
    phone: string;
    total_debt: number;
  }>;
  
  // OLIB KELIB BERISH
  delivery_summary: {
    pending: number;
    partial: number;
    paid: number;
    total_tariff: number;
    total_payment: number;
    total_debt: number;
  };
  
  lastUpdated: string;
  period: {
    today: string;
    month_start: string;
  };
}

export default function SimpleDashboard() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery<SimpleDashboardData>({
    queryKey: ['simple-dashboard'],
    queryFn: async () => {
      const response = await axios.get('/reports/simple-dashboard');
      return response.data;
    },
    refetchInterval: 300000, // 5 daqiqa
    staleTime: 240000, // 4 daqiqa cache
    gcTime: 600000, // 10 daqiqa
    refetchOnWindowFocus: false,
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Icon name="alert-circle" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{t.common.noData}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  const formatVolume = (volume: number) => {
    return `${volume.toFixed(2)} m³`;
  };

  const getPercentage = (part: number, total: number) => {
    if (total === 0) return 0;
    return ((part / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t.dashboard.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t.dashboard.lastUpdate}: {new Date(data.lastUpdated).toLocaleString('uz-UZ')}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cash Balance USD */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t.dashboard.cashBalance} (USD)
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.cash_balance.USD, 'USD')}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Icon name="dollar-sign" className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Cash Balance RUB */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t.dashboard.cashBalance} (RUB)
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.cash_balance.RUB, 'RUB')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Icon name="ruble-sign" className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Today's Revenue */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t.dashboard.todayRevenue}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.today_stats.revenue, 'USD')}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <Icon name="trending-up" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        {/* Today's Profit */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t.dashboard.todayProfit}
              </p>
              <p className={`text-2xl font-bold ${
                data.today_stats.profit >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(data.today_stats.profit, 'USD')}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              data.today_stats.profit >= 0 
                ? 'bg-green-100 dark:bg-green-900/20' 
                : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <Icon 
                name={data.today_stats.profit >= 0 ? "trending-up" : "trending-down"} 
                className={`h-6 w-6 ${
                  data.today_stats.profit >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`} 
              />
            </div>
          </div>
        </Card>

        {/* Active Vagons */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Faol vagonlar
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.vagon_summary.active}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Icon name="truck" className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Pending Deliveries */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Kutilayotgan yetkazib berishlar
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.delivery_summary.pending}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Icon name="package" className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Total Clients */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Jami mijozlar
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.client_summary.total_clients}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <Icon name="users" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </Card>

        {/* Clients with Debt */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Qarzdor mijozlar
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {data.client_summary.clients_with_usd_debt + data.client_summary.clients_with_rub_debt + data.client_summary.clients_with_delivery_debt}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Icon name="alert-triangle" className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}