'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import SalesDynamicsChart from './SalesDynamicsChart';
import ProfitTrendChart from './ProfitTrendChart';
import CashFlowWidget from './CashFlowWidget';
import AlertsWidget from './AlertsWidget';
import ActiveTransportsMap from './ActiveTransportsMap';

interface DashboardData {
  // REAL MA'LUMOTLAR (Haqiqiy)
  actual: {
    today_revenue: number;
    today_expenses: number;
    today_profit: number;
    cash_balance: number;
    active_vagons: number;
    total_realized_profit: number;
  };
  
  // PROGNOZ MA'LUMOTLAR (Kutilayotgan)
  projected: {
    expected_revenue_from_remaining: number;
    break_even_analysis: {
      total_investment: number;
      min_price_needed: number;
      current_avg_price: number;
    };
    roi_forecast: number;
    completion_timeline: string;
  };
  
  // ARALASH MA'LUMOTLAR (Real + Prognoz)
  combined: {
    total_investment: number;
    potential_total_revenue: number;
    potential_total_profit: number;
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
  lastUpdated: string;
}

export default function RealTimeDashboard() {
  const { t } = useLanguage();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 sekund
  const [viewMode, setViewMode] = useState<'real' | 'projected' | 'combined'>('real');

  // Real-time dashboard ma'lumotlari
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard-realtime'],
    queryFn: async () => {
      const response = await axios.get('/reports/dashboard-realtime');
      return response.data;
    },
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    staleTime: 10000 // 10 sekund
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg h-96"></div>
            <div className="bg-white rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ma'lumotlarni yuklashda xatolik
          </h3>
          <p className="text-gray-600">
            Iltimos, sahifani yangilang yoki keyinroq qayta urinib ko'ring
          </p>
        </Card>
      </div>
    );
  }

  // Ko'rsatish rejimi bo'yicha ma'lumotlarni tanlash
  const getDisplayData = () => {
    if (!dashboardData) return null;
    
    switch (viewMode) {
      case 'real':
        return {
          title: '📊 Haqiqiy Ma\'lumotlar',
          subtitle: 'Bugun sodir bo\'lgan real operatsiyalar',
          metrics: [
            {
              label: 'Bugungi daromad',
              value: `$${dashboardData.actual.today_revenue.toLocaleString()}`,
              color: 'text-green-600',
              icon: '💰'
            },
            {
              label: 'Bugungi xarajat',
              value: `$${dashboardData.actual.today_expenses.toLocaleString()}`,
              color: 'text-red-600',
              icon: '💸'
            },
            {
              label: 'Bugungi foyda',
              value: `$${dashboardData.actual.today_profit.toLocaleString()}`,
              color: dashboardData.actual.today_profit >= 0 ? 'text-green-600' : 'text-red-600',
              icon: dashboardData.actual.today_profit >= 0 ? '📈' : '📉'
            },
            {
              label: 'Kassa balansi',
              value: `$${dashboardData.actual.cash_balance.toLocaleString()}`,
              color: dashboardData.actual.cash_balance >= 0 ? 'text-blue-600' : 'text-red-600',
              icon: '🏦'
            }
          ]
        };
      
      case 'projected':
        return {
          title: '🔮 Prognoz Ma\'lumotlar',
          subtitle: 'Kutilayotgan natijalar va tahlillar',
          metrics: [
            {
              label: 'Kutilayotgan daromad',
              value: `$${dashboardData.projected.expected_revenue_from_remaining.toLocaleString()}`,
              color: 'text-blue-600',
              icon: '🎯'
            },
            {
              label: 'Minimal narx',
              value: `$${dashboardData.projected.break_even_analysis.min_price_needed.toFixed(2)}/m³`,
              color: 'text-orange-600',
              icon: '⚖️'
            },
            {
              label: 'ROI prognozi',
              value: `${dashboardData.projected.roi_forecast.toFixed(1)}%`,
              color: dashboardData.projected.roi_forecast >= 0 ? 'text-green-600' : 'text-red-600',
              icon: '📊'
            },
            {
              label: 'Tugash muddati',
              value: dashboardData.projected.completion_timeline,
              color: 'text-purple-600',
              icon: '⏰'
            }
          ]
        };
      
      case 'combined':
        return {
          title: '🔄 Umumiy Ko\'rsatkichlar',
          subtitle: 'Real va prognoz ma\'lumotlar birgalikda',
          metrics: [
            {
              label: 'Jami sarmoya',
              value: `$${dashboardData.combined.total_investment.toLocaleString()}`,
              color: 'text-gray-600',
              icon: '💼'
            },
            {
              label: 'Potensial daromad',
              value: `$${dashboardData.combined.potential_total_revenue.toLocaleString()}`,
              color: 'text-blue-600',
              icon: '🎯'
            },
            {
              label: 'Potensial foyda',
              value: `$${dashboardData.combined.potential_total_profit.toLocaleString()}`,
              color: dashboardData.combined.potential_total_profit >= 0 ? 'text-green-600' : 'text-red-600',
              icon: dashboardData.combined.potential_total_profit >= 0 ? '🚀' : '⚠️'
            },
            {
              label: 'Faol vagonlar',
              value: dashboardData.actual.active_vagons.toString(),
              color: 'text-indigo-600',
              icon: '🚛'
            }
          ]
        };
      
      default:
        return null;
    }
  };

  const displayData = getDisplayData();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {displayData?.title || '📈 Real-time Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {displayData?.subtitle} • {t.vagon.lastUpdate}: {dashboardData?.lastUpdated ? 
              new Date(dashboardData.lastUpdated).toLocaleTimeString('uz-UZ') : 
              t.vagon.unknown
            }
          </p>
        </div>
        
        {/* Boshqaruv paneli */}
        <div className="flex items-center space-x-4">
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
              📊 Real
            </button>
            <button
              onClick={() => setViewMode('projected')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                viewMode === 'projected' 
                  ? 'bg-blue-100 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔮 Prognoz
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                viewMode === 'combined' 
                  ? 'bg-purple-100 text-purple-700 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔄 Umumiy
            </button>
          </div>
          
          {/* Yangilanish sozlamalari */}
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
          <AlertsWidget alerts={dashboardData.alerts} />
        </div>
      )}

      {/* Asosiy metrikalar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {displayData?.metrics.map((metric, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <p className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                </p>
              </div>
              <div className="text-2xl">{metric.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Break-even tahlil (faqat prognoz rejimida) */}
      {viewMode === 'projected' && dashboardData?.projected.break_even_analysis && (
        <div className="mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚖️ Break-even Tahlil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Jami sarmoya</p>
                <p className="text-xl font-bold text-gray-900">
                  ${dashboardData.projected.break_even_analysis.total_investment.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Minimal narx</p>
                <p className="text-xl font-bold text-orange-600">
                  ${dashboardData.projected.break_even_analysis.min_price_needed.toFixed(2)}/m³
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Joriy o'rtacha narx</p>
                <p className={`text-xl font-bold ${
                  dashboardData.projected.break_even_analysis.current_avg_price >= dashboardData.projected.break_even_analysis.min_price_needed
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${dashboardData.projected.break_even_analysis.current_avg_price.toFixed(2)}/m³
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
            📈 Kunlik Sotuv Dinamikasi
          </h3>
          <SalesDynamicsChart data={dashboardData?.dailySales || []} />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💰 Oylik Foyda Trendi
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
            🚨 {t.vagon.debtorClients}
          </h3>
          <div className="space-y-3">
            {dashboardData?.debtClients?.slice(0, 5).map((client: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-600">{client.phone}</p>
                </div>
                <p className="font-bold text-red-600">
                  ${client.total_debt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Faol vagonlar xaritasi */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🗺️ Faol Vagonlar Holati
        </h3>
        <ActiveTransportsMap data={dashboardData?.activeTransports || []} />
      </Card>
    </div>
  );
}