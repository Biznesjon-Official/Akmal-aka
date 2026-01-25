'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';

interface VagonLot {
  _id: string;
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
}

export default function VagonDetailsModal({ vagonId, onClose }: Props) {
  const { t } = useLanguage();
  const [vagon, setVagon] = useState<Vagon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVagonDetails();
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

  const safeToFixed = (value: number | undefined | null, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return '0.00';
    return Number(value).toFixed(decimals);
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>{t.vagon.vagonDetailsModal.loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex justify-between items-start">
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
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
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
                  <div key={lot._id} className="border-l-4 border-blue-500 pl-4 py-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-lg text-blue-600">
                          {index + 1}. {lot.dimensions} mm × {lot.quantity} {t.vagon.pieces}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>{t.vagon.vagonDetailsModal.totalVolumeText} {safeToFixed(lot.volume_m3)} m³</div>
                          <div>{t.vagon.vagonDetailsModal.availableText} {safeToFixed((lot.warehouse_available_volume_m3 || 0) || ((lot.volume_m3 || 0) - (lot.loss_volume_m3 || 0)))} m³</div>
                          <div className="text-green-600 font-semibold">{t.vagon.vagonDetailsModal.soldText} {safeToFixed(lot.warehouse_dispatched_volume_m3)} m³</div>
                          <div>{t.vagon.vagonDetailsModal.remainingText} {safeToFixed((lot.warehouse_remaining_volume_m3 || 0) || (lot.remaining_volume_m3 || 0))} m³</div>
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

                    {/* Brak ma'lumotlari */}
                    {(lot.loss_volume_m3 || 0) > 0 && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 font-semibold text-red-700 mb-2">
                          <Icon name="alert-triangle" className="h-4 w-4" />
                          {t.vagon.vagonDetailsModal.brakInfo} {safeToFixed(lot.loss_volume_m3)} m³
                        </div>
                        {lot.loss_responsible_person && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <Icon name="users" className="h-4 w-4" />
                            {t.vagon.vagonDetailsModal.responsiblePerson} {lot.loss_responsible_person}
                          </div>
                        )}
                        {lot.loss_reason && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <Icon name="info" className="h-4 w-4" />
                            {t.vagon.vagonDetailsModal.brakReason} {lot.loss_reason}
                          </div>
                        )}
                        {lot.loss_date && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <Icon name="calendar" className="h-4 w-4" />
                            {t.vagon.vagonDetailsModal.brakDate} {new Date(lot.loss_date).toLocaleDateString('uz-UZ')}
                          </div>
                        )}
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
        <div className="border-t p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              {t.vagon.vagonDetailsModal.closeButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}