'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import FormattedInput from '@/components/FormattedInput';

// Types
interface DebtRecord {
  _id: string;
  client: {
    _id: string;
    name: string;
    phone: string;
  };
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
  createdAt: string;
  updatedAt: string;
}

interface PaymentFormData {
  amount: string;
  description: string;
  date: string;
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
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState<string[]>([]);

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await axios.post(`/debt/${debt?._id}/payment`, {
        amount: parseFloat(data.amount),
        description: data.description,
        date: data.date
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
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: string[] = [];
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.push('To\'lov summasi 0 dan katta bo\'lishi kerak');
    }
    
    if (debt && parseFloat(formData.amount) > debt.remaining_amount) {
      newErrors.push('To\'lov summasi qolgan qarzdan katta bo\'lmasin');
    }
    
    if (!formData.description.trim()) {
      newErrors.push('Tavsif kiritilishi shart');
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    paymentMutation.mutate(formData);
  };

  if (!debt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="To'lov qo'shish">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {/* Qarz ma'lumotlari */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Qarz ma'lumotlari</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Mijoz:</span>
                <div className="font-medium">{debt.client.name}</div>
              </div>
              <div>
                <span className="text-gray-600">Telefon:</span>
                <div className="font-medium">{debt.client.phone}</div>
              </div>
              <div>
                <span className="text-gray-600">Vagon:</span>
                <div className="font-medium">{debt.vagon.vagonCode}</div>
              </div>
              <div>
                <span className="text-gray-600">Yog'och:</span>
                <div className="font-medium">{debt.yogoch.name || debt.yogoch.dimensions}</div>
              </div>
              <div>
                <span className="text-gray-600">Jami qarz:</span>
                <div className="font-medium text-red-600">
                  {formatCurrency(debt.total_amount, debt.currency)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Qolgan qarz:</span>
                <div className="font-medium text-red-600">
                  {formatCurrency(debt.remaining_amount, debt.currency)}
                </div>
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
              <FormattedInput
                value={formData.amount}
                onChange={(value) => setFormData({...formData, amount: value})}
                placeholder={`Maksimal: ${debt.remaining_amount.toFixed(2)}`}
                required
              />
            </div>

            {/* Tavsif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="To'lov haqida qisqacha ma'lumot"
                className="input-field"
                required
              />
            </div>

            {/* Sana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To'lov sanasi *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="input-field"
                required
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
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Qarzlar ro'yxati
  const { data: debtsData, isLoading } = useQuery({
    queryKey: ['debts', statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await axios.get(`/debt?${params}`);
      return response.data;
    },
    enabled: !!user
  });

  const debts = debtsData?.debts || [];

  const handlePayment = (debt: DebtRecord) => {
    setSelectedDebt(debt);
    setShowPaymentModal(true);
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
                      <div className="text-2xl font-bold">{debts.length}</div>
                      <div className="text-sm opacity-90">Jami qarzlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">
                        {debts.filter((d: DebtRecord) => d.status === 'active').length}
                      </div>
                      <div className="text-sm opacity-90">Faol qarzlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {formatCurrency(
                          debts.reduce((sum: number, d: DebtRecord) => sum + (d.status === 'active' ? d.remaining_amount : 0), 0),
                          'USD'
                        )}
                      </div>
                      <div className="text-sm opacity-90">Jami qarz (USD)</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">
                        {debts.filter((d: DebtRecord) => d.status === 'overdue').length}
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
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <option value="paid">To'langan</option>
                    <option value="overdue">Muddati o'tgan</option>
                  </select>
                </div>
                
                <div>
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
            {debts.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="credit-card" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Qarzlar topilmadi</h3>
                <p className="text-gray-600">Hozircha hech qanday qarz mavjud emas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {debts.map((debt: DebtRecord) => (
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
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{debt.client.name}</h3>
                      <p className="text-sm text-gray-600">{debt.client.phone}</p>
                    </div>

                    {/* Product Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Mahsulot</div>
                      <div className="font-medium">{debt.vagon.vagonCode}</div>
                      <div className="text-sm text-gray-600">
                        {debt.yogoch.name || debt.yogoch.dimensions} - {debt.sold_quantity} dona
                      </div>
                    </div>

                    {/* Financial Info */}
                    <div className="space-y-2 mb-4">
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
                                <span>{formatCurrency(payment.amount, debt.currency)}</span>
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
                    {debt.status === 'active' && (
                      <Button
                        onClick={() => handlePayment(debt)}
                        className="w-full"
                        size="sm"
                      >
                        <Icon name="credit-card" className="h-4 w-4 mr-2" />
                        To'lov qo'shish
                      </Button>
                    )}
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
    </Layout>
  );
}