'use client';

import { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import ExpenseModal from '@/components/expenses/ExpenseModal';

// TypeScript interfaces
interface Expense {
  _id: string;
  vagon?: {
    _id: string;
    vagonCode: string;
  };
  type: string;
  amount: number;
  currency: string;
  description: string;
  responsible_person?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseFilters {
  vagon: string;
  type: string;
  startDate: string;
  endDate: string;
}

export default function ExpensesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'debts'>('expenses');
  const [filters, setFilters] = useState<ExpenseFilters>({
    vagon: '',
    type: '',
    startDate: '',
    endDate: ''
  });

  // Scroll lock for modal
  useScrollLock(isModalOpen);

  // Xarajatlarni olish (vagon xarajatlari)
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.vagon) params.append('vagon', filters.vagon);
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await axios.get(`/vagon-expense?${params.toString()}`);
      return response.data;
    },
    staleTime: 30000,
  });

  // Shaxsiy qarzlarni olish
  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ['debts-for-expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await axios.get(`/debt?${params.toString()}`);
      return response.data.debts || [];
    },
    staleTime: 30000,
  });

  const isLoading = expensesLoading || debtsLoading;

  // Vagonlarni olish
  const { data: vagons = [] } = useQuery({
    queryKey: ['vagons-list'],
    queryFn: async () => {
      const response = await axios.get('/vagon');
      return response.data.vagons || [];
    },
    staleTime: 60000,
  });

  // Xarajatni o'chirish
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/vagon-expense/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      showToast.success('Xarajat o\'chirildi');
    },
    onError: () => {
      showToast.error('Xarajatni o\'chirishda xatolik');
    }
  });

  const handleAdd = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleEdit = (expense: any) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Rostdan ham bu xarajatni o\'chirmoqchimisiz?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  const clearFilters = () => {
    setFilters({
      vagon: '',
      type: '',
      startDate: '',
      endDate: ''
    });
  };

  // Jami xarajatni hisoblash
  const totalExpenses = expenses.reduce((sum: number, expense: any) => {
    return sum + (expense.amount || 0);
  }, 0);

  // Jami qarzlarni hisoblash
  const totalDebts = (debtsData || []).reduce((sum: number, debt: any) => {
    return sum + (debt.remaining_amount || 0);
  }, 0);

  // Umumiy jami
  const grandTotal = totalExpenses + totalDebts;

  const expenseTypes = [
    { value: 'transport_kz', label: 'Transport KZ', icon: 'truck', color: 'blue' },
    { value: 'transport_uz', label: 'Transport UZ', icon: 'truck', color: 'green' },
    { value: 'transport_kelish', label: 'Transport kelish', icon: 'truck', color: 'purple' },
    { value: 'bojxona_nds', label: 'Bojxona NDS', icon: 'file-text', color: 'red' },
    { value: 'yuklash_tushirish', label: 'Yuklash/Tushirish', icon: 'package', color: 'orange' },
    { value: 'saqlanish', label: 'Saqlanish', icon: 'archive', color: 'yellow' },
    { value: 'ishchilar', label: 'Ishchilar', icon: 'users', color: 'indigo' },
    { value: 'boshqa', label: 'Boshqa', icon: 'more-horizontal', color: 'gray' }
  ];

  const getExpenseTypeInfo = (type: string) => {
    return expenseTypes.find(t => t.value === type) || expenseTypes[expenseTypes.length - 1];
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Ultra Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-red-600 to-pink-600">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          
          <div className="relative px-6 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                      <Icon name="trending-down" className="h-9 w-9 text-white" />
                    </div>
                    <div>
                      <h1 className="text-5xl lg:text-6xl font-bold text-white mb-2">
                        Xarajatlar
                      </h1>
                      <p className="text-xl text-white/90">
                        Barcha xarajatlarni boshqarish tizimi
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-white">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">{expenses.length}</div>
                      <div className="text-sm opacity-90">Vagon xarajatlari</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">{(debtsData || []).length}</div>
                      <div className="text-sm opacity-90">Shaxsiy qarzlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {formatCurrency(totalExpenses, 'USD')}
                      </div>
                      <div className="text-sm opacity-90">Xarajatlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {formatCurrency(grandTotal, 'USD')}
                      </div>
                      <div className="text-sm opacity-90">Umumiy jami</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAdd}
                    className="bg-white text-orange-600 px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-3"
                  >
                    <Icon name="plus" className="h-6 w-6" />
                    Yangi xarajat
                  </button>
                  
                  <button
                    onClick={() => setIsSourceModalOpen(true)}
                    className="bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 px-6 py-4 rounded-2xl font-semibold hover:bg-white/30 transition-all duration-300 flex items-center gap-3"
                  >
                    <Icon name="settings" className="h-6 w-6" />
                    Xarajat manbaasini qo'shish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg mb-6">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === 'expenses'
                      ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="trending-down" className="h-5 w-5" />
                    <span>Vagon Xarajatlari</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      {expenses.length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('debts')}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === 'debts'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="credit-card" className="h-5 w-5" />
                    <span>Shaxsiy Qarzlar</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      {(debtsData || []).length}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vagon
                  </label>
                  <select
                    value={filters.vagon}
                    onChange={(e) => setFilters({...filters, vagon: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Barcha vagonlar</option>
                    {vagons.map((vagon: any) => (
                      <option key={vagon._id} value={vagon._id}>
                        {vagon.vagonCode}
                      </option>
                    ))}
                  </select>
                </div>
                
                {activeTab === 'expenses' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Xarajat turi
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({...filters, type: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Barcha turlar</option>
                      {expenseTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Boshlanish
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tugash
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="input-field"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Icon name="refresh-cw" className="h-4 w-4" />
                    Tozalash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'expenses' ? (
              /* Vagon Xarajatlari */
              expensesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                  <Icon name="trending-down" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Xarajatlar topilmadi</h3>
                  <p className="text-gray-600 mb-6">Hozircha hech qanday xarajat mavjud emas</p>
                  <button onClick={handleAdd} className="btn-primary">
                    <Icon name="plus" className="h-4 w-4 mr-2" />
                    Birinchi xarajatni qo'shing
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Turi
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Vagon
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Summa
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Javobgar
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Sana
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Tavsif
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Amallar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {expenses.map((expense: any) => {
                          const typeInfo = getExpenseTypeInfo(expense.type);
                          return (
                            <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 bg-${typeInfo.color}-100 rounded-lg flex items-center justify-center`}>
                                    <Icon name={typeInfo.icon as any} className={`h-5 w-5 text-${typeInfo.color}-600`} />
                                  </div>
                                  <span className={`px-3 py-1 text-xs font-bold bg-${typeInfo.color}-100 text-${typeInfo.color}-800 rounded-full`}>
                                    {typeInfo.label}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {expense.vagon ? (
                                  <div className="flex items-center text-sm text-gray-900">
                                    <Icon name="truck" className="h-4 w-4 mr-2 text-gray-400" />
                                    <span className="font-medium">{expense.vagon.vagonCode}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-lg font-bold text-gray-900">
                                  {formatCurrency(expense.amount, expense.currency)}
                                </div>
                                <div className="text-xs text-gray-500">{expense.currency}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {expense.responsible_person ? (
                                  <div className="flex items-center text-sm text-gray-900">
                                    <Icon name="user" className="h-4 w-4 mr-2 text-gray-400" />
                                    <span>{expense.responsible_person}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Icon name="calendar" className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{formatDate(expense.date || expense.createdAt)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {expense.description || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEdit(expense)}
                                    className="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors"
                                    title="Tahrirlash"
                                  >
                                    <Icon name="edit" className="h-4 w-4 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(expense._id)}
                                    className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors"
                                    title="O'chirish"
                                  >
                                    <Icon name="trash-2" className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
              /* Shaxsiy Qarzlar */
              debtsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
                </div>
              ) : !debtsData || debtsData.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                  <Icon name="credit-card" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Qarzlar topilmadi</h3>
                  <p className="text-gray-600">Hozircha hech qanday qarz mavjud emas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {debtsData.map((debt: any) => (
                    <Card key={debt._id} className="p-6 hover:shadow-xl transition-all duration-300">
                      {/* Status Badge */}
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          debt.status === 'paid' 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : debt.status === 'overdue'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}>
                          {debt.status === 'paid' ? 'To\'langan' : debt.status === 'overdue' ? 'Muddati o\'tgan' : 'Faol'}
                        </span>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Qarz sanasi</div>
                          <div className="text-sm font-medium">{formatDate(debt.sale_date || debt.createdAt)}</div>
                        </div>
                      </div>

                      {/* Client Info */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {debt.client?.name || debt.one_time_client_name || '-'}
                        </h3>
                        <p className="text-sm text-gray-600">{debt.client?.phone || debt.one_time_client_phone || ''}</p>
                      </div>

                      {/* Product Info */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Mahsulot</div>
                        <div className="font-medium">{debt.vagon?.vagonCode || '-'}</div>
                      </div>

                      {/* Financial Info */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Jami summa:</span>
                          <span className="font-medium">{formatCurrency(debt.total_amount, debt.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">To'langan:</span>
                          <span className="font-medium text-green-600">{formatCurrency(debt.paid_amount, debt.currency)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-medium text-gray-900">Qolgan qarz:</span>
                          <span className="font-bold text-red-600">{formatCurrency(debt.remaining_amount, debt.currency)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <Suspense fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              </div>
            </div>
          }>
            <ExpenseModal
              expense={selectedExpense}
              onClose={handleModalClose}
            />
          </Suspense>
        )}
        
        {/* Xarajat manbaasi modali */}
        {isSourceModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Xarajat Manbaalarini Boshqarish</h2>
                  <button
                    onClick={() => setIsSourceModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                  >
                    <Icon name="x" className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Xarajat manbaalarini qo'shish va boshqarish uchun quyidagi ro'yxatdan foydalaning.
                  </p>
                </div>
                
                {/* Mavjud xarajat turlari */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Mavjud Xarajat Turlari:</h3>
                  {expenseTypes.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-${type.color}-100 flex items-center justify-center`}>
                          <Icon name={type.icon} className={`h-6 w-6 text-${type.color}-600`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{type.label}</p>
                          <p className="text-sm text-gray-500">{type.value}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Faol
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Icon name="info" className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">Ma'lumot</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Yangi xarajat manbaasini qo'shish uchun administrator bilan bog'laning. 
                        Tizim sozlamalarida yangi xarajat turlari qo'shilishi mumkin.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t">
                <button
                  onClick={() => setIsSourceModalOpen(false)}
                  className="w-full bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
