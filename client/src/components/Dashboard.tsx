'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardData {
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

export default function Dashboard() {
  const { t } = useLanguage();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await axios.get('/reports/simple-dashboard');
      return response.data;
    },
    refetchInterval: 300000, // 5 daqiqa
    staleTime: 240000, // 4 daqiqa cache
    gcTime: 600000, // 10 daqiqa
    refetchOnWindowFocus: true,
    retry: 2
  });

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
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

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Icon name="alert-circle" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{t.common.noData}</p>
          <p className="text-sm text-red-500 mt-2">
            {error?.message || t.common.loading}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Icon name="dashboard" className="h-8 w-8 text-blue-600 mr-3" />
            {t.dashboard.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t.dashboard.lastUpdate}: {new Date(data.lastUpdated).toLocaleString('uz-UZ')}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {t.dashboard.today}: {new Date(data.period.today).toLocaleDateString('uz-UZ')} |
          {t.common.total}: {new Date(data.period.month_start).toLocaleDateString('uz-UZ')}
        </div>
      </div>

      {/* MOLIYAVIY HOLAT */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Icon name="dollar-sign" className="h-6 w-6 text-green-600 mr-2" />
          {t.dashboard.cashBalance}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* USD Kassa */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">USD {t.kassa.balance}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.cash_balance.USD, 'USD')}
                </p>
                <p className="text-xs text-gray-500">
                  {t.kassa.income}: {formatCurrency(data.cash_details.USD.income, 'USD')}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Icon name="dollar-sign" className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          {/* RUB Kassa */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">RUB {t.kassa.balance}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.cash_balance.RUB, 'RUB')}
                </p>
                <p className="text-xs text-gray-500">
                  {t.kassa.income}: {formatCurrency(data.cash_details.RUB.income, 'RUB')}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Icon name="ruble-sign" className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Bugungi Daromad */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.dashboard.todayRevenue}</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(data.today_stats.revenue)}
                </p>
                <p className="text-xs text-gray-500">
                  {data.today_stats.transactions} {t.common.total}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Icon name="trending-up" className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          {/* Bugungi Foyda */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.dashboard.todayProfit}</p>
                <p className={`text-2xl font-bold ${
                  data.today_stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(data.today_stats.profit)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.kassa.expense}: {formatCurrency(data.today_stats.expenses)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                data.today_stats.profit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon 
                  name={data.today_stats.profit >= 0 ? "trending-up" : "trending-down"} 
                  className={`h-6 w-6 ${
                    data.today_stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} 
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* VAGON HOLATI */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Icon name="truck" className="h-6 w-6 text-purple-600 mr-2" />
          {t.vagon.status}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Faol Vagonlar */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.dashboard.activeVagons}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(data.vagon_summary.active)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.vagon.closed}: {formatNumber(data.vagon_summary.closed)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Icon name="truck" className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          {/* Jami Hajm */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.vagon.totalVolume}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatVolume(data.vagon_summary.total_volume)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.vagon.remainingVolume}: {formatVolume(data.vagon_summary.remaining_volume)}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Icon name="package" className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </Card>

          {/* Sotilgan Hajm */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.vagon.soldVolume}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatVolume(data.vagon_summary.sold_volume)}
                </p>
                <p className="text-xs text-gray-500">
                  {getPercentage(data.vagon_summary.sold_volume, data.vagon_summary.total_volume)}% {t.dashboard.sales}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Icon name="trending-up" className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          {/* Jami Daromad */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.reports.revenue}</p>
                <p className="text-2xl font-bold text-teal-600">
                  {formatCurrency(data.vagon_summary.total_revenue_usd)}
                </p>
                <p className="text-xs text-gray-500">
                  RUB: {formatCurrency(data.vagon_summary.total_revenue_rub, 'RUB')}
                </p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <Icon name="dollar-sign" className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MIJOZLAR VA QARZLAR */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Icon name="users" className="h-6 w-6 text-blue-600 mr-2" />
          {t.client.title} va {t.dashboard.debt}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Jami Mijozlar */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.reports.totalClients}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.client_summary.total_clients)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.reports.volume}: {formatVolume(data.client_summary.total_volume_received)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Icon name="users" className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* USD Qarzlar */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">USD {t.dashboard.debt}</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(Math.max(0, data.client_summary.total_usd_debt))}
                </p>
                <p className="text-xs text-gray-500">
                  {data.client_summary.clients_with_usd_debt} {t.client.title}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Icon name="alert-triangle" className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          {/* RUB Qarzlar */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">RUB {t.dashboard.debt}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(Math.max(0, data.client_summary.total_rub_debt), 'RUB')}
                </p>
                <p className="text-xs text-gray-500">
                  {data.client_summary.clients_with_rub_debt} {t.client.title}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Icon name="alert-circle" className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          {/* Delivery Qarzlar */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.delivery.title} {t.dashboard.debt}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(Math.max(0, data.client_summary.total_delivery_debt))}
                </p>
                <p className="text-xs text-gray-500">
                  {data.client_summary.clients_with_delivery_debt} {t.client.title}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Icon name="truck" className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* OLIB KELIB BERISH */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Icon name="truck" className="h-6 w-6 text-indigo-600 mr-2" />
          {t.delivery.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Kutilayotgan */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.delivery.unpaid}</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(data.delivery_summary.pending)}
                </p>
                <p className="text-xs text-gray-500">{t.delivery.unpaid}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Icon name="clock" className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          {/* Qisman to'langan */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.delivery.partial}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(data.delivery_summary.partial)}
                </p>
                <p className="text-xs text-gray-500">{t.delivery.partial}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Icon name="alert-circle" className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>

          {/* To'langan */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.delivery.paid}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(data.delivery_summary.paid)}
                </p>
                <p className="text-xs text-gray-500">{t.common.total}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Icon name="check-circle" className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          {/* Jami Tarif */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.delivery.totalTariff}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(data.delivery_summary.total_tariff)}
                </p>
                <p className="text-xs text-gray-500">
                  {t.delivery.debt}: {formatCurrency(data.delivery_summary.total_debt)}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Icon name="dollar-sign" className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ENG KATTA QARZDARLAR */}
      {data.top_debtors && data.top_debtors.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Icon name="alert-triangle" className="h-6 w-6 text-red-600 mr-2" />
            {t.reports.topClients} ({t.dashboard.debt})
          </h2>
          <Card className="p-6">
            <div className="space-y-4">
              {data.top_debtors.map((debtor, index) => (
                <div key={debtor._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{debtor.name}</p>
                      <p className="text-sm text-gray-500">{debtor.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(debtor.total_debt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* OYLIK STATISTIKA */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Icon name="trending-up" className="h-6 w-6 text-green-600 mr-2" />
          {t.dashboard.statistics}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.reports.revenue}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.monthly_stats.revenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Icon name="trending-up" className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.reports.totalExpenses}</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.monthly_stats.expenses)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Icon name="trending-down" className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t.dashboard.profit}</p>
                <p className={`text-2xl font-bold ${
                  data.monthly_stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(data.monthly_stats.profit)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                data.monthly_stats.profit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Icon 
                  name={data.monthly_stats.profit >= 0 ? "trending-up" : "trending-down"} 
                  className={`h-6 w-6 ${
                    data.monthly_stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} 
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}