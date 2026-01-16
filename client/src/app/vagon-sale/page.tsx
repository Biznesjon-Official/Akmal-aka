'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';

interface Client {
  _id: string;
  name: string;
  phone: string;
}

interface VagonLot {
  _id: string;
  dimensions: string;
  quantity: number;
  volume_m3: number;
  purchase_currency: string;
  purchase_amount: number;
  remaining_quantity: number;
  remaining_volume_m3: number;
}

interface Vagon {
  _id: string;
  vagonCode: string;
  status: string;
  lots: VagonLot[];
}

interface VagonSale {
  _id: string;
  vagon: {
    vagonCode: string;
  };
  lot: {
    dimensions: string;
  };
  client: {
    name: string;
    phone: string;
  };
  sold_quantity: number;
  sold_volume_m3: number;
  sale_currency: string;
  price_per_m3: number;
  total_amount: number;
  paid_amount: number;
  debt: number;
  createdAt: string;
}

export default function VagonSalePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [sales, setSales] = useState<VagonSale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vagons, setVagons] = useState<Vagon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVagon, setSelectedVagon] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [soldQuantity, setSoldQuantity] = useState('');
  const [saleCurrency, setSaleCurrency] = useState('USD'); // Yangi: valyuta tanlash
  const [pricePerM3, setPricePerM3] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

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
      const [salesRes, clientsRes, vagonsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon-sale`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/client`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSales(salesRes.data);
      setClients(clientsRes.data);
      
      // Faqat aktiv vagonlarni filter qilish
      const activeVagons = vagonsRes.data.filter((v: any) => v.status !== 'closed');
      setVagons(activeVagons);
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

  const getSelectedVagonLots = () => {
    const vagon = vagons.find(v => v._id === selectedVagon);
    return vagon?.lots || [];
  };

  const getSelectedLotInfo = () => {
    const lots = getSelectedVagonLots();
    return lots.find(l => l._id === selectedLot);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validatsiya
    if (!selectedVagon) {
      alert('❌ Vagonni tanlang!');
      return;
    }
    if (!selectedLot) {
      alert('❌ Lotni tanlang!');
      return;
    }
    if (!selectedClient) {
      alert('❌ Mijozni tanlang!');
      return;
    }
    if (!soldQuantity || parseInt(soldQuantity) <= 0) {
      alert('❌ Sotilgan sonini kiriting!');
      return;
    }
    if (!saleCurrency) {
      alert('❌ Valyutani tanlang!');
      return;
    }
    if (!pricePerM3 || parseFloat(pricePerM3) <= 0) {
      alert('❌ Narxni kiriting!');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Lotni topish va hajmni hisoblash
      const lotInfo = getSelectedLotInfo();
      if (!lotInfo) {
        alert('❌ Lot ma\'lumotlari topilmadi!');
        return;
      }
      
      // Hajmni hisoblash: (quantity * volume_m3) / total_quantity
      const soldVolumeM3 = (parseInt(soldQuantity) * lotInfo.volume_m3) / lotInfo.quantity;
      
      console.log('📤 Sending data:', {
        vagon: selectedVagon,
        lot: selectedLot,
        client: selectedClient,
        sent_volume_m3: soldVolumeM3,
        sale_currency: saleCurrency,
        price_per_m3: parseFloat(pricePerM3),
        paid_amount: parseFloat(paidAmount) || 0,
        notes: notes
      });
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-sale`,
        {
          vagon: selectedVagon,
          lot: selectedLot,
          client: selectedClient,
          sent_volume_m3: soldVolumeM3,
          sale_currency: saleCurrency,
          price_per_m3: parseFloat(pricePerM3),
          paid_amount: parseFloat(paidAmount) || 0,
          notes: notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Mijoz nomini olish
      const clientName = clients.find(c => c._id === selectedClient)?.name || 'Mijoz';
      alert(`✅ ${clientName}ga sotuv muvaffaqiyatli saqlandi!\n\n💡 Agar bu mijozga avval ham sotilgan bo'lsa, qarz va hajm yangilandi.`);
      
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error:', error.response?.data);
      alert(error.response?.data?.message || t.vagonSale.saveError);
    }
  };

  const resetForm = () => {
    setSelectedVagon('');
    setSelectedLot('');
    setSelectedClient('');
    setSoldQuantity('');
    setSaleCurrency('USD');
    setPricePerM3('');
    setPaidAmount('');
    setNotes('');
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
          <h1 className="text-3xl font-bold">{t.vagonSale.title}</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {t.vagonSale.addSale}
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t.vagonSale.noSales}
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale._id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{sale.vagon?.vagonCode || 'N/A'}</h3>
                    <p className="text-sm text-gray-600">{sale.lot?.dimensions || 'N/A'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Sotilgan hajm</div>
                    <div className="text-lg font-bold">{sale.sold_volume_m3?.toFixed(2) || '0.00'} m³</div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-semibold">{sale.client?.name || 'N/A'}</div>
                  <div className="text-sm text-gray-600">{sale.client?.phone || 'N/A'}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-gray-600">Soni:</span>
                      <span className="ml-2 font-semibold">{sale.sold_quantity || 0} dona</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hajm:</span>
                      <span className="ml-2 font-semibold">{sale.sold_volume_m3?.toFixed(2) || '0.00'} m³</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Narx (m³):</span>
                      <span className="ml-2 font-semibold">
                        {sale.price_per_m3?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Jami:</span>
                      <span className="ml-2 font-semibold">
                        {sale.total_amount?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-600">Jami narx</div>
                    <div className="text-lg font-bold">
                      {sale.total_amount?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">To'langan</div>
                    <div className="text-lg font-bold text-green-600">
                      {sale.paid_amount?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Qarz</div>
                    <div className={`text-lg font-bold ${(sale.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {sale.debt?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
              <h2 className="text-2xl font-bold mb-4">{t.vagonSale.addSale}</h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Vagonni tanlang</label>
                    <select
                      value={selectedVagon}
                      onChange={(e) => handleVagonChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Vagonni tanlang</option>
                      {vagons.map(vagon => (
                        <option key={vagon._id} value={vagon._id}>
                          {vagon.vagonCode} ({vagon.lots?.length || 0} lot)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedVagon && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Lotni tanlang</label>
                      <select
                        value={selectedLot}
                        onChange={(e) => setSelectedLot(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Lotni tanlang</option>
                        {getSelectedVagonLots().map(lot => (
                          <option key={lot._id} value={lot._id}>
                            {lot.dimensions} - {lot.remaining_quantity} dona ({lot.remaining_volume_m3.toFixed(2)} m³) - {lot.purchase_currency}
                          </option>
                        ))}
                      </select>
                      {selectedLot && getSelectedLotInfo() && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-600">Qolgan soni:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.remaining_quantity} dona</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Qolgan hajm:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.remaining_volume_m3.toFixed(2)} m³</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Jami soni:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.quantity} dona</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Jami hajm:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.volume_m3.toFixed(2)} m³</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Sotib olingan valyuta:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.purchase_currency}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Mijozni tanlang</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Mijozni tanlang</option>
                      {clients.map(client => (
                        <option key={client._id} value={client._id}>
                          {client.name} - {client.phone}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-blue-600 mt-2 font-semibold">
                      💡 Agar bu mijozga avval ham sotilgan bo'lsa, yangi yozuv yaratilmaydi - qarz va hajm yangilanadi
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Sotilgan soni (dona)</label>
                    <input
                      type="number"
                      value={soldQuantity}
                      onChange={(e) => setSoldQuantity(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Sotuv valyutasi</label>
                    <select
                      value={saleCurrency}
                      onChange={(e) => setSaleCurrency(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="RUB">RUB (₽)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Sotuv valyutasi sotib olingan valyutadan farq qilishi mumkin
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Narx (m³ uchun, {saleCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricePerM3}
                      onChange={(e) => setPricePerM3(e.target.value)}
                      placeholder="500"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">To'langan summa ({saleCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Izoh</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Qo'shimcha ma'lumot"
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {t.common.save}
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
