'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import SalesDynamicsChart from '@/components/dashboard/SalesDynamicsChart';
import ProfitTrendChart from '@/components/dashboard/ProfitTrendChart';
import CashFlowWidget from '@/components/dashboard/CashFlowWidget';
import AlertsWidget from '@/components/dashboard/AlertsWidget';

interface DashboardData {
  // REAL MA'LUMOTLAR (Haqiqiy) - Asosiy valyutada
  actual: {
    today_revenue_base: number;
    today_expenses_base: number;
    today_profit_base: number;
    cash_balance_base: number;
    active_vagons: number;
    total_realized_profit_base: number;
    today_revenue_breakdown: any[];
    cash_balance_breakdown: any[];
  };
  
  // PROGNOZ MA'LUMOTLAR (Kutilayotgan)
  projected: {
    expected_revenue_from_remaining_base: number;
    break_even_analysis: {
      total_investment_base: number;
      min_price_needed_base: number;
      current_avg_price_base: number;
    };
    roi_forecast: number;
    completion_timeline: string;
  };
  
  // ARALASH MA'LUMOTLAR (Real + Prognoz)
  combined: {
    total_investment_base: number;
    potential_total_revenue_base: number;
    potential_total_profit_base: number;
  };
  
  // OGOHLANTIRISHLAR
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    action_needed: boolean;
  }>;
  
  // ESKI FORMAT (Backward compatibility)
  todayKassa: any[];
  dailySales: any[];
  monthlyProfit: any[];
  debtClients: any[];
  lowStockLots: any[];
  activeTransports: any[];
  
  // TIZIM MA'LUMOTLARI
  system_info: {
    base_currency: string;
    exchange_rates: {
      RUB_USD: number;
      USD_RUB: number;
    };
  };
  
  lastUpdated: string;
}

interface BalanceData {
  _id: string;
  otpr: number;
  prixod: number;
  rasxod: number;
  klentPrixod: number;
  chistiyPrixod: number;
}

interface WoodStat {
  count: number;
  totalKub: number;
  totalTonna: number;
}

interface WoodStatusStat {
  status: string;
  count: number;
  totalKub: number;
}

interface TransportStat {
  count: number;
}

interface KassaStat {
  _id: {
    turi: string;
    valyuta: string;
  };
  totalSumma: number;
  count: number;
}

interface StatsData {
  woodStats: WoodStat;
  woodStatusStats: WoodStatusStat[];
  transportStats: TransportStat;
  kassaStats: KassaStat[];
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'real' | 'projected' | 'combined'>('real');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 sekund

  // Real-time dashboard ma'lumotlari (YANGI)
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-realtime'],
    queryFn: async () => {
      const response = await axios.get('/reports/dashboard-realtime');
      return response.data;
    },
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    staleTime: 10000 // 10 sekund
  });

  // Kassa balansini olish (ESKI)
  const { data: balanceData } = useQuery<BalanceData[]>({
    queryKey: ['balance'],
    queryFn: async () => {
      const response = await axios.get('/kassa/balance');
      return response.data;
    }
  });

  // Valyuta kurslarini olish (ESKI) - faqat kerak bo'lganda ishlatiladi
  const { data: exchangeRates } = useQuery<Array<{currency: string, rate: number}>>({
    queryKey: ['exchange-rates-dashboard'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    },
    enabled: false // Faqat kerak bo'lganda yoqiladi
  });

  // Umumiy statistika (ESKI)
  const { data: statsData } = useQuery<StatsData>({
    queryKey: ['general-stats'],
    queryFn: async () => {
      const response = await axios.get('/reports/general');
      return response.data;
    }
  });

  // Status labels
  const statusLabels: Record<string, string> = {
    xarid_qilindi: t.wood.statusPurchased,
    transport_kelish: t.wood.statusTransportIn,
    omborda: t.wood.statusInStock,
    qayta_ishlash: t.wood.statusProcessing,
    transport_ketish: t.wood.statusTransportOut,
    sotildi: t.wood.statusSold,
    bekor_qilindi: t.wood.statusCancelled
  };

  const statusIcons: Record<string, React.ReactElement> = {
    xarid_qilindi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    transport_kelish: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    omborda: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    qayta_ishlash: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    transport_ketish: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
    sotildi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    bekor_qilindi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  };

  // Ko'rsatish rejimi bo'yicha ma'lumotlarni tanlash
  const getDisplayData = () => {
    if (!dashboardData) return null;
    
    switch (viewMode) {
      case 'real':
        return {
          title: 'Haqiqiy Ma\'lumotlar',
          subtitle: 'Bugun sodir bo\'lgan real operatsiyalar',
          metrics: [
            {
              label: 'Bugungi daromad',
              value: `$${dashboardData.actual.today_revenue_base.toLocaleString()}`,
              color: 'text-green-600',
              icon: 'cash'
            },
            {
              label: 'Bugungi xarajat',
              value: `$${dashboardData.actual.today_expenses_base.toLocaleString()}`,
              color: 'text-red-600',
              icon: 'expenses'
            },
            {
              label: 'Bugungi foyda',
              value: `$${dashboardData.actual.today_profit_base.toLocaleString()}`,
              color: dashboardData.actual.today_profit_base >= 0 ? 'text-green-600' : 'text-red-600',
              icon: dashboardData.actual.today_profit_base >= 0 ? 'profit' : 'loss'
            },
            {
              label: 'Kassa balansi',
              value: `$${dashboardData.actual.cash_balance_base.toLocaleString()}`,
              color: dashboardData.actual.cash_balance_base >= 0 ? 'text-blue-600' : 'text-red-600',
              icon: 'bank'
            }
          ]
        };
      
      case 'projected':
        return {
          title: 'Prognoz Ma\'lumotlar',
          subtitle: 'Kutilayotgan natijalar va tahlillar',
          metrics: [
            {
              label: 'Kutilayotgan daromad',
              value: `$${dashboardData.projected.expected_revenue_from_remaining_base.toLocaleString()}`,
              color: 'text-blue-600',
              icon: 'target'
            },
            {
              label: 'Minimal narx',
              value: `$${dashboardData.projected.break_even_analysis.min_price_needed_base.toFixed(2)}/m³`,
              color: 'text-orange-600',
              icon: 'balance'
            },
            {
              label: 'ROI prognozi',
              value: `${dashboardData.projected.roi_forecast.toFixed(1)}%`,
              color: dashboardData.projected.roi_forecast >= 0 ? 'text-green-600' : 'text-red-600',
              icon: 'statistics'
            },
            {
              label: 'Tugash muddati',
              value: dashboardData.projected.completion_timeline,
              color: 'text-purple-600',
              icon: 'time'
            }
          ]
        };
      
      case 'combined':
        return {
          title: 'Umumiy Ko\'rsatkichlar',
          subtitle: 'Real va prognoz ma\'lumotlar birgalikda',
          metrics: [
            {
              label: 'Jami sarmoya',
              value: `$${dashboardData.combined.total_investment_base.toLocaleString()}`,
              color: 'text-gray-600',
              icon: 'business'
            },
            {
              label: 'Potensial daromad',
              value: `$${dashboardData.combined.potential_total_revenue_base.toLocaleString()}`,
              color: 'text-blue-600',
              icon: 'target'
            },
            {
              label: 'Potensial foyda',
              value: `$${dashboardData.combined.potential_total_profit_base.toLocaleString()}`,
              color: dashboardData.combined.potential_total_profit_base >= 0 ? 'text-green-600' : 'text-red-600',
              icon: dashboardData.combined.potential_total_profit_base >= 0 ? 'success' : 'warning'
            },
            {
              label: 'Faol vagonlar',
              value: dashboardData.actual.active_vagons.toString(),
              color: 'text-indigo-600',
              icon: 'transport'
            }
          ]
        };
      
      default:
        return null;
    }
  };

  const displayData = getDisplayData();

  // Ogohlantirishlarni AlertsWidget formatiga o'tkazish
  const convertAlertsToWidgetFormat = (alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    action_needed: boolean;
  }>) => {
    return alerts.map(alert => ({
      type: alert.type === 'error' ? 'debt' as const : 
            alert.type === 'warning' ? 'low_stock' as const : 
            'transport_delay' as const,
      priority: alert.action_needed ? 'high' as const : 
                alert.type === 'error' ? 'medium' as const : 'low' as const,
      title: alert.type === 'error' ? 'Xatolik' :
             alert.type === 'warning' ? 'Ogohlantirish' : 'Ma\'lumot',
      message: alert.message,
      data: { message: alert.message, action_needed: alert.action_needed }
    }));
  };

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {displayData?.title || 'Bosh Sahifa'}
            </h1>
            <p className="text-blue-100 mt-2">
              {displayData?.subtitle || t.dashboard.statistics} • {t.dashboard.lastUpdate}: {dashboardData?.lastUpdated ? 
                new Date(dashboardData.lastUpdated).toLocaleTimeString('uz-UZ') : 
                t.dashboard.unknown
              }
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-2xl font-bold text-white">
                {new Date().toLocaleDateString('uz-UZ')}
              </div>
              <div className="text-blue-100 text-sm">{t.dashboard.today}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Boshqaruv paneli */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Ko'rsatish rejimi */}
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setViewMode('real')}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              viewMode === 'real' 
                ? 'bg-green-100 text-green-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon name="statistics" className="mr-1" size="sm" />
            Real
          </button>
          <button
            onClick={() => setViewMode('projected')}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              viewMode === 'projected' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon name="forecast" className="mr-1" size="sm" />
            Prognoz
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${
              viewMode === 'combined' 
                ? 'bg-purple-100 text-purple-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon name="combined" className="mr-1" size="sm" />
            Umumiy
          </button>
        </div>
        
        {/* Yangilanish sozlamalari */}
        <div className="flex items-center space-x-4">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={10000}>10 sekund</option>
            <option value={30000}>30 sekund</option>
            <option value={60000}>1 daqiqa</option>
            <option value={300000}>5 daqiqa</option>
          </select>
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            Live
          </div>
        </div>
      </div>

      {/* Ogohlantirishlar */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <div className="mb-8">
          <AlertsWidget alerts={convertAlertsToWidgetFormat(dashboardData.alerts)} />
        </div>
      )}

      {/* Asosiy metrikalar (YANGI) */}
      {displayData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {displayData.metrics.map((metric, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
                <Icon name={metric.icon} size="lg" className="text-gray-400" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tizim ma'lumotlari */}
      {dashboardData?.system_info && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">💱 Tizim Ma'lumotlari</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Asosiy valyuta</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {dashboardData.system_info.base_currency}
                  </p>
                </div>
                <Icon name="cash" size="lg" className="text-white" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">RUB → USD</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardData.system_info.exchange_rates.RUB_USD.toFixed(4)}
                  </p>
                </div>
                <Icon name="profit" size="lg" className="text-white" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">USD → RUB</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dashboardData.system_info.exchange_rates.USD_RUB.toFixed(2)}
                  </p>
                </div>
                <Icon name="loss" size="lg" className="text-white" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Break-even tahlil (faqat prognoz rejimida) */}
      {viewMode === 'projected' && dashboardData?.projected.break_even_analysis && (
        <div className="mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <Icon name="balance" className="mr-2" />
              Break-even Tahlil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Jami sarmoya</p>
                <p className="text-xl font-bold text-gray-900">
                  ${dashboardData.projected.break_even_analysis.total_investment_base.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Minimal narx</p>
                <p className="text-xl font-bold text-orange-600">
                  ${dashboardData.projected.break_even_analysis.min_price_needed_base.toFixed(2)}/m³
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Joriy o'rtacha narx</p>
                <p className={`text-xl font-bold ${
                  dashboardData.projected.break_even_analysis.current_avg_price_base >= dashboardData.projected.break_even_analysis.min_price_needed_base
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${dashboardData.projected.break_even_analysis.current_avg_price_base.toFixed(2)}/m³
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Grafiklar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Icon name="statistics" className="mr-2" />
            Kunlik Sotuv Dinamikasi
          </h3>
          <SalesDynamicsChart data={dashboardData?.dailySales || []} />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <Icon name="profit" className="mr-2" />
            Oylik Foyda Trendi
          </h3>
          <ProfitTrendChart data={dashboardData?.monthlyProfit || []} />
        </Card>
      </div>

      {/* Qo'shimcha ma'lumotlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Kassa oqimi */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💳 Bugungi Kassa Harakati
          </h3>
          <CashFlowWidget data={dashboardData?.todayKassa || []} />
        </Card>

        {/* Qarzli mijozlar */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t.dashboard.debtorClients}
          </h3>
          <div className="space-y-3">
            {dashboardData?.debtClients?.slice(0, 5).map((client: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{client.name}</p>
                </div>
                <div className="text-right">
                  {client.usd_current_debt > 0 && (
                    <p className="font-bold text-red-600">
                      ${client.usd_current_debt.toLocaleString()}
                    </p>
                  )}
                  {client.rub_current_debt > 0 && (
                    <p className="font-bold text-red-600">
                      {client.rub_current_debt.toLocaleString()} ₽
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ESKI QISMLAR - Backward compatibility */}
      
      {/* Kassa balansi (ESKI) */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          <Icon name="cash" className="mr-2" />
          {t.dashboard.balance}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {balanceData?.map((balance) => (
            <div key={balance._id} className="stats-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {balance._id}
                </h3>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Icon name="cash" size="lg" className="text-white" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-medium">{t.dashboard.income}:</span>
                  <span className="font-bold text-lg text-green-700">
                    {(balance.otpr + balance.prixod + balance.klentPrixod).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-medium">{t.dashboard.expense}:</span>
                  <span className="font-bold text-lg text-red-700">{balance.rasxod.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">{t.dashboard.netIncome}:</span>
                    <span className={`font-bold text-xl ${balance.chistiyPrixod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.chistiyPrixod.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin statistikasi (ESKI) */}
      {statsData && (
        <>
          {/* Lot Status Breakdown */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">📦 Lotlar Holati</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsData.woodStatusStats?.map((stat) => (
                <div key={stat.status} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-blue-600">{statusIcons[stat.status] || <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}</div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{stat.count}</div>
                      <div className="text-xs text-gray-500">lot</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {statusLabels[stat.status] || stat.status}
                  </div>
                  <div className="text-xs text-gray-600">
                    {stat.totalKub.toFixed(2)} m³
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tizim statistikasi */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              <Icon name="statistics" className="mr-2" />
              {t.dashboard.systemStats}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yog'och statistikasi */}
              <div className="card">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg mr-4">
                    🌳
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t.dashboard.woodLots}
                  </h3>
                </div>
                <div className="space-y-4">
                  {statsData.woodStats && (
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                      <span className="font-medium text-green-800">{t.dashboard.totalLots}</span>
                      <div className="text-right">
                        <div className="font-bold text-green-700">{statsData.woodStats.count} {t.dashboard.lot}</div>
                        <div className="text-sm text-green-600">{statsData.woodStats.totalKub.toFixed(2)} m³</div>
                        <div className="text-sm text-green-600">{statsData.woodStats.totalTonna.toFixed(2)} t</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transport statistikasi */}
              <div className="card">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg mr-4">
                    🚂
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t.dashboard.trainTransport}
                  </h3>
                </div>
                <div className="space-y-4">
                  {statsData.transportStats && (
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                      <span className="font-medium text-purple-800">{t.dashboard.totalTrains}</span>
                      <span className="font-bold text-purple-700">{statsData.transportStats.count} {t.dashboard.pieces}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}