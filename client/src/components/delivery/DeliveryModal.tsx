'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';

interface DeliveryModalProps {
  delivery: any | null;
  onClose: () => void;
}

function DeliveryModal({ delivery, onClose }: DeliveryModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isEdit = !!delivery;

  // Mijozlar ro'yxatini olish
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await axios.get('/client');
      return response.data;
    },
    staleTime: 60000, // 1 daqiqa cache
  });

  const [formData, setFormData] = useState({
    orderNumber: delivery?.orderNumber || '',
    month: delivery?.month || new Date().toISOString().slice(0, 7),
    codeUZ: delivery?.codeUZ || '',
    codeKZ: delivery?.codeKZ || '',
    fromLocation: delivery?.fromLocation || '',
    toLocation: delivery?.toLocation || '',
    tonnage: delivery?.tonnage || '',
    orderDate: delivery?.orderDate ? new Date(delivery.orderDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    sender: delivery?.sender || '',
    receiver: delivery?.receiver || '',
    client: delivery?.client?._id || '', // YANGI: Mijoz ID
    vagonNumber: delivery?.vagonNumber || '',
    shipmentNumber: delivery?.shipmentNumber || '',
    actualWeight: delivery?.actualWeight || '',
    roundedWeight: delivery?.roundedWeight || '',
    rateKZ: delivery?.rateKZ || '',
    rateUZ: delivery?.rateUZ || '',
    afghanTariff: delivery?.afghanTariff || '',
    payment: delivery?.payment || 0
  });

  // Avtomatik hisoblash
  const [calculatedValues, setCalculatedValues] = useState({
    tariffKZ: 0,
    tariffUZ: 0,
    totalTariff: 0,
    debt: 0
  });

  useEffect(() => {
    const roundedWeight = parseFloat(formData.roundedWeight) || 0;
    const rateKZ = parseFloat(formData.rateKZ) || 0;
    const rateUZ = parseFloat(formData.rateUZ) || 0;
    const afghanTariff = parseFloat(formData.afghanTariff) || 0;
    const payment = parseFloat(formData.payment) || 0;

    const tariffKZ = roundedWeight * rateKZ;
    const tariffUZ = roundedWeight * rateUZ;
    const totalTariff = afghanTariff + tariffKZ + tariffUZ;
    const debt = totalTariff - payment;

    setCalculatedValues({
      tariffKZ,
      tariffUZ,
      totalTariff,
      debt: debt < 0 ? 0 : debt
    });
  }, [formData.roundedWeight, formData.rateKZ, formData.rateUZ, formData.afghanTariff, formData.payment]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return await axios.put(`/delivery/${delivery._id}`, data);
      } else {
        return await axios.post('/delivery', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-monthly-report'] });
      onClose();
    }
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📤 Delivery ma\'lumotlari yuborilmoqda:', formData);
    await saveMutation.mutateAsync(formData);
  }, [formData, saveMutation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`🔄 Field o'zgartirildi: ${name} = ${value}`);
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Escape tugmasi bilan yopish
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-enter">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-enter modal-content">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icon name="transport" />
            {isEdit ? t.delivery.editDelivery : t.delivery.addDelivery}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asosiy ma'lumotlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.orderNumber} *
              </label>
              <input
                type="number"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.month} *
              </label>
              <input
                type="month"
                name="month"
                value={formData.month}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.orderDate} *
              </label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Kodlar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.codeUZ} *
              </label>
              <input
                type="text"
                name="codeUZ"
                value={formData.codeUZ}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.codeKZ} *
              </label>
              <input
                type="text"
                name="codeKZ"
                value={formData.codeKZ}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Marshrutlar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.fromLocation} *
              </label>
              <input
                type="text"
                name="fromLocation"
                value={formData.fromLocation}
                onChange={handleChange}
                required
                placeholder="Afg'oniston"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.toLocation} *
              </label>
              <input
                type="text"
                name="toLocation"
                value={formData.toLocation}
                onChange={handleChange}
                required
                placeholder="O'zbekiston / Qozog'iston"
                className="input-field"
              />
            </div>
          </div>

          {/* Tomonlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.sender} *
              </label>
              <input
                type="text"
                name="sender"
                value={formData.sender}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.receiver} *
              </label>
              <input
                type="text"
                name="receiver"
                value={formData.receiver}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mijoz (ixtiyoriy)
              </label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Mijoz tanlanmagan</option>
                {clients.map((client: any) => (
                  <option key={client._id} value={client._id}>
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-600 mt-1">
                💡 Mijoz tanlanganida qarz mijozlar sahifasida ko'rinadi
              </p>
            </div>
          </div>

          {/* Vagon ma'lumotlari */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.vagonNumber} *
              </label>
              <input
                type="text"
                name="vagonNumber"
                value={formData.vagonNumber}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.shipmentNumber} *
              </label>
              <input
                type="text"
                name="shipmentNumber"
                value={formData.shipmentNumber}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Vaznlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.tonnage} *
              </label>
              <input
                type="number"
                step="0.01"
                name="tonnage"
                value={formData.tonnage}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.actualWeight} *
              </label>
              <input
                type="number"
                step="0.01"
                name="actualWeight"
                value={formData.actualWeight}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.roundedWeight} *
              </label>
              <input
                type="number"
                step="0.01"
                name="roundedWeight"
                value={formData.roundedWeight}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
          </div>

          {/* Tariflar */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Tariflar (USD)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.delivery.rateKZ} (1 tonna) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="rateKZ"
                  value={formData.rateKZ}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t.delivery.tariffKZ}: ${calculatedValues.tariffKZ.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.delivery.rateUZ} (1 tonna) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="rateUZ"
                  value={formData.rateUZ}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t.delivery.tariffUZ}: ${calculatedValues.tariffUZ.toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.afghanTariff} *
              </label>
              <input
                type="number"
                step="0.01"
                name="afghanTariff"
                value={formData.afghanTariff}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="text-lg font-bold text-gray-900">
                {t.delivery.totalTariff}: ${calculatedValues.totalTariff.toFixed(2)}
              </div>
            </div>
          </div>

          {/* To'lovlar */}
          <div className="bg-green-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">To'lovlar (USD)</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.delivery.payment}
              </label>
              <input
                type="number"
                step="0.01"
                name="payment"
                value={formData.payment}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div className={`bg-white rounded-lg p-4 ${calculatedValues.debt > 0 ? 'border-2 border-red-300' : 'border-2 border-green-300'}`}>
              <div className={`text-lg font-bold ${calculatedValues.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {t.delivery.debt}: ${calculatedValues.debt.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? t.common.loading : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default DeliveryModal;
