'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import CashSkeleton from '@/components/cash/CashSkeleton';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
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
      // Backend'dan pagination format kelishi mumkin
      const clientsData = response.data.clients || response.data || [];
      return clientsData.filter((client: Client) => 
        client.usd_current_debt > 0 || client.rub_current_debt > 0
      );
    }
  });

  // Tanlangan mijoz ma'lumotlari
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

    // Qarz tekshiruvi
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
      
      // Formani tozalash
      setSelectedClient('');
      setPaymentAmount('');
      setNotes('');
      
      // Parent komponentni yangilash
      onPaymentSuccess();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.response?.data?.message || t.messages.errorSavingPayment);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientsLoading) {
    return <div className="text-center py-4">{t.kassa.clientsLoading}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mijoz tanlash */}
      <div>
        <label className="block text-sm font-medium mb-2">{t.kassa.selectClient}</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
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

      {/* Tanlangan mijoz ma'lumotlari */}
      {selectedClientData && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <Icon name="details" className="mr-2" size="sm" />
            {t.kassa.clientInfo}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium flex items-center">
                <Icon name="clients" className="mr-1" size="sm" />
                {selectedClientData.name}
              </div>
              <div className="text-gray-600 flex items-center">
                <Icon name="phone" className="mr-1" size="sm" />
                {selectedClientData.phone}
              </div>
            </div>
            <div>
              <div className="text-red-600">
                <strong>{t.kassa.usdDebt}</strong> {formatCurrency(selectedClientData.usd_current_debt, 'USD')}
              </div>
              <div className="text-red-600">
                <strong>{t.kassa.rubDebt}</strong> {formatCurrency(selectedClientData.rub_current_debt, 'RUB')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* To'lov summasi va valyuta */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t.kassa.paymentAmount}</label>
          <input
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="1000.00"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">{t.kassa.currencyLabel}</label>
          <select
            value={paymentCurrency}
            onChange={(e) => setPaymentCurrency(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="USD">💵 USD</option>
            <option value="RUB">💶 RUB</option>
          </select>
        </div>
      </div>

      {/* To'lov usuli */}
      <div>
        <label className="block text-sm font-medium mb-2">{t.kassa.paymentMethod}</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="cash">{t.kassa.cash}</option>
          <option value="bank_transfer">{t.kassa.bankTransfer}</option>
          <option value="card">{t.kassa.card}</option>
          <option value="other">{t.kassa.other}</option>
        </select>
      </div>

      {/* Izoh */}
      <div>
        <label className="block text-sm font-medium mb-2">{t.kassa.notesOptional}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.kassa.notesPlaceholder}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          rows={2}
        />
      </div>

      {/* Hisoblash ko'rsatkichlari */}
      {selectedClientData && paymentAmount && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <Icon name="cash" className="mr-2" size="sm" />
            {t.kassa.afterPayment}
          </h4>
          <div className="text-sm space-y-1">
            {paymentCurrency === 'USD' ? (
              <>
                <div>{t.kassa.usdDebt} {formatCurrency(selectedClientData.usd_current_debt, 'USD')} → {formatCurrency(Math.max(0, selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0')), 'USD')}</div>
                <div className="text-green-600 font-medium flex items-center">
                  <Icon 
                    name={selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0') <= 0 ? 'success' : 'warning'} 
                    className="mr-1" 
                    size="sm" 
                  />
                  {selectedClientData.usd_current_debt - parseFloat(paymentAmount || '0') <= 0 ? `USD ${t.kassa.debtWillBePaid}` : `USD ${t.kassa.debtWillRemain}`}
                </div>
              </>
            ) : (
              <>
                <div>{t.kassa.rubDebt} {formatCurrency(selectedClientData.rub_current_debt, 'RUB')} → {formatCurrency(Math.max(0, selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0')), 'RUB')}</div>
                <div className="text-green-600 font-medium flex items-center">
                  <Icon 
                    name={selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0') <= 0 ? 'success' : 'warning'} 
                    className="mr-1" 
                    size="sm" 
                  />
                  {selectedClientData.rub_current_debt - parseFloat(paymentAmount || '0') <= 0 ? `RUB ${t.kassa.debtWillBePaid}` : `RUB ${t.kassa.debtWillRemain}`}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submit tugma */}
      <button
        type="submit"
        disabled={isSubmitting || !selectedClient || !paymentAmount}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center"
      >
        {isSubmitting ? (
          <>
            <Icon name="loading" className="mr-2 animate-spin" size="sm" />
            {t.kassa.saving}
          </>
        ) : (
          <>
            <Icon name="save" className="mr-2" size="sm" />
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
  profitLoss: {
    [currency: string]: {
      kirim: number;
      chiqim: number;
      foyda: number;
    };
  };
  expenseTypes: Array<{
    _id: {
      xarajatTuri: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
    avgSumma: number;
  }>;
}

interface TransactionFormData {
  turi: 'income' | 'expense';
  summa: string;
  valyuta: string;
  tavsif: string;
  xarajatTuri?: string;
  manba?: string;
  mijozNomi?: string;
  javobgarShaxs?: string;
  hujjatRaqami?: string;
  sana: string;
}

export default function CashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expense' | 'report'>('overview');
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    valyuta: '',
    period: 'month',
    turi: ''
  });
  
  // Form data
  const [formData, setFormData] = useState<TransactionFormData>({
    turi: 'income',
    summa: '',
    valyuta: 'USD',
    tavsif: '',
    sana: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Data fetching
  const { data: balanceData } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: async () => {
      const response = await axios.get('/kassa/balance');
      return response.data;
    }
  });

  // Kassa tranzaksiyalari ro'yxati
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

  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/kassa/exchange-rates?days=30');
      return response.data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = formData.turi === 'income' ? '/kassa/income' : '/kassa/expense';
      const submitData = {
        ...formData,
        summa: parseFloat(formData.summa),
        summaRUB: formData.valyuta === 'RUB' ? parseFloat(formData.summa) : parseFloat(formData.summa) * 95.5, // USD -> RUB
        summaUSD: formData.valyuta === 'USD' ? parseFloat(formData.summa) : parseFloat(formData.summa) * 0.0105, // RUB -> USD
        turi: formData.turi === 'income' ? 'prixod' : 'rasxod'
      };
      
      await axios.post(endpoint, submitData);
      
      // ✅ Muvaffaqiyat xabari - kassa va xarajatlar integratsiyasi haqida
      const successMessage = formData.turi === 'income' 
        ? '✅ Kirim muvaffaqiyatli qo\'shildi!' 
        : '✅ Xarajat muvaffaqiyatli qo\'shildi!\n💰 Bu xarajat xarajatlar bo\'limida ham ko\'rsatiladi.';
      
      alert(successMessage);
      
      refetchReport();
      refetchTransactions(); // Tranzaksiyalar ro'yxatini yangilash
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || t.messages.errorSavingTransaction);
    }
  };

  const resetForm = () => {
    setFormData({
      turi: 'income',
      summa: '',
      valyuta: 'USD',
      tavsif: '',
      sana: new Date().toISOString().split('T')[0]
    });
  };

  // Xarajat turi labelini olish
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

  if (authLoading) {
    return (
      <Layout>
        <div className="container-full-desktop">
          <CashSkeleton />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: t.kassa.overview, icon: 'dashboard' },
    { id: 'income', name: t.kassa.income, icon: 'cash' },
    { id: 'expense', name: t.kassa.expense, icon: 'expenses' },
    { id: 'report', name: t.kassa.report, icon: 'reports' }
  ];

  return (
    <Layout>
      <div className="container-full-desktop">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Icon name="cash" className="mr-3 text-green-600" size="lg" />
              {t.kassa.professionalKassa}
            </h1>
            <p className="text-gray-600 mt-1">{t.kassa.kassaDescription}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center shadow-lg"
          >
            <Icon name="add" className="mr-2" />
            {t.kassa.newTransaction}
          </button>
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
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={tab.icon} className="mr-2" size="sm" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Balance Cards */}
            {balanceData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(balanceData).map(([currency, balance]) => (
                  <Card key={currency} className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">{currency} {t.kassa.balance}</p>
                        <p className="text-3xl font-bold">
                          {formatCurrency(balance as number, currency)}
                        </p>
                      </div>
                      <div className="text-4xl opacity-80">
                        <Icon name={currency === 'USD' ? 'usd' : 'rub'} className="text-white" size="xl" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Profit/Loss Summary */}
            {reportData?.profitLoss && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Icon name="statistics" className="mr-2" />
                  {t.kassa.profitLossAnalysis}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(reportData.profitLoss).map(([currency, data]) => (
                    <div key={currency} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3 flex items-center">
                        <Icon name={currency === 'USD' ? 'usd' : 'rub'} className="mr-2" />
                        {currency}
                      </h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-green-600">{t.kassa.income}:</span>
                          <span className="font-semibold text-green-600">
                            +{formatCurrency(data.kirim, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">{t.kassa.expense}:</span>
                          <span className="font-semibold text-red-600">
                            -{formatCurrency(data.chiqim, currency)}
                          </span>
                        </div>
                        <hr />
                        <div className="flex justify-between">
                          <span className="font-bold">{t.dashboard.profit}:</span>
                          <span className={`font-bold text-lg ${
                            data.foyda >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {data.foyda >= 0 ? '+' : ''}{formatCurrency(data.foyda, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Transactions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                {t.kassa.recentTransactions}
              </h3>
              
              {transactionsLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="animate-pulse flex space-x-4 p-3 border rounded">
                      <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : transactionsData?.kassa?.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactionsData.kassa.slice(0, 10).map((transaction: any) => (
                    <div key={transaction._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                          transaction.turi === 'prixod' || transaction.turi === 'klent_prixod' 
                            ? 'bg-green-500' 
                            : transaction.turi === 'rasxod' 
                            ? 'bg-red-500' 
                            : 'bg-blue-500'
                        }`}>
                          {transaction.turi === 'prixod' || transaction.turi === 'klent_prixod' ? '💰' : 
                           transaction.turi === 'rasxod' ? '💸' : '📦'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.tavsif}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.sana).toLocaleDateString('uz-UZ')} • 
                            {transaction.yaratuvchi?.username || 'Noma\'lum'}
                            {transaction.xarajatTuri && (
                              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                {getExpenseTypeLabel(transaction.xarajatTuri)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.turi === 'prixod' || transaction.turi === 'klent_prixod' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.turi === 'prixod' || transaction.turi === 'klent_prixod' ? '+' : '-'}
                          {formatCurrency(transaction.summa, transaction.valyuta)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.valyuta}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {transactionsData.kassa.length > 10 && (
                    <div className="text-center pt-3">
                      <p className="text-sm text-gray-500">
                        Va yana {transactionsData.kassa.length - 10} ta tranzaksiya...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Hozircha tranzaksiyalar yo'q
                </p>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="space-y-6">
            {/* Mijoz To'lovi Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">👤</span>
                {t.kassa.clientPayment}
              </h3>
              
              <ClientPaymentForm onPaymentSuccess={() => refetchReport()} />
            </Card>

            {/* Boshqa Kirimlar Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">💰</span>
                {t.kassa.otherIncome}
              </h3>
              <p className="text-gray-600">{t.kassa.otherIncomeDescription}</p>
            </Card>
          </div>
        )}

        {activeTab === 'expense' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">💸</span>
              {t.kassa.expenseTransactions}
            </h3>
            <p className="text-gray-600">{t.kassa.expenseTransactionsDescription}</p>
          </Card>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                {t.kassa.reportFilters}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.kassa.startDate}</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t.kassa.endDate}</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t.kassa.currencyLabel}</label>
                  <select
                    value={filters.valyuta}
                    onChange={(e) => setFilters({...filters, valyuta: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">{t.kassa.allCurrencies}</option>
                    <option value="USD">💵 USD</option>
                    <option value="RUB">💶 RUB</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t.kassa.period}</label>
                  <select
                    value={filters.period}
                    onChange={(e) => setFilters({...filters, period: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="day">{t.kassa.daily}</option>
                    <option value="month">{t.kassa.monthly}</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Report Charts */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                {t.kassa.financialReport}
              </h3>
              <p className="text-gray-600">{t.kassa.financialReportDescription}</p>
            </Card>
          </div>
        )}

        {/* Transaction Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span className="text-3xl mr-3">
                  {formData.turi === 'income' ? '💰' : '💸'}
                </span>
                {formData.turi === 'income' ? t.kassa.addIncome : t.kassa.addExpense}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Transaction Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.kassa.transactionType}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, turi: 'income'})}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          formData.turi === 'income'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">💰</div>
                        <div className="font-semibold">{t.kassa.incomeType}</div>
                        <div className="text-xs text-gray-600">{t.kassa.incomeDescription}</div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, turi: 'expense'})}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          formData.turi === 'expense'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">💸</div>
                        <div className="font-semibold">{t.kassa.expenseType}</div>
                        <div className="text-xs text-gray-600">{t.kassa.expenseDescription}</div>
                      </button>
                    </div>
                  </div>

                  {/* Amount and Currency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t.kassa.amountLabel}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.summa}
                        onChange={(e) => setFormData({...formData, summa: e.target.value})}
                        placeholder="1000"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t.kassa.currencyLabel}
                      </label>
                      <select
                        required
                        value={formData.valyuta}
                        onChange={(e) => setFormData({...formData, valyuta: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
                      >
                        <option value="USD">💵 USD</option>
                        <option value="RUB">💶 RUB</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.kassa.descriptionLabel}
                    </label>
                    <textarea
                      required
                      value={formData.tavsif}
                      onChange={(e) => setFormData({...formData, tavsif: e.target.value})}
                      placeholder={t.kassa.transactionDescription}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
                      rows={3}
                    />
                  </div>

                  {/* Expense Type (only for expenses) */}
                  {formData.turi === 'expense' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t.kassa.expenseTypeLabel}
                      </label>
                      <select
                        required
                        value={formData.xarajatTuri || ''}
                        onChange={(e) => setFormData({...formData, xarajatTuri: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
                      >
                        <option value="">{t.kassa.selectExpenseType}</option>
                        <option value="transport_kelish">🚛 {t.kassa.transportIncoming}</option>
                        <option value="transport_ketish">🚛 {t.kassa.transportOutgoing}</option>
                        <option value="bojxona_kelish">🛃 {t.kassa.customsImport}</option>
                        <option value="bojxona_ketish">🛃 {t.kassa.customsExport}</option>
                        <option value="yuklash_tushirish">📦 {t.kassa.loadingUnloading}</option>
                        <option value="saqlanish">🏢 {t.kassa.warehouse}</option>
                        <option value="ishchilar">👷 {t.kassa.workers}</option>
                        <option value="maosh">💰 {t.kassa.salary}</option>
                        <option value="boshqa">📝 {t.kassa.other}</option>
                      </select>
                    </div>
                  )}

                  {/* Additional fields based on type */}
                  <div className="grid grid-cols-2 gap-4">
                    {formData.turi === 'income' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.kassa.sourceOptional}
                          </label>
                          <input
                            type="text"
                            value={formData.manba || ''}
                            onChange={(e) => setFormData({...formData, manba: e.target.value})}
                            placeholder={t.kassa.sourcePlaceholder}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.kassa.clientNameOptional}
                          </label>
                          <input
                            type="text"
                            value={formData.mijozNomi || ''}
                            onChange={(e) => setFormData({...formData, mijozNomi: e.target.value})}
                            placeholder={t.kassa.clientNamePlaceholder}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.kassa.responsibleOptional}
                          </label>
                          <input
                            type="text"
                            value={formData.javobgarShaxs || ''}
                            onChange={(e) => setFormData({...formData, javobgarShaxs: e.target.value})}
                            placeholder={t.vagon.responsible}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.kassa.documentOptional}
                          </label>
                          <input
                            type="text"
                            value={formData.hujjatRaqami || ''}
                            onChange={(e) => setFormData({...formData, hujjatRaqami: e.target.value})}
                            placeholder="INV-001"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t.kassa.dateLabel}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.sana}
                      onChange={(e) => setFormData({...formData, sana: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
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
                    {t.kassa.cancel}
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 text-white px-4 py-3 rounded-lg font-semibold ${
                      formData.turi === 'income'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    }`}
                  >
                    {formData.turi === 'income' ? t.kassa.saveIncome : t.kassa.saveExpense}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
