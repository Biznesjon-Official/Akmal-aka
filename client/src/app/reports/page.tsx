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
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <span className="text-4xl mr-3">📈</span>
              Professional Hisobotlar
            </h1>
            <p className="text-gray-600 mt-1">Kengaytirilgan tahlil va statistika</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={tab.icon} className="mr-2" size="sm" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🔍</span>
            Hisobot Filterlari
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Boshlanish sanasi</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tugash sanasi</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Valyuta</label>
              <select
                value={filters.valyuta}
                onChange={(e) => setFilters({...filters, valyuta: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Barchasi</option>
                <option value="USD">💵 USD</option>
                <option value="RUB">💶 RUB</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Davr</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({...filters, period: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="day">Kunlik</option>
                <option value="month">Oylik</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilters({
                startDate: '',
                endDate: '',
                valyuta: '',
                period: 'month'
              })}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Tozalash
            </button>
          </div>
        </Card>

        {/* Content */}
        {activeTab === 'profit-loss' && (
          <div className="space-y-6">
            {profitLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            ) : profitLossData ? (
              <>
                {/* Foyda/Zarar kartochkalari */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {profitLossData.profitLoss.map((profit) => (
                    <Card key={profit._id} className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold">{profit._id}</h4>
                        <div className={`text-2xl ${profit.sof_foyda >= 0 ? '📈' : '📉'}`}>
                          {profit.sof_foyda >= 0 ? '📈' : '📉'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-blue-100">Kirim:</span>
                          <span className="font-bold">
                            {formatCurrency(profit.kirim + profit.otpr, profit._id)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-100">Chiqim:</span>
                          <span className="font-bold">
                            {formatCurrency(profit.chiqim, profit._id)}
                          </span>
                        </div>
                        <hr className="border-blue-300" />
                        <div className="flex justify-between">
                          <span className="font-bold">Foyda:</span>
                          <span className={`font-bold text-lg ${
                            profit.sof_foyda >= 0 ? 'text-green-200' : 'text-red-200'
                          }`}>
                            {formatCurrency(profit.sof_foyda, profit._id)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-100">Rentabellik:</span>
                          <span className="font-bold">
                            {profit.rentabellik.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Foyda trendi */}
                {profitLossData.profitTrend && profitLossData.profitTrend.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📈 Foyda Trendi</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={profitLossData.profitTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="_id.month"
                            tickFormatter={(value, index) => {
                              const item = profitLossData.profitTrend[index];
                              return item ? `${item._id.month}/${item._id.year}` : value;
                            }}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              formatCurrency(value as number, 'USD'), 
                              name === 'foyda' ? 'Foyda' : name === 'kirim' ? 'Kirim' : 'Chiqim'
                            ]}
                          />
                          <Line type="monotone" dataKey="kirim" stroke="#10b981" strokeWidth={2} name="kirim" />
                          <Line type="monotone" dataKey="chiqim" stroke="#ef4444" strokeWidth={2} name="chiqim" />
                          <Line type="monotone" dataKey="foyda" stroke="#3b82f6" strokeWidth={3} name="foyda" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* Xarajat kategoriyalari */}
                {profitLossData.expenseByCategory && profitLossData.expenseByCategory.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">💸 Xarajat Kategoriyalari</h3>
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
                            <Tooltip formatter={(value) => formatCurrency(value as number, 'USD')} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">💰 Daromad Manbalari</h3>
                      <div className="space-y-3">
                        {profitLossData.incomeBySource.map((source, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <span className="font-medium">
                                {source._id.turi === 'prixod' ? 'Asosiy daromad' : 'Mijoz to\'lovlari'}
                              </span>
                              <div className="text-sm text-gray-600">
                                {source.count} ta tranzaksiya
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {formatCurrency(source.totalSumma, source._id.valyuta)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {source._id.valyuta}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>Ma'lumotlar topilmadi</p>
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
                {/* Vagon statistika kartochkalari */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Jami vagonlar</p>
                        <p className="text-3xl font-bold">{vagonData.summary.totalVagons}</p>
                      </div>
                      <div className="text-4xl opacity-80">🚛</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">{t.vagon.totalVolume}</p>
                        <p className="text-3xl font-bold">{formatNumber(vagonData.summary.totalVolume)} m³</p>
                      </div>
                      <div className="text-4xl opacity-80">📦</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Sotilgan hajm</p>
                        <p className="text-3xl font-bold">{formatNumber(vagonData.summary.soldVolume)} m³</p>
                      </div>
                      <div className="text-4xl opacity-80">💰</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">{t.vagon.remainingVolume}</p>
                        <p className="text-3xl font-bold">{formatNumber(vagonData.summary.remainingVolume)} m³</p>
                      </div>
                      <div className="text-4xl opacity-80">📊</div>
                    </div>
                  </Card>
                </div>

                {/* {t.vagonSale.remainingVolumeByStatus} */}
                {vagonData.remainingStock && vagonData.remainingStock.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📦 {t.vagonSale.remainingVolumeByStatus}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {vagonData.remainingStock.map((stock, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{getStatusLabel(stock._id)}</h4>
                            <span className="text-2xl">
                              {stock._id === 'omborda' ? '🏢' : 
                               stock._id === 'qayta_ishlash' ? '⚙️' : 
                               stock._id === 'tayyor' ? '✅' : '📦'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Soni:</span>
                              <span className="font-semibold">{stock.count} ta</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Hajm:</span>
                              <span className="font-semibold">{formatNumber(stock.totalVolume)} m³</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Og'irlik:</span>
                              <span className="font-semibold">{formatNumber(stock.totalWeight)} t</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.avgCostPrice}:</span>
                              <span className="font-semibold">{formatCurrency(stock.avgCostPrice, 'USD')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Sotilgan hajm dinamikasi */}
                {vagonData.soldVolume && vagonData.soldVolume.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📈 Sotilgan hajm dinamikasi</h3>
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
                              name === 'totalSold' ? 'Sotilgan hajm' : 'Qiymat'
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
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">🚛</div>
                <p>Vagon ma'lumotlari topilmadi</p>
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
                {/* Mijoz statistika kartochkalari */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Jami mijozlar</p>
                        <p className="text-3xl font-bold">{clientData.summary.totalClients}</p>
                      </div>
                      <div className="text-4xl opacity-80">👥</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm">Qarzli mijozlar</p>
                        <p className="text-3xl font-bold">{clientData.summary.clientsWithDebt}</p>
                      </div>
                      <div className="text-4xl opacity-80">⚠️</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Jami qarz</p>
                        <p className="text-2xl font-bold">{formatCurrency(clientData.summary.totalDebt, 'USD')}</p>
                      </div>
                      <div className="text-4xl opacity-80">💸</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">O'rt. to'lov</p>
                        <p className="text-2xl font-bold">{(clientData.summary.avgPaymentRate * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-4xl opacity-80">📊</div>
                    </div>
                  </Card>
                </div>

                {/* Qarzlar ro'yxati */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">💸 Qarzlar ro'yxati (Top 10)</h3>
                  {clientData.debtList && clientData.debtList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mijoz</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qarz</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">To'langan</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sotuvlar</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qarz nisbati</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {clientData.debtList.slice(0, 10).map((client) => (
                            <tr key={client._id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm font-medium text-gray-900">{client.name}</td>
                              <td className="px-4 py-4 text-sm text-gray-600">{client.phone}</td>
                              <td className="px-4 py-4 text-sm text-right font-bold text-red-600">
                                {formatCurrency(client.total_debt, 'USD')}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-green-600">
                                {formatCurrency(client.total_paid, 'USD')}
                              </td>
                              <td className="px-4 py-4 text-sm text-right">{client.salesCount}</td>
                              <td className="px-4 py-4 text-sm text-right">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  client.debtRatio > 0.5 ? 'bg-red-100 text-red-800' : 
                                  client.debtRatio > 0.2 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-green-100 text-green-800'
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
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">✅</div>
                      <p>Qarzli mijozlar yo'q</p>
                    </div>
                  )}
                </Card>

                {/* Top mijozlar */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">🏆 Top mijozlar (Daromad bo'yicha)</h3>
                  {clientData.topClients && clientData.topClients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clientData.topClients.slice(0, 9).map((client, index) => (
                        <div key={client._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-lg">{client.name}</h4>
                            <span className="text-2xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Daromad:</span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(client.totalRevenue, 'USD')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Hajm:</span>
                              <span className="font-semibold">{formatNumber(client.totalVolume)} m³</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sotuvlar:</span>
                              <span className="font-semibold">{client.salesCount} ta</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">O'rt. buyurtma:</span>
                              <span className="font-semibold">
                                {formatCurrency(client.avgOrderValue, 'USD')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">👥</div>
                      <p>Mijozlar ma'lumotlari yo'q</p>
                    </div>
                  )}
                </Card>

                {/* To'lov intizomi */}
                {clientData.paymentDisciplineAnalysis && clientData.paymentDisciplineAnalysis.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📊 To'lov intizomi tahlili</h3>
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
                              name === 'paymentRate' ? 'To\'lov foizi' : 'Qarz'
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
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">👥</div>
                <p>Mijoz ma'lumotlari topilmadi</p>
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
                {/* Xarajat statistika kartochkalari */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm">{t.vagonSale.totalExpenses}</p>
                        <p className="text-3xl font-bold">{expenseData.summary.totalExpenses}</p>
                      </div>
                      <div className="text-4xl opacity-80">💸</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Jami summa</p>
                        <p className="text-2xl font-bold">{formatCurrency(expenseData.summary.totalAmount, 'USD')}</p>
                      </div>
                      <div className="text-4xl opacity-80">💰</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">O'rtacha xarajat</p>
                        <p className="text-2xl font-bold">{formatCurrency(expenseData.summary.avgExpense, 'USD')}</p>
                      </div>
                      <div className="text-4xl opacity-80">📊</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Kategoriyalar</p>
                        <p className="text-3xl font-bold">{expenseData.summary.categoriesCount}</p>
                      </div>
                      <div className="text-4xl opacity-80">📋</div>
                    </div>
                  </Card>
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
                      <h3 className="text-lg font-semibold mb-4">📋 Xarajat tafsilotlari</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {expenseData.expenseByCategory.map((category, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <span className="font-medium">
                                {getExpenseTypeLabel(category._id.xarajatTuri)}
                              </span>
                              <div className="text-sm text-gray-600">
                                {category.count} ta • O'rtacha: {formatCurrency(category.avgSumma, category._id.valyuta)}
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
                    <h3 className="text-lg font-semibold mb-4">📈 Oylik xarajat dinamikasi</h3>
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
                              'Xarajat'
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
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">💸</div>
                <p>Xarajat ma'lumotlari topilmadi</p>
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
                {/* {t.vagonSale.costStatistics} kartochkalari */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Jami lotlar</p>
                        <p className="text-3xl font-bold">{costData.summary.totalLots}</p>
                      </div>
                      <div className="text-4xl opacity-80">📦</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Foydali lotlar</p>
                        <p className="text-3xl font-bold">{costData.summary.profitableLots}</p>
                      </div>
                      <div className="text-4xl opacity-80">📈</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">O'rt. rentabellik</p>
                        <p className="text-2xl font-bold">{costData.summary.avgProfitMargin.toFixed(1)}%</p>
                      </div>
                      <div className="text-4xl opacity-80">📊</div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Jami foyda</p>
                        <p className="text-2xl font-bold">{formatCurrency(costData.summary.totalGrossProfit, 'USD')}</p>
                      </div>
                      <div className="text-4xl opacity-80">💰</div>
                    </div>
                  </Card>
                </div>

                {/* Top foydali lotlar */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Eng foydali lotlar (Top 10)</h3>
                  {costData.lotProfitability && costData.lotProfitability.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.vagonSale.lotCode}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.vagonSale.costPrice}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.vagonSale.expenses}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.vagonSale.revenue}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.vagonSale.profit}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rentabellik</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ROI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {costData.lotProfitability.slice(0, 10).map((lot: any) => (
                            <tr key={lot._id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm font-medium text-gray-900">{lot.lotCode}</td>
                              <td className="px-4 py-4 text-sm text-right">{formatCurrency(lot.tannarx, 'USD')}</td>
                              <td className="px-4 py-4 text-sm text-right text-red-600">
                                {formatCurrency(lot.totalExpenses, 'USD')}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-green-600">
                                {formatCurrency(lot.totalRevenue, 'USD')}
                              </td>
                              <td className="px-4 py-4 text-sm text-right font-bold">
                                <span className={lot.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(lot.grossProfit, 'USD')}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-right">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  lot.profitMargin > 20 ? 'bg-green-100 text-green-800' : 
                                  lot.profitMargin > 10 ? 'bg-yellow-100 text-yellow-800' : 
                                  lot.profitMargin > 0 ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {lot.profitMargin.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-right">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  lot.roi > 50 ? 'bg-green-100 text-green-800' : 
                                  lot.roi > 20 ? 'bg-yellow-100 text-yellow-800' : 
                                  lot.roi > 0 ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
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
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📦</div>
                      <p>Lot ma'lumotlari yo'q</p>
                    </div>
                  )}
                </Card>

                {/* O'lchov bo'yicha rentabellik */}
                {costData.dimensionProfitability && costData.dimensionProfitability.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">📏 O'lchov bo'yicha rentabellik</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {costData.dimensionProfitability.slice(0, 9).map((dimension: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">
                              {dimension._id.qalinlik}×{dimension._id.eni}×{dimension._id.uzunlik}mm
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              dimension.profitMargin > 20 ? 'bg-green-100 text-green-800' : 
                              dimension.profitMargin > 10 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {dimension.profitMargin.toFixed(1)}%
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Soni:</span>
                              <span className="font-semibold">{dimension.count} ta</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Hajm:</span>
                              <span className="font-semibold">{formatNumber(dimension.totalVolume)} m³</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.avgCostPrice}:</span>
                              <span className="font-semibold">{formatCurrency(dimension.avgCostPrice, 'USD')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">O'rt. sotuv:</span>
                              <span className="font-semibold">{formatCurrency(dimension.avgSalePrice, 'USD')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Foyda/birlik:</span>
                              <span className={`font-bold ${
                                dimension.profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(dimension.profitPerUnit, 'USD')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Valyuta bo'yicha rentabellik */}
                {costData.currencyProfitability && costData.currencyProfitability.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">💱 Valyuta bo'yicha rentabellik</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {costData.currencyProfitability.map((currency: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg">{currency._id}</h4>
                            <span className="text-2xl">
                              {currency._id === 'USD' ? '💵' : currency._id === 'RUB' ? '💶' : '💴'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Daromad:</span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(currency.totalRevenue, currency._id)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.costPrice}:</span>
                              <span className="font-bold text-red-600">
                                {formatCurrency(currency.totalCost, currency._id)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Foyda:</span>
                              <span className={`font-bold ${
                                currency.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(currency.grossProfit, currency._id)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rentabellik:</span>
                              <span className={`font-bold ${
                                currency.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {currency.profitMargin.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sotuvlar:</span>
                              <span className="font-semibold">{currency.salesCount} ta</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p>{t.vagonSale.costInfoNotFound}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}