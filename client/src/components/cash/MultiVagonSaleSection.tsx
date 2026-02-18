'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@/components/Icon';
import FormattedInput from '@/components/FormattedInput';
import { formatCurrency } from '@/utils/formatters';
import axios from '@/lib/axios';

interface SaleItem {
  vagon_id: string;
  vagon_code: string;
  yogoch_id: string;
  yogoch_name: string;
  sold_quantity: string;
  price_per_unit: string;
  total_price: number;
  available_quantity: number;
}

interface MultiVagonSaleSectionProps {
  items: SaleItem[];
  onChange: (items: SaleItem[]) => void;
  currency: 'USD' | 'RUB';
}

export default function MultiVagonSaleSection({ 
  items, 
  onChange,
  currency 
}: MultiVagonSaleSectionProps) {
  const [selectedVagonId, setSelectedVagonId] = useState('');

  // Vagonlar ro'yxati
  const { data: vagons = [] } = useQuery({
    queryKey: ['vagons-for-multi-sale'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100&status=active');
      return response.data.vagons || [];
    }
  });

  // Tanlangan vagon uchun yog'ochlar
  const { data: yogochlar = [] } = useQuery({
    queryKey: ['yogochlar-for-multi-sale', selectedVagonId],
    queryFn: async () => {
      if (!selectedVagonId) return [];
      const response = await axios.get(`/vagon-lot?vagon=${selectedVagonId}`);
      return response.data || [];
    },
    enabled: !!selectedVagonId
  });

  // Yog'och qo'shish
  const addItem = () => {
    if (!selectedVagonId) return;

    const vagon = vagons.find((v: any) => v._id === selectedVagonId);
    if (!vagon) return;

    const newItem: SaleItem = {
      vagon_id: selectedVagonId,
      vagon_code: vagon.vagonCode,
      yogoch_id: '',
      yogoch_name: '',
      sold_quantity: '',
      price_per_unit: '',
      total_price: 0,
      available_quantity: 0
    };

    onChange([...items, newItem]);
    setSelectedVagonId('');
  };

  // Item o'chirish
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  // Yog'och tanlash
  const selectYogoch = (index: number, yogochId: string) => {
    const yogoch = yogochlar.find((y: any) => y._id === yogochId);
    if (!yogoch) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      yogoch_id: yogochId,
      yogoch_name: yogoch.dimensions || yogoch.name || 'Yog\'och',
      available_quantity: yogoch.remaining_quantity || 0,
      price_per_unit: yogoch.recommended_sale_price_per_m3?.toString() || ''
    };
    onChange(newItems);
  };

  // Miqdor o'zgartirish
  const updateQuantity = (index: number, quantity: string) => {
    const newItems = [...items];
    newItems[index].sold_quantity = quantity;
    
    // Narxni hisoblash
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(newItems[index].price_per_unit) || 0;
    newItems[index].total_price = qty * price;
    
    onChange(newItems);
  };

  // Narx o'zgartirish
  const updatePrice = (index: number, price: string) => {
    const newItems = [...items];
    newItems[index].price_per_unit = price;
    
    // Narxni hisoblash
    const qty = parseFloat(newItems[index].sold_quantity) || 0;
    const priceNum = parseFloat(price) || 0;
    newItems[index].total_price = qty * priceNum;
    
    onChange(newItems);
  };

  // Jami summa
  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="space-y-4">
      {/* Vagon tanlash va qo'shish */}
      <div className="flex gap-2">
        <select
          value={selectedVagonId}
          onChange={(e) => setSelectedVagonId(e.target.value)}
          className="input-field flex-1"
        >
          <option value="">Vagon tanlang</option>
          {vagons.map((vagon: any) => (
            <option key={vagon._id} value={vagon._id}>
              {vagon.vagonCode} - {vagon.sending_place} → {vagon.receiving_place}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addItem}
          disabled={!selectedVagonId}
          className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="plus" className="h-4 w-4" />
          Qo'shish
        </button>
      </div>

      {/* Items ro'yxati */}
      {items.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Icon name="package" className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Vagon va yog'och qo'shing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{item.vagon_code}</h4>
                  <p className="text-sm text-gray-500">Item {index + 1}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Yog'och tanlash */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yog'och
                  </label>
                  <select
                    value={item.yogoch_id}
                    onChange={(e) => selectYogoch(index, e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Yog'ochni tanlang</option>
                    {item.vagon_id && yogochlar
                      .filter((y: any) => y.vagon?.toString() === item.vagon_id || y.vagon?._id === item.vagon_id)
                      .map((yogoch: any) => (
                        <option key={yogoch._id} value={yogoch._id}>
                          {yogoch.dimensions || yogoch.name} - {yogoch.remaining_quantity || 0} dona
                        </option>
                      ))}
                  </select>
                </div>

                {item.yogoch_id && (
                  <>
                    {/* Miqdor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sotilgan miqdor (dona) - Mavjud: {item.available_quantity}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={item.available_quantity}
                        value={item.sold_quantity}
                        onChange={(e) => updateQuantity(index, e.target.value)}
                        placeholder="0"
                        className="input-field"
                        required
                      />
                    </div>

                    {/* Narx */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Narx (dona uchun)
                      </label>
                      <FormattedInput
                        value={item.price_per_unit}
                        onChange={(value) => updatePrice(index, value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Jami */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
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

      {/* Jami summa */}
      {items.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600 mb-1">JAMI SUMMA</div>
              <div className="text-xs text-gray-500">{items.length} ta yog'och</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount, currency)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
