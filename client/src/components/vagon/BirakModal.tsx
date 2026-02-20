'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';
import { showToast } from '@/utils/toast';

interface BirakModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot: {
    _id: string;
    name?: string;
    dimensions: string;
    quantity: number;
    volume_m3: number;
    reject_quantity?: number;
    reject_volume_m3?: number;
    loss_volume_m3?: number;
  };
  onSuccess: () => void;
}

export default function BirakModal({ isOpen, onClose, lot, onSuccess }: BirakModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    birak_quantity: '',
    birak_reason: ''
  });

  if (!isOpen) return null;

  // Mavjud miqdorlarni hisoblash
  const currentRemainingQty = lot.quantity - (lot.reject_quantity || 0);
  const currentRemainingVol = lot.volume_m3 - (lot.loss_volume_m3 || 0) - (lot.reject_volume_m3 || 0);
  
  // Bitta dona uchun hajm
  const volumePerPiece = lot.volume_m3 / lot.quantity;
  
  // Birak hajmini avtomatik hisoblash
  const calculatedVolume = formData.birak_quantity 
    ? (parseFloat(formData.birak_quantity) * volumePerPiece).toFixed(6)
    : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(formData.birak_quantity);
    
    if (!quantity) {
      showToast.error('Dona sonini kiriting');
      return;
    }
    
    if (quantity <= 0) {
      showToast.error('Dona soni 0 dan katta bo\'lishi kerak');
      return;
    }
    
    if (quantity > currentRemainingQty) {
      showToast.error(`Dona soni mavjud miqdordan oshib ketdi (mavjud: ${currentRemainingQty})`);
      return;
    }
    
    const volume = parseFloat(calculatedVolume);
    
    if (volume > currentRemainingVol) {
      showToast.error(`Hajm mavjud hajmdan oshib ketdi (mavjud: ${currentRemainingVol.toFixed(3)} m³)`);
      return;
    }
    
    try {
      setLoading(true);
      
      await axios.put(`/vagon-lot/${lot._id}/birak`, {
        birak_quantity: quantity,
        birak_volume_m3: volume,
        birak_reason: formData.birak_reason || 'Sifatsiz mahsulot'
      });
      
      showToast.success('Birak muvaffaqiyatli belgilandi');
      onSuccess();
      onClose();
      
      // Formani tozalash
      setFormData({
        birak_quantity: '',
        birak_reason: ''
      });
      
    } catch (error: any) {
      console.error('Birak belgilashda xatolik:', error);
      showToast.error(
        error.response?.data?.message || 'Birak belgilashda xatolik yuz berdi'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Icon name="alert-triangle" className="h-6 w-6 text-orange-600 mr-2" />
            Birak belgilash
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="close" size="sm" />
          </button>
        </div>

        {/* Lot ma'lumotlari */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <div className="font-semibold text-blue-900 mb-2">
            {lot.name || lot.dimensions}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Jami dona:</span>
              <span className="font-semibold ml-2">{lot.quantity}</span>
            </div>
            <div>
              <span className="text-gray-600">Jami hajm:</span>
              <span className="font-semibold ml-2">{lot.volume_m3.toFixed(3)} m³</span>
            </div>
            <div>
              <span className="text-gray-600">Mavjud dona:</span>
              <span className="font-semibold ml-2 text-green-600">{currentRemainingQty}</span>
            </div>
            <div>
              <span className="text-gray-600">Mavjud hajm:</span>
              <span className="font-semibold ml-2 text-green-600">{currentRemainingVol.toFixed(3)} m³</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-blue-200">
              <span className="text-gray-600">1 dona hajmi:</span>
              <span className="font-semibold ml-2 text-blue-600">{volumePerPiece.toFixed(6)} m³</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Dona soni */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birak dona soni <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={currentRemainingQty}
                value={formData.birak_quantity}
                onChange={(e) => setFormData({ ...formData, birak_quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Dona soni"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maksimal: {currentRemainingQty} dona
              </p>
            </div>

            {/* Avtomatik hisoblangan hajm */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Avtomatik hisoblangan hajm:</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.birak_quantity || '0'} dona × {volumePerPiece.toFixed(6)} m³
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">
                    {parseFloat(calculatedVolume).toFixed(3)} m³
                  </p>
                </div>
              </div>
            </div>

            {/* Sabab */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sabab
              </label>
              <textarea
                value={formData.birak_reason}
                onChange={(e) => setFormData({ ...formData, birak_reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Birak sababi (ixtiyoriy)"
                rows={3}
              />
            </div>
          </div>

          {/* Ogohlantirish */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-3 mt-4">
            <div className="flex items-start">
              <Icon name="alert-triangle" className="h-5 w-5 text-orange-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Diqqat!</p>
                <p>Birak deb belgilangan mahsulotlar ombordan ayriladi va sotuvga chiqarilmaydi.</p>
              </div>
            </div>
          </div>

          {/* Tugmalar */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4 mr-2" />
                  Birak belgilash
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
