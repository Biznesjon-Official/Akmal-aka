'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@/components/Icon';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import FormattedInput from '@/components/FormattedInput';
import ClientAutocomplete from '@/components/ui/ClientAutocomplete';
import { formatCurrency } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import axios from '@/lib/axios';

interface SelectedYogoch {
  yogoch_id: string;
  yogoch_name: string;
  available_volume_m3: number;
  available_quantity: number; // Mavjud dona soni
  selected_quantity: string; // Foydalanuvchi kiritadigan YAGONA maydon
  price_per_m3: number; // Oldindan belgilangan m³ narxi (o'zgarmas)
  volume_per_piece: number; // Bir dona hajmi
  calculated_volume_m3: number; // Avtomatik hisoblangan m³
  total_price: number; // Avtomatik hisoblangan jami summa
}

interface SelectedVagon {
  vagon_id: string;
  vagon_code: string;
  selected: boolean;
  yogochlar: SelectedYogoch[];
}

interface MultiVagonCheckboxSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MultiVagonCheckboxSaleModal({
  isOpen,
  onClose,
  onSuccess
}: MultiVagonCheckboxSaleModalProps) {
  const queryClient = useQueryClient();
  
  // State
  const [selectedVagons, setSelectedVagons] = useState<SelectedVagon[]>([]);
  const [clientData, setClientData] = useState({
    client_id: '',
    client_type: 'existing' as 'existing' | 'one_time',
    one_time_client_name: '',
    one_time_client_phone: ''
  });
  const [paidAmount, setPaidAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vagonlar ro'yxati
  const { data: vagons = [] } = useQuery({
    queryKey: ['vagons-for-checkbox-sale'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100&status=active');
      return response.data.vagons || [];
    },
    enabled: isOpen
  });

  // Mijozlar ro'yxati
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-checkbox-sale'],
    queryFn: async () => {
      const response = await axios.get('/client');
      return response.data.clients || response.data || [];
    },
    enabled: isOpen
  });

  // Vagon tanlash/bekor qilish
  const toggleVagon = async (vagonId: string, vagonCode: string) => {
    const existingIndex = selectedVagons.findIndex(v => v.vagon_id === vagonId);
    
    if (existingIndex >= 0) {
      // Vagonni bekor qilish
      setSelectedVagons(selectedVagons.filter(v => v.vagon_id !== vagonId));
    } else {
      // Vagonni tanlash va yog'ochlarni yuklash
      try {
        const response = await axios.get(`/vagon-lot?vagon=${vagonId}`);
        const yogochlar = response.data || [];
        
        setSelectedVagons([
          ...selectedVagons,
          {
            vagon_id: vagonId,
            vagon_code: vagonCode,
            selected: true,
            yogochlar: yogochlar.map((y: any) => {
              // Bir dona hajmini hisoblash
              const volumePerPiece = y.quantity > 0 ? y.volume_m3 / y.quantity : 0;
              const pricePerM3 = y.recommended_sale_price_per_m3 || 0;
              
              return {
                yogoch_id: y._id,
                yogoch_name: y.dimensions || y.name || 'Yog\'och',
                available_volume_m3: y.remaining_volume_m3 || 0,
                available_quantity: y.remaining_quantity || 0,
                selected_quantity: '',
                price_per_m3: pricePerM3, // O'zgarmas narx
                volume_per_piece: volumePerPiece,
                calculated_volume_m3: 0,
                total_price: 0
              };
            })
          }
        ]);
      } catch (error) {
        showToast.error('Yog\'ochlarni yuklashda xatolik');
      }
    }
  };

  // Yog'och tanlash/bekor qilish
  const toggleYogoch = (vagonId: string, yogochId: string) => {
    setSelectedVagons(selectedVagons.map(vagon => {
      if (vagon.vagon_id === vagonId) {
        return {
          ...vagon,
          yogochlar: vagon.yogochlar.map(yogoch => {
            if (yogoch.yogoch_id === yogochId) {
              // Agar tanlangan bo'lsa, bekor qilish
              if (yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0) {
                return {
                  ...yogoch,
                  selected_quantity: '',
                  calculated_volume_m3: 0,
                  total_price: 0
                };
              }
              // Agar tanlanmagan bo'lsa, barcha donani tanlash
              const quantity = yogoch.available_quantity;
              const volume = quantity * yogoch.volume_per_piece;
              const totalPrice = volume * yogoch.price_per_m3;
              
              return {
                ...yogoch,
                selected_quantity: quantity.toString(),
                calculated_volume_m3: volume,
                total_price: totalPrice
              };
            }
            return yogoch;
          })
        };
      }
      return vagon;
    }));
  };

  // Hajm o'zgartirish - ISHLATILMAYDI
  const updateVolume = (vagonId: string, yogochId: string, volume: string) => {
    // Bu funksiya endi ishlatilmaydi
  };

  // Narx o'zgartirish - OLIB TASHLANDI (narx o'zgarmas)
  const updatePrice = (vagonId: string, yogochId: string, price: string) => {
    // Narx o'zgarmas, foydalanuvchi o'zgartira olmaydi
  };

  // Sotuv birligini o'zgartirish - OLIB TASHLANDI
  const toggleSaleUnit = (vagonId: string, yogochId: string) => {
    // Bu funksiya endi kerak emas
  };

  // Dona sonini yangilash - YAGONA INPUT
  const updateQuantity = (vagonId: string, yogochId: string, quantity: string) => {
    setSelectedVagons(selectedVagons.map(vagon => {
      if (vagon.vagon_id === vagonId) {
        return {
          ...vagon,
          yogochlar: vagon.yogochlar.map(yogoch => {
            if (yogoch.yogoch_id === yogochId) {
              const qty = parseFloat(quantity) || 0;
              const volume = qty * yogoch.volume_per_piece;
              const totalPrice = volume * yogoch.price_per_m3;
              
              return {
                ...yogoch,
                selected_quantity: quantity,
                calculated_volume_m3: volume,
                total_price: totalPrice
              };
            }
            return yogoch;
          })
        };
      }
      return vagon;
    }));
  };

  // Jami summa hisoblash
  const calculateTotal = () => {
    let total = 0;
    selectedVagons.forEach(vagon => {
      vagon.yogochlar.forEach(yogoch => {
        if (yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0) {
          total += yogoch.total_price;
        }
      });
    });
    return total;
  };

  // Tanlangan yog'ochlar soni
  const getSelectedCount = () => {
    let count = 0;
    selectedVagons.forEach(vagon => {
      vagon.yogochlar.forEach(yogoch => {
        if (yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0) {
          count++;
        }
      });
    });
    return count;
  };

  // Validatsiya
  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    // Kamida 1 ta yog'och tanlanganini tekshirish
    const selectedCount = getSelectedCount();
    if (selectedCount === 0) {
      newErrors.push('Kamida 1 ta yog\'och tanlang va hajmini kiriting');
    }
    
    // Har bir tanlangan yog'ochni tekshirish
    selectedVagons.forEach((vagon, vIndex) => {
      vagon.yogochlar.forEach((yogoch, yIndex) => {
        if (yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0) {
          const quantity = parseFloat(yogoch.selected_quantity);
          
          if (quantity > yogoch.available_quantity) {
            newErrors.push(
              `${vagon.vagon_code} - ${yogoch.yogoch_name}: ` +
              `Mavjud dona (${yogoch.available_quantity}) yetarli emas`
            );
          }
          
          if (yogoch.price_per_m3 <= 0) {
            newErrors.push(
              `${vagon.vagon_code} - ${yogoch.yogoch_name}: ` +
              `Sotuv narxi belgilanmagan`
            );
          }
        }
      });
    });
    
    // Mijoz tekshirish
    if (!clientData.client_id && !clientData.one_time_client_name) {
      newErrors.push('Mijoz tanlanishi kerak');
    }
    
    if (clientData.client_type === 'one_time' && clientData.one_time_client_name && !clientData.one_time_client_phone) {
      newErrors.push('Bir martalik mijoz uchun telefon raqami kiritilishi shart');
    }
    
    // To'lov tekshirish
    const totalPrice = calculateTotal();
    const paid = parseFloat(paidAmount) || 0;
    
    if (paid < 0) {
      newErrors.push('To\'lov summasi 0 dan kichik bo\'lmasin');
    }
    
    if (paid > totalPrice) {
      newErrors.push('To\'lov summasi jami narxdan katta bo\'lmasin');
    }
    
    // Tavsif tekshirish
    if (!description || description.trim().length < 3) {
      newErrors.push('Tavsif kamida 3 belgi bo\'lishi shart');
    }
    
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
      
      // Sale items tayyorlash
      const saleItems: any[] = [];
      selectedVagons.forEach(vagon => {
        vagon.yogochlar.forEach(yogoch => {
          if (yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0) {
            saleItems.push({
              vagon_id: vagon.vagon_id,
              yogoch_id: yogoch.yogoch_id,
              sale_unit: 'pieces',
              sent_quantity: parseFloat(yogoch.selected_quantity),
              volume_m3: yogoch.calculated_volume_m3,
              price_per_m3: yogoch.price_per_m3
            });
          }
        });
      });
      
      return await axios.post('/cash/income', {
        income_source: 'yogoch_tolovi',
        is_multi_sale: true,
        sale_items: saleItems,
        paid_amount: parseFloat(paidAmount) || 0,
        description: description.trim(),
        client_id: clientData.client_id || null,
        client_type: clientData.client_type,
        one_time_client_name: clientData.one_time_client_name?.trim() || null,
        one_time_client_phone: clientData.one_time_client_phone?.trim() || null,
        date: date
      });
    },
    onSuccess: () => {
      showToast.success('Ko\'p vagonli sotuv muvaffaqiyatli saqlandi');
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        setErrors(error.response.data.errors || [error.response.data.message]);
      } else if (error.response?.status === 409) {
        showToast.error('Takroriy yuborildi');
      } else {
        showToast.error('Serverda xatolik yuz berdi');
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate();
  };

  const resetForm = () => {
    setSelectedVagons([]);
    setClientData({
      client_id: '',
      client_type: 'existing',
      one_time_client_name: '',
      one_time_client_phone: ''
    });
    setPaidAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setErrors([]);
  };

  const totalPrice = calculateTotal();
  const selectedCount = getSelectedCount();
  const debt = totalPrice - (parseFloat(paidAmount) || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ko'p Vagonli Sotuv (Checkbox)" size="xl">
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

            {/* Vagonlar ro'yxati */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Vagonlarni tanlang *
              </label>
              <div className="max-h-96 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 space-y-4">
                {vagons.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Vagonlar mavjud emas</p>
                ) : (
                  vagons.map((vagon: any) => {
                    const isSelected = selectedVagons.some(v => v.vagon_id === vagon._id);
                    const selectedVagon = selectedVagons.find(v => v.vagon_id === vagon._id);
                    
                    return (
                      <div key={vagon._id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        {/* Vagon header */}
                        <div className="flex items-center mb-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleVagon(vagon._id, vagon.vagonCode)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-3"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{vagon.vagonCode}</h4>
                            <p className="text-sm text-gray-500">
                              {vagon.sending_place} → {vagon.receiving_place}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                              Tanlangan
                            </span>
                          )}
                        </div>

                        {/* Yog'ochlar (faqat vagon tanlangan bo'lsa) */}
                        {isSelected && selectedVagon && (
                          <div className="ml-8 space-y-3 mt-4 border-l-2 border-blue-200 pl-4">
                            {selectedVagon.yogochlar.length === 0 ? (
                              <p className="text-sm text-gray-500">Bu vagonda yog'ochlar mavjud emas</p>
                            ) : (
                              selectedVagon.yogochlar.map((yogoch) => {
                                const isYogochSelected = !!(yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0);
                                
                                return (
                                  <div key={yogoch.yogoch_id} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-start mb-2">
                                      <input
                                        type="checkbox"
                                        checked={isYogochSelected}
                                        onChange={() => toggleYogoch(selectedVagon.vagon_id, yogoch.yogoch_id)}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500 mr-2 mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{yogoch.yogoch_name}</div>
                                        <div className="text-sm text-gray-500">
                                          Mavjud: {yogoch.available_quantity} dona
                                          <span className="text-blue-600 ml-1">
                                            ({yogoch.available_volume_m3.toFixed(3)} m³)
                                          </span>
                                        </div>
                                        <div className="text-xs text-green-600 font-medium mt-1">
                                          Narx: ${yogoch.price_per_m3.toFixed(2)}/m³
                                          <span className="text-gray-500 ml-1">
                                            (${(yogoch.price_per_m3 * yogoch.volume_per_piece).toFixed(2)}/dona)
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {isYogochSelected && (
                                      <div className="space-y-3 mt-3">
                                        {/* Faqat dona input */}
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Dona soni
                                          </label>
                                          <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            max={yogoch.available_quantity}
                                            value={yogoch.selected_quantity}
                                            onChange={(e) => updateQuantity(selectedVagon.vagon_id, yogoch.yogoch_id, e.target.value)}
                                            className="input-field w-full"
                                            placeholder="Dona sonini kiriting"
                                          />
                                        </div>

                                        {/* Avtomatik hisoblangan ma'lumotlar */}
                                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 space-y-2">
                                          <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Hajm:</span>
                                            <span className="font-semibold text-gray-900">
                                              {yogoch.calculated_volume_m3.toFixed(3)} m³
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Narx (m³):</span>
                                            <span className="font-semibold text-gray-900">
                                              ${yogoch.price_per_m3.toFixed(2)}/m³
                                            </span>
                                          </div>
                                          <div className="pt-2 border-t border-blue-200">
                                            <div className="flex justify-between items-center">
                                              <span className="text-sm font-medium text-gray-700">Jami:</span>
                                              <span className="text-lg font-bold text-green-600">
                                                {formatCurrency(yogoch.total_price, 'USD')}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Jami summa */}
            {selectedCount > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-sm text-gray-600">JAMI SUMMA</div>
                    <div className="text-xs text-gray-500">{selectedCount} ta yog'och tanlandi</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalPrice, 'USD')}
                  </div>
                </div>
              </div>
            )}

            {/* Mijoz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mijoz *
              </label>
              <ClientAutocomplete
                clients={clients}
                value={clientData}
                onChange={setClientData}
                placeholder="Mijoz ismini kiriting..."
                required
              />
            </div>

            {/* To'lov */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hozir to'lanayotgan summa (USD)
              </label>
              <FormattedInput
                value={paidAmount}
                onChange={setPaidAmount}
                placeholder="0.00"
              />
              {totalPrice > 0 && (
                <div className="mt-2 text-sm">
                  {debt > 0 ? (
                    <div className="text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      <Icon name="alert-triangle" className="h-4 w-4 inline mr-1" />
                      Qarz: {formatCurrency(debt, 'USD')}
                    </div>
                  ) : debt === 0 ? (
                    <div className="text-green-600 bg-green-50 p-2 rounded border border-green-200">
                      <Icon name="check-circle" className="h-4 w-4 inline mr-1" />
                      To'liq to'landi
                    </div>
                  ) : (
                    <div className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      <Icon name="x-circle" className="h-4 w-4 inline mr-1" />
                      To'lov summasi jami narxdan katta
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tavsif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sotuv haqida qisqacha ma'lumot"
                className="input-field"
                maxLength={500}
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
            disabled={saveMutation.isPending || isSubmitting || selectedCount === 0}
          >
            Saqlash
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
