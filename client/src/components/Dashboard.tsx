'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardData {
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
  vagon_summary: {
    active: number;
    closed: number;
    total_volume: number;
    sold_volume: number;
    remaining_volume: number;
    total_revenue_usd: number;
    total_revenue_rub: number;
  };
  client_summary: {
    total_clients: number;
    clients_with_usd_debt: number;
    clients_with_rub_debt: number;
    total_usd_debt: number;
    total_rub_debt: number;
    total_volume_received: number;
  };
  lastUpdated: string;
}

export default function Dashboard() {
  const { t } = useLanguage();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await axios.get('/reports/simple-dashboard');
      return response.data;
    },
    refetchInterval: 300000,
    staleTime: 240000,
    gcTime: 600000,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-8 lg:mb-0">
                <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="dashboard" className="h-7 w-7" />
                  </div>
                  {t.dashboard.title}
                </h1>
                <p className="text-xl opacity-90 mb-2">
                  Yogoch Import/Export Boshqaruv Tizimi
                </p>
                <p className="text-sm opacity-75">
                  {t.dashboard.lastUpdate}: {new Date(data.lastUpdated).toLocaleString('uz-UZ')}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold">{formatNumber(data.vagon_summary.active)}</div>
                  <div className="text-sm opacity-80">Faol Vagonlar</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold">{formatNumber(data.client_summary.total_clients)}</div>
                  <div className="text-sm opacity-80">Jami Mijozlar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* MOLIYAVIY HOLAT */}
        <section>
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
              <Icon name="dollar-sign" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t.dashboard.cashBalance}</h2>
              <p className="text-gray-600">Moliyaviy holat va bugungi statistika</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Icon name="dollar-sign" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">USD {t.kassa.balance}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(data.cash_balance.USD, 'USD')}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      +{formatCurrency(data.cash_details.USD.income, 'USD')}
                    </div>
                    <div className="text-xs text-gray-600">{t.kassa.income}</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">
                      -{formatCurrency(data.cash_details.USD.expenses, 'USD')}
                    </div>
                    <div className="text-xs text-gray-600">{t.kassa.expense}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Icon name="ruble-sign" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">RUB {t.kassa.balance}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(data.cash_balance.RUB, 'RUB')}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      +{formatCurrency(data.cash_details.RUB.income, 'RUB')}
                    </div>
                    <div className="text-xs text-gray-600">{t.kassa.income}</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">
                      -{formatCurrency(data.cash_details.RUB.expenses, 'RUB')}
                    </div>
                    <div className="text-xs text-gray-600">{t.kassa.expense}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Icon name="trending-up" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">{t.dashboard.todayRevenue}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(data.today_stats.revenue)}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-lg font-bold text-emerald-600">
                      {data.today_stats.transactions}
                    </div>
                    <div className="text-xs text-gray-600">Tranzaksiyalar</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(data.today_stats.profit)}
                    </div>
                    <div className="text-xs text-gray-600">{t.dashboard.profit}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
              </div>
            </div>
          </div>
        </section>

        {/* VAGON HOLATI */}
        <section>
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
              <Icon name="truck" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t.vagon.status}</h2>
              <p className="text-gray-600">Vagonlar va hajm statistikasi</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Icon name="truck" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">{t.dashboard.activeVagons}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatNumber(data.vagon_summary.active)}
                </div>
                <div className="text-sm text-gray-500">
                  {t.vagon.closed}: {formatNumber(data.vagon_summary.closed)}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Icon name="package" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">{t.vagon.totalVolume}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatVolume(data.vagon_summary.total_volume)}
                </div>
                <div className="text-sm text-gray-500">
                  {t.vagon.remainingVolume}: {formatVolume(data.vagon_summary.remaining_volume)}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Icon name="trending-up" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">{t.vagon.soldVolume}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatVolume(data.vagon_summary.sold_volume)}
                </div>
                <div className="text-sm text-gray-500">
                  {getPercentage(data.vagon_summary.sold_volume, data.vagon_summary.total_volume)}% {t.dashboard.sales}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Icon name="dollar-sign" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">{t.reports.revenue}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(data.vagon_summary.total_revenue_usd)}
                </div>
                <div className="text-sm text-gray-500">
                  RUB: {formatCurrency(data.vagon_summary.total_revenue_rub, 'RUB')}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-600"></div>
              </div>
            </div>
          </div>
        </section>

        {/* MIJOZLAR VA QARZLAR */}
        <section>
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4">
              <Icon name="users" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t.client.title} va {t.dashboard.debt}</h2>
              <p className="text-gray-600">Mijozlar statistikasi va qarz holati</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Icon name="users" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">{t.reports.totalClients}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatNumber(data.client_summary.total_clients)}
                </div>
                <div className="text-sm text-gray-500">
                  {t.reports.volume}: {formatVolume(data.client_summary.total_volume_received)}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                    <Icon name="alert-triangle" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">USD {t.dashboard.debt}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(Math.max(0, data.client_summary.total_usd_debt))}
                </div>
                <div className="text-sm text-gray-500">
                  {data.client_summary.clients_with_usd_debt} {t.client.title}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-600/5"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Icon name="alert-circle" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">RUB {t.dashboard.debt}</div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(Math.max(0, data.client_summary.total_rub_debt), 'RUB')}
                </div>
                <div className="text-sm text-gray-500">
                  {data.client_summary.clients_with_rub_debt} {t.client.title}
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-600"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}