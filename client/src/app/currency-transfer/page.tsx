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

// Types
interface CurrencyTransfer {
  _id: string;
  from_currency: 'USD' | 'RUB';
  to_currency: 'USD' | 'RUB';
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  transfer_date: string;
  notes?: string;
  created_by: {
    username: string;
  };
  status: 'completed' | 'cancelled';
}

interface ExchangeRate {
  _id: string;
  from_currency: 'USD' | 'RUB';
  to_currency: 'USD' | 'RUB';
  rate: number;
  effective_date: string;
  is_active: boolean;
}

interface Balance {
  USD: number;
  RUB: number;
}

export default function CurrencyTransferPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (!authLoading && !user) {
    return null;
  }

  // Balanslarni olish
  const { data: balances, isLoading: balancesLoading } = useQuery<Balance>({
    queryKey: ['currency-balances'],
    queryFn: async () => {
      const response = await axios.get('/currency-transfer/balance/all');
      return response.data.data;
    }
  });

  // Joriy kurslarni olish
  const { data: rates, isLoading: ratesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate/current');
      return response.data.data;
    }
  });

  // O'tkazmalar tarixini olish
  const { data: transfers, isLoading: transfersLoading } = useQuery<CurrencyTransfer[]>({
    queryKey: ['currency-transfers'],
    queryFn: async () => {
      const response = await axios.get('/currency-transfer');
      return response.data.data;
    }
  });

  if (authLoading || balancesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Valyuta O'tkazmalari
            </h1>
            <p className="text-gray-600 mt-1">
              USD va RUB hisoblar orasida pul o'tkazish
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsDepositModalOpen(true)}
              variant="secondary"
            >
              <Icon name="plus" className="w-5 h-5 mr-2" />
              Hisobni To'ldirish
            </Button>
            {user?.role === 'admin' && (
              <Button
                onClick={() => setIsRateModalOpen(true)}
                variant="secondary"
              >
                <Icon name="settings" className="w-5 h-5 mr-2" />
                Kursni O'rnatish
              </Button>
            )}
            <Button onClick={() => setIsTransferModalOpen(true)}>
              <Icon name="exchange" className="w-5 h-5 mr-2" />
              Valyuta O'tkazish
            </Button>
          </div>
        </div>

        {/* Balanslar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BalanceCard
            currency="USD"
            balance={balances?.USD || 0}
            symbol="$"
            color="green"
          />
          <BalanceCard
            currency="RUB"
            balance={balances?.RUB || 0}
            symbol="₽"
            color="blue"
          />
        </div>

        {/* Joriy Kurslar */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Joriy Valyuta Kurslari</h2>
            {ratesLoading ? (
              <div className="text-center py-4">Yuklanmoqda...</div>
            ) : rates && rates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rates.map((rate) => (
                  <div
                    key={rate._id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">
                          1 {rate.from_currency} =
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {rate.rate.toFixed(2)} {rate.to_currency}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {formatDate(rate.effective_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Kurslar topilmadi
              </div>
            )}
          </div>
        </Card>

        {/* O'tkazmalar Tarixi */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">O'tkazmalar Tarixi</h2>
            {transfersLoading ? (
              <div className="text-center py-4">Yuklanmoqda...</div>
            ) : transfers && transfers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Sana
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kurs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Foydalanuvchi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Izoh
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers.map((transfer) => (
                      <tr key={transfer._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transfer.transfer_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-red-600">
                            -{formatCurrency(transfer.from_amount, transfer.from_currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">
                            +{formatCurrency(transfer.to_amount, transfer.to_currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          1 {transfer.from_currency} = {transfer.exchange_rate} {transfer.to_currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.created_by?.username || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {transfer.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Hali o'tkazmalar yo'q
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          balances={balances}
          rates={rates}
        />
      )}

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
        />
      )}

      {/* Rate Modal */}
      {isRateModalOpen && user?.role === 'admin' && (
        <RateModal
          isOpen={isRateModalOpen}
          onClose={() => setIsRateModalOpen(false)}
        />
      )}
    </Layout>
  );
}


// Balance Card Component
interface BalanceCardProps {
  currency: 'USD' | 'RUB';
  balance: number;
  symbol: string;
  color: 'green' | 'blue';
}

function BalanceCard({ currency, balance, symbol, color }: BalanceCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  return (
    <Card>
      <div className={`p-6 border-l-4 ${colorClasses[color]}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium opacity-75">{currency} Hisob</p>
            <p className="text-3xl font-bold mt-2">
              {symbol}{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className={`p-3 rounded-full ${color === 'green' ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Icon name="wallet" className="w-6 h-6" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// Transfer Modal Component
interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances?: Balance;
  rates?: ExchangeRate[];
}

function TransferModal({ isOpen, onClose, balances, rates }: TransferModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    from_currency: 'USD' as 'USD' | 'RUB',
    to_currency: 'RUB' as 'USD' | 'RUB',
    from_amount: '',
    notes: ''
  });
  const [convertedAmount, setConvertedAmount] = useState<number>(0);

  // Kursni topish
  const currentRate = rates?.find(
    r => r.from_currency === formData.from_currency && r.to_currency === formData.to_currency
  );

  // Konvertatsiya qilish
  useEffect(() => {
    if (formData.from_amount && currentRate) {
      const amount = parseFloat(formData.from_amount);
      if (!isNaN(amount)) {
        setConvertedAmount(amount * currentRate.rate);
      }
    } else {
      setConvertedAmount(0);
    }
  }, [formData.from_amount, currentRate]);

  // Valyutalarni almashtirish
  const swapCurrencies = () => {
    setFormData(prev => ({
      ...prev,
      from_currency: prev.to_currency,
      to_currency: prev.from_currency
    }));
  };

  // O'tkazma mutation
  const transferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.post('/currency-transfer', data);
      return response.data;
    },
    onSuccess: () => {
      showToast.success('Valyuta o\'tkazmasi muvaffaqiyatli amalga oshirildi');
      queryClient.invalidateQueries({ queryKey: ['currency-balances'] });
      queryClient.invalidateQueries({ queryKey: ['currency-transfers'] });
      onClose();
      setFormData({
        from_currency: 'USD',
        to_currency: 'RUB',
        from_amount: '',
        notes: ''
      });
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validatsiya
    if (!formData.from_amount || parseFloat(formData.from_amount) <= 0) {
      showToast.error('Summani kiriting');
      return;
    }

    if (!currentRate) {
      showToast.error('Valyuta kursi topilmadi');
      return;
    }

    const amount = parseFloat(formData.from_amount);
    const currentBalance = balances?.[formData.from_currency] || 0;

    if (amount > currentBalance) {
      showToast.error(`${formData.from_currency} hisobida yetarli mablag' yo'q`);
      return;
    }

    transferMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Valyuta O'tkazish">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            {/* From Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qaysi valyutadan
              </label>
              <select
                value={formData.from_currency}
                onChange={(e) => setFormData({ ...formData, from_currency: e.target.value as 'USD' | 'RUB' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="RUB">RUB (₽)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Mavjud: {balances?.[formData.from_currency]?.toLocaleString() || 0} {formData.from_currency}
              </p>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapCurrencies}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Icon name="swap" className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* To Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qaysi valyutaga
              </label>
              <select
                value={formData.to_currency}
                onChange={(e) => setFormData({ ...formData, to_currency: e.target.value as 'USD' | 'RUB' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="RUB">RUB (₽)</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summa ({formData.from_currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.from_amount}
                onChange={(e) => setFormData({ ...formData, from_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            {/* Exchange Rate Info */}
            {currentRate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Joriy kurs:</span>
                  <span className="text-sm font-medium">
                    1 {formData.from_currency} = {currentRate.rate} {formData.to_currency}
                  </span>
                </div>
                {formData.from_amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Olinadi:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {formData.to_currency}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Izoh (ixtiyoriy)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Masalan: Vagon sotib olish uchun"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={transferMutation.isPending}>
            {transferMutation.isPending ? 'O\'tkazilmoqda...' : 'O\'tkazish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// Rate Modal Component (Admin only)
interface RateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Deposit Modal Component
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    currency: 'USD' as 'USD' | 'RUB',
    amount: '',
    notes: ''
  });

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Deposit request data:', {
        currency: data.currency,
        amount: parseFloat(data.amount),
        notes: data.notes
      });
      
      const response = await axios.post('/currency-transfer/deposit', {
        currency: data.currency,
        amount: parseFloat(data.amount),
        notes: data.notes
      });
      return response.data;
    },
    onSuccess: () => {
      showToast.success('Hisob muvaffaqiyatli to\'ldirildi');
      queryClient.invalidateQueries({ queryKey: ['currency-balances'] });
      queryClient.invalidateQueries({ queryKey: ['currency-transfers'] });
      onClose();
      setFormData({
        currency: 'USD',
        amount: '',
        notes: ''
      });
    },
    onError: (error: any) => {
      console.error('Deposit error:', error.response?.data);
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form data before validation:', formData);
    
    if (!formData.amount || formData.amount.trim() === '') {
      showToast.error('Summani kiriting');
      return;
    }
    
    const amountValue = parseFloat(formData.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      showToast.error('Summa 0 dan katta bo\'lishi kerak');
      return;
    }
    
    if (!formData.notes || formData.notes.trim() === '') {
      showToast.error('Izoh kiritish majburiy');
      return;
    }

    console.log('Submitting deposit:', {
      currency: formData.currency,
      amount: amountValue,
      notes: formData.notes
    });

    depositMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hisobni To'ldirish">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 Bu funksiya CRM ni boshlash uchun dastlabki balansni kiritish uchun ishlatiladi.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valyuta
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'RUB' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="RUB">RUB (₽)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summa
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Izoh
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Masalan: Dastlabki balans"
                required
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={depositMutation.isPending}>
            {depositMutation.isPending ? 'To\'ldirilmoqda...' : 'To\'ldirish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function RateModal({ isOpen, onClose }: RateModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    from_currency: 'USD' as 'USD' | 'RUB',
    to_currency: 'RUB' as 'USD' | 'RUB',
    rate: '',
    notes: ''
  });

  // Kurs o'rnatish mutation
  const rateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.post('/exchange-rate', {
        from_currency: data.from_currency,
        to_currency: data.to_currency,
        rate: parseFloat(data.rate), // String'dan number'ga o'tkazish
        notes: data.notes
      });
      return response.data;
    },
    onSuccess: () => {
      showToast.success('Valyuta kursi muvaffaqiyatli o\'rnatildi');
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      onClose();
      setFormData({
        from_currency: 'USD',
        to_currency: 'RUB',
        rate: '',
        notes: ''
      });
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      showToast.error('Kurs qiymatini kiriting');
      return;
    }

    rateMutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Valyuta Kursini O'rnatish">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Diqqat: Yangi kurs o'rnatilganda, eski kurs avtomatik deaktiv bo'ladi.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qaysi valyutadan
              </label>
              <select
                value={formData.from_currency}
                onChange={(e) => setFormData({ ...formData, from_currency: e.target.value as 'USD' | 'RUB' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qaysi valyutaga
              </label>
              <select
                value={formData.to_currency}
                onChange={(e) => setFormData({ ...formData, to_currency: e.target.value as 'USD' | 'RUB' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kurs (1 {formData.from_currency} = ? {formData.to_currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Masalan: 85"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Misol: 1 USD = 85 RUB
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Izoh (ixtiyoriy)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Masalan: Yangi kurs"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={rateMutation.isPending}>
            {rateMutation.isPending ? 'O\'rnatilmoqda...' : 'O\'rnatish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
