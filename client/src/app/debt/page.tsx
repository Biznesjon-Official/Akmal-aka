'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/hooks/useConfirm';
import Layout from '@/components/Layout';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import FormattedInput from '@/components/FormattedInput';

// Helper function to format currency with decimal highlighting
const formatCurrencyWithDecimal = (amount: number, currency: 'USD' | 'RUB') => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = absAmount - integerPart;
  
  const formattedInteger = integerPart.toLocaleString('uz-UZ').replace(/,/g, ' ');
  
  const currencySymbol = currency === 'USD' ? '$' : '₽';
  const sign = isNegative ? '-' : '';
  
  if (decimalPart > 0) {
    // Kasr qismini 3 xonagacha ko'rsatish
    const decimalStr = decimalPart.toFixed(3).substring(2).replace(/0+$/, '');
    return (
      <span>
        {sign}{formattedInteger}
        <span className="text-sm">.{decimalStr}</span>
        {' '}{currencySymbol}
      </span>
    );
  }
  
  return `${sign}${formattedInteger} ${currencySymbol}`;
};

// Types
interface DebtRecord {
  _id: string;
  client?: {
    _id: string;
    name: string;
    phone: string;
  };
  one_time_client_name?: string;
  one_time_client_phone?: string;
  vagon: {
    _id: string;
    vagonCode: string;
  };
  yogoch: {
    _id: string;
    name?: string;
    dimensions: string;
  };
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: 'USD' | 'RUB';
  sold_quantity: number;
  sale_date: string;
  status: 'active' | 'paid' | 'overdue';
  payment_history: Array<{
    amount: number;
    date: string;
    description: string;
  }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentFormData {
  amount: string;
  description: string;
  date: string;
}

interface EditDebtFormData {
  notes: string;
  sale_date: string;
}

// Edit Debt Modal Component
interface EditDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
  onSuccess: () => void;
}

function EditDebtModal({ isOpen, onClose, debt, onSuccess }: EditDebtModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<EditDebtFormData>({
    notes: '',
    sale_date: ''
  });

  useEffect(() => {
    if (debt) {
      setFormData({
        notes: debt.notes || '',
        sale_date: debt.sale_date ? new Date(debt.sale_date).toISOString().split('T')[0] : ''
      });
    }
  }, [debt]);

  const editMutation = useMutation({
    mutationFn: async (data: EditDebtFormData) => {
      const response = await axios.put(`/debt/${debt?._id}`, data);
      return response.data;
    },
    onSuccess: () => {
      showToast.success('Qarz muvaffaqiyatli tahrirlandi');
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editMutation.mutate(formData);
  };

  if (!debt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Qarzni tahrirlash">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            {/* Qarz ma'lumotlari */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Qarz ma'lumotlari</h4>
              <div className="text-sm space-y-1">
                <div>Mijoz: <span className="font-medium">{debt.client?.name || debt.one_time_client_name}</span></div>
                <div>Qarz: <span className="font-medium text-red-600">{formatCurrencyWithDecimal(debt.remaining_amount, debt.currency)}</span></div>
              </div>
            </div>

            {/* Sana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qarz sanasi
              </label>
              <input
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
                className="input-field"
              />
            </div>

            {/* Izoh */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Izoh
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Qarz haqida qo'shimcha ma'lumot"
                className="input-field"
                rows={3}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            loading={editMutation.isPending}
            disabled={editMutation.isPending}
          >
            Saqlash
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// Payment Modal Component
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
  onSuccess: () => void;
}

function PaymentModal({ isOpen, onClose, debt, onSuccess }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/debt/${debt?._id}/payment`, {
        amount: parseFloat(amount),
        description: description.trim() || 'To\'lov',
        date: new Date().toISOString().split('T')[0]
      });
      return response.data;
    },
    onSuccess: () => {
      showToast.success('To\'lov muvaffaqiyatli qo\'shildi');
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: string[] = [];
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.push('To\'lov summasi 0 dan katta bo\'lishi kerak');
    }
    
    if (debt && parseFloat(amount) > debt.remaining_amount) {
      newErrors.push('To\'lov summasi qolgan qarzdan katta bo\'lmasin');
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    paymentMutation.mutate();
  };

  if (!debt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="To'lov qo'shish">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {/* Qarz summasi */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl mb-6 border border-red-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">Qolgan qarz</div>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrencyWithDecimal(debt.remaining_amount, debt.currency)}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {debt.client?.name || debt.one_time_client_name}
              </div>
            </div>
          </div>

          {/* Xatoliklar */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <Icon name="alert-circle" className="h-5 w-5 text-red-500 mr-2" />
                <h4 className="text-sm font-medium text-red-800">Xatoliklar:</h4>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {/* To'lov summasi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To'lov summasi ({debt.currency}) *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <FormattedInput
                    value={amount}
                    onChange={(value) => setAmount(value)}
                    placeholder="0"
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAmount(debt.remaining_amount.toString())}
                  className="whitespace-nowrap"
                >
                  To'liq
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Maksimal: {debt.remaining_amount.toFixed(2)} {debt.currency}
              </div>
            </div>

            {/* Tavsif (ixtiyoriy) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif (ixtiyoriy)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="To'lov haqida qisqacha ma'lumot"
                className="input-field"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            loading={paymentMutation.isPending}
            disabled={paymentMutation.isPending}
          >
            To'lov qo'shish
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default function DebtPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Qarzlar ro'yxati
  const { data: debtsData, isLoading } = useQuery({
    queryKey: ['debts', activeTab, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Arxiv yoki faol qarzlar
      if (activeTab === 'archive') {
        params.append('status', 'paid');
      } else {
        // Faol qarzlar (active va overdue)
        if (statusFilter && statusFilter !== 'paid') {
          params.append('status', statusFilter);
        } else if (!statusFilter) {
          // Agar filter bo'lmasa, faqat active va overdue ni ko'rsatish
          // Backend'da buni qo'llab-quvvatlamaydi, shuning uchun client-side filter qilamiz
        }
      }
      
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await axios.get(`/debt?${params}`);
      return response.data;
    },
    enabled: !!user
  });

  const debts = debtsData?.debts || [];
  
  // Client-side filter: Faol tabda faqat active va overdue
  const filteredDebts = activeTab === 'active' 
    ? debts.filter((d: DebtRecord) => d.status === 'active' || d.status === 'overdue')
    : debts;

  // O'chirish mutation
  const deleteMutation = useMutation({
    mutationFn: async (debtId: string) => {
      const response = await axios.delete(`/debt/${debtId}`);
      return response.data;
    },
    onSuccess: () => {
      showToast.success('Qarz muvaffaqiyatli o\'chirildi');
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const handlePayment = (debt: DebtRecord) => {
    setSelectedDebt(debt);
    setShowPaymentModal(true);
  };

  const handleEdit = (debt: DebtRecord) => {
    setSelectedDebt(debt);
    setShowEditModal(true);
  };

  const handleDelete = async (debt: DebtRecord) => {
    const confirmed = await confirm({
      title: 'Qarzni o\'chirish',
      message: `${debt.client?.name || debt.one_time_client_name} ning qarzini o'chirmoqchimisiz?`,
      confirmText: 'O\'chirish',
      cancelText: 'Bekor qilish'
    });

    if (confirmed) {
      deleteMutation.mutate(debt._id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'paid': return 'To\'langan';
      case 'overdue': return 'Muddati o\'tgan';
      default: return status;
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
          <div className="space-y-8">
            <div className="h-48 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div className="h-16 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-red-700">
          <div className="absolute inset-0 bg-black/5"></div>
          
          <div className="relative px-6 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                      <Icon name="credit-card" className="h-9 w-9 text-white" />
                    </div>
                    <div>
                      <h1 className="text-5xl lg:text-6xl font-bold text-white mb-2">
                        Qarz Daftarcha
                      </h1>
                      <p className="text-xl text-white/90">
                        Mijozlar qarzlarini boshqarish tizimi
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-white">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">{filteredDebts.length}</div>
                      <div className="text-sm opacity-90">{activeTab === 'active' ? 'Faol qarzlar' : 'Arxiv'}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">
                        {filteredDebts.filter((d: DebtRecord) => d.status === 'active').length}
                      </div>
                      <div className="text-sm opacity-90">Faol</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {formatCurrency(
                          filteredDebts.reduce((sum: number, d: DebtRecord) => sum + (d.status === 'active' ? d.remaining_amount : 0), 0),
                          'USD'
                        )}
                      </div>
                      <div className="text-sm opacity-90">Jami qarz (USD)</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">
                        {filteredDebts.filter((d: DebtRecord) => d.status === 'overdue').length}
                      </div>
                      <div className="text-sm opacity-90">Muddati o'tgan</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg mb-6">
              <div className="flex border-b">
                <button
                  onClick={() => {
                    setActiveTab('active');
                    setStatusFilter('');
                  }}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === 'active'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="credit-card" className="h-5 w-5" />
                    <span>Faol Qarzlar</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      {debts.filter((d: DebtRecord) => d.status === 'active' || d.status === 'overdue').length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('archive');
                    setStatusFilter('');
                  }}
                  className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                    activeTab === 'archive'
                      ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="archive" className="h-5 w-5" />
                    <span>Arxiv</span>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      {debts.filter((d: DebtRecord) => d.status === 'paid').length}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeTab === 'active' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Holat bo'yicha filter
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Barcha holatlar</option>
                      <option value="active">Faol qarzlar</option>
                      <option value="overdue">Muddati o'tgan</option>
                    </select>
                  </div>
                )}
                
                <div className={activeTab === 'archive' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qidiruv
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Mijoz nomi yoki telefon raqami"
                    className="input-field"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setStatusFilter('');
                      setSearchTerm('');
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    <Icon name="refresh-cw" className="h-4 w-4 mr-2" />
                    Tozalash
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debts List */}
        <div className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            {filteredDebts.length === 0 ? (
              <div className="text-center py-12">
                <Icon name={activeTab === 'active' ? 'credit-card' : 'archive'} className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeTab === 'active' ? 'Qarzlar topilmadi' : 'Arxiv bo\'sh'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'active' 
                    ? 'Hozircha hech qanday faol qarz mavjud emas' 
                    : 'To\'langan qarzlar bu yerda ko\'rsatiladi'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDebts.map((debt: DebtRecord) => (
                  <Card key={debt._id} className="p-6 hover:shadow-xl transition-all duration-300">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(debt.status)}`}>
                        {getStatusText(debt.status)}
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Qarz sanasi</div>
                        <div className="text-sm font-medium">{formatDate(debt.sale_date)}</div>
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {debt.client?.name || debt.one_time_client_name || 'Noma\'lum mijoz'}
                        {debt.one_time_client_name && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Bir martalik
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {debt.client?.phone || debt.one_time_client_phone || '-'}
                      </p>
                    </div>

                    {/* Product Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Mahsulot</div>
                      <div className="font-medium">{debt.vagon?.vagonCode || 'N/A'}</div>
                      <div className="text-sm text-gray-600">
                        {debt.yogoch?.name || debt.yogoch?.dimensions || 'N/A'} - {debt.sold_quantity || 0} dona
                      </div>
                    </div>

                    {/* Financial Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Jami summa:</span>
                        <span className="font-medium">{formatCurrencyWithDecimal(debt.total_amount, debt.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">To'langan:</span>
                        <span className="font-medium text-green-600">{formatCurrencyWithDecimal(debt.paid_amount, debt.currency)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-900">Qolgan qarz:</span>
                        <span className="font-bold text-red-600">{formatCurrencyWithDecimal(debt.remaining_amount, debt.currency)}</span>
                      </div>
                    </div>

                    {/* Payment History */}
                    {debt.payment_history && debt.payment_history.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          To'lovlar tarixi ({debt.payment_history.length} ta)
                        </div>
                        <div className="max-h-20 overflow-y-auto space-y-1">
                          {debt.payment_history.slice(-3).map((payment, index) => (
                            <div key={index} className="text-xs bg-green-50 p-2 rounded border border-green-200">
                              <div className="flex justify-between">
                                <span>{formatCurrencyWithDecimal(payment.amount, debt.currency)}</span>
                                <span>{formatDate(payment.date)}</span>
                              </div>
                              {payment.description && (
                                <div className="text-gray-600 mt-1">{payment.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {debt.status === 'active' && (
                        <>
                          <Button
                            onClick={() => handlePayment(debt)}
                            className="flex-1"
                            size="sm"
                          >
                            <Icon name="credit-card" className="h-4 w-4 mr-2" />
                            To'lov
                          </Button>
                          <Button
                            onClick={() => handleEdit(debt)}
                            variant="secondary"
                            size="sm"
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {debt.status === 'paid' && (
                        <>
                          <Button
                            onClick={() => handleEdit(debt)}
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                          >
                            <Icon name="edit" className="h-4 w-4 mr-2" />
                            Tahrirlash
                          </Button>
                          <Button
                            onClick={() => handleDelete(debt)}
                            variant="secondary"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Icon name="trash-2" className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {debt.status === 'overdue' && (
                        <>
                          <Button
                            onClick={() => handlePayment(debt)}
                            className="flex-1"
                            size="sm"
                          >
                            <Icon name="credit-card" className="h-4 w-4 mr-2" />
                            To'lov
                          </Button>
                          <Button
                            onClick={() => handleEdit(debt)}
                            variant="secondary"
                            size="sm"
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        debt={selectedDebt}
        onSuccess={() => {}}
      />

      {/* Edit Modal */}
      <EditDebtModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        debt={selectedDebt}
        onSuccess={() => {}}
      />
    </Layout>
  );
}