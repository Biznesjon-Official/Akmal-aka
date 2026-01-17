'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
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
  category: string;
  subTypes: string[];
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
    summa: '',
    valyuta: 'USD',
    tavsif: '',
    javobgarShaxs: '',
    xarajatSanasi: new Date().toISOString().split('T')[0],
    tolovSanasi: '',
    hujjatRaqami: '',
    qoshimchaMalumot: '',
    vagon: ''
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

  const { data: vagons } = useQuery({
    queryKey: ['vagons'],
    queryFn: async () => {
      const response = await axios.get('/vagon');
      return response.data || []; // vagon array'ini qaytaramiz
    }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        summa: parseFloat(formData.summa),
        summaRUB: formData.valyuta === 'RUB' ? parseFloat(formData.summa) : parseFloat(formData.summa) * 95.5, // USD -> RUB
        summaUSD: formData.valyuta === 'USD' ? parseFloat(formData.summa) : parseFloat(formData.summa) * 0.0105 // RUB -> USD
      };
      
      await axios.post('/expense-advanced', submitData);
      
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
      summa: '',
      valyuta: 'USD',
      tavsif: '',
      javobgarShaxs: '',
      xarajatSanasi: new Date().toISOString().split('T')[0],
      tolovSanasi: '',
      hujjatRaqami: '',
      qoshimchaMalumot: '',
      vagon: ''
    });
  };

  const openDetailsModal = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setShowDetailsModal(true);
  };

  const getExpenseTypeInfo = (type: string) => {
    const typeMap: { [key: string]: { label: string; icon: string } } = {
      'transport_kelish': { label: 'Transport (Kelish)', icon: 'transport' },
      'transport_ketish': { label: 'Transport (Ketish)', icon: 'transport' },
      'bojxona_kelish': { label: 'Bojxona (Import)', icon: 'customs' },
      'bojxona_ketish': { label: 'Bojxona (Export)', icon: 'customs' },
      'yuklash_tushirish': { label: 'Yuklash/Tushirish', icon: 'loading' },
      'saqlanish': { label: 'Ombor/Saqlanish', icon: 'storage' },
      'ishchilar': { label: 'Ishchilar', icon: 'workers' },
      'maosh': { label: 'Maosh', icon: 'cash' },
      'qayta_ishlash': { label: 'Qayta ishlash', icon: 'processing' },
      'boshqa': { label: 'Boshqa', icon: 'details' }
    };
    return typeMap[type] || { label: type, icon: 'details' };
  };

  const getExpenseTypeLabel = (type: string) => {
    return getExpenseTypeInfo(type).label;
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  const expenses = expensesData?.expenses || [];
  const totalPages = expensesData?.totalPages || 1;

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Icon name="expenses" className="mr-3" size="lg" />
              {t.expense.title}
            </h1>
            <p className="text-gray-600 mt-1">{t.expense.subtitle}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 flex items-center shadow-lg"
          >
            <Icon name="add" className="mr-2" />
            {t.expense.addExpense}
          </button>
        </div>

        {/* Stats Widget */}
        {statsData && (
          <div className="mb-8">
            <div className="space-y-6">
              {/* Umumiy statistika */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">{t.expense.totalExpenses}</p>
                      <p className="text-3xl font-bold">{statsData.summary?.totalExpenses || 0}</p>
                    </div>
                    <Icon name="statistics" className="text-4xl opacity-80" size="xl" />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">{t.common.total} {t.common.amount}</p>
                      <p className="text-2xl font-bold">{formatNumber(statsData.summary?.totalAmount || 0)}</p>
                    </div>
                    <Icon name="cash" className="text-4xl opacity-80" size="xl" />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">{t.expense.averageExpense}</p>
                      <p className="text-2xl font-bold">{formatNumber(statsData.summary?.avgExpense || 0)}</p>
                    </div>
                    <Icon name="profit" className="text-4xl opacity-80" size="xl" />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">{t.expense.topExpenseType}</p>
                      <p className="text-lg font-bold">
                        {statsData.byExpenseType?.length > 0 ? 
                          getExpenseTypeLabel(statsData.byExpenseType[0]._id) : 
                          t.common.noData
                        }
                      </p>
                    </div>
                    <Icon name="success" className="text-4xl opacity-80" size="xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Icon name="filter" className="mr-2" />
            {t.expense.filters}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t.expense.type}</label>
              <select
                value={filters.xarajatTuri}
                onChange={(e) => setFilters({...filters, xarajatTuri: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">{t.vagon.allTypes}</option>
                {expenseTypes?.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">{t.common.currency}</label>
              <select
                value={filters.valyuta}
                onChange={(e) => setFilters({...filters, valyuta: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">{t.vagon.allCurrencies}</option>
                <option value="USD">USD ($)</option>
                <option value="RUB">RUB (₽)</option>
              </select>
            </div>
            
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
              <label className="block text-sm font-medium mb-1">Qidiruv</label>
              <input
                type="text"
                placeholder="Tavsif bo'yicha..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilters({
                xarajatTuri: '',
                valyuta: '',
                startDate: '',
                endDate: '',
                search: ''
              })}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              {t.expense.clearFilters}
            </button>
          </div>
        </div>

        {/* Charts */}
        {statsData && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Icon name="statistics" className="mr-2" />
                {t.expense.expenseStats}
              </h3>
              <p className="text-gray-600">Grafiklar tez orada qo'shiladi...</p>
            </div>
          </div>
        )}

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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vagon</th>
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
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Icon name="add" className="mr-3" />
                {t.expense.addExpense}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Xarajat turi */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      1. {t.expense.selectExpenseType}
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {expenseTypes?.map(type => (
                        <div
                          key={type.id}
                          onClick={() => setFormData({...formData, xarajatTuri: type.id})}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.xarajatTuri === type.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center mb-2">
                            <span className="text-2xl mr-2">{type.icon}</span>
                            <span className="font-semibold">{type.name}</span>
                          </div>
                          <p className="text-xs text-gray-600">{type.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summa va valyuta */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      2. {t.common.amount}
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

                  {/* Tavsif */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      3. {t.common.description}
                    </label>
                    <textarea
                      required
                      value={formData.tavsif}
                      onChange={(e) => setFormData({...formData, tavsif: e.target.value})}
                      placeholder={t.expense.enterDescription}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                      rows={3}
                    />
                  </div>

                  {/* Javobgar shaxs */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      4. {t.expense.responsiblePerson}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.javobgarShaxs}
                      onChange={(e) => setFormData({...formData, javobgarShaxs: e.target.value})}
                      placeholder={t.expense.enterResponsiblePerson}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* Xarajat sanasi */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.expense.expenseDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.xarajatSanasi}
                      onChange={(e) => setFormData({...formData, xarajatSanasi: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* To'lov sanasi */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.expense.paymentDate} ({t.expense.optional})
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
                      {t.expense.documentNumber} ({t.expense.optional})
                    </label>
                    <input
                      type="text"
                      value={formData.hujjatRaqami}
                      onChange={(e) => setFormData({...formData, hujjatRaqami: e.target.value})}
                      placeholder="INV-001"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    />
                  </div>

                  {/* Vagon tanlash */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Bog'langan vagon ({t.expense.optional})
                    </label>
                    <select
                      value={formData.vagon}
                      onChange={(e) => setFormData({...formData, vagon: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500"
                    >
                      <option value="">Vagon tanlanmagan</option>
                      {Array.isArray(vagons) && vagons.map((vagon: any) => (
                        <option key={vagon._id} value={vagon._id}>
                          {vagon.vagonCode} - {vagon.sending_place} → {vagon.receiving_place}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qo'shimcha ma'lumot */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.expense.additionalInfo} ({t.expense.optional})
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
    </Layout>
  );
}
