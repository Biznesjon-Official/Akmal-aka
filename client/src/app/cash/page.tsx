'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { formatCurrency } from '@/utils/formatters';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';

// MIJOZ TO'LOVI KOMPONENTI
interface Client {
  _id: string;
  name: string;
  phone: string;
  usd_total_debt: number;
  usd_current_debt: number;
  rub_total_debt: number;
  rub_current_debt: number;
  usd_total_paid: number;
  rub_total_paid: number;
}

interface ClientPaymentFormProps {
  onPaymentSuccess: () => void;
}

function ClientPaymentForm({ onPaymentSuccess }: ClientPaymentFormProps) {
  const { t } = useLanguage();
  const [selectedClient, setSelectedClient] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('USD');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mijozlar ro'yxatini olish
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['clients-for-payment'],
    queryFn: async () => {
      const response = await axios.get('/client');
      const clientsData = response.data.clients || response.data || [];
      return clientsData.filter((client: Client) => 
        client.usd_current_debt > 0 || client.rub_current_debt > 0
      );
    }
  });

  const selectedClientData = clients?.find(c => c._id === selectedClient);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !paymentAmount) {
      alert(t.messages.enterClientAndAmount);
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      alert(t.messages.amountMustBePositive);
      return;
    }

    const clientDebt = paymentCurrency === 'USD' 
      ? selectedClientData?.usd_current_debt || 0
      : selectedClientData?.rub_current_debt || 0;

    if (amount > clientDebt) {
      alert(`${t.messages.clientDebt}: ${formatCurrency(clientDebt, paymentCurrency)}. ${t.messages.youEntered} ${formatCurrency(amount, paymentCurrency)} kiritdingiz.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post('/kassa/client-payment', {
        client: selectedClient,
        amount: amount,
        currency: paymentCurrency,
        payment_method: paymentMethod,
        notes: notes
      });

      alert(`✅ ${t.messages.paymentSuccessfullySaved}`);
      
      setSelectedClient('');
      setPaymentAmount('');
      setNotes('');
      
      onPaymentSuccess();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.response?.data?.message || t.messages.errorSavingPayment);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">{t.kassa.clientsLoading}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">{t.kassa.selectClient}</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          required
        >
          <option value="">{t.kassa.selectClientPlaceholder}</option>
          {clients?.map((client) => (
            <option key={client._id} value={client._id}>
              {client.name} - USD: {formatCurrency(client.usd_current_debt, 'USD')}, RUB: {formatCurrency(client.rub_current_debt, 'RUB')}
            </option>
          ))}
        </select>
      </div>

      {selectedClientData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <Icon name="user" className="h-5 w-5 text-white" />
            </div>
            {t.kassa.clientInfo}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <Icon name="user" className="mr-2 h-4 w-4 text-blue-600" />
                <span className="font-semibold text-gray-900">{selectedClientData.name}</span>
              </div>
              <div className="flex items-center">
                <Icon name="phone" className="mr-2 h-4 w-4 text-blue-600" />
                <span className="text-gray-700">{selectedClientData.phone}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="font-semibold text-red-700">{t.kassa.usdDebtLabel}:</span>
                <span className="font-bold text-red-600">{formatCurrency(selectedClientData.usd_current_debt, 'USD')}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="font-semibold text-red-700">{t.kassa.rubDebtLabel}:</span>
                <span className="font-bold text-red-600">{formatCurrency(selectedClientData.rub_current_debt, 'RUB')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">{t.kassa.paymentAmount}</label>
          <input
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="1000.00"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">{t.common.currency}</label>
          <select
            value={paymentCurrency}
            onChange={(e) => setPaymentCurrency(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            <option value="USD">USD</option>
            <option value="RUB">RUB</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">{t.kassa.paymentMethod}</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: 'cash', label: t.kassa.cash, icon: 'dollar-sign' },
            { value: 'bank_transfer', label: t.kassa.bankTransfer, icon: 'building' },
            { value: 'card', label: t.kassa.card, icon: 'credit-card' },
            { value: 'other', label: t.kassa.other, icon: 'file-text' }
          ].map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => setPaymentMethod(method.value)}
              className={`p-3 border-2 rounded-xl transition-all duration-200 ${
                paymentMethod === method.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="mb-1 flex justify-center">
                <Icon name={method.icon} className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium">{method.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">{t.kassa.notesOptional}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.kassa.notesPlaceholder}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          rows={3}
        />
      </div>

      {selectedClientData && paymentAmount && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
          <h4 className="font-bold text-green-900 mb-4 flex items-center text-lg">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
              <Icon name="calculator" className="h-5 w-5 text-white" />
            </div>
            {t.kassa.afterPayment}
          </h4>
          <div className="space-y-3">
            {paymentCurrency === 'USD' ? (
              <>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-gray-700">{t.kassa.usdDebtLabel}:</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedClientData.usd_current_debt, 'USD')} → {formatCurrency(Math.max(0, selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0')), 'USD')}
                  </span>
                </div>
                <div className={`flex items-center justify-center p-3 rounded-lg ${
                  selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0') <= 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <Icon 
                    name={selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0') <= 0 ? 'check-circle' : 'alert-circle'} 
                    className="mr-2 h-5 w-5" 
                  />
                  <span className="font-semibold">
                    {selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0') <= 0 
                      ? `USD ${t.kassa.debtWillBePaid}` 
                      : `USD ${t.kassa.debtWillRemain}`
                    }
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-gray-700">{t.kassa.rubDebtLabel}:</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedClientData.rub_current_debt, 'RUB')} → {formatCurrency(Math.max(0, selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0')), 'RUB')}
                  </span>
                </div>
                <div className={`flex items-center justify-center p-3 rounded-lg ${
                  selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0') <= 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <Icon 
                    name={selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0') <= 0 ? 'check-circle' : 'alert-circle'} 
                    className="mr-2 h-5 w-5" 
                  />
                  <span className="font-semibold">
                    {selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0') <= 0 
                      ? `RUB ${t.kassa.debtWillBePaid}` 
                      : `RUB ${t.kassa.debtWillRemain}`
                    }
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !selectedClient || !paymentAmount}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            {t.kassa.saving}
          </>
        ) : (
          <>
            <Icon name="save" className="mr-3 h-5 w-5" />
            {t.kassa.savePayment}
          </>
        )}
      </button>
    </form>
  );
}

interface AdvancedCashReport {
  summary: Array<{
    _id: {
      turi: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
  }>;
  trend: Array<{
    _id: {
      year: number;
      month: number;
      day?: number;
      turi: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
  }>;
  incomeBySource: {
    [currency: string]: {
      vagonSotuvi: number;
      mijozTolovi: number;
      xarajatlar: number;
      jami: number;
      sof: number;
    };
  };
}

export default function CashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'report'>('overview');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    valyuta: '',
    period: 'month',
    turi: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: async () => {
      const response = await axios.get('/kassa/balance');
      return response.data;
    }
  });

  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['kassa-transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.turi) params.append('turi', filters.turi);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', '1');
      params.append('limit', '50');
      
      const response = await axios.get(`/kassa?${params}`);
      return response.data;
    }
  });

  const { data: reportData, refetch: refetchReport } = useQuery<AdvancedCashReport>({
    queryKey: ['cash-advanced-report', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.valyuta) params.append('valyuta', filters.valyuta);
      params.append('period', filters.period);
      
      const response = await axios.get(`/kassa/advanced-report?${params}`);
      return response.data;
    }
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t.common.loading}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: t.kassa.overview, icon: 'dashboard', color: 'blue' },
    { id: 'income', name: t.kassa.income, icon: 'trending-up', color: 'green' },
    { id: 'report', name: t.kassa.report, icon: 'bar-chart', color: 'purple' }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="dollar-sign" className="h-7 w-7" />
                    </div>
                    {t.kassa.kassaManagement}
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    {t.kassa.kassaManagementSubtitle}
                  </p>
                  <p className="text-sm opacity-75">
                    {t.kassa.kassaManagementDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Modern Tabs */}
          <div className="mb-8">
            <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg`
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon name={tab.icon} className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* YANGI: Umumiy Statistika Kartalar - Kirim, Chiqim, Foyda */}
              {balanceData && balanceData.length > 0 && (
                <>
                  {/* Asosiy 3 ta karta: Jami Kirim, Jami Chiqim, Sof Foyda */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Jami Kirim */}
                    <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5"></div>
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Icon name="trending-up" className="h-7 w-7 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.kassa.totalIncomeLabel}</div>
                            <div className="text-xs text-green-600 font-semibold mt-1">💰 {t.kassa.totalIncomeDescription}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {balanceData.map((balance: any) => (
                            <div key={balance._id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">{balance._id}:</span>
                              <span className="text-2xl font-bold text-green-600">
                                {formatCurrency(balance.jamiKirim || 0, balance._id)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500 space-y-1">
                            {balanceData.map((balance: any) => {
                              const total = balance.jamiKirim || 0;
                              const vagonPercent = total > 0 ? ((balance.vagonSotuvi || 0) / total * 100).toFixed(1) : 0;
                              const clientPercent = total > 0 ? ((balance.mijozTolovi || 0) / total * 100).toFixed(1) : 0;
                              return (
                                <div key={balance._id} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span>🚛 {t.kassa.vagonSalePercent} ({balance._id}):</span>
                                    <span className="font-semibold">{vagonPercent}%</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>👤 {t.kassa.clientPaymentPercent} ({balance._id}):</span>
                                    <span className="font-semibold">{clientPercent}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
                      </div>
                    </div>

                    {/* Jami Chiqim */}
                    <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-600/5"></div>
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Icon name="trending-down" className="h-7 w-7 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.kassa.totalExpenseLabel}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {balanceData.map((balance: any) => (
                            <div key={balance._id} className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-600">{balance._id}:</span>
                              <span className="text-2xl font-bold text-red-600">
                                {formatCurrency(balance.xarajatlar || 0, balance._id)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            <div className="flex justify-between">
                              <span>💸 {t.kassa.allExpensesLabel}</span>
                              <span className="font-semibold text-red-600">
                                {balanceData.map((b: any) => `${b._id}: ${formatCurrency(b.xarajatlar || 0, b._id)}`).join(' • ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
                      </div>
                    </div>

                    {/* Sof Foyda */}
                    <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5"></div>
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Icon name="dollar-sign" className="h-7 w-7 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t.kassa.netProfitLabel}</div>
                            <div className="text-xs text-blue-600 font-semibold mt-1">💎 {t.kassa.netProfitDescription}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {balanceData.map((balance: any) => {
                            const profit = (balance.sof || 0);
                            const isPositive = profit >= 0;
                            const profitMargin = balance.jamiKirim > 0 
                              ? ((profit / balance.jamiKirim) * 100).toFixed(1) 
                              : 0;
                            return (
                              <div key={balance._id}>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">{balance._id}:</span>
                                  <span className={`text-2xl font-bold ${isPositive ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {formatCurrency(profit, balance._id)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-gray-500">{t.kassa.profitMarginLabel}:</span>
                                  <span className={`text-xs font-bold ${isPositive ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {profitMargin}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            <div className="flex justify-between items-center">
                              <span>📊 {t.kassa.formulaLabel}:</span>
                              <span className="font-semibold">{t.kassa.incomeMinusExpense}</span>
                            </div>
                            {balanceData.map((balance: any) => (
                              <div key={balance._id} className="flex justify-between items-center mt-1">
                                <span>{balance._id}:</span>
                                <span className="font-mono text-xs">
                                  {formatCurrency(balance.jamiKirim || 0, balance._id)} - {formatCurrency(balance.xarajatlar || 0, balance._id)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                      </div>
                    </div>
                  </div>

                  {/* Batafsil Balans Kartalar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {balanceData.map((balance: any) => (
                      <div key={balance._id} className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                        <div className={`absolute inset-0 bg-gradient-to-br ${balance._id === 'USD' ? 'from-green-500/5 to-emerald-600/5' : 'from-blue-500/5 to-indigo-600/5'}`}></div>
                        <div className="relative p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-r ${balance._id === 'USD' ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-indigo-600'} rounded-xl flex items-center justify-center`}>
                              <Icon name={balance._id === 'USD' ? 'dollar-sign' : 'ruble-sign'} className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-600">{balance._id} {t.kassa.detailedBalanceLabel}</div>
                            </div>
                          </div>
                          <div className="text-3xl font-bold text-gray-900 mb-4">
                            {formatCurrency(balance.sof || 0, balance._id)}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">🚛 {t.kassa.vagonSalePercent}:</span>
                              <span className="font-semibold text-green-600">{formatCurrency(balance.vagonSotuvi || 0, balance._id)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">👤 {t.kassa.clientPaymentPercent}:</span>
                              <span className="font-semibold text-blue-600">{formatCurrency(balance.mijozTolovi || 0, balance._id)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">💸 {t.kassa.expensesLabel}:</span>
                              <span className="font-semibold text-red-600">-{formatCurrency(balance.xarajatlar || 0, balance._id)}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex justify-between text-sm font-bold">
                                <span className="text-gray-700">{t.kassa.totalIncomeShort}:</span>
                                <span className="text-green-700">{formatCurrency(balance.jamiKirim || 0, balance._id)}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${balance._id === 'USD' ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-indigo-600'}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Income by Source */}
              {reportData?.incomeBySource && Object.keys(reportData.incomeBySource).length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="trending-up" className="h-6 w-6 text-white" />
                    </div>
                    {t.kassa.financialAnalysis}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(reportData.incomeBySource).map(([currency, data]: [string, any]) => (
                      <div key={currency} className="border-2 border-gray-100 rounded-2xl p-6 hover:border-gray-200 transition-all duration-200">
                        <h4 className="font-bold text-xl mb-4 flex items-center">
                          <Icon name={currency === 'USD' ? 'dollar-sign' : 'ruble-sign'} className="mr-3 h-6 w-6 text-gray-600" />
                          {currency}
                        </h4>
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
                            <span className="font-semibold text-green-700">🚛 {t.kassa.vagonSalePercent}:</span>
                            <span className="font-bold text-green-600 text-lg">
                              {formatCurrency(data.vagonSotuvi || 0, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
                            <span className="font-semibold text-blue-700">👤 {t.kassa.clientPaymentPercent}:</span>
                            <span className="font-bold text-blue-600 text-lg">
                              {formatCurrency(data.mijozTolovi || 0, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                            <span className="font-semibold text-red-700">💸 {t.kassa.expensesLabel}:</span>
                            <span className="font-bold text-red-600 text-lg">
                              -{formatCurrency(data.xarajatlar || 0, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                            <span className="font-bold text-gray-800">💰 {t.kassa.totalIncomeShort}:</span>
                            <span className="font-bold text-indigo-600 text-xl">
                              {formatCurrency(data.jami || 0, currency)}
                            </span>
                          </div>
                          <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${
                            (data.sof || 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                          }`}>
                            <span className="font-bold text-gray-800">📊 {t.kassa.netBalance}:</span>
                            <span className={`font-bold text-xl ${
                              (data.sof || 0) >= 0 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {formatCurrency(data.sof || 0, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="list" className="h-6 w-6 text-white" />
                  </div>
                  {t.kassa.recentTransactions}
                </h3>
                
                {transactionsLoading ? (
                  <div className="space-y-4">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="animate-pulse flex space-x-4 p-4 border-2 border-gray-100 rounded-xl">
                        <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                ) : transactionsData?.kassa?.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {transactionsData.kassa.slice(0, 10).map((transaction: any) => (
                      <div key={transaction._id} className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                            transaction.turi === 'klent_prixod' 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                              : 'bg-gradient-to-r from-green-500 to-emerald-600'
                          }`}>
                            {transaction.turi === 'klent_prixod' ? '👤' : '🚛'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-lg">
                              {transaction.tavsif}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(transaction.sana).toLocaleDateString('uz-UZ')} • 
                              {transaction.yaratuvchi?.username || t.kassa.unknown}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-xl text-green-600">
                            +{formatCurrency(transaction.summa, transaction.valyuta)}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {transaction.valyuta}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {transactionsData.kassa.length > 10 && (
                      <div className="text-center pt-4">
                        <p className="text-gray-500">
                          {t.kassa.andMore} {transactionsData.kassa.length - 10} {t.kassa.moreTransactions}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon name="inbox" className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg">{t.kassa.noTransactionsYet}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'income' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="user" className="h-6 w-6 text-white" />
                  </div>
                  {t.kassa.clientPaymentTitle}
                </h3>
                
                <ClientPaymentForm onPaymentSuccess={() => {
                  refetchReport();
                  refetchTransactions();
                }} />
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-8 border-2 border-blue-200">
                <h3 className="text-2xl font-bold mb-4 flex items-center text-blue-900">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="info" className="h-6 w-6 text-white" />
                  </div>
                  {t.kassa.vagonSaleIncome}
                </h3>
                <p className="text-gray-700 text-lg">
                  💡 {t.kassa.vagonSaleIncomeDescription}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="filter" className="h-6 w-6 text-white" />
                  </div>
                  {t.kassa.reportFiltersTitle}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.startDateLabel}</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.endDateLabel}</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.currencyLabel}</label>
                    <select
                      value={filters.valyuta}
                      onChange={(e) => setFilters({...filters, valyuta: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">{t.kassa.allCurrenciesLabel}</option>
                      <option value="USD">💵 USD</option>
                      <option value="RUB">💶 RUB</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.periodLabel}</label>
                    <select
                      value={filters.period}
                      onChange={(e) => setFilters({...filters, period: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="day">{t.kassa.dailyLabel}</option>
                      <option value="month">{t.kassa.monthlyLabel}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="bar-chart" className="h-6 w-6 text-white" />
                  </div>
                  {t.kassa.financialReportTitle}
                </h3>
                <p className="text-gray-600 text-lg">{t.kassa.financialReportDescription}</p>
              </div>
            </div>
          )}
        </div>


      </div>
    </Layout>
  );
}