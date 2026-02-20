'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';
import { useScrollLock } from '@/hooks/useScrollLock';
import BirakModal from './BirakModal';

interface VagonLot {
  _id: string;
  name?: string; // Yog'och nomi
  dimensions: string;
  quantity: number;
  volume_m3: number;
  loss_volume_m3: number;
  loss_responsible_person?: string;
  loss_reason?: string;
  loss_date?: string;
  warehouse_available_volume_m3: number;
  warehouse_dispatched_volume_m3: number;
  warehouse_remaining_volume_m3: number;
  total_investment: number;
  realized_profit: number;
  unrealized_value: number;
  break_even_price_per_m3: number;
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
  closure_date?: string;
  closure_reason?: string;
  closure_notes?: string;
  total_volume_m3: number;
  total_loss_m3: number;
  available_volume_m3: number;
  sold_volume_m3: number;
  remaining_volume_m3: number;
  usd_total_cost: number;
  usd_total_revenue: number;
  usd_profit: number;
  rub_total_cost: number;
  rub_total_revenue: number;
  rub_profit: number;
  lots: VagonLot[];
}

interface Props {
  vagonId: string;
  onClose: () => void;
  onVagonUpdated?: () => void; // Vagon yangilanganda parent componentni xabardor qilish uchun
}

export default function VagonDetailsModal({ vagonId, onClose, onVagonUpdated }: Props) {
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useDialog();
  const [vagon, setVagon] = useState<Vagon | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [birakModalOpen, setBirakModalOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<VagonLot | null>(null);

  // Scroll lock
  useScrollLock(true);

  useEffect(() => {
    fetchVagonDetails();
    fetchVagonExpenses();
  }, [vagonId]);

  const fetchVagonDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/vagon/${vagonId}`);
      setVagon(response.data);
    } catch (error: any) {
      console.error('Error fetching vagon details:', error);
      setError(error.response?.data?.message || 'Vagon ma\'lumotlarini olishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const fetchVagonExpenses = async () => {
    try {
      // Vagon bilan bog'liq xarajatlarni olish
      const response = await axios.get(`/vagon-expense?vagon=${vagonId}`);
      const allExpenses = response.data || [];
      
      setExpenses(allExpenses);
    } catch (error: any) {
      console.error('Error fetching vagon expenses:', error);
      // Xarajatlar yuklanmasa ham modal ochilsin
    }
  };

  const safeToFixed = (value: number | undefined | null, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    // 0 gacha ko'rsatish, yaxlitlamasdan
    return String(Number(value));
  };

  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      default: return currency;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden modal-overlay">
        <div className="bg-white rounded-lg p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100"
            aria-label="Yopish"
          >
            <Icon name="close" size="sm" />
          </button>
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>{t.vagon.vagonDetailsModal.loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden modal-overlay">
        <div className="bg-white rounded-lg p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100"
            aria-label="Yopish"
          >
            <Icon name="close" size="sm" />
          </button>
          <Icon name="error" className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.vagon.vagonDetailsModal.errorTitle}</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="btn-primary"
          >
            {t.vagon.vagonDetailsModal.closeButton}
          </button>
        </div>
      </div>
    );
  }

  if (!vagon) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white hover:text-white/80 transition-all duration-200 p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm group"
            aria-label="Yopish"
          >
            <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
          
          <div className="flex justify-between items-start pr-12">
            <div>
              <h2 className="text-3xl font-bold">{vagon.vagonCode}</h2>
              <p className="text-lg opacity-90">{vagon.month}</p>
              <p className="text-lg opacity-90">{vagon.sending_place} → {vagon.receiving_place}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{safeToFixed(vagon.total_volume_m3)} m³</div>
              <div className="text-lg opacity-90">{t.vagon.vagonDetailsModal.totalVolumeTitle}</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Hajm statistikasi */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Icon name="package" className="h-5 w-5 text-blue-600 mr-2" />
              {t.vagon.vagonDetailsModal.volumeStatistics}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">{t.vagon.vagonDetailsModal.totalVolumeLabel}</div>
                <div className="text-2xl font-bold text-blue-600">{safeToFixed(vagon.total_volume_m3)} m³</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-gray-600">{t.vagon.vagonDetailsModal.brakLabel}</div>
                <div className="text-2xl font-bold text-red-600">{safeToFixed(vagon.total_loss_m3)} m³</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-gray-600">{t.vagon.vagonDetailsModal.availableLabel}</div>
                <div className="text-2xl font-bold text-orange-600">{safeToFixed(vagon.available_volume_m3)} m³</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">{t.vagon.vagonDetailsModal.soldLabel}</div>
                <div className="text-2xl font-bold text-green-600">{safeToFixed(vagon.sold_volume_m3)} m³</div>
                <div className="text-xs text-gray-500">
                  {(vagon.total_volume_m3 || 0) > 0 ? `${safeToFixed(((vagon.sold_volume_m3 || 0) / (vagon.total_volume_m3 || 1)) * 100, 1)}%` : '0%'}
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">{t.vagon.vagonDetailsModal.remainingLabel}</div>
                <div className="text-2xl font-bold text-purple-600">{safeToFixed(vagon.remaining_volume_m3)} m³</div>
              </div>
            </div>
          </div>

          {/* Moliyaviy ma'lumotlar */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Icon name="dollar-sign" className="h-5 w-5 text-green-600 mr-2" />
              {t.vagon.vagonDetailsModal.financialInfo}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* USD */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-700 mb-3 flex items-center">
                  <Icon name="dollar-sign" className="h-4 w-4 mr-1" />
                  USD
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.vagon.vagonDetailsModal.investmentLabel}</span>
                    <span className="font-semibold">${(vagon.usd_total_cost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.vagon.vagonDetailsModal.revenueLabel}</span>
                    <span className="font-semibold">${(vagon.usd_total_revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-semibold">{t.vagon.vagonDetailsModal.profitLabel}</span>
                    <span className={`font-bold ${(vagon.usd_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(vagon.usd_profit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* RUB */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center">
                  <Icon name="ruble-sign" className="h-4 w-4 mr-1" />
                  RUB
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.vagon.vagonDetailsModal.investmentLabel}</span>
                    <span className="font-semibold">₽{(vagon.rub_total_cost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.vagon.vagonDetailsModal.revenueLabel}</span>
                    <span className="font-semibold">₽{(vagon.rub_total_revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-semibold">{t.vagon.vagonDetailsModal.profitLabel}</span>
                    <span className={`font-bold ${(vagon.rub_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₽{(vagon.rub_profit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lotlar */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Icon name="package" className="h-5 w-5 text-purple-600 mr-2" />
              {t.vagon.vagonDetailsModal.lotsTitle} ({vagon.lots?.length || 0})
            </h3>
            
            {vagon.lots && vagon.lots.length > 0 ? (
              <div className="space-y-4">
                {vagon.lots.map((lot: VagonLot, index: number) => (
                  <div key={lot._id} className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{index + 1}</span>
                          </div>
                          <div className="font-bold text-xl text-blue-900">
                            {lot.name || lot.dimensions} mm × {lot.quantity} {t.vagon.pieces}
                          </div>
                        </div>
                        
                        {/* Hajm ma'lumotlari - yangi dizayn */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          <div className="bg-white p-3 rounded-xl border-2 border-blue-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Jami hajm</div>
                            <div className="text-lg font-bold text-blue-600">{safeToFixed(lot.volume_m3)} m³</div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border-2 border-orange-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Mavjud</div>
                            <div className="text-lg font-bold text-orange-600">
                              {safeToFixed((lot.warehouse_available_volume_m3 || 0) || ((lot.volume_m3 || 0) - (lot.loss_volume_m3 || 0)))} m³
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border-2 border-green-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Sotilgan</div>
                            <div className="text-lg font-bold text-green-600">{safeToFixed(lot.warehouse_dispatched_volume_m3)} m³</div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border-2 border-purple-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Qolgan</div>
                            <div className="text-lg font-bold text-purple-600">
                              {safeToFixed((lot.warehouse_remaining_volume_m3 || 0) || (lot.remaining_volume_m3 || 0))} m³
                            </div>
                          </div>
                        </div>

                        {/* Moliyaviy ma'lumotlar - tan narx va foyda */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-3 rounded-xl border-2 border-yellow-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Tan narxi</div>
                            <div className="text-lg font-bold text-yellow-600">
                              {(lot.purchase_amount || 0).toLocaleString()} {lot.currency}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {safeToFixed((lot.purchase_amount || 0) / (lot.volume_m3 || 1), 2)} {lot.currency}/m³
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border-2 border-green-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Haqiqiy foyda</div>
                            <div className={`text-lg font-bold ${(lot.realized_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(lot.realized_profit || 0).toLocaleString()} {lot.currency}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Sotilgan qismdan
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl border-2 border-blue-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Qolgan qiymat</div>
                            <div className="text-lg font-bold text-blue-600">
                              {(lot.unrealized_value || 0).toLocaleString()} {lot.currency}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Sotilmagan qism
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border-2 border-purple-200 text-center">
                            <div className="text-xs text-gray-600 font-semibold mb-1">Rentabellik</div>
                            <div className="text-lg font-bold text-purple-600">
                              {safeToFixed(lot.break_even_price_per_m3 || 0, 2)} {lot.currency}/m³
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Minimal narx
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border-2 border-green-200 mb-3">
                          <div className="font-bold text-2xl text-green-600">
                            {(lot.purchase_amount || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 font-semibold">
                            {getCurrencySymbol(lot.currency)} {lot.currency}
                          </div>
                        </div>
                        
                        {/* Birak tugmasi */}
                        {(lot.warehouse_remaining_volume_m3 || lot.remaining_volume_m3 || 0) > 0 && (
                          <button
                            onClick={() => {
                              setSelectedLot(lot);
                              setBirakModalOpen(true);
                            }}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center text-sm font-semibold"
                            title="Sifatsiz mahsulot belgilash"
                          >
                            <Icon name="alert-triangle" className="h-4 w-4 mr-1" />
                            Birak
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Brak ma'lumotlari */}
                    {(lot.loss_volume_m3 || 0) > 0 && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 font-bold text-red-700 mb-3 text-lg">
                          <Icon name="alert-triangle" className="h-5 w-5" />
                          {t.vagon.vagonDetailsModal.brakInfo} {safeToFixed(lot.loss_volume_m3)} m³
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {lot.loss_responsible_person && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-white p-2 rounded-lg">
                              <Icon name="users" className="h-4 w-4" />
                              <div>
                                <div className="text-xs text-gray-500">Javobgar:</div>
                                <div className="font-semibold">{lot.loss_responsible_person}</div>
                              </div>
                            </div>
                          )}
                          {lot.loss_reason && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-white p-2 rounded-lg">
                              <Icon name="info" className="h-4 w-4" />
                              <div>
                                <div className="text-xs text-gray-500">Sabab:</div>
                                <div className="font-semibold">{lot.loss_reason}</div>
                              </div>
                            </div>
                          )}
                          {lot.loss_date && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-white p-2 rounded-lg">
                              <Icon name="calendar" className="h-4 w-4" />
                              <div>
                                <div className="text-xs text-gray-500">Sana:</div>
                                <div className="font-semibold">{new Date(lot.loss_date).toLocaleDateString('uz-UZ')}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Birak (sifatsiz) ma'lumotlari */}
                    {((lot as any).reject_volume_m3 || 0) > 0 && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl">
                        <div className="flex items-center gap-2 font-bold text-orange-700 mb-3 text-lg">
                          <Icon name="alert-triangle" className="h-5 w-5" />
                          Birak (sifatsiz): {(lot as any).reject_quantity || 0} dona, {safeToFixed((lot as any).reject_volume_m3)} m³
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(lot as any).reject_reason && (
                            <div className="flex items-center gap-2 text-orange-600 text-sm bg-white p-2 rounded-lg">
                              <Icon name="info" className="h-4 w-4" />
                              <div>
                                <div className="text-xs text-gray-500">Sabab:</div>
                                <div className="font-semibold">{(lot as any).reject_reason}</div>
                              </div>
                            </div>
                          )}
                          {(lot as any).reject_date && (
                            <div className="flex items-center gap-2 text-orange-600 text-sm bg-white p-2 rounded-lg">
                              <Icon name="calendar" className="h-4 w-4" />
                              <div>
                                <div className="text-xs text-gray-500">Sana:</div>
                                <div className="font-semibold">{new Date((lot as any).reject_date).toLocaleDateString('uz-UZ')}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Icon name="package" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>{t.vagon.vagonDetailsModal.noLotsMessage}</p>
              </div>
            )}
          </div>

          {/* Xarajatlar */}
          {expenses && expenses.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Icon name="trending-down" className="h-5 w-5 text-red-600 mr-2" />
                Vagon xarajatlari ({expenses.length})
              </h3>
              
              <div className="space-y-3">
                {expenses.map((expense: any) => (
                  <div key={expense._id} className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">
                          {expense.description}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs mr-2">
                            {expense.expense_type}
                          </span>
                          <span className="text-gray-500">
                            {new Date(expense.expense_date || expense.createdAt).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        {expense.createdBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            Yaratuvchi: {expense.createdBy.username}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-red-600">
                          {(expense.amount || 0).toLocaleString()} {expense.currency}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Jami xarajatlar */}
                <div className="border-t-2 border-red-300 pt-3 mt-4">
                  <div className="flex justify-between items-center bg-red-100 p-3 rounded-lg">
                    <span className="font-semibold text-gray-800">Jami xarajatlar:</span>
                    <div className="text-right">
                      <div className="font-bold text-xl text-red-600">
                        {expenses.reduce((sum: number, exp: any) => sum + (exp.currency === 'USD' ? (exp.amount || 0) : 0), 0).toLocaleString()} USD
                      </div>
                      <div className="font-semibold text-lg text-red-600">
                        {expenses.reduce((sum: number, exp: any) => sum + (exp.currency === 'RUB' ? (exp.amount || 0) : 0), 0).toLocaleString()} RUB
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status ma'lumotlari */}
          {(vagon.status === 'closed' || vagon.status === 'archived') && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Icon name="info" className="h-5 w-5 text-gray-600 mr-2" />
                {t.vagon.vagonDetailsModal.statusInfo}
              </h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-red-600">{t.vagon.vagonDetailsModal.closedVagon}</span>
                  {vagon.closure_date && (
                    <span className="ml-2">
                      ({new Date(vagon.closure_date).toLocaleDateString('uz-UZ')})
                    </span>
                  )}
                </div>
                {vagon.closure_reason && (
                  <div className="text-sm text-gray-500 mt-1">
                    {t.vagon.vagonDetailsModal.closureReason} {vagon.closure_reason}
                  </div>
                )}
                {vagon.closure_notes && (
                  <div className="text-sm text-gray-500 mt-1">
                    {t.vagon.vagonDetailsModal.closureNotes} {vagon.closure_notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-blue-50/50">
          {/* Jami summa */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                <Icon name="calculator" className="h-5 w-5 text-blue-600 mr-2" />
                {t.common.grandTotal}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${(vagon.usd_total_cost || 0).toLocaleString()} USD
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  ₽{(vagon.rub_total_cost || 0).toLocaleString()} RUB
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {t.vagon.vagonDetailsModal.investmentLabel}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                {/* Vagon yopish tugmasi */}
                {vagon.status === 'active' && (
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: 'Vagonni yopish',
                        message: `Rostdan ham "${vagon?.vagonCode}" vagonini yopmoqchimisiz?`,
                        type: 'warning',
                        confirmText: 'Ha, yopish',
                        cancelText: 'Bekor qilish'
                      });
                      
                      if (!confirmed) return;
                      
                      try {
                        const token = localStorage.getItem('token');
                        await axios.patch(
                          `${process.env.NEXT_PUBLIC_API_URL}/api/vagon/${vagonId}/close`,
                          { 
                            reason: 'manual_closure',
                            notes: 'Modal orqali yopildi'
                          },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        showAlert({
                          title: 'Muvaffaqiyat',
                          message: `"${vagon?.vagonCode}" vagoni muvaffaqiyatli yopildi`,
                          type: 'success'
                        });
                        
                        // Vagon ma'lumotlarini yangilash
                        await fetchVagonDetails();
                        
                        // Parent componentni xabardor qilish
                        if (onVagonUpdated) {
                          onVagonUpdated();
                        }
                      } catch (error: any) {
                        showAlert({
                          title: 'Xatolik',
                          message: error.response?.data?.message || error.message || 'Vagonni yopishda xatolik',
                          type: 'error'
                        });
                      }
                    }}
                    className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-semibold flex items-center"
                  >
                    <Icon name="x-circle" className="mr-2 h-5 w-5" />
                    Vagonni yopish
                  </button>
                )}
                
                {/* Vagon o'chirish tugmasi - faqat admin uchun */}
                {vagon.status !== 'closed' && (vagon.sold_volume_m3 || 0) === 0 && (
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm({
                        title: 'Vagonni o\'chirish',
                        message: `Rostdan ham "${vagon?.vagonCode}" vagonini o'chirmoqchimisiz?\n\n⚠️ DIQQAT: Bu amal qaytarib bo'lmaydi!`,
                        type: 'danger',
                        confirmText: 'Ha, o\'chirish',
                        cancelText: 'Bekor qilish'
                      });
                      
                      if (!confirmed) return;
                      
                      try {
                        const token = localStorage.getItem('token');
                        await axios.delete(
                          `${process.env.NEXT_PUBLIC_API_URL}/api/vagon/${vagonId}`,
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        showAlert({
                          title: 'Muvaffaqiyat',
                          message: `"${vagon?.vagonCode}" vagoni muvaffaqiyatli o'chirildi`,
                          type: 'success'
                        });
                        
                        // Parent componentni xabardor qilish
                        if (onVagonUpdated) {
                          onVagonUpdated();
                        }
                        
                        // Modalni yopish
                        onClose();
                      } catch (error: any) {
                        showAlert({
                          title: 'Xatolik',
                          message: error.response?.data?.message || error.message || 'Vagonni o\'chirishda xatolik',
                          type: 'error'
                        });
                      }
                    }}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold flex items-center"
                  >
                    <Icon name="trash" className="mr-2 h-5 w-5" />
                    Vagonni o'chirish
                  </button>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="btn-secondary px-8 py-3"
              >
                {t.vagon.vagonDetailsModal.closeButton}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Birak Modal */}
      {selectedLot && (
        <BirakModal
          isOpen={birakModalOpen}
          onClose={() => {
            setBirakModalOpen(false);
            setSelectedLot(null);
          }}
          lot={selectedLot}
          onSuccess={() => {
            fetchVagonDetails();
            if (onVagonUpdated) {
              onVagonUpdated();
            }
          }}
        />
      )}
    </div>
  );
}