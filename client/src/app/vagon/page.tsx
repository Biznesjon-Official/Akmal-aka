'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';

interface VagonLot {
  _id: string;
  dimensions: string;
  quantity: number;
  volume_m3: number;
  currency: string;
  purchase_amount: number;
  remaining_quantity: number;
  remaining_volume_m3: number;
}

interface Vagon {
  _id: string;
  vagonCode: string;
  month: string;
  sending_place: string;
  receiving_place: string;
  status: string;
  total_volume_m3: number;
  total_purchase_usd: number;
  total_purchase_rub: number;
  total_expenses_usd: number;
  total_expenses_rub: number;
  total_revenue_usd: number;
  total_revenue_rub: number;
  profit_usd: number;
  profit_rub: number;
  lots: VagonLot[];
}

interface LotInput {
  thickness: string;
  width: string;
  length: string;
  quantity: string;
  loss_volume_m3: string; // Brak hajmi (m³)
  currency: string;
  purchase_amount: string;
}

export default function VagonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [vagons, setVagons] = useState<Vagon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Vagon ma'lumotlari
  const [vagonCode, setVagonCode] = useState('');
  const [month, setMonth] = useState(() => {
    // Bugungi sanani DD/MM/YYYY formatida olish
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const monthNum = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${monthNum}/${year}`;
  });
  const [sendingPlace, setSendingPlace] = useState('');
  const [receivingPlace, setReceivingPlace] = useState('');
  
  // Lotlar ro'yxati
  const [lots, setLots] = useState<LotInput[]>([
    { thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', currency: 'USD', purchase_amount: '' }
  ]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchVagons();
    }
  }, [user]);

  const fetchVagons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVagons(response.data);
    } catch (error) {
      console.error('Error fetching vagons:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLotRow = () => {
    setLots([...lots, { thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', currency: 'USD', purchase_amount: '' }]);
  };

  const removeLotRow = (index: number) => {
    if (lots.length > 1) {
      setLots(lots.filter((_, i) => i !== index));
    }
  };

  const updateLot = (index: number, field: keyof LotInput, value: string) => {
    const newLots = [...lots];
    newLots[index][field] = value;
    setLots(newLots);
  };

  const calculateLotVolume = (lot: LotInput): number => {
    const thickness = parseFloat(lot.thickness) || 0;
    const width = parseFloat(lot.width) || 0;
    const length = parseFloat(lot.length) || 0;
    const quantity = parseInt(lot.quantity) || 0;
    
    if (thickness && width && length && quantity) {
      // Hajm = (qalinlik_mm × eni_mm × uzunlik_m × soni) / 1,000,000
      return (thickness * width * length * quantity) / 1000000;
    }
    return 0;
  };

  const calculateTotalVolume = (): number => {
    return lots.reduce((sum, lot) => sum + calculateLotVolume(lot), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validatsiya - faqat to'liq to'ldirilgan lotlarni olish
    const validLots = lots.filter(lot => 
      lot.thickness && 
      lot.width && 
      lot.length && 
      lot.quantity && 
      lot.purchase_amount &&
      parseFloat(lot.thickness) > 0 &&
      parseFloat(lot.width) > 0 &&
      parseFloat(lot.length) > 0 &&
      parseInt(lot.quantity) > 0 &&
      parseFloat(lot.purchase_amount) > 0
    );
    
    if (validLots.length === 0) {
      alert('Kamida bitta to\'liq lot ma\'lumotini kiriting!');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // 1. Vagon yaratish
      const vagonData = {
        vagonCode,
        month,
        sending_place: sendingPlace,
        receiving_place: receivingPlace
      };
      
      const vagonResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon`,
        vagonData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const vagonId = vagonResponse.data._id;
      
      // 2. Har bir lot uchun so'rov yuborish
      for (const lot of validLots) {
        // Hajmni hisoblash
        const volume = calculateLotVolume(lot);
        
        const lotData = {
          vagon: vagonId,
          dimensions: `${lot.thickness}×${lot.width}×${lot.length}`,
          quantity: parseInt(lot.quantity),
          volume_m3: volume,
          loss_volume_m3: parseFloat(lot.loss_volume_m3) || 0,
          purchase_currency: lot.currency,
          purchase_amount: parseFloat(lot.purchase_amount)
        };
        
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-lot`,
          lotData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      alert('Vagon va lotlar muvaffaqiyatli qo\'shildi!');
      fetchVagons();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const resetForm = () => {
    setVagonCode('');
    setMonth('');
    setSendingPlace('');
    setReceivingPlace('');
    setLots([{ thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', currency: 'USD', purchase_amount: '' }]);
  };

  const closeVagon = async (vagonId: string) => {
    if (!confirm('Rostdan ham bu vagonni yopmoqchimisiz?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon/${vagonId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchVagons();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Xatolik yuz berdi');
    }
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
          <h1 className="text-3xl font-bold">{t.vagon.title}</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {t.vagon.addVagon}
          </button>
        </div>

        {vagons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t.vagon.noVagons}
          </div>
        ) : (
          <div className="space-y-6">
            {vagons.map((vagon) => (
              <div key={vagon._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold">{vagon.vagonCode}</h3>
                      <p className="text-sm opacity-90">{vagon.month}</p>
                      <p className="text-sm opacity-90">{vagon.sending_place} → {vagon.receiving_place}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{vagon.total_volume_m3.toFixed(4)} m³</div>
                      <div className="text-sm opacity-90">Jami hajm</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-lg mb-4">Lotlar ({vagon.lots?.length || 0})</h4>
                  
                  {vagon.lots && vagon.lots.length > 0 ? (
                    <div className="space-y-3">
                      {vagon.lots.map((lot, index) => (
                        <div key={lot._id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-lg text-blue-600">
                                {index + 1}. {lot.dimensions} mm × {lot.quantity} dona
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Hajm: {lot.volume_m3.toFixed(4)} m³ | 
                                Qolgan: {lot.remaining_quantity} dona ({lot.remaining_volume_m3.toFixed(4)} m³)
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                {(lot.purchase_amount || 0).toLocaleString()} {getCurrencySymbol(lot.currency)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {lot.currency}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">Lotlar yo'q</div>
                  )}

                  <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">USD Xarid</div>
                      <div className="text-lg font-bold">${(vagon.total_purchase_usd || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">RUB Xarid</div>
                      <div className="text-lg font-bold">₽{(vagon.total_purchase_rub || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">USD Foyda</div>
                      <div className={`text-lg font-bold ${(vagon.profit_usd || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(vagon.profit_usd || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">RUB Foyda</div>
                      <div className={`text-lg font-bold ${(vagon.profit_rub || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₽{(vagon.profit_rub || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {vagon.status !== 'closed' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => closeVagon(vagon._id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Vagonni yopish
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Yangi vagon va lotlar</h2>
              <form onSubmit={handleSubmit}>
                {/* Vagon ma'lumotlari */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold mb-3">Vagon ma'lumotlari</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Vagon kodi</label>
                      <input
                        type="text"
                        required
                        value={vagonCode}
                        onChange={(e) => setVagonCode(e.target.value)}
                        placeholder="V-001"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Oy</label>
                      <input
                        type="month"
                        required
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Jo'natish joyi</label>
                      <input
                        type="text"
                        required
                        value={sendingPlace}
                        onChange={(e) => setSendingPlace(e.target.value)}
                        placeholder="Rossiya, Moskva"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Qabul qilish joyi</label>
                      <input
                        type="text"
                        required
                        value={receivingPlace}
                        onChange={(e) => setReceivingPlace(e.target.value)}
                        placeholder="O'zbekiston, Toshkent"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Lotlar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Lotlar</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {calculateTotalVolume().toFixed(4)} m³
                      </div>
                      <div className="text-sm text-gray-600">Jami hajm</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {lots.map((lot, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-semibold text-lg">Lot {index + 1}</div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-orange-600">
                                {calculateLotVolume(lot).toFixed(4)} m³
                              </div>
                              <div className="text-xs text-gray-500">
                                {lot.quantity ? `1 m³ = ${(parseInt(lot.quantity) / calculateLotVolume(lot)).toFixed(0)} dona` : ''}
                              </div>
                            </div>
                            {lots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLotRow(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Qalinlik (mm)</label>
                            <input
                              type="number"
                              value={lot.thickness}
                              onChange={(e) => updateLot(index, 'thickness', e.target.value)}
                              placeholder="31"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Eni (mm)</label>
                            <input
                              type="number"
                              value={lot.width}
                              onChange={(e) => updateLot(index, 'width', e.target.value)}
                              placeholder="125"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Uzunlik (m)</label>
                            <input
                              type="number"
                              value={lot.length}
                              onChange={(e) => updateLot(index, 'length', e.target.value)}
                              placeholder="6"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Soni (dona)</label>
                            <input
                              type="number"
                              value={lot.quantity}
                              onChange={(e) => updateLot(index, 'quantity', e.target.value)}
                              placeholder="115"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-red-600">Brak (m³)</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={lot.loss_volume_m3}
                              onChange={(e) => updateLot(index, 'loss_volume_m3', e.target.value)}
                              placeholder="0.0000"
                              className="w-full px-2 py-2 border border-red-300 rounded text-center font-semibold text-red-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Valyuta</label>
                            <select
                              value={lot.currency}
                              onChange={(e) => updateLot(index, 'currency', e.target.value)}
                              className="w-full px-2 py-2 border rounded font-semibold"
                            >
                              <option value="USD">USD</option>
                              <option value="RUB">RUB</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Narx</label>
                            <input
                              type="number"
                              step="0.01"
                              value={lot.purchase_amount}
                              onChange={(e) => updateLot(index, 'purchase_amount', e.target.value)}
                              placeholder="10000"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addLotRow}
                    className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    + Lot qo'shish
                  </button>
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
