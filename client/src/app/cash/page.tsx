'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';

interface CashBalance {
  USD: number;
  RUB: number;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
}

interface VagonSale {
  _id: string;
  vagon: {
    vagonCode: string;
  };
  client: {
    _id: string;
    name: string;
  };
  sale_currency: string;
  total_amount: number;
  paid_amount: number;
  debt: number;
}

export default function CashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [balance, setBalance] = useState<CashBalance>({ USD: 0, RUB: 0 });
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<VagonSale[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [balanceRes, salesRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/cash/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon-sale`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setBalance(balanceRes.data);
      setSales(salesRes.data);
      
      // Qarzdor mijozlarni olish
      const debtSales = salesRes.data.filter((s: VagonSale) => s.debt > 0);
      const uniqueClients = Array.from(
        new Map(debtSales.map((s: VagonSale) => [s.client._id, s.client])).values()
      );
      setClients(uniqueClients as Client[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const clientSales = sales.filter(s => s.client._id === clientId && s.debt > 0);
    if (clientSales.length > 0) {
      setSelectedSale(clientSales[0]._id);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const selectedSaleData = sales.find(s => s._id === selectedSale);
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cash/client-payment`,
        {
          vagonSale: selectedSale,
          amount: parseFloat(paymentAmount),
          currency: selectedSaleData?.sale_currency || 'USD',
          description: 'Mijoz to\'lovi'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('To\'lov muvaffaqiyatli qabul qilindi!');
      setShowModal(false);
      setPaymentAmount('');
      setSelectedClient('');
      setSelectedSale('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'To\'lov qabul qilinmadi');
    }
  };

  const getClientSales = (clientId: string) => {
    return sales.filter(s => s.client._id === clientId && s.debt > 0);
  };

  const getClientTotalDebt = (clientId: string) => {
    const clientSales = getClientSales(clientId);
    const debtByCurrency: { [key: string]: number } = {};
    
    clientSales.forEach(sale => {
      if (!debtByCurrency[sale.sale_currency]) {
        debtByCurrency[sale.sale_currency] = 0;
      }
      debtByCurrency[sale.sale_currency] += sale.debt;
    });
    
    return debtByCurrency;
  };

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      default: return '';
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Kassa</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            To'lov qabul qilish
          </button>
        </div>

        {/* Balans ko'rsatish */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-2">USD Balans</div>
            <div className="text-3xl font-bold">${balance.USD.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-2">RUB Balans</div>
            <div className="text-3xl font-bold">₽{balance.RUB.toLocaleString()}</div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Qarzdor Mijozlar</h2>

        {clients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Qarzdor mijozlar yo'q
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const clientSales = getClientSales(client._id);
              const debtByCurrency = getClientTotalDebt(client._id);
              
              return (
                <div key={client._id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold">{client.name}</h3>
                    <p className="text-sm text-gray-600">{client.phone}</p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-semibold text-gray-700">Qarzlar:</div>
                    {Object.entries(debtByCurrency).map(([currency, amount]) => (
                      <div key={currency} className="flex justify-between">
                        <span className="text-gray-600">{currency}:</span>
                        <span className="font-bold text-red-600">
                          {amount.toLocaleString()} {getCurrencySymbol(currency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
                      <span>Sotuvlar soni:</span>
                      <span>{clientSales.length}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleClientSelect(client._id);
                      setShowModal(true);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    To'lov qabul qilish
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">To'lov qabul qilish</h2>
              <form onSubmit={handlePayment}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Mijoz</label>
                    <select
                      required
                      value={selectedClient}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Mijozni tanlang</option>
                      {clients.map(client => {
                        const debtByCurrency = getClientTotalDebt(client._id);
                        const debtStr = Object.entries(debtByCurrency)
                          .map(([curr, amt]) => `${amt.toLocaleString()} ${getCurrencySymbol(curr)}`)
                          .join(', ');
                        return (
                          <option key={client._id} value={client._id}>
                            {client.name} - Qarz: {debtStr}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedClient && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Sotuv</label>
                      <select
                        required
                        value={selectedSale}
                        onChange={(e) => setSelectedSale(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Sotuvni tanlang</option>
                        {getClientSales(selectedClient).map(sale => (
                          <option key={sale._id} value={sale._id}>
                            {sale.vagon.vagonCode} - Qarz: {sale.debt.toLocaleString()} {getCurrencySymbol(sale.sale_currency)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedSale && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        To'lov summasi ({sales.find(s => s._id === selectedSale)?.sale_currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maksimal: {sales.find(s => s._id === selectedSale)?.debt.toLocaleString()} {getCurrencySymbol(sales.find(s => s._id === selectedSale)?.sale_currency || '')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setPaymentAmount('');
                      setSelectedClient('');
                      setSelectedSale('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    To'lovni qabul qilish
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
