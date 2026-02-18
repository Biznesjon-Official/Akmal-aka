'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { showToast } from '@/utils/toast';
import Icon from '@/components/Icon';

interface Vagon {
  _id: string;
  vagonCode: string;
  total_volume_m3: number;
  usd_total_cost: number;
  usd_cost_per_m3?: number;
  usd_sale_price_per_m3?: number;
}

interface PriceSettingModalProps {
  vagon: Vagon;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  safeToFixed: (value: any, decimals?: number) => string;
}

export default function PriceSettingModal({ 
  vagon, 
  isOpen, 
  onClose, 
  onSuccess,
  safeToFixed 
}: PriceSettingModalProps) {
  const [salePriceInput, setSalePriceInput] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(80); // Default: 1 USD = 80 RUB

  // Valyuta kursini olish
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await axios.get('/exchange-rate/active?from=USD&to=RUB');
        if (response.data && response.data.rate) {
          setExchangeRate(response.data.rate);
        }
      } catch (error) {
        console.error('Valyuta kursini olishda xatolik:', error);
        // Default qiymat ishlatiladi
      }
    };
    
    if (isOpen) {
      fetchExchangeRate();
    }
  }, [isOpen]);

  // Real-time vagon ma'lumotlarini olish
  const { data: freshVagonData, isLoading } = useQuery({
    queryKey: ['vagon-for-price', vagon._id],
    queryFn: async () => {
      const response = await axios.get(`/vagon/${vagon._id}`);
      return response.data;
    },
    enabled: isOpen,
    refetchOnMount: 'always', // Har safar ochilganda yangilash
    staleTime: 0 // Hech qachon eski deb hisoblanmasin
  });

  // Sotuv narxini yuklash
  useEffect(() => {
    if (freshVagonData) {
      setSalePriceInput(freshVagonData.usd_sale_price_per_m3 || 0);
    }
  }, [freshVagonData]);

  const handleSave = async () => {
    if (salePriceInput <= 0) {
      showToast.error('Sotuv narxi 0 dan katta bo\'lishi kerak');
      return;
    }

    setIsSaving(true);
    try {
      await axios.patch(`/vagon/${vagon._id}/sale-price`, {
        usd_sale_price_per_m3: salePriceInput
      });
      
      showToast.success('Sotuv narxi muvaffaqiyatli yangilandi');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentVagon = freshVagonData || vagon;
  const costPerM3 = currentVagon.usd_cost_per_m3 || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl w-full max-w-lg my-8 shadow-2xl border border-white/20">
          {/* Modal Header */}
          <div className="relative bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-700 text-white p-6 rounded-t-3xl">
            <div className="absolute inset-0 bg-black/10 rounded-t-3xl"></div>
            
            <div className="relative flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Narx belgilash</h2>
                <p className="text-sm opacity-90 mt-1">Vagon: {currentVagon.vagonCode}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Yuklanmoqda...</span>
              </div>
            ) : (
              <>
                {/* Tannarx (read-only) */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Icon name="info" className="h-4 w-4 mr-2" />
                    Tannarx (avtomatik hisoblangan)
                  </label>
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-3xl font-bold text-gray-900">
                      ${safeToFixed(costPerM3, 2)} <span className="text-lg text-gray-500">/ m³</span>
                    </div>
                    
                    {/* Xarajatlar tafsiloti */}
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Yo'g'och xaridi (RUB → USD):</span>
                        <span className="font-semibold text-gray-900">
                          ${safeToFixed((currentVagon.rub_total_cost || 0) / exchangeRate, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Qo'shimcha xarajatlar (USD):</span>
                        <span className="font-semibold text-gray-900">
                          ${safeToFixed(currentVagon.usd_total_cost || 0, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 pt-3 border-t-2 border-gray-200">
                        <span className="text-gray-700 font-semibold">Jami xarajat:</span>
                        <span className="font-bold text-gray-900">
                          ${safeToFixed(((currentVagon.rub_total_cost || 0) / exchangeRate) + (currentVagon.usd_total_cost || 0), 2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Hajm:</span>
                        <span className="font-semibold text-gray-900">
                          {safeToFixed(currentVagon.total_volume_m3 || 0, 2)} m³
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                        Valyuta kursi: 1 USD = {exchangeRate} RUB
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sotuv narxi (input) */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Icon name="tag" className="h-4 w-4 mr-2" />
                    Sotuv narxi (USD / m³)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePriceInput || ''}
                    onChange={(e) => setSalePriceInput(parseFloat(e.target.value) || 0)}
                    placeholder="Sotuv narxini kiriting"
                    className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  />
                  {salePriceInput > 0 && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Foyda (1 m³):</span>
                        <span className={`font-bold ${(salePriceInput - costPerM3) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${safeToFixed(salePriceInput - costPerM3, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600">Jami foyda:</span>
                        <span className={`font-bold ${((salePriceInput - costPerM3) * (currentVagon.total_volume_m3 || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${safeToFixed((salePriceInput - costPerM3) * (currentVagon.total_volume_m3 || 0), 2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    disabled={isSaving}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold flex items-center justify-center disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saqlanmoqda...
                      </>
                    ) : (
                      <>
                        <Icon name="check" className="h-5 w-5 mr-2" />
                        Saqlash
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
