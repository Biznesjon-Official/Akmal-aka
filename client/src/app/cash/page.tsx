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
  rub_total_debt: number;
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
      return response.data.filter((client: Client) => 
        client.usd_total_debt > 0 || client.rub_total_debt > 0
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
      ? selectedClientData?.usd_total_debt || 0
      : selectedClientData?.rub_total_debt || 0;

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
    return <div className="text-center py-4">Mijozlar yuklanmoqda...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mijoz tanlash */}
      <div>
        <label className="block text-sm font-medium mb-2">Mijozni tanlang</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          required
        >
          <option value="">Mijozni tanlang...</option>
          {clients?.map((client) => (
            <option key={client._id} value={client._id}>
              {client.name} - USD: {formatCurrency(client.usd_total_debt, 'USD')}, RUB: {formatCurrency(client.rub_total_debt, 'RUB')}
            </option>
          ))}
        </select>
      </div>

      {/* Tanlangan mijoz ma'lumotlari */}
      {selectedClientData && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <Icon name="details" className="mr-2" size="sm" />
            Mijoz ma'lumotlari:
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
                <strong>USD qarzi:</strong> {formatCurrency(selectedClientData.usd_total_debt, 'USD')}
              </div>
              <div className="text-red-600">
                <strong>RUB qarzi:</strong> {formatCurrency(selectedClientData.rub_total_debt, 'RUB')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* To'lov summasi va valyuta */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">To'lov summasi</label>
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
          <label className="block text-sm font-medium mb-2">Valyuta</label>
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
        <label className="block text-sm font-medium mb-2">To'lov usuli</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="cash">Naqd pul</option>
          <option value="bank_transfer">Bank o'tkazmasi</option>
          <option value="card">Plastik karta</option>
          <option value="other">Boshqa</option>
        </select>
      </div>

      {/* Izoh */}
      <div>
        <label className="block text-sm font-medium mb-2">Izoh (ixtiyoriy)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="To'lov haqida qo'shimcha ma'lumot..."
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          rows={2}
        />
      </div>

      {/* Hisoblash ko'rsatkichlari */}
      {selectedClientData && paymentAmount && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <Icon name="cash" className="mr-2" size="sm" />
            To'lovdan keyin:
          </h4>
          <div className="text-sm space-y-1">
            {paymentCurrency === 'USD' ? (
              <>
                <div>USD qarzi: {formatCurrency(selectedClientData.usd_total_debt, 'USD')} → {formatCurrency(Math.max(0, selectedClientData.usd_total_debt - parseFloat(paymentAmount || '0')), 'USD')}</div>
                <div className="text-green-600 font-medium flex items-center">
                  <Icon 
                    name={selectedClientData.usd_total_debt - parseFloat(paymentAmount || '0') <= 0 ? 'success' : 'warning'} 
                    className="mr-1" 
                    size="sm" 
                  />
                  {selectedClientData.usd_total_debt - parseFloat(paymentAmount || '0') <= 0 ? 'USD qarzi to\'liq to\'lanadi!' : 'USD qarzi qoladi'}
                </div>
              </>
            ) : (
              <>
                <div>RUB qarzi: {formatCurrency(selectedClientData.rub_total_debt, 'RUB')} → {formatCurrency(Math.max(0, selectedClientData.rub_total_debt - parseFloat(paymentAmount || '0')), 'RUB')}</div>
                <div className="text-green-600 font-medium flex items-center">
                  <Icon 
                    name={selectedClientData.rub_total_debt - parseFloat(paymentAmount || '0') <= 0 ? 'success' : 'warning'} 
                    className="mr-1" 
                    size="sm" 
                  />
                  {selectedClientData.rub_total_debt - parseFloat(paymentAmount || '0') <= 0 ? 'RUB qarzi to\'liq to\'lanadi!' : 'RUB qarzi qoladi'}
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
            Saqlanmoqda...
          </>
        ) : (
          <>
            <Icon name="save" className="mr-2" size="sm" />
            To'lovni Saqlash
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
    period: 'month'
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
      
      refetchReport();
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

  if (authLoading) {
    return (
      <Layout>
        <div className="p-6">
          <CashSkeleton />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview', name: 'Umumiy', icon: 'dashboard' },
    { id: 'income', name: 'Kirim', icon: 'cash' },
    { id: 'expense', name: 'Chiqim', icon: 'expenses' },
    { id: 'report', name: 'Hisobot', icon: 'reports' }
  ];

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Icon name="cash" className="mr-3 text-green-600" size="lg" />
              Professional Kassa
            </h1>
            <p className="text-gray-600 mt-1">Kirim, chiqim va moliyaviy hisobotlar</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center shadow-lg"
          >
            <Icon name="add" className="mr-2" />
            Yangi tranzaksiya
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
                        <p className="text-blue-100 text-sm">{currency} Balans</p>
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
                  Foyda/Zarar Tahlili
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
                          <span className="text-green-600">Kirim:</span>
                          <span className="font-semibold text-green-600">
                            +{formatCurrency(data.kirim, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Chiqim:</span>
                          <span className="font-semibold text-red-600">
                            -{formatCurrency(data.chiqim, currency)}
                          </span>
                        </div>
                        <hr />
                        <div className="flex justify-between">
                          <span className="font-bold">Foyda:</span>
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
                So'nggi Tranzaksiyalar
              </h3>
              <p className="text-gray-600">So'nggi tranzaksiyalar ro'yxati tez orada qo'shiladi...</p>
            </Card>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="space-y-6">
            {/* Mijoz To'lovi Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">👤</span>
                Mijoz To'lovi
              </h3>
              
              <ClientPaymentForm onPaymentSuccess={() => refetchReport()} />
            </Card>

            {/* Boshqa Kirimlar Section */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">💰</span>
                Boshqa Kirimlar
              </h3>
              <p className="text-gray-600">Mijozlardan tashqari boshqa kirim manbalari...</p>
            </Card>
          </div>
        )}

        {activeTab === 'expense' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">💸</span>
              Chiqim Tranzaksiyalari
            </h3>
            <p className="text-gray-600">Chiqim tranzaksiyalari ro'yxati va statistikasi...</p>
          </Card>
        )}

        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-6">
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
            </Card>

            {/* Report Charts */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Moliyaviy Hisobot
              </h3>
              <p className="text-gray-600">Grafiklar va batafsil tahlil tez orada qo'shiladi...</p>
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
                {formData.turi === 'income' ? 'Kirim Qo\'shish' : 'Chiqim Qo\'shish'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Transaction Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Tranzaksiya turi
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
                        <div className="font-semibold">Kirim</div>
                        <div className="text-xs text-gray-600">Mijoz to'lovi, boshqa manbalar</div>
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
                        <div className="font-semibold">Chiqim</div>
                        <div className="text-xs text-gray-600">Xarajatlar, maosh, boshqa</div>
                      </button>
                    </div>
                  </div>

                  {/* Amount and Currency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Summa
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
                        Valyuta
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
                      Tavsif
                    </label>
                    <textarea
                      required
                      value={formData.tavsif}
                      onChange={(e) => setFormData({...formData, tavsif: e.target.value})}
                      placeholder="Tranzaksiya haqida batafsil ma'lumot..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
                      rows={3}
                    />
                  </div>

                  {/* Expense Type (only for expenses) */}
                  {formData.turi === 'expense' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Xarajat turi
                      </label>
                      <select
                        required
                        value={formData.xarajatTuri || ''}
                        onChange={(e) => setFormData({...formData, xarajatTuri: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500"
                      >
                        <option value="">Turni tanlang...</option>
                        <option value="transport_kelish">🚛 Transport (Kelish)</option>
                        <option value="transport_ketish">🚛 Transport (Ketish)</option>
                        <option value="bojxona_kelish">🛃 Bojxona (Import)</option>
                        <option value="bojxona_ketish">🛃 Bojxona (Export)</option>
                        <option value="yuklash_tushirish">📦 Yuklash/Tushirish</option>
                        <option value="saqlanish">🏢 Ombor/Saqlanish</option>
                        <option value="ishchilar">👷 Ishchilar</option>
                        <option value="maosh">💰 Maosh</option>
                        <option value="boshqa">📝 Boshqa</option>
                      </select>
                    </div>
                  )}

                  {/* Additional fields based on type */}
                  <div className="grid grid-cols-2 gap-4">
                    {formData.turi === 'income' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Manba (ixtiyoriy)
                          </label>
                          <input
                            type="text"
                            value={formData.manba || ''}
                            onChange={(e) => setFormData({...formData, manba: e.target.value})}
                            placeholder="Kirim manbai"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mijoz nomi (ixtiyoriy)
                          </label>
                          <input
                            type="text"
                            value={formData.mijozNomi || ''}
                            onChange={(e) => setFormData({...formData, mijozNomi: e.target.value})}
                            placeholder="Mijoz ismi"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Javobgar shaxs (ixtiyoriy)
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
                            Hujjat raqami (ixtiyoriy)
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
                      Sana
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
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 text-white px-4 py-3 rounded-lg font-semibold ${
                      formData.turi === 'income'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    }`}
                  >
                    {formData.turi === 'income' ? 'Kirimni Saqlash' : 'Chiqimni Saqlash'}
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
