'use client';

import { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import ExpenseModal from '@/components/expenses/ExpenseModal';

export default function ExpensesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [filters, setFilters] = useState({
    vagon: '',
    type: '',
    startDate: '',
    endDate: ''
  });

  // Scroll lock for modal
  useScrollLock(isModalOpen);

  // Xarajatlarni olish
  const { data: expenses = [], isLoading } = useQuery({
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

  const expenseTypes = [
    { value: 'transport_kz', label: 'Transport KZ' },
    { value: 'transport_uz', label: 'Transport UZ' },
    { value: 'transport_kelish', label: 'Transport kelish' },
    { value: 'bojxona_nds', label: 'Bojxona NDS' },
    { value: 'yuklash_tushirish', label: 'Yuklash/Tushirish' },
    { value: 'saqlanish', label: 'Saqlanish' },
    { value: 'ishchilar', label: 'Ishchilar' },
    { value: 'boshqa', label: 'Boshqa' }
  ];

  return (
    <Layout>
      <div className="container-full-desktop space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Icon name="expenses" className="text-white" />
              </div>
              Xarajatlar
            </h1>
            <p className="text-gray-500 mt-1">Barcha xarajatlarni boshqaring</p>
          </div>
          
          <button
            onClick={handleAdd}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Icon name="add" size="sm" />
            <span className="hidden sm:inline">Yangi xarajat</span>
            <span className="sm:hidden">Qo'shish</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jami xarajatlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {expenses.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Icon name="list" className="text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jami summa</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalExpenses, 'USD')}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Icon name="cash" className="text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bu oy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {expenses.filter((exp: any) => {
                    const expDate = new Date(exp.expense_date);
                    const now = new Date();
                    return expDate.getMonth() === now.getMonth() && 
                           expDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Icon name="calendar" className="text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">O'rtacha</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0, 'USD')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Icon name="trending-up" className="text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    {vagon.vagon_code}
                  </option>
                ))}
              </select>
            </div>
            
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boshlanish sanasi
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
                Tugash sanasi
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
                className="btn-secondary w-full"
              >
                Tozalash
              </button>
            </div>
          </div>
        </Card>

        {/* Expenses Table */}
        <Card>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="expenses" className="mx-auto text-gray-400 mb-4" size="lg" />
              <p className="text-gray-500">Xarajatlar topilmadi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableHead>Sana</TableHead>
                <TableHead>Vagon</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Tavsif</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Javobgar</TableHead>
                <TableHead>Amallar</TableHead>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: any) => (
                  <TableRow key={expense._id}>
                    <TableCell>
                      {formatDate(expense.expense_date)}
                    </TableCell>
                    <TableCell>
                      {expense.vagon?.vagon_code || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        {expenseTypes.find(t => t.value === expense.expense_type)?.label || expense.expense_type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </TableCell>
                    <TableCell>
                      {expense.responsible_person || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Icon name="edit" size="sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Icon name="delete" size="sm" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

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
      </div>
    </Layout>
  );
}