'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import FormattedInput from '@/components/FormattedInput';
import { showToast } from '@/utils/toast';

interface ExpenseModalProps {
  expense?: any;
  onClose: () => void;
}

export default function ExpenseModal({ expense, onClose }: ExpenseModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    vagon: '',
    expense_type: '',
    amount: '',
    currency: 'USD',
    description: '',
    responsible_person: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_date: '',
    document_number: '',
    additional_info: ''
  });

  // Vagonlarni olish
  const { data: vagons = [] } = useQuery({
    queryKey: ['vagons-list'],
    queryFn: async () => {
      const response = await axios.get('/vagon');
      return response.data.vagons || [];
    }
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        vagon: expense.vagon?._id || '',
        expense_type: expense.expense_type || '',
        amount: expense.amount?.toString() || '',
        currency: expense.currency || 'USD',
        description: expense.description || '',
        responsible_person: expense.responsible_person || '',
        expense_date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        payment_date: expense.payment_date ? new Date(expense.payment_date).toISOString().split('T')[0] : '',
        document_number: expense.document_number || '',
        additional_info: expense.additional_info || ''
      });
    }
  }, [expense]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (expense) {
        const response = await axios.put(`/vagon-expense/${expense._id}`, data);
        return response.data;
      } else {
        const response = await axios.post('/vagon-expense', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      showToast.success(expense ? 'Xarajat yangilandi' : 'Xarajat qo\'shildi');
      onClose();
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.expense_type || !formData.amount || !formData.description) {
      showToast.error('Majburiy maydonlarni to\'ldiring');
      return;
    }

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      currency: 'USD', // TUZATILDI: Barcha chiqimlar USD da
      payment_date: formData.payment_date || null
    };

    saveMutation.mutate(submitData);
  };

  const expenseTypes = [
    { value: 'transport_kz', label: 'Transport KZ' },
    { value: 'transport_uz', label: 'Transport UZ' },
    { value: 'transport_kelish', label: 'Transport kelish' },
    { value: 'bojxona_nds', label: 'Bojxona NDS' },
    { value: 'yuklash_tushirish', label: 'Yuklash/Tushirish' },
    { value: 'saqlanish', label: 'Saqlanish' },
    { value: 'ishchilar', label: 'Ishchilar' },
    { value: 'boshqa', label: 'Boshqa' }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={expense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vagon
                </label>
                <select
                  value={formData.vagon}
                  onChange={(e) => setFormData({...formData, vagon: e.target.value})}
                  className="input-field"
                >
                  <option value="">Vagonni tanlang</option>
                  {vagons.map((vagon: any) => (
                    <option key={vagon._id} value={vagon._id}>
                      {vagon.vagon_code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xarajat turi *
                </label>
                <select
                  value={formData.expense_type}
                  onChange={(e) => setFormData({...formData, expense_type: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Turni tanlang</option>
                  {expenseTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summa (USD) *
                </label>
                <FormattedInput
                  value={formData.amount}
                  onChange={(value) => setFormData({...formData, amount: value})}
                  placeholder="1000.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Barcha chiqimlar USD hisobidan ayriladi
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Xarajat haqida batafsil ma'lumot..."
                className="input-field"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Javobgar shaxs
                </label>
                <input
                  type="text"
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({...formData, responsible_person: e.target.value})}
                  placeholder="To'liq ismi"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xarajat sanasi *
                </label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To'lov sanasi
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hujjat raqami
                </label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                  placeholder="INV-001"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qo'shimcha ma'lumot
              </label>
              <textarea
                value={formData.additional_info}
                onChange={(e) => setFormData({...formData, additional_info: e.target.value})}
                placeholder="Qo'shimcha izohlar..."
                className="input-field"
                rows={2}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            loading={saveMutation.isPending}
          >
            {expense ? 'Yangilash' : 'Saqlash'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}