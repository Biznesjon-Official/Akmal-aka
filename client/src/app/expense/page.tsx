'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import ExpenseTableSkeleton from '@/components/expense/ExpenseTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import axios from '@/lib/axios';

// Import komponentlar
// import ExpenseDetailsModal from '../../../components/expense/ExpenseDetailsModal';
// import ExpenseStatsWidget from '../../../components/expense/ExpenseStatsWidget';
// import ExpenseChart from '../../../components/expense/ExpenseChart';

import Icon from '@/components/Icon';

interface ExpenseType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  parentCategory?: string;
  isCategory?: boolean;
  hasSubTypes?: boolean;
  requiresClient?: boolean;
}

interface AdvancedExpense {
  _id: string;
  xarajatTuri: string;
  summa: number;
  valyuta: string;
  summaRUB: number;
  tavsif: string;
  createdAt: string;
  yaratuvchi: {
    username: string;
  };
  vagon?: {
    vagonCode: string;
    sending_place: string;
    receiving_place: string;
  };
  client?: {
    _id: string;
    name: string;
    phone: string;
    usd_current_debt: number;
    rub_current_debt: number;
  };
  additionalInfo?: {
    javobgarShaxs?: string;
    tolovSanasi?: string;
    hujjatRaqami?: string;
    qoshimchaMalumot?: string;
  };
}

export default function ExpensePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  // State
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    xarajatTuri: '',
    valyuta: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  
  // Form data
  const [formData, setFormData] = useState({
    xarajatTuri: '',
    xarajatKategoriyasi: '', // Yangi: kategoriya (shaxsiy, qarzdorlik, chiqim)
    summa: '',
    valyuta: 'USD',
    tavsif: '',
    javobgarShaxs: '',
    xarajatSanasi: new Date().toISOString().split('T')[0],
    tolovSanasi: '',
    hujjatRaqami: '',
    qoshimchaMalumot: '',
    vagon: '',
    client: ''
  });

  // Data fetching
  const { data: expenseTypes } = useQuery<ExpenseType[]>({
    queryKey: ['expense-types'],
    queryFn: async () => {
      const response = await axios.get('/expense-advanced/types/list');
      return response.data;
    }
  });

  const { data: expensesData, isLoading, refetch } = useQuery({
    queryKey: ['expenses-advanced', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.xarajatTuri) params.append('xarajatTuri', filters.xarajatTuri);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page.toString());
      
      const response = await axios.get(`/expense-advanced?${params}`);
      return response.data;
    }
  });

  // Business summary data fetching
  const { data: businessSummary } = useQuery({
    queryKey: ['business-summary'],
    queryFn: async () => {
      const response = await axios.get('/expense-advanced/summary/business');
      return response.data;
    },
    staleTime: 60000, // 1 daqiqa cache
    refetchOnWindowFocus: false
  });

  const { data: statsData } = useQuery({
    queryKey: ['expense-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      
      const response = await axios.get(`/expense-advanced/stats/advanced?${params}`);
      return response.data;
    }
  });

  const { data: vagons, isLoading: vagonsLoading, error: vagonsError } = useQuery({
    queryKey: ['vagons-simple'], // Alohida cache key
    queryFn: async () => {
      console.log('🔍 {t.expense.vagonsLoading}...');
      const response = await axios.get('/vagon?limit=100&includeLots=false&status=active'); // Faqat faol vagonlar
      console.log('📦 Vagonlar javobi:', response.data);
      const vagonsData = response.data?.vagons || response.data || [];
      console.log('📋 Vagonlar ro\'yxati:', vagonsData.length, 'ta vagon');
      return vagonsData;
    },
    staleTime: 60000, // 1 daqiqa cache
    retry: 1
  });

  // Mijozlar ro'yxati (qarzdorlik xarajatlari uchun)
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-simple'],
    queryFn: async () => {
      const response = await axios.get('/client?limit=100');
      return response.data?.clients || response.data || [];
    },
    staleTime: 60000,
    retry: 1
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Kategoriya o'zgarganda xarajat turini tozalash
  useEffect(() => {
    if (formData.xarajatKategoriyasi !== 'chiqim') {
      // Agar chiqim bo'lmasa, xarajat turini kategoriya bilan bir xil qilamiz
      setFormData(prev => ({ ...prev, xarajatTuri: prev.xarajatKategoriyasi }));
    } else {
      // Chiqim bo'lsa, xarajat turini tozalaymiz
      setFormData(prev => ({ ...prev, xarajatTuri: '' }));
    }
    
    // Qarzdorlik bo'lmasa, client ni tozalash
    if (formData.xarajatKategoriyasi !== 'qarzdorlik') {
      setFormData(prev => ({ ...prev, client: '' }));
    }
    
    // Shaxsiy bo'lsa, vagon ni tozalash
    if (formData.xarajatKategoriyasi === 'shaxsiy') {
      setFormData(prev => ({ ...prev, vagon: '' }));
    }
  }, [formData.xarajatKategoriyasi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Qarzdorlik xarajatlari uchun mijoz majburiy
    if (formData.xarajatKategoriyasi === 'qarzdorlik' && !formData.client) {
      alert(t.expense.clientRequired);
      return;
    }
    
    // Chiqim kategoriyasida xarajat turi tanlanishi kerak
    if (formData.xarajatKategoriyasi === 'chiqim' && !formData.xarajatTuri) {
      alert('Chiqim kategoriyasida xarajat turini tanlang');
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        summa: parseFloat(formData.summa),
        summaRUB: formData.valyuta === 'RUB' ? parseFloat(formData.summa) : parseFloat(formData.summa) * 95.5,
        summaUSD: formData.valyuta === 'USD' ? parseFloat(formData.summa) : parseFloat(formData.summa) * 0.0105
      };
      
      const response = await axios.post('/expense-advanced', submitData);
      
      if (response.data.message) {
        alert(`${response.data.message}\n\n💰 Bu xarajat kassada ham ko'rsatiladi.`);
      } else {
        alert(`✅ Xarajat muvaffaqiyatli qo'shildi!\n💰 Kassa balansida ham ko'rsatiladi.`);
      }
      
      refetch();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || t.messages.errorSavingExpense);
    }
  };

  const resetForm = () => {
    setFormData({
      xarajatTuri: '',
      xarajatKategoriyasi: '',
      summa: '',
      valyuta: 'USD',
      tavsif: '',
      javobgarShaxs: '',
      xarajatSanasi: new Date().toISOString().split('T')[0],
      tolovSanasi: '',
      hujjatRaqami: '',
      qoshimchaMalumot: '',
      vagon: '',
      client: ''
    });
  };

  const openDetailsModal = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setShowDetailsModal(true);
  };

  const getExpenseTypeInfo = (type: string) => {
    const typeMap: { [key: string]: { label: string; icon: string } } = {
      'transport_kz': { label: 'Transport KZ', icon: 'transport' },
      'transport_uz': { label: 'Transport UZ', icon: 'transport' },
      'transport_kelish': { label: 'Transport kelish', icon: 'transport' },
      'bojxona_nds': { label: 'Bojxona NDS', icon: 'customs' },
      'shaxsiy': { label: t.expense.types.shaxsiy, icon: 'user' },
      'qarzdorlik': { label: t.expense.types.qarzdorlik, icon: 'credit-card' },
      'chiqim': { label: 'Chiqim', icon: 'more-horizontal' }
    };
    return typeMap[type] || { label: type, icon: 'details' };
  };

  const getExpenseTypeLabel = (type: string) => {
    return getExpenseTypeInfo(type).label;
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container-full-desktop space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <ExpenseTableSkeleton />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const expenses = expensesData?.expenses || [];
  const totalPages = expensesData?.totalPages || 1;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-red-600 to-pink-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="trending-down" className="h-7 w-7" />
                    </div>
                    {t.expense.title}
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    Professional xarajatlar boshqaruv tizimi
                  </p>
                  <p className="text-sm opacity-75">
                    Barcha xarajatlarni kuzatib boring va tahlil qiling
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl hover:bg-white/30 flex items-center shadow-lg transition-all duration-200 font-semibold"
                >
                  <Icon name="plus" className="mr-3 h-6 w-6" />
                  {t.expense.addExpense}
                </button>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats Widget */}
          {statsData && (
            <section className="mb-12">
              <div className="flex items-center mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                  <Icon name="bar-chart" className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Xarajatlar Statistikasi</h2>
                  <p className="text-gray-600">Umumiy ko'rsatkichlar va tahlil</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Icon name="hash" className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600">{t.expense.totalExpenses}</div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatNumber(statsData.summary?.totalExpenses || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Jami xarajatlar soni</div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  </div>
                </div>

                <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Icon name="dollar-sign" className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600">{t.common.total} {t.common.amount}</div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatNumber(statsData.summary?.totalAmount || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Jami xarajat miqdori</div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
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
                        <div className="text-sm font-medium text-gray-600">{t.expense.averageExpense}</div>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatNumber(statsData.summary?.avgExpense || 0)}
                    </div>
                    <div className="text-sm text-gray-500">O'rtacha xarajat</div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-600"></div>
                  </div>
                </div>

                <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-600/5"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Icon name="award" className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600">{t.expense.topExpenseType}</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 mb-2">
                      {statsData.byExpenseType?.length > 0 ? 
                        getExpenseTypeLabel(statsData.byExpenseType[0]._id) : 
                        t.common.noData
                      }
                    </div>
                    <div className="text-sm text-gray-500">Eng ko'p xarajat turi</div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Modern Filters */}
          <section className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <Icon name="filter" className="h-6 w-6 text-white" />
                </div>
                Filtrlar va Qidiruv
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{t.expense.type}</label>
                  <select
                    value={filters.xarajatTuri}
                    onChange={(e) => setFilters({...filters, xarajatTuri: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  >
                    <option value="">{t.common.selectAll}</option>
                    {expenseTypes?.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{t.common.currency}</label>
                  <select
                    value={filters.valyuta}
                    onChange={(e) => setFilters({...filters, valyuta: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  >
                    <option value="">{t.reports.allCurrencies}</option>
                    <option value="USD">💵 USD</option>
                    <option value="RUB">💶 RUB</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Boshlanish sanasi</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Tugash sanasi</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Qidiruv</label>
                  <input
                    type="text"
                    placeholder="Tavsif bo'yicha..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setFilters({
                    xarajatTuri: '',
                    valyuta: '',
                    startDate: '',
                    endDate: '',
                    search: ''
                  })}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold flex items-center"
                >
                  <Icon name="refresh-cw" className="mr-2 h-5 w-5" />
                  {t.expense.clearFilters}
                </button>
              </div>
            </div>
          </section>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold flex items-center">
              <Icon name="expenses" className="mr-2" />
              {t.expense.expenseList} ({expensesData?.total || 0})
            </h3>
          </div>
          
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Icon name="expenses" className="mx-auto mb-4" size="xl" />
              <p className="text-lg">{t.expense.noData}</p>
              <p className="text-sm mt-2">Filter sozlamalarini o'zgartiring yoki yangi xarajat qo'shing</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tavsif</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vagon/Mijoz</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yaratuvchi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map((expense: AdvancedExpense) => {
                      return (
                        <tr key={expense._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(expense.createdAt).toLocaleDateString('uz-UZ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Icon name={getExpenseTypeInfo(expense.xarajatTuri).icon} className="mr-2 text-gray-600" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getExpenseTypeInfo(expense.xarajatTuri).label}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {expense.xarajatTuri}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {formatCurrency(expense.summa, expense.valyuta)}
                            </div>
                            {expense.valyuta !== 'RUB' && (
                              <div className="text-xs text-gray-500">
                                ≈ {formatCurrency(expense.summaRUB, 'RUB')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {expense.tavsif}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {expense.vagon ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {expense.vagon.vagonCode} - {expense.vagon.sending_place} → {expense.vagon.receiving_place}
                              </span>
                            ) : expense.client ? (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                                👤 {expense.client.name} ({expense.client.phone})
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {expense.yaratuvchi?.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openDetailsModal(expense._id)}
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs flex items-center"
                            >
                              <Icon name="details" className="mr-1" size="sm" />
                              {t.expense.details}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Sahifa {page} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
                    >
                      Oldingi
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
                    >
                      Keyingi
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center">
                  <Icon name="add" className="mr-3" />
                  {t.expense.addExpense}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 group"
                  aria-label="Yopish"
                >
                  <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. Kategoriya tanlash */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      1. Kategoriyani tanlang
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {expenseTypes?.filter(type => type.isCategory).map(type => (
                        <div
                          key={type.id}
                          onClick={() => setFormData({...formData, xarajatKategoriyasi: type.id, xarajatTuri: type.id})}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                            formData.xarajatKategoriyasi === type.id
                              ? 'border-orange-500 bg-orange-50 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mb-3 shadow-md">
                              <Icon name={type.icon} className="h-6 w-6 text-white" />
                            </div>
                            <span className="font-semibold text-sm mb-1">{type.name}</span>
                            <p className="text-xs text-gray-600 line-clamp-2">{type.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 2. Chiqim kategoriyasida xarajat turi tanlash */}
                  {formData.xarajatKategoriyasi === 'chiqim' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        2. Xarajat turini tanlang
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {expenseTypes?.filter(type => type.parentCategory === 'chiqim').map(type => (
                          <div
                            key={type.id}
                            onClick={() => setFormData({...formData, xarajatTuri: type.id})}
                            className={`p-3 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                              formData.xarajatTuri === type.id
                                ? 'border-blue-500 bg-blue-50 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex flex-col items-center text-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-2 shadow-sm">
                                <Icon name={type.icon} className="h-5 w-5 text-white" />
                              </div>
                              <span className="font-semibold text-xs">{type.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2/3. Vagon tanlash - faqat chiqim xarajatlari uchun */}
                  {formData.xarajatKategoriyasi === 'chiqim' && formData.xarajatTuri && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        3. Bog'langan vagon ({t.expense.optional})
                      </label>
                      <select
                        value={formData.vagon}
                        onChange={(e) => setFormData({...formData, vagon: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                        disabled={vagonsLoading}
                      >
                        <option value="">
                          {vagonsLoading ? t.expense.vagonsLoading : 
                           vagonsError ? t.expense.errorLoadingVagons : 
                           t.expense.vagonNotSelected}
                        </option>
                        {Array.isArray(vagons) && vagons.length > 0 ? (
                          vagons.map((vagon: any) => (
                            <option key={vagon._id} value={vagon._id}>
                              {vagon.vagonCode} - {vagon.sending_place} → {vagon.receiving_place}
                            </option>
                          ))
                        ) : (
                          !vagonsLoading && !vagonsError && (
                            <option value="" disabled>Hozircha vagonlar yo'q</option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  {/* 2. Mijoz tanlash - faqat qarzdorlik xarajatlari uchun */}
                  {formData.xarajatKategoriyasi === 'qarzdorlik' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        2. {t.expense.selectClient} <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.client}
                        onChange={(e) => setFormData({...formData, client: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                        disabled={clientsLoading}
                      >
                        <option value="">
                          {clientsLoading ? t.expense.clientsLoading : t.expense.selectClient}
                        </option>
                        {Array.isArray(clients) && clients.length > 0 ? (
                          clients.map((client: any) => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.phone} (Qarz: ${client.usd_current_debt?.toFixed(2) || 0})
                            </option>
                          ))
                        ) : (
                          !clientsLoading && (
                            <option value="" disabled>Hozircha mijozlar yo'q</option>
                          )
                        )}
                      </select>
                      <p className="text-sm text-gray-600 mt-2">
                        {t.expense.clientRequired}
                      </p>
                    </div>
                  )}

                  {/* Shaxsiy xarajat uchun ogohlantirish */}
                  {formData.xarajatKategoriyasi === 'shaxsiy' && (
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="text-blue-600 mr-3 text-2xl">ℹ️</div>
                          <div>
                            <h4 className="font-bold text-blue-800 text-lg mb-2">Shaxsiy xarajat</h4>
                            <p className="text-blue-800">
                              Bu shaxsiy xarajat bo'lgani uchun vagon bilan bog'lanmaydi. 
                              Biznesmen shaxsiy ehtiyojlari uchun sarflangan mablag'.
                              Tavsifda nima uchun xarajat qilinganini yozing.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Qarzdorlik xarajatlari uchun ogohlantirish */}
                  {formData.xarajatKategoriyasi === 'qarzdorlik' && (
                    <div className="md:col-span-2">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="text-yellow-600 mr-3 text-2xl">💳</div>
                          <div>
                            <h4 className="font-bold text-yellow-800 text-lg mb-2">Qarzdorlik xarajatlari</h4>
                            <p className="text-yellow-800 mb-2">
                              Mijozga qarz beriladi. Bu summa avtomatik ravishda mijozning umumiy qarziga qo'shiladi.
                            </p>
                            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                              <li>Mijoz tanlanishi shart</li>
                              <li>Qarz mijozning balansiga qo'shiladi</li>
                              <li>Mijozlar bo'limida ko'rsatiladi</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Chiqim uchun ogohlantirish */}
                  {formData.xarajatKategoriyasi === 'chiqim' && !formData.xarajatTuri && (
                    <div className="md:col-span-2">
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="text-gray-600 mr-3 text-2xl">📋</div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-lg mb-2">Chiqim kategoriyasi</h4>
                            <p className="text-gray-700">
                              Yuqoridan xarajat turini tanlang (Transport, Bojxona, Ishchilar va h.k.)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3/4. Summa va valyuta */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {formData.xarajatKategoriyasi === 'chiqim' && formData.xarajatTuri ? '4' : 
                       formData.xarajatKategoriyasi === 'qarzdorlik' ? '3' : 
                       formData.xarajatKategoriyasi === 'shaxsiy' ? '2' : ''}. {t.common.amount}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.summa}
                      onChange={(e) => setFormData({...formData, summa: e.target.value})}
                      placeholder="1000"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.common.currency}
                    </label>
                    <select
                      required
                      value={formData.valyuta}
                      onChange={(e) => setFormData({...formData, valyuta: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="RUB">RUB (₽)</option>
                    </select>
                  </div>

                  {/* 4/5. Tavsif */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {formData.xarajatKategoriyasi === 'chiqim' && formData.xarajatTuri ? '5' : 
                       formData.xarajatKategoriyasi === 'qarzdorlik' ? '4' : 
                       formData.xarajatKategoriyasi === 'shaxsiy' ? '3' : ''}. {t.common.description}
                    </label>
                    <textarea
                      required
                      value={formData.tavsif}
                      onChange={(e) => setFormData({...formData, tavsif: e.target.value})}
                      placeholder={formData.xarajatKategoriyasi === 'shaxsiy' ? 
                        'Masalan: Oziq-ovqat, transport, turar joy...' : 
                        formData.xarajatKategoriyasi === 'qarzdorlik' ?
                        'Masalan: Mijoz qarzi, qarz to\'lovi...' :
                        t.expense.enterDescription}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                      rows={3}
                    />
                  </div>

                  {/* 5/6. Javobgar shaxs */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {formData.xarajatKategoriyasi === 'chiqim' && formData.xarajatTuri ? '6' : 
                       formData.xarajatKategoriyasi === 'qarzdorlik' ? '5' : 
                       formData.xarajatKategoriyasi === 'shaxsiy' ? '4' : ''}. {t.expense.responsiblePerson}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.javobgarShaxs}
                      onChange={(e) => setFormData({...formData, javobgarShaxs: e.target.value})}
                      placeholder={formData.xarajatKategoriyasi === 'shaxsiy' ? 
                        'Biznesmen ismi' : 
                        t.expense.enterResponsiblePerson}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* 6/7. Xarajat sanasi */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {formData.xarajatKategoriyasi === 'chiqim' && formData.xarajatTuri ? '7' : 
                       formData.xarajatKategoriyasi === 'qarzdorlik' ? '6' : 
                       formData.xarajatKategoriyasi === 'shaxsiy' ? '5' : ''}. {t.expense.expenseDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.xarajatSanasi}
                      onChange={(e) => setFormData({...formData, xarajatSanasi: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* Qo'shimcha ma'lumotlar */}
                  <div className="md:col-span-2">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                      Qo'shimcha ma'lumotlar ({t.expense.optional})
                    </h4>
                  </div>

                  {/* To'lov sanasi */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.expense.paymentDate}
                    </label>
                    <input
                      type="date"
                      value={formData.tolovSanasi}
                      onChange={(e) => setFormData({...formData, tolovSanasi: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* Hujjat raqami */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.expense.documentNumber}
                    </label>
                    <input
                      type="text"
                      value={formData.hujjatRaqami}
                      onChange={(e) => setFormData({...formData, hujjatRaqami: e.target.value})}
                      placeholder="INV-001"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* Qo'shimcha ma'lumot */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.expense.additionalInfo}
                    </label>
                    <textarea
                      value={formData.qoshimchaMalumot}
                      onChange={(e) => setFormData({...formData, qoshimchaMalumot: e.target.value})}
                      placeholder={t.expense.enterAdditionalInfo}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                      rows={2}
                    />
                  </div>
                </div>

                {/* UMUMIY BIZNES HISOBOTI */}
                {businessSummary && (
                  <div className="mt-8 pt-6 border-t-2 border-gray-200">
                    <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                        <Icon name="bar-chart" className="h-5 w-5 text-white" />
                      </div>
                      📊 Umumiy Biznes Hisoboti
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Jami Sotuvlar */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-700">💰 Jami Sotuvlar</span>
                          <Icon name="trending-up" className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-blue-900">
                            ${formatNumber(businessSummary.sales?.USD || 0)}
                          </div>
                          <div className="text-sm text-blue-700">
                            ₽{formatNumber(businessSummary.sales?.RUB || 0)}
                          </div>
                          <div className="text-xs text-blue-600">
                            {formatNumber(businessSummary.sales?.totalVolume || 0)} m³ • {businessSummary.sales?.totalSales || 0} ta
                          </div>
                        </div>
                      </div>

                      {/* Jami Xarajatlar */}
                      <div className="bg-gradient-to-br from-red-50 to-rose-100 p-4 rounded-xl border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-red-700">💸 Jami Xarajatlar</span>
                          <Icon name="trending-down" className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-red-900">
                            ${formatNumber(businessSummary.expenses?.USD || 0)}
                          </div>
                          <div className="text-sm text-red-700">
                            ₽{formatNumber(businessSummary.expenses?.RUB || 0)}
                          </div>
                          <div className="text-xs text-red-600">
                            {businessSummary.expenses?.totalExpenses || 0} ta xarajat
                          </div>
                        </div>
                      </div>

                      {/* Sof Foyda */}
                      <div className={`bg-gradient-to-br p-4 rounded-xl border ${
                        (businessSummary.profit?.USD || 0) >= 0 
                          ? 'from-green-50 to-emerald-100 border-green-200' 
                          : 'from-red-50 to-rose-100 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${
                            (businessSummary.profit?.USD || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            📈 Sof Foyda
                          </span>
                          <Icon 
                            name={(businessSummary.profit?.USD || 0) >= 0 ? "trending-up" : "trending-down"} 
                            className={`h-4 w-4 ${
                              (businessSummary.profit?.USD || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`} 
                          />
                        </div>
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            (businessSummary.profit?.USD || 0) >= 0 ? 'text-green-900' : 'text-red-900'
                          }`}>
                            ${formatNumber(businessSummary.profit?.USD || 0)}
                          </div>
                          <div className={`text-sm ${
                            (businessSummary.profit?.RUB || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            ₽{formatNumber(businessSummary.profit?.RUB || 0)}
                          </div>
                          <div className={`text-xs ${
                            (businessSummary.summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Jami: ${formatNumber(businessSummary.summary?.netProfit || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Jami Qarz */}
                      <div className={`bg-gradient-to-br p-4 rounded-xl border ${
                        (businessSummary.debt?.USD || 0) > 0 
                          ? 'from-orange-50 to-amber-100 border-orange-200' 
                          : 'from-gray-50 to-slate-100 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${
                            (businessSummary.debt?.USD || 0) > 0 ? 'text-orange-700' : 'text-gray-700'
                          }`}>
                            💳 Jami Qarz
                          </span>
                          <Icon 
                            name="credit-card" 
                            className={`h-4 w-4 ${
                              (businessSummary.debt?.USD || 0) > 0 ? 'text-orange-600' : 'text-gray-600'
                            }`} 
                          />
                        </div>
                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${
                            (businessSummary.debt?.USD || 0) > 0 ? 'text-orange-900' : 'text-gray-900'
                          }`}>
                            ${formatNumber(businessSummary.debt?.USD || 0)}
                          </div>
                          <div className={`text-sm ${
                            (businessSummary.debt?.RUB || 0) > 0 ? 'text-orange-700' : 'text-gray-700'
                          }`}>
                            ₽{formatNumber(businessSummary.debt?.RUB || 0)}
                          </div>
                          <div className={`text-xs ${
                            (businessSummary.summary?.totalDebt || 0) > 0 ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            Jami: ${formatNumber(businessSummary.summary?.totalDebt || 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Qo'shimcha ma'lumot */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-start">
                        <div className="text-blue-600 mr-3 text-lg">ℹ️</div>
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">Real vaqt hisoboti:</p>
                          <p>Bu ma'lumotlar barcha sotuvlar, xarajatlar va to'lovlar asosida hisoblangan. 
                          Yangi xarajat qo'shilgandan keyin hisobot avtomatik yangilanadi.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Jami summa ko'rsatish */}
                {formData.summa && parseFloat(formData.summa) > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Icon name="calculator" className="h-5 w-5 text-red-600 mr-2" />
                        {t.common.grandTotal}
                      </h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {parseFloat(formData.summa).toLocaleString()} {formData.valyuta}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Xarajat summasi
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-400 font-semibold"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.xarajatTuri || !formData.summa || !formData.tavsif}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 font-semibold disabled:opacity-50"
                  >
                    {t.expense.saveExpense}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedExpenseId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{t.expense.details}</h3>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedExpenseId(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <p className="text-gray-600">Tafsilotlar tez orada qo'shiladi...</p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}
