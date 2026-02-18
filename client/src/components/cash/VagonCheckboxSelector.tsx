'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@/components/Icon';
import { formatCurrency } from '@/utils/formatters';
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
  total_price: number;
}

interface SelectedVagon {
  vagon_id: string;
  vagon_code: string;
  selected: boolean;
  yogochlar: SelectedYogoch[];
}

interface VagonCheckboxSelectorProps {
  selectedVagons: SelectedVagon[];
  onChange: (vagons: SelectedVagon[]) => void;
  currency: 'USD' | 'RUB';
}

export default function VagonCheckboxSelector({
  selectedVagons,
  onChange,
  currency
}: VagonCheckboxSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Vagonlar ro'yxati
  const { data: vagons = [] } = useQuery({
    queryKey: ['vagons-for-checkbox-selector'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100&status=active');
      return response.data.vagons || [];
    }
  });

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Vagon tanlash/bekor qilish
  const toggleVagon = async (vagonId: string, vagonCode: string) => {
    const existingIndex = selectedVagons.findIndex(v => v.vagon_id === vagonId);
    
    if (existingIndex >= 0) {
      // Vagonni bekor qilish
      onChange(selectedVagons.filter(v => v.vagon_id !== vagonId));
    } else {
      // Vagonni tanlash va yog'ochlarni yuklash
      try {
        // Avval vagon ma'lumotlarini olish (sotuv narxi uchun)
        const vagonResponse = await axios.get(`/vagon/${vagonId}`);
        const vagonData = vagonResponse.data;
        const vagonSalePrice = vagonData.usd_sale_price_per_m3 || 0;
        
        console.log('Vagon ma\'lumotlari:', {
          vagonCode,
          salePrice: vagonSalePrice,
          vagonData
        }); // Debug
        
        // Keyin yog'ochlarni olish
        const response = await axios.get(`/vagon-lot?vagon=${vagonId}`);
        const yogochlar = response.data || [];
        
        console.log('Yuklangan yog\'ochlar:', yogochlar); // Debug
        
        onChange([
          ...selectedVagons,
          {
            vagon_id: vagonId,
            vagon_code: vagonCode,
            selected: true,
            yogochlar: yogochlar.map((y: any) => {
              // Mavjud hajmni aniqlash
              const availableVolume = y.warehouse_remaining_volume_m3 || y.remaining_volume_m3 || y.available_volume_m3 || 0;
              const availableQuantity = y.remaining_quantity || 0;
              
              // Bir dona hajmini hisoblash
              const volumePerPiece = y.quantity > 0 ? y.volume_m3 / y.quantity : 0;
              
              // Vagon sotuv narxini ishlatish
              const salePrice = vagonSalePrice > 0 
                ? vagonSalePrice 
                : (y.recommended_sale_price_per_m3 || y.usd_sale_price_per_m3 || y.break_even_price_per_m3 || 0);
              
              return {
                yogoch_id: y._id,
                yogoch_name: y.dimensions || y.name || 'Yog\'och',
                available_volume_m3: availableVolume,
                available_quantity: availableQuantity,
                selected_quantity: '',
                price_per_m3: salePrice,
                volume_per_piece: volumePerPiece,
                calculated_volume_m3: 0,
                total_price: 0
              };
            })
          }
        ]);
        
        // Vagon tanlangandan keyin dropdown'ni yopish
        setIsOpen(false);
      } catch (error) {
        console.error('Yog\'ochlarni yuklashda xatolik:', error);
      }
    }
  };

  // Yog'och tanlash/bekor qilish
  const toggleYogoch = (vagonId: string, yogochId: string) => {
    onChange(selectedVagons.map(vagon => {
      if (vagon.vagon_id === vagonId) {
        return {
          ...vagon,
          yogochlar: vagon.yogochlar.map(yogoch => {
            if (yogoch.yogoch_id === yogochId) {
              const isCurrentlySelected = !!(yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0);
              
              // Agar tanlangan bo'lsa, bekor qilish
              if (isCurrentlySelected) {
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
              const newTotal = volume * yogoch.price_per_m3;
              
              return {
                ...yogoch,
                selected_quantity: quantity.toString(),
                calculated_volume_m3: volume,
                total_price: newTotal
              };
            }
            return yogoch;
          })
        };
      }
      return vagon;
    }));
  };

  // Dona sonini yangilash
  const updateQuantity = (vagonId: string, yogochId: string, quantity: string) => {
    onChange(selectedVagons.map(vagon => {
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

  const totalPrice = calculateTotal();
  const selectedCount = getSelectedCount();

  return (
    <div className="space-y-4" ref={dropdownRef}>
      {/* Select-style dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full input-field flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
        >
          <span className={selectedVagons.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
            {selectedVagons.length === 0 
              ? 'Vagonlarni tanlang...' 
              : `${selectedVagons.length} ta vagon tanlandi`}
          </span>
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className="w-5 h-5 text-gray-400" />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
            {vagons.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Vagonlar mavjud emas</div>
            ) : (
              <div className="p-2">
                {vagons.map((vagon: any) => {
                  const isSelected = selectedVagons.some(v => v.vagon_id === vagon._id);
                  
                  return (
                    <div
                      key={vagon._id}
                      className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVagon(vagon._id, vagon.vagonCode)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{vagon.vagonCode}</div>
                          <div className="text-sm text-gray-500">
                            {vagon.sending_place} → {vagon.receiving_place}
                          </div>
                        </div>
                        {isSelected && (
                          <Icon name="check-circle" className="w-5 h-5 text-green-500" />
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tanlangan vagonlar va yog'ochlar */}
      {selectedVagons.length > 0 && (
        <div className="space-y-4">
          {selectedVagons.map((selectedVagon) => (
            <div key={selectedVagon.vagon_id} className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
              {/* Vagon header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedVagon.vagon_code}</h4>
                  <p className="text-sm text-gray-600">Yog'ochlarni tanlang</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleVagon(selectedVagon.vagon_id, selectedVagon.vagon_code)}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Vagonni olib tashlash"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              {/* Yog'ochlar */}
              <div className="space-y-3">
                {selectedVagon.yogochlar.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Bu vagonda yog'ochlar mavjud emas</p>
                ) : (
                  selectedVagon.yogochlar.map((yogoch) => {
                    const isYogochSelected = !!(yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0);
                    
                    return (
                      <div key={yogoch.yogoch_id} className="bg-white rounded-lg p-3 border border-gray-200">
                        {/* Yog'och header - checkbox va asosiy ma'lumotlar */}
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isYogochSelected}
                            onChange={() => toggleYogoch(selectedVagon.vagon_id, yogoch.yogoch_id)}
                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mt-1 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 mb-1">{yogoch.yogoch_name}</div>
                            
                            {/* Yog'och ma'lumotlari */}
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <div className="text-xs text-gray-600 mb-0.5">Mavjud:</div>
                                <div className="font-semibold text-blue-700">
                                  {yogoch.available_quantity} dona
                                </div>
                                <div className="text-xs text-blue-600 mt-0.5">
                                  ({yogoch.available_volume_m3.toFixed(3)} m³)
                                </div>
                              </div>
                              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                                <div className="text-xs text-gray-600 mb-0.5">Narx:</div>
                                <div className="font-semibold text-green-700">
                                  {formatCurrency(yogoch.price_per_m3, currency)}/m³
                                </div>
                                <div className="text-xs text-green-600 mt-0.5">
                                  ({(yogoch.price_per_m3 * yogoch.volume_per_piece).toFixed(2)} {currency === 'USD' ? '$' : '₽'}/dona)
                                </div>
                              </div>
                            </div>

                            {/* Tanlangan bo'lsa - faqat dona input */}
                            {isYogochSelected && (
                              <div className="space-y-3 pt-3 border-t border-gray-200">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dona soni *
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max={yogoch.available_quantity}
                                    value={yogoch.selected_quantity}
                                    onChange={(e) => updateQuantity(selectedVagon.vagon_id, yogoch.yogoch_id, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Dona sonini kiriting"
                                  />
                                </div>

                                {/* Avtomatik hisoblangan ma'lumotlar */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Hajm:</span>
                                    <span className="font-semibold text-gray-900">
                                      {yogoch.calculated_volume_m3.toFixed(3)} m³
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Narx (m³):</span>
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(yogoch.price_per_m3, currency)}/m³
                                    </span>
                                  </div>
                                  <div className="pt-2 border-t border-blue-200">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-gray-700">Jami:</span>
                                      <span className="text-lg font-bold text-green-600">
                                        {formatCurrency(yogoch.total_price, currency)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Umumiy jami summa */}
      {selectedCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-300 shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-gray-700">UMUMIY JAMI SUMMA</div>
              <div className="text-xs text-gray-600 mt-1">
                {selectedVagons.length} ta vagon, {selectedCount} ta yog'och
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(totalPrice, currency)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
