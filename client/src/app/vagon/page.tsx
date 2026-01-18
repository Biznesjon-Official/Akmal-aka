'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import Layout from '@/components/Layout';
import VagonTableSkeleton from '@/components/vagon/VagonTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import Icon from '@/components/Icon';
import axios from 'axios';

interface VagonLot {
  _id: string;
  dimensions: string;
  quantity: number;
  volume_m3: number;
  loss_volume_m3: number;
  loss_responsible_person?: string;
  loss_reason?: string;
  loss_date?: string;
  // YANGI TERMINOLOGIYA
  warehouse_available_volume_m3: number;
  warehouse_dispatched_volume_m3: number;
  warehouse_remaining_volume_m3: number;
  total_investment: number;
  realized_profit: number;
  unrealized_value: number;
  break_even_price_per_m3: number;
  // ESKI (Backward compatibility)
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
  // Yopilish ma'lumotlari
  closure_date?: string;
  closure_reason?: string;
  closure_notes?: string;
  // YANGI TERMINOLOGIYA
  total_volume_m3: number;
  total_loss_m3: number;
  available_volume_m3: number;
  sold_volume_m3: number;
  remaining_volume_m3: number;
  // Moliyaviy (backend field nomlari)
  usd_total_cost: number;
  usd_total_revenue: number;
  usd_profit: number;
  rub_total_cost: number;
  rub_total_revenue: number;
  rub_profit: number;
  // ESKI (Backward compatibility)
  total_investment_usd?: number;
  total_investment_rub?: number;
  realized_profit_usd?: number;
  realized_profit_rub?: number;
  unrealized_value_usd?: number;
  unrealized_value_rub?: number;
  total_purchase_usd?: number;
  total_purchase_rub?: number;
  total_expenses_usd?: number;
  total_expenses_rub?: number;
  total_revenue_usd?: number;
  total_revenue_rub?: number;
  profit_usd?: number;
  profit_rub?: number;
  lots: VagonLot[];
}

interface LotInput {
  thickness: string;
  width: string;
  length: string;
  quantity: string;
  loss_volume_m3: string; // Brak hajmi (m³)
  loss_responsible_person: string; // Brak uchun javobgar shaxs
  loss_reason: string; // Brak sababi
  currency: string;
  purchase_amount: string;
}

export default function VagonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useDialog();
  const [vagons, setVagons] = useState<Vagon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Vagon ma'lumotlari
  const [vagonCode, setVagonCode] = useState('');
  const [month, setMonth] = useState('');
  const [sendingPlace, setSendingPlace] = useState('');
  const [receivingPlace, setReceivingPlace] = useState('');
  
  // Bugungi sanani avtomatik o'rnatish
  useEffect(() => {
    if (!month) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const monthNum = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setMonth(`${day}/${monthNum}/${year}`);
    }
  }, []);
  
  // Lotlar ro'yxati
  const [lots, setLots] = useState<LotInput[]>([
    { thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', currency: 'USD', purchase_amount: '' }
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
    setLots([...lots, { thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', currency: 'USD', purchase_amount: '' }]);
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
      showAlert({
        title: t.messages.error,
        message: t.messages.enterCompleteLotInfo,
        type: 'warning'
      });
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
          loss_responsible_person: lot.loss_responsible_person || null,
          loss_reason: lot.loss_reason || null,
          loss_date: parseFloat(lot.loss_volume_m3) > 0 ? new Date() : null,
          purchase_currency: lot.currency,
          purchase_amount: parseFloat(lot.purchase_amount)
        };
        
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-lot`,
          lotData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      showAlert({
        title: t.messages.success,
        message: t.messages.vagonAndLotsAdded,
        type: 'success'
      });
      fetchVagons();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || t.messages.errorOccurred,
        type: 'error'
      });
    }
  };

  const resetForm = () => {
    setVagonCode('');
    setMonth('');
    setSendingPlace('');
    setReceivingPlace('');
    setLots([{ thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', currency: 'USD', purchase_amount: '' }]);
  };

  const closeVagon = async (vagonId: string, reason: string = 'manual_closure') => {
    const reasonText = {
      'manual_closure': 'qo\'lda yopish',
      'business_decision': 'biznes qaror',
      'fully_sold': 'to\'liq sotilgan',
      'remaining_too_small': t.vagonSale.remainingVolumeTooSmall
    }[reason] || reason;
    
    const confirmed = await showConfirm({
      title: t.vagon.forceClose,
      message: `Rostdan ham bu vagonni yopmoqchimisiz?\nSabab: ${reasonText}`,
      type: 'warning',
      confirmText: t.common.yes,
      cancelText: t.common.no
    });
    
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon/${vagonId}/close`,
        { 
          reason: reason,
          notes: `Frontend orqali yopildi: ${reasonText}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert({
        title: t.messages.success,
        message: `${t.messages.vagonSuccessfullyClosed}\n${t.messages.reason}: ${reasonText}`,
        type: 'success'
      });
      fetchVagons();
    } catch (error: any) {
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || t.messages.errorOccurred,
        type: 'error'
      });
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
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <VagonTableSkeleton />
        </div>
      </Layout>
    );
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
                      <div className="text-sm opacity-90">{t.vagon.totalVolume}</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-lg mb-4">{t.vagon.lots} ({vagon.lots?.length || 0})</h4>
                  
                  {vagon.lots && vagon.lots.length > 0 ? (
                    <div className="space-y-3">
                      {vagon.lots.map((lot, index) => (
                        <div key={lot._id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-lg text-blue-600">
                                {index + 1}. {lot.dimensions} mm × {lot.quantity} {t.vagon.pieces}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {t.vagon.totalVolumeLabel}: {lot.volume_m3.toFixed(4)} m³ | 
                                {t.vagon.warehouseAvailable}: {(lot.warehouse_available_volume_m3 || lot.volume_m3 - lot.loss_volume_m3).toFixed(4)} m³ |
                                <span className="text-green-600 font-semibold">{t.vagon.soldLabel}: {(lot.warehouse_dispatched_volume_m3 || 0).toFixed(4)} m³</span> |
                                {t.vagon.remainingLabel}: {(lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3).toFixed(4)} m³
                              </div>
                              {/* Brak ma'lumotlari */}
                              {lot.loss_volume_m3 > 0 && (
                                <div className="mt-2 p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl text-sm shadow-sm">
                                  <div className="flex items-center gap-2 font-semibold text-red-700 mb-2">
                                    <Icon name="warning" size="sm" />
                                    {t.vagon.brakLabel}: {lot.loss_volume_m3.toFixed(4)} m³
                                  </div>
                                  {lot.loss_responsible_person && (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <Icon name="clients" size="sm" />
                                      {t.vagon.responsible}: {lot.loss_responsible_person}
                                    </div>
                                  )}
                                  {lot.loss_reason && (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <Icon name="details" size="sm" />
                                      {t.vagon.brakReason}: {lot.loss_reason}
                                    </div>
                                  )}
                                  {lot.loss_date && (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <Icon name="calendar" size="sm" />
                                      {t.vagon.brakDate}: {new Date(lot.loss_date).toLocaleDateString('uz-UZ')}
                                    </div>
                                  )}
                                </div>
                              )}
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
                    <div className="text-center py-4 text-gray-500">{t.vagon.lots} {t.common.noData}</div>
                  )}

                  <div className="mt-6 pt-6 border-t">
                    {/* Hajm statistikasi */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t.vagon.totalVolumeLabel}</div>
                        <div className="text-lg font-bold text-blue-600">{vagon.total_volume_m3.toFixed(4)} m³</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t.vagon.brakLabel}</div>
                        <div className="text-lg font-bold text-red-600">{vagon.total_loss_m3.toFixed(4)} m³</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t.vagon.availableLabel}</div>
                        <div className="text-lg font-bold text-orange-600">{vagon.available_volume_m3.toFixed(4)} m³</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t.vagon.soldLabel}</div>
                        <div className="text-lg font-bold text-green-600">{vagon.sold_volume_m3.toFixed(4)} m³</div>
                        <div className="text-xs text-gray-500">
                          {vagon.total_volume_m3 > 0 ? `${((vagon.sold_volume_m3 / vagon.total_volume_m3) * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t.vagon.remainingLabel}</div>
                        <div className="text-lg font-bold text-purple-600">{vagon.remaining_volume_m3.toFixed(4)} m³</div>
                      </div>
                    </div>
                    
                    {/* Moliyaviy ma'lumotlar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">{t.vagon.usdInvestment}</div>
                        <div className="text-lg font-bold">${(vagon.usd_total_cost || vagon.total_investment_usd || vagon.total_purchase_usd || 0).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{t.vagon.purchaseAndExpenses}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">{t.vagon.rubInvestment}</div>
                        <div className="text-lg font-bold">₽{(vagon.rub_total_cost || vagon.total_investment_rub || vagon.total_purchase_rub || 0).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{t.vagon.purchaseAndExpenses}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">{t.vagon.usdRealProfit}</div>
                        <div className={`text-lg font-bold ${(vagon.usd_profit || vagon.realized_profit_usd || vagon.profit_usd || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${(vagon.usd_profit || vagon.realized_profit_usd || vagon.profit_usd || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">{t.vagon.onlySoldPart}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">{t.vagon.usdRealValue}</div>
                        <div className="text-lg font-bold text-blue-600">
                          ${(vagon.usd_total_revenue || vagon.unrealized_value_usd || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">{t.vagon.remainingVolumeValue}</div>
                      </div>
                    </div>
                  </div>

                  {vagon.status !== 'closed' && vagon.status !== 'archived' && (
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        {t.vagon.statusLabel}: <span className={`font-semibold ${
                          vagon.status === 'active' ? 'text-green-600' : 
                          vagon.status === 'closing' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {vagon.status === 'active' ? t.vagon.activeStatus : 
                           vagon.status === 'closing' ? t.vagon.closingStatus : vagon.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {vagon.status === 'active' && (
                          <button
                            onClick={() => closeVagon(vagon._id, 'manual_closure')}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm"
                          >
                            {t.vagon.markForClosing}
                          </button>
                        )}
                        <button
                          onClick={() => closeVagon(vagon._id, 'business_decision')}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                        >
                          {t.vagon.forceClose}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {(vagon.status === 'closed' || vagon.status === 'archived') && (
                    <div className="mt-4 p-3 bg-gray-100 rounded">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-red-600">{t.vagon.closedVagon}</span>
                        {vagon.closure_date && (
                          <span className="ml-2">
                            ({new Date(vagon.closure_date).toLocaleDateString('uz-UZ')})
                          </span>
                        )}
                      </div>
                      {vagon.closure_reason && (
                        <div className="text-xs text-gray-500 mt-1">
                          {t.vagon.closureReason}: {vagon.closure_reason}
                        </div>
                      )}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{t.vagonSale.newVagonAndLots}</h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 group"
                  aria-label="Yopish"
                >
                  <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                {/* Vagon ma'lumotlari */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold mb-3">{t.vagonSale.vagonInfo}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">{t.vagon.vagonCodeLabel}</label>
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
                      <label className="block text-sm font-medium mb-1">{t.vagon.monthLabel}</label>
                      <input
                        type="text"
                        required
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t.vagon.sendingPlace}</label>
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
                      <label className="block text-sm font-medium mb-1">{t.vagon.receivingPlace}</label>
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
                    <h3 className="font-semibold">{t.vagon.lots}</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {calculateTotalVolume().toFixed(4)} m³
                      </div>
                      <div className="text-sm text-gray-600">{t.vagon.totalVolumeLabel}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {lots.map((lot, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-semibold text-lg">{t.vagon.lot} {index + 1}</div>
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
                            <label className="block text-xs font-medium mb-1">{t.vagon.thickness}</label>
                            <input
                              type="number"
                              value={lot.thickness}
                              onChange={(e) => updateLot(index, 'thickness', e.target.value)}
                              placeholder="31"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">{t.vagon.width}</label>
                            <input
                              type="number"
                              value={lot.width}
                              onChange={(e) => updateLot(index, 'width', e.target.value)}
                              placeholder="125"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">{t.vagon.length}</label>
                            <input
                              type="number"
                              value={lot.length}
                              onChange={(e) => updateLot(index, 'length', e.target.value)}
                              placeholder="6"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">{t.vagon.quantity}</label>
                            <input
                              type="number"
                              value={lot.quantity}
                              onChange={(e) => updateLot(index, 'quantity', e.target.value)}
                              placeholder="115"
                              className="w-full px-2 py-2 border rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-red-600">{t.vagon.brakVolume}</label>
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
                            <label className="block text-xs font-medium mb-1">{t.vagon.currency}</label>
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
                            <label className="block text-xs font-medium mb-1">{t.vagon.price}</label>
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
                        
                        {/* Brak ma'lumotlari (agar brak mavjud bo'lsa) */}
                        {parseFloat(lot.loss_volume_m3) > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <h5 className="text-sm font-semibold text-red-700 mb-2">{t.vagonSale.brakInfo}</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium mb-1 text-red-600">{t.vagon.responsiblePerson}</label>
                                <input
                                  type="text"
                                  value={lot.loss_responsible_person}
                                  onChange={(e) => updateLot(index, 'loss_responsible_person', e.target.value)}
                                  placeholder={t.vagonSale.fullNamePlaceholder}
                                  className="w-full px-2 py-2 border border-red-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1 text-red-600">{t.vagon.brakReasonLabel}</label>
                                <input
                                  type="text"
                                  value={lot.loss_reason}
                                  onChange={(e) => updateLot(index, 'loss_reason', e.target.value)}
                                  placeholder={t.vagonSale.transportDamagePlaceholder}
                                  className="w-full px-2 py-2 border border-red-300 rounded text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addLotRow}
                    className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    {t.vagonSale.addLot}
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
