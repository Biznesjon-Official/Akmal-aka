'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import axios from '@/lib/axios';

interface ProfitLossData {
  profitLoss: Array<{
    _id: string;
    kirim: number;
    chiqim: number;
    otpr: number;
    sof_foyda: number;
    rentabellik: number;
  }>;
  expenseByCategory: Array<{
    _id: {
      xarajatTuri: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
    avgSumma: number;
  }>;
  incomeBySource: Array<{
    _id: {
      turi: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
  }>;
  profitTrend: Array<{
    _id: {
      year: number;
      month: number;
      day?: number;
      valyuta: string;
    };
    kirim: number;
    chiqim: number;
    foyda: number;
  }>;
}

interface VagonReportsData {
  incomingVagons: Array<{
    _id: {
      status: string;
      month: number;
      year: number;
    };
    count: number;
    totalVolume: number;
    totalWeight: number;
    avgCostPrice: number;
  }>;
  soldVolume: Array<{
    _id: {
      valyuta: string;
      month: number;
      year: number;
    };
    totalSold: number;
    totalValue: number;
    avgPrice: number;
    count: number;
  }>;
  remainingStock: Array<{
    _id: string;
    count: number;
    totalVolume: number;
    totalWeight: number;
    avgCostPrice: number;
  }>;
  summary: {
    totalVagons: number;
    totalVolume: number;
    soldVolume: number;
    remainingVolume: number;
  };
}

interface ClientReportsData {
  debtList: Array<{
    _id: string;
    name: string;
    phone: string;
    total_debt: number;
    total_paid: number;
    salesCount: number;
    debtRatio: number;
  }>;
  paymentDisciplineAnalysis: Array<{
    _id: string;
    clientName: string;
    totalSales: number;
    totalPaid: number;
    paymentRate: number;
    remainingDebt: number;
  }>;
  topClients: Array<{
    _id: string;
    name: string;
    totalRevenue: number;
    totalVolume: number;
    salesCount: number;
    avgOrderValue: number;
  }>;
  summary: {
    totalClients: number;
    clientsWithDebt: number;
    totalDebt: number;
    avgPaymentRate: number;
  };
}

interface ExpenseReportsData {
  expenseByCategory: Array<{
    _id: {
      xarajatTuri: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
    avgSumma: number;
  }>;
  monthlyDynamics: Array<{
    _id: {
      year: number;
      month: number;
      xarajatTuri: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
  }>;
  summary: {
    totalExpenses: number;
    totalAmount: number;
    avgExpense: number;
    categoriesCount: number;
  };
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  // State
  const [activeTab, setActiveTab] = useState<'profit-loss' | 'vagon' | 'client' | 'expense' | 'cost'>('profit-loss');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    valyuta: '',
    period: 'month'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Data fetching
  const { data: profitLossData, isLoading: profitLoading } = useQuery<ProfitLossData>({
    queryKey: ['profit-loss-advanced', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      params.append('period', filters.period);
      
      const response = await axios.get(`/reports/profit-loss-advanced?${params}`);
      return response.data;
    },
    enabled: activeTab === 'profit-loss'
  });

  const { data: vagonData, isLoading: vagonLoading } = useQuery<VagonReportsData>({
    queryKey: ['vagon-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      
      const response = await axios.get(`/reports/vagon-reports?${params}`);
      return response.data;
    },
    enabled: activeTab === 'vagon'
  });

  const { data: clientData, isLoading: clientLoading } = useQuery<ClientReportsData>({
    queryKey: ['client-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await axios.get(`/reports/client-reports?${params}`);
      return response.data;
    },
    enabled: activeTab === 'client'
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery<ExpenseReportsData>({
    queryKey: ['expense-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      
      const response = await axios.get(`/reports/expense-reports?${params}`);
      return response.data;
    },
    enabled: activeTab === 'expense'
  });

  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ['cost-profitability', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      
      const response = await axios.get(`/reports/cost-profitability?${params}`);
      return response.data;
    },
    enabled: activeTab === 'cost'
  });

  const getExpenseTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'transport_kelish': 'Transport (Kelish)',
      'transport_ketish': 'Transport (Ketish)',
      'bojxona_kelish': 'Bojxona (Import)',
      'bojxona_ketish': 'Bojxona (Export)',
      'yuklash_tushirish': 'Yuklash/Tushirish',
      'saqlanish': 'Ombor/Saqlanish',
      'ishchilar': 'Ishchilar',
      'qayta_ishlash': 'Qayta ishlash',
      'boshqa': 'Boshqa'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'omborda': 'Omborda',
      'qayta_ishlash': 'Qayta ishlash',
      'tayyor': 'Tayyor',
      'transport_kelish': 'Transport (Kelish)',
      'transport_ketish': 'Transport (Ketish)',
      'sotilgan': 'Sotilgan'
    };
    return labels[status] || status;
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'profit-loss', name: t.vagonSale.profitLoss, icon: 'profit' },
    { id: 'vagon', name: t.vagonSale.vagonReports, icon: 'vagons' },
    { id: 'client', name: t.vagonSale.clientReports, icon: 'clients' },
    { id: 'expense', name: t.vagonSale.expenseReports, icon: 'expenses' },
    { id: 'cost', name: t.vagonSale.costProfitability, icon: 'statistics' }
  ];

  return (
    <Layout>
      <div className="container-full-desktop">
        {/* Header - Professional Design */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <span className="text-4xl">📊</span>
                  </div>
                  <h1 className="text-4xl font-bold text-white">
                    {t.reports.professionalReports}
                  </h1>
                </div>
                <p className="text-blue-100 text-lg ml-16">{t.reports.advancedAnalytics}</p>
              </div>
              <div className="hidden lg:flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
                  <div className="text-white/80 text-sm">{t.common.period}</div>
                  <div className="text-white text-xl font-bold">
                    {filters.startDate && filters.endDate 
                      ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
                      : t.reports.allTime}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Modern Design */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon name={tab.icon} size="sm" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters - Enhanced Design */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                <span className="text-2xl">🔍</span>
                {t.reports.reportFilters}
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {t.kassa.reportStartDate}
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {t.kassa.reportEndDate}
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {t.common.currency}
                  </label>
                  <select
                    value={filters.valyuta}
                    onChange={(e) => setFilters({...filters, valyuta: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">{t.reports.allCurrencies}</option>
                    <option value="USD">💵 USD</option>
                    <option value="RUB">💶 RUB</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    {t.kassa.reportPeriod}
                  </label>
                  <select
                    value={filters.period}
                    onChange={(e) => setFilters({...filters, period: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="day">{t.reports.daily}</option>
                    <option value="month">{t.reports.monthly}</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setFilters({
                    startDate: '',
                    endDate: '',
                    valyuta: '',
                    period: 'month'
                  })}
                  className="px-6 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  {t.reports.clear}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-6">
            {profitLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            ) : profitLossData ? (
              <>
                {/* Foyda/Zarar kartochkalari - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {profitLossData.profitLoss.map((profit, index) => (
                    <div 
                      key={profit._id} 
                      className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
                    >
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                          backgroundSize: '24px 24px'
                        }}></div>
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
                            <h4 className="text-xl font-bold text-white">{profit._id}</h4>
                          </div>
                          <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                            {profit.sof_foyda >= 0 ? '📈' : '📉'}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                            <span className="text-blue-100 text-sm">{t.reports.income}</span>
                            <span className="font-bold text-white">
                              {formatCurrency(profit.kirim + profit.otpr, profit._id)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                            <span className="text-blue-100 text-sm">{t.reports.expense}</span>
                            <span className="font-bold text-white">
                              {formatCurrency(profit.chiqim, profit._id)}
                            </span>
                          </div>
                          <div className="h-px bg-white/30 my-2"></div>
                          <div className="flex justify-between items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-3 border border-white/30">
                            <span className="font-bold text-white">{t.reports.profit}</span>
                            <span className={`font-bold text-xl ${
                              profit.sof_foyda >= 0 ? 'text-green-300' : 'text-red-300'
                            }`}>
                              {formatCurrency(profit.sof_foyda, profit._id)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                            <span className="text-blue-100 text-sm">{t.reports.profitability}</span>
                            <span className="font-bold text-white text-lg">
                              {profit.rentabellik.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Foyda trendi - Enhanced */}
                {profitLossData.profitTrend && profitLossData.profitTrend.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                        <span className="text-2xl">📈</span>
                        {t.reports.profitTrend}
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={profitLossData.profitTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="_id.month"
                              tickFormatter={(value, index) => {
                                const item = profitLossData.profitTrend[index];
                                return item ? `${item._id.month}/${item._id.year}` : value;
                              }}
                              stroke="#6b7280"
                            />
                            <YAxis stroke="#6b7280" />
                            <Tooltip 
                              formatter={(value, name) => [
                                formatCurrency(value as number, 'USD'), 
                                name === 'foyda' ? t.reports.profit : name === 'kirim' ? t.reports.income : t.reports.expense
                              ]}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Line type="monotone" dataKey="kirim" stroke="#10b981" strokeWidth={3} name="kirim" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="chiqim" stroke="#ef4444" strokeWidth={3} name="chiqim" dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="foyda" stroke="#3b82f6" strokeWidth={4} name="foyda" dot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Xarajat kategoriyalari - Enhanced */}
                {profitLossData.expenseByCategory && profitLossData.expenseByCategory.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                          <span className="text-2xl">💸</span>
                          {t.reports.expenseCategories}
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={profitLossData.expenseByCategory.map((item, index) => ({
                                  name: getExpenseTypeLabel(item._id.xarajatTuri),
                                  value: item.totalSumma,
                                  fill: COLORS[index % COLORS.length]
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {profitLossData.expenseByCategory.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value) => formatCurrency(value as number, 'USD')}
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                          <span className="text-2xl">💰</span>
                          {t.reports.incomeSources}
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          {profitLossData.incomeBySource.map((source, index) => (
                            <div 
                              key={index} 
                              className="group flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-emerald-50 transition-all duration-200 border border-gray-200 hover:border-green-300 hover:shadow-md"
                            >
                              <div>
                                <span className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                                  {source._id.turi === 'prixod' ? t.reports.mainIncome : t.reports.clientPayments}
                                </span>
                                <div className="text-sm text-gray-600 mt-1">
                                  {source.count} {t.reports.transactions}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-600 text-lg">
                                  {formatCurrency(source.totalSumma, source._id.valyuta)}
                                </div>
                                <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded mt-1">
                                  {source._id.valyuta}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-6xl">📊</span>
                </div>
                <p className="text-gray-500 text-lg font-medium">{t.reports.noDataFound}</p>
                <p className="text-gray-400 text-sm mt-2">Filtrlarni o'zgartiring yoki boshqa davr tanlang</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'vagon' && (
          <div className="space-y-6">
            {vagonLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            ) : vagonData ? (
              <>
                {/* Vagon statistika kartochkalari - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-green-100 text-sm font-medium mb-1">{t.reports.totalVagons}</p>
                          <p className="text-4xl font-bold text-white">{vagonData.summary.totalVagons}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">🚛</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-blue-100 text-sm font-medium mb-1">{t.vagon.totalVolume}</p>
                          <p className="text-4xl font-bold text-white">{formatNumber(vagonData.summary.totalVolume)}</p>
                          <p className="text-blue-200 text-xs mt-1">m³</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📦</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-orange-100 text-sm font-medium mb-1">{t.reports.soldVolume}</p>
                          <p className="text-4xl font-bold text-white">{formatNumber(vagonData.summary.soldVolume)}</p>
                          <p className="text-orange-200 text-xs mt-1">m³</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">💰</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-purple-100 text-sm font-medium mb-1">{t.vagon.remainingVolume}</p>
                          <p className="text-4xl font-bold text-white">{formatNumber(vagonData.summary.remainingVolume)}</p>
                          <p className="text-purple-200 text-xs mt-1">m³</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📊</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* {t.vagonSale.remainingVolumeByStatus} - Enhanced */}
                {vagonData.remainingStock && vagonData.remainingStock.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                        <span className="text-2xl">📦</span>
                        {t.vagonSale.remainingVolumeByStatus}
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vagonData.remainingStock.map((stock, index) => (
                          <div 
                            key={index} 
                            className="group border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                                {getStatusLabel(stock._id)}
                              </h4>
                              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-2 group-hover:scale-110 transition-transform">
                                <span className="text-2xl">
                                  {stock._id === 'omborda' ? '🏢' : 
                                   stock._id === 'qayta_ishlash' ? '⚙️' : 
                                   stock._id === 'tayyor' ? '✅' : '📦'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">Soni:</span>
                                <span className="font-semibold text-gray-800">{stock.count} ta</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">Hajm:</span>
                                <span className="font-semibold text-blue-600">{formatNumber(stock.totalVolume)} m³</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">Og'irlik:</span>
                                <span className="font-semibold text-gray-800">{formatNumber(stock.totalWeight)} t</span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600 text-sm">{t.vagonSale.avgCostPrice}:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(stock.avgCostPrice, 'USD')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sotilgan hajm dinamikasi */}
                {vagonData.soldVolume && vagonData.soldVolume.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📈 {t.reports.soldVolumeDynamics}</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={vagonData.soldVolume}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="_id.month"
                            tickFormatter={(value, index) => {
                              const item = vagonData.soldVolume[index];
                              return item ? `${item._id.month}/${item._id.year}` : value;
                            }}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'totalSold' ? `${formatNumber(value as number)} m³` : formatCurrency(value as number, 'USD'),
                              name === 'totalSold' ? t.reports.soldVolume : t.reports.revenue
                            ]}
                          />
                          <Bar dataKey="totalSold" fill="#3b82f6" name="totalSold" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-green-100 to-emerald-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-6xl">🚛</span>
                </div>
                <p className="text-gray-500 text-lg font-medium">{t.reports.vagonDataNotFound}</p>
                <p className="text-gray-400 text-sm mt-2">Vagon ma'lumotlari topilmadi</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'client' && (
          <div className="space-y-6">
            {clientLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            ) : clientData ? (
              <>
                {/* Mijoz statistika kartochkalari - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-blue-100 text-sm font-medium mb-1">{t.reports.totalClients}</p>
                          <p className="text-4xl font-bold text-white">{clientData.summary.totalClients}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">👥</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-red-100 text-sm font-medium mb-1">{t.reports.clientsWithDebt}</p>
                          <p className="text-4xl font-bold text-white">{clientData.summary.clientsWithDebt}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">⚠️</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-orange-100 text-sm font-medium mb-1">{t.reports.totalDebt}</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(clientData.summary.totalDebt, 'USD')}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">💸</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-green-100 text-sm font-medium mb-1">{t.reports.avgPayment}</p>
                          <p className="text-3xl font-bold text-white">{(clientData.summary.avgPaymentRate * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📊</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Qarzlar ro'yxati - Enhanced */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                      <span className="text-2xl">💸</span>
                      {t.reports.debtList}
                    </h3>
                  </div>
                  <div className="p-6">
                    {clientData.debtList && clientData.debtList.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.client}</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.phone}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.debt}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.paid}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.sales}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.debtRatio}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {clientData.debtList.slice(0, 10).map((client) => (
                              <tr key={client._id} className="hover:bg-blue-50 transition-colors duration-150">
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{client.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.phone}</td>
                                <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                                  {formatCurrency(client.total_debt, 'USD')}
                                </td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                                  {formatCurrency(client.total_paid, 'USD')}
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-gray-700">{client.salesCount}</td>
                                <td className="px-6 py-4 text-sm text-right">
                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    client.debtRatio > 0.5 ? 'bg-red-100 text-red-800 border border-red-200' : 
                                    client.debtRatio > 0.2 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                                    'bg-green-100 text-green-800 border border-green-200'
                                  }`}>
                                    {(client.debtRatio * 100).toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-green-100 to-emerald-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                          <span className="text-5xl">✅</span>
                        </div>
                        <p className="text-gray-600 font-medium">{t.reports.noDebtClients}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top mijozlar - Enhanced */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                      <span className="text-2xl">🏆</span>
                      {t.reports.topClients}
                    </h3>
                  </div>
                  <div className="p-6">
                    {clientData.topClients && clientData.topClients.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientData.topClients.slice(0, 9).map((client, index) => (
                          <div 
                            key={client._id} 
                            className="group border-2 border-gray-200 rounded-xl p-5 hover:border-yellow-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-yellow-50/30 relative overflow-hidden"
                          >
                            {/* Rank Badge */}
                            <div className="absolute top-3 right-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-10 h-10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <span className="text-xl">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                              </span>
                            </div>
                            
                            <div className="mb-4">
                              <h4 className="font-bold text-lg text-gray-800 group-hover:text-yellow-700 transition-colors pr-12">
                                {client.name}
                              </h4>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">{t.reports.revenue}:</span>
                                <span className="font-bold text-green-600">
                                  {formatCurrency(client.totalRevenue, 'USD')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">{t.reports.volume}:</span>
                                <span className="font-semibold text-blue-600">{formatNumber(client.totalVolume)} m³</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600 text-sm">{t.reports.sales}:</span>
                                <span className="font-semibold text-gray-800">{client.salesCount} ta</span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600 text-sm">{t.reports.avgOrder}:</span>
                                <span className="font-semibold text-purple-600">
                                  {formatCurrency(client.avgOrderValue, 'USD')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                          <span className="text-5xl">👥</span>
                        </div>
                        <p className="text-gray-600 font-medium">{t.reports.noClientData}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* To'lov intizomi */}
                {clientData.paymentDisciplineAnalysis && clientData.paymentDisciplineAnalysis.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📊 {t.reports.paymentDiscipline}</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clientData.paymentDisciplineAnalysis.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="clientName"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              name === 'paymentRate' ? `${((value as number) * 100).toFixed(1)}%` : formatCurrency(value as number, 'USD'),
                              name === 'paymentRate' ? t.reports.paymentRate : t.reports.debt
                            ]}
                          />
                          <Bar dataKey="paymentRate" fill="#10b981" name="paymentRate" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-6xl">👥</span>
                </div>
                <p className="text-gray-500 text-lg font-medium">{t.reports.clientDataNotFound}</p>
                <p className="text-gray-400 text-sm mt-2">Mijoz ma'lumotlari topilmadi</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expense' && (
          <div className="space-y-6">
            {expenseLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            ) : expenseData ? (
              <>
                {/* Xarajat statistika kartochkalari - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="group bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-red-100 text-sm font-medium mb-1">{t.vagonSale.totalExpenses}</p>
                          <p className="text-4xl font-bold text-white">{expenseData.summary.totalExpenses}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">💸</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-orange-100 text-sm font-medium mb-1">{t.reports.totalAmount}</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(expenseData.summary.totalAmount, 'USD')}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">💰</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-blue-100 text-sm font-medium mb-1">{t.reports.avgExpense}</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(expenseData.summary.avgExpense, 'USD')}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📊</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-purple-100 text-sm font-medium mb-1">{t.reports.categories}</p>
                          <p className="text-4xl font-bold text-white">{expenseData.summary.categoriesCount}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📋</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* {t.vagonSale.expensesByCategory} */}
                {expenseData.expenseByCategory && expenseData.expenseByCategory.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">📊 {t.vagonSale.expensesByCategory}</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseData.expenseByCategory.map((item, index) => ({
                                name: getExpenseTypeLabel(item._id.xarajatTuri),
                                value: item.totalSumma,
                                fill: COLORS[index % COLORS.length]
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {expenseData.expenseByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number, 'USD')} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">📋 {t.reports.expenseDetails}</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {expenseData.expenseByCategory.map((category, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <span className="font-medium">
                                {getExpenseTypeLabel(category._id.xarajatTuri)}
                              </span>
                              <div className="text-sm text-gray-600">
                                {category.count} ta • {t.reports.average}: {formatCurrency(category.avgSumma, category._id.valyuta)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-red-600">
                                {formatCurrency(category.totalSumma, category._id.valyuta)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {category._id.valyuta}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Oylik dinamika */}
                {expenseData.monthlyDynamics && expenseData.monthlyDynamics.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📈 {t.reports.monthlyExpenseDynamics}</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={expenseData.monthlyDynamics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="_id.month"
                            tickFormatter={(value, index) => {
                              const item = expenseData.monthlyDynamics[index];
                              return item ? `${item._id.month}/${item._id.year}` : value;
                            }}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              formatCurrency(value as number, 'USD'), 
                              t.reports.expense
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalSumma" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-red-100 to-orange-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-6xl">💸</span>
                </div>
                <p className="text-gray-500 text-lg font-medium">{t.reports.expenseDataNotFound}</p>
                <p className="text-gray-400 text-sm mt-2">Xarajat ma'lumotlari topilmadi</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="space-y-6">
            {costLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            ) : costData ? (
              <>
                {/* {t.vagonSale.costStatistics} kartochkalari - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-green-100 text-sm font-medium mb-1">{t.reports.totalLots}</p>
                          <p className="text-4xl font-bold text-white">{costData.summary.totalLots}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📦</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-blue-100 text-sm font-medium mb-1">{t.reports.profitableLots}</p>
                          <p className="text-4xl font-bold text-white">{costData.summary.profitableLots}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📈</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-orange-100 text-sm font-medium mb-1">{t.reports.avgProfitability}</p>
                          <p className="text-3xl font-bold text-white">{costData.summary.avgProfitMargin.toFixed(1)}%</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">📊</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 transform -skew-y-6 group-hover:skew-y-6 transition-transform duration-500"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-purple-100 text-sm font-medium mb-1">{t.reports.totalProfit}</p>
                          <p className="text-2xl font-bold text-white">{formatCurrency(costData.summary.totalGrossProfit, 'USD')}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:rotate-12 transition-transform duration-300">
                          <span className="text-4xl">💰</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top foydali lotlar - Enhanced */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                      <span className="text-2xl">🏆</span>
                      {t.reports.topProfitableLots}
                    </h3>
                  </div>
                  <div className="p-6">
                    {costData.lotProfitability && costData.lotProfitability.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t.vagonSale.lotCode}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.vagonSale.costPrice}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.vagonSale.expenses}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.vagonSale.revenue}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.vagonSale.profit}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t.reports.profitability}</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">ROI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {costData.lotProfitability.slice(0, 10).map((lot: any) => (
                              <tr key={lot._id} className="hover:bg-green-50 transition-colors duration-150">
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{lot.lotCode}</td>
                                <td className="px-6 py-4 text-sm text-right text-gray-700">{formatCurrency(lot.tannarx, 'USD')}</td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">
                                  {formatCurrency(lot.totalExpenses, 'USD')}
                                </td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                                  {formatCurrency(lot.totalRevenue, 'USD')}
                                </td>
                                <td className="px-6 py-4 text-sm text-right font-bold text-lg">
                                  <span className={lot.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(lot.grossProfit, 'USD')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-right">
                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    lot.profitMargin > 20 ? 'bg-green-100 text-green-800 border border-green-200' : 
                                    lot.profitMargin > 10 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                                    lot.profitMargin > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    'bg-red-100 text-red-800 border border-red-200'
                                  }`}>
                                    {lot.profitMargin.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-right">
                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    lot.roi > 50 ? 'bg-green-100 text-green-800 border border-green-200' : 
                                    lot.roi > 20 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                                    lot.roi > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    'bg-red-100 text-red-800 border border-red-200'
                                  }`}>
                                    {lot.roi.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                          <span className="text-5xl">📦</span>
                        </div>
                        <p className="text-gray-600 font-medium">{t.reports.noLotData}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* O'lchov bo'yicha rentabellik - Enhanced */}
                {costData.dimensionProfitability && costData.dimensionProfitability.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                        <span className="text-2xl">📏</span>
                        {t.reports.dimensionProfitability}
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {costData.dimensionProfitability.slice(0, 9).map((dimension: any, index: number) => (
                          <div 
                            key={index} 
                            className="group border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-bl-full opacity-50"></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
                                  {dimension._id.qalinlik}×{dimension._id.eni}×{dimension._id.uzunlik}mm
                                </h4>
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                  dimension.profitMargin > 20 ? 'bg-green-100 text-green-800 border border-green-200' : 
                                  dimension.profitMargin > 10 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                                  'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                  {dimension.profitMargin.toFixed(1)}%
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">Soni:</span>
                                  <span className="font-semibold text-gray-800">{dimension.count} ta</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">Hajm:</span>
                                  <span className="font-semibold text-blue-600">{formatNumber(dimension.totalVolume)} m³</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">{t.vagonSale.avgCostPrice}:</span>
                                  <span className="font-semibold text-gray-700">{formatCurrency(dimension.avgCostPrice, 'USD')}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">O'rt. sotuv:</span>
                                  <span className="font-semibold text-green-600">{formatCurrency(dimension.avgSalePrice, 'USD')}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-gray-600 text-sm">Foyda/birlik:</span>
                                  <span className={`font-bold ${
                                    dimension.profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(dimension.profitPerUnit, 'USD')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Valyuta bo'yicha rentabellik - Enhanced */}
                {costData.currencyProfitability && costData.currencyProfitability.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                        <span className="text-2xl">💱</span>
                        Valyuta bo'yicha rentabellik
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {costData.currencyProfitability.map((currency: any, index: number) => (
                          <div 
                            key={index} 
                            className="group border-2 border-gray-200 rounded-xl p-6 hover:border-purple-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-purple-50/30 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-bl-full opacity-50"></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-2xl text-gray-800 group-hover:text-purple-600 transition-colors">
                                  {currency._id}
                                </h4>
                                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-3 group-hover:scale-110 transition-transform">
                                  <span className="text-3xl">
                                    {currency._id === 'USD' ? '💵' : currency._id === 'RUB' ? '💶' : '💴'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">Daromad:</span>
                                  <span className="font-bold text-green-600 text-lg">
                                    {formatCurrency(currency.totalRevenue, currency._id)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">{t.vagonSale.costPrice}:</span>
                                  <span className="font-bold text-red-600 text-lg">
                                    {formatCurrency(currency.totalCost, currency._id)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-3 -mx-1">
                                  <span className="text-gray-700 font-semibold text-sm">Foyda:</span>
                                  <span className={`font-bold text-xl ${
                                    currency.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(currency.grossProfit, currency._id)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                  <span className="text-gray-600 text-sm">Rentabellik:</span>
                                  <span className={`font-bold text-lg ${
                                    currency.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {currency.profitMargin.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-gray-600 text-sm">Sotuvlar:</span>
                                  <span className="font-semibold text-gray-800">{currency.salesCount} ta</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-purple-100 to-pink-200 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-6xl">📊</span>
                </div>
                <p className="text-gray-500 text-lg font-medium">{t.vagonSale.costInfoNotFound}</p>
                <p className="text-gray-400 text-sm mt-2">Rentabellik ma'lumotlari topilmadi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}