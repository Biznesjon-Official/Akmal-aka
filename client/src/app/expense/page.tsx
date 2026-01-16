'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';

interface Vagon {
  _id: string;
  vagonCode: string;
}

interface VagonLot {
  _id: string;
  vagon: {
    _id: string;
    vagonCode: string;
  };
  dimensions: string;
  quantity: number;
  volume_m3: number;
  currency: string;
}

interface VagonExpense {
  _id: string;
  vagon: {
    vagonCode: string;
  };
  lot?: {
    dimensions: string;
  };
  expense_type: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
}

export default function ExpensePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<VagonExpense[]>([]);
  const [vagons, setVagons] = useState<Vagon[]>([]);
  const [lots, setLots] = useState<VagonLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVagon, setSelectedVagon] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');

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
      const [expensesRes, vagonsRes, lotsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon-expense`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon-lot`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setExpenses(expensesRes.data);
      setVagons(vagonsRes.data);
      setLots(lotsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVagonChange = (vagonId: string) => {
    setSelectedVagon(vagonId);
    setSelectedLot(''); // Reset lot selection
  };

  const getVagonLots = () => {
    return lots.filter(l => l.vagon._id === selectedVagon);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data: any = {
        vagon: selectedVagon,
        expense_type: expenseType,
        amount: parseFloat(amount),
        currency: currency,
        description: description
      };
      
      if (selectedLot) {
        data.lot = selectedLot;
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-expense`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Backend dan qaytgan xabar
      const expenseTypeLabel = getExpenseTypeLabel(expenseType);
      alert(`✅ ${expenseTypeLabel} xarajati muvaffaqiyatli saqlandi!\n\n💡 Agar bu xarajat turi avval qo'shilgan bo'lsa, summa qo'shildi.`);
      
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Xarajatni saqlashda xatolik');
    }
  };

  const resetForm = () => {
    setSelectedVagon('');
    setSelectedLot('');
    setExpenseType('');
    setAmount('');
    setCurrency('USD');
    setDescription('');
  };

  const getCurrencySymbol = (curr: string) => {
    switch(curr) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      default: return '';
    }
  };

  const getExpenseTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'transport': 'Transport',
      'customs': 'Bojxona',
      'loading': 'Yuklash/Tushirish',
      'storage': 'Ombor',
      'workers': 'Ishchilar',
      'processing': 'Qayta ishlash',
      'other': 'Boshqa'
    };
    return types[type] || type;
  };

  const getExpenseTypeInfo = (type: string) => {
    const info: { [key: string]: string } = {
      'transport': 'Rossiyadan O\'zbekistonga yoki aksincha transport xarajatlari',
      'customs': 'Bojxona to\'lovlari va rasmiylashtirish',
      'loading': 'Yog\'ochni yuklash va tushirish xizmatlari',
      'storage': 'Omborda saqlash, qo\'riqlash va boshqa xarajatlar',
      'workers': 'Ishchilar maoshi va mehnat haqqi',
      'processing': 'Yog\'ochni qayta ishlash, kesish va tayyorlash',
      'other': 'Boshqa turli xil xarajatlar'
    };
    return info[type] || '';
  };

  // Valyuta bo'yicha jami xarajatlarni hisoblash
  const getTotalByCurrency = (curr: string) => {
    return expenses
      .filter(e => e.currency === curr)
      .reduce((sum, e) => sum + e.amount, 0);
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
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <svg className="w-8 h-8 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Xarajatlar
            </h1>
            <p className="text-gray-600 mt-1">Transport, bojxona, ishchilar va boshqa xarajatlar</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yangi xarajat
          </button>
        </div>

        {/* Jami xarajatlar statistikasi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-2">Jami USD Xarajat</div>
            <div className="text-3xl font-bold">${getTotalByCurrency('USD').toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-2">Jami RUB Xarajat</div>
            <div className="text-3xl font-bold">₽{getTotalByCurrency('RUB').toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-sm opacity-90 mb-2">Jami Xarajatlar</div>
            <div className="text-3xl font-bold">{expenses.length}</div>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg">Xarajatlar yo'q</p>
            <p className="text-sm mt-2">Birinchi xarajatni qo'shish uchun yuqoridagi tugmani bosing</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sana</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vagon</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Lot</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Turi</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Summa</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tavsif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(expense.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-blue-600">
                        {expense.vagon.vagonCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.lot ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {expense.lot.dimensions}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Umumiy</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">
                        {getExpenseTypeLabel(expense.expense_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${expense.currency === 'USD' ? 'text-green-600' : 'text-blue-600'}`}>
                        {expense.amount.toLocaleString()} {getCurrencySymbol(expense.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {expense.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <svg className="w-7 h-7 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yangi xarajat qo'shish
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* 1. Vagon tanlash */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      1. Vagonni tanlang
                    </label>
                    <select
                      required
                      value={selectedVagon}
                      onChange={(e) => handleVagonChange(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Vagonni tanlang...</option>
                      {vagons.map(vagon => (
                        <option key={vagon._id} value={vagon._id}>
                          {vagon.vagonCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Lot tanlash (ixtiyoriy) */}
                  {selectedVagon && getVagonLots().length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        2. Lot tanlang (ixtiyoriy)
                      </label>
                      <select
                        value={selectedLot}
                        onChange={(e) => setSelectedLot(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      >
                        <option value="">Umumiy xarajat (barcha lotlar uchun)</option>
                        {getVagonLots().map(lot => (
                          <option key={lot._id} value={lot._id}>
                            {lot.dimensions} - {lot.quantity} dona ({lot.volume_m3.toFixed(4)} m³) - {lot.currency}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-purple-600 mt-2">
                        💡 Agar lot tanlamasangiz, xarajat barcha lotlarga teng taqsimlanadi
                      </p>
                    </div>
                  )}

                  {/* 3. Xarajat turi */}
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      3. Xarajat turini tanlang
                    </label>
                    <select
                      required
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="">Turni tanlang...</option>
                      <option value="transport">🚛 Transport</option>
                      <option value="customs">🛃 Bojxona</option>
                      <option value="loading">📦 Yuklash/Tushirish</option>
                      <option value="storage">🏢 Ombor/Saqlanish</option>
                      <option value="workers">👷 Ishchilar maoshi</option>
                      <option value="processing">⚙️ Qayta ishlash</option>
                      <option value="other">📝 Boshqa</option>
                    </select>
                    {expenseType && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-orange-600">
                          ℹ️ {getExpenseTypeInfo(expenseType)}
                        </p>
                        <p className="text-xs text-blue-600 font-semibold">
                          💡 Agar bu xarajat turi avval qo'shilgan bo'lsa, yangi summa qo'shiladi (yangi yozuv yaratilmaydi)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 4. Valyuta va summa */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      4. Valyuta va summa
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Valyuta</label>
                        <select
                          required
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 font-semibold"
                        >
                          <option value="USD">💵 USD (Dollar)</option>
                          <option value="RUB">💶 RUB (Rubl)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Summa</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="1000"
                          className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 font-bold text-lg"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      💡 Har valyuta alohida saqlanadi va hisob-kitob shunga mos bo'ladi
                    </p>
                  </div>

                  {/* 5. Tavsif */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      5. Tavsif (ixtiyoriy)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Xarajat haqida qo'shimcha ma'lumot..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
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
                    className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 font-semibold"
                  >
                    Xarajatni saqlash
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
