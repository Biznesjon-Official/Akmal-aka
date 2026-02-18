'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import FormattedInput from '@/components/FormattedInput';
import Icon from '@/components/Icon';
import { showToast } from '@/utils/toast';
import { formatCurrency } from '@/utils/formatters';
import axios from '@/lib/axios';

interface VagonItem {
  vagon_id: string;
  vagon_code: string;
  volume_m3: string;
  sale_price_per_m3: number;
  currency: 'USD' | 'RUB';
  total_price: number;
  available_volume: number;
}

interface MultiVagonPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MultiVagonPurchaseModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: MultiVagonPurchaseModalProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<VagonItem[]>([]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<'USD' | 'RUB'>('USD');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vagonlar ro'yxati
  const { data: vagons = [], isLoading: vagonsLoading } = useQuery({
    queryKey: ['vagons-for-purchase'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100&status=active');
      return response.data.vagons || [];
    },
    enabled: isOpen
  });

  // Vagon qo'shish
  const addVagon = () => {
    setItems([...items, {
      vagon_id: '',
      vagon_code: '',
      volume_m3: '',
      sale_price_per_m3: 0,
      currency: currency,
      total_price: 0,
      available_volume: 0
    }]);
  };

  // Vagon o'chirish
  const removeVagon = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Vagon tanlash
  const selectVagon = (index: number, vagonId: string) => {
    const vagon = vagons.find((v: any) => v._id === vagonId);
    if (!vagon) return;

    const salePrice = currency === 'USD' 
      ? vagon.usd_sale_price_per_m3 
      : vagon.rub_sale_price_per_m3;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      vagon_id: vagonId,
      vagon_code: vagon.vagonCode,
      sale_price_per_m3: salePrice || 0,
      available_volume: vagon.remaining_volume_m3 || 0,
      currency: currency
    };
    setItems(newItems);
  };

  // Hajm o'zgartirish
  const updateVolume = (index: number, volume: string) => {
    const newItems = [...items];
    newItems[index].volume_m3 = volume;
    
    // Narxni hisoblash
    const vol = parseFloat(volume) || 0;
    newItems[index].total_price = vol * newItems[index].sale_price_per_m3;
    
    setItems(newItems);
  };

  // Jami summa
  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

  // Validatsiya
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (items.length === 0) {
      newErrors.push('Kamida 1 ta vagon tanlanishi kerak');
    }

    if (!description || description.trim().length < 3) {
      newErrors.push('Tavsif kamida 3 belgi bo\'lishi shart');
    }

    items.forEach((item, index) => {
      if (!item.vagon_id) {
        newErrors.push(`Vagon ${index + 1}: Vagon tanlanmagan`);
      }

      if (!item.volume_m3 || parseFloat(item.volume_m3) <= 0) {
        newErrors.push(`Vagon ${index + 1}: Hajm 0 dan katta bo'lishi kerak`);
      }

      if (parseFloat(item.volume_m3) > item.available_volume) {
        newErrors.push(
          `Vagon ${index + 1} (${item.vagon_code}): ` +
          `Mavjud hajm (${item.available_volume.toFixed(2)} m³) yetarli emas`
        );
      }

      if (!item.sale_price_per_m3 || item.sale_price_per_m3 <= 0) {
        newErrors.push(
          `Vagon ${index + 1} (${item.vagon_code}): ` +
          `Sotuv narxi belgilanmagan. Vagon sahifasida narxni belgilang.`
        );
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Saqlash
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSubmitting) {
        throw new Error('Takroriy yuborildi');
      }
      setIsSubmitting(true);

      return await axios.post('/cash/multi-vagon-purchase', {
        items: items.map(item => ({
          vagon_id: item.vagon_id,
          volume_m3: parseFloat(item.volume_m3),
          sale_price_per_m3: item.sale_price_per_m3,
          currency: item.currency
        })),
        description: description.trim(),
        date: date
      });
    },
    onSuccess: () => {
      showToast.success('Ko\'p vagondan yog\'och sotib olish muvaffaqiyatli amalga oshirildi');
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        setErrors(error.response.data.errors || [error.response.data.message]);
      } else {
        showToast.error(error.response?.data?.message || 'Serverda xatolik yuz berdi');
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const resetForm = () => {
    setItems([]);
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ko'p vagondan yog'och sotib olish" size="xl">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-6">
            {/* Xato xabarlari */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <Icon name="alert-circle" className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Xatolar:</h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Valyuta tanlash */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valyuta *
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`flex-1 p-3 border-2 rounded-xl transition-all ${
                    currency === 'USD'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">USD ($)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('RUB')}
                  className={`flex-1 p-3 border-2 rounded-xl transition-all ${
                    currency === 'RUB'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">RUB (₽)</div>
                </button>
              </div>
            </div>

            {/* Vagonlar ro'yxati */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Vagonlar *
                </label>
                <button
                  type="button"
                  onClick={addVagon}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Vagon qo'shish
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Icon name="truck" className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Vagon qo'shing</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Vagon {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeVagon(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Icon name="x" className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Vagon tanlash */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vagon
                          </label>
                          <select
                            value={item.vagon_id}
                            onChange={(e) => selectVagon(index, e.target.value)}
                            className="input-field"
                            required
                          >
                            <option value="">Vagonni tanlang</option>
                            {vagons.map((vagon: any) => (
                              <option key={vagon._id} value={vagon._id}>
                                {vagon.vagonCode} - {vagon.sending_place} → {vagon.receiving_place}
                                {' '}(Mavjud: {vagon.remaining_volume_m3?.toFixed(2) || 0} m³)
                              </option>
                            ))}
                          </select>
                        </div>

                        {item.vagon_id && (
                          <>
                            {/* Hajm */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hajm (m³) - Mavjud: {item.available_volume.toFixed(2)} m³
                              </label>
                              <FormattedInput
                                value={item.volume_m3}
                                onChange={(value) => updateVolume(index, value)}
                                placeholder="0.00"
                                required
                              />
                            </div>

                            {/* Narx ma'lumotlari */}
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Sotuv narxi:</span>
                                <span className="font-semibold">
                                  {formatCurrency(item.sale_price_per_m3, currency)}/m³
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-900">Jami:</span>
                                <span className="text-lg font-bold text-blue-600">
                                  {formatCurrency(item.total_price, currency)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jami summa */}
            {items.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">JAMI SUMMA</div>
                    <div className="text-xs text-gray-500">{items.length} ta vagon</div>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(totalAmount, currency)}
                  </div>
                </div>
              </div>
            )}

            {/* Tavsif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Yog'och sotib olish haqida qisqacha ma'lumot"
                className="input-field"
                rows={3}
                required
              />
            </div>

            {/* Sana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sana *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            loading={saveMutation.isPending || isSubmitting}
            disabled={saveMutation.isPending || isSubmitting || items.length === 0}
          >
            Saqlash
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
