'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import Icon from '@/components/Icon';
import axios from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import FormattedInput from '@/components/FormattedInput';
import ClientAutocomplete from '@/components/ui/ClientAutocomplete';

// Types
interface IncomeFormData {
  income_source: 'yogoch_tolovi' | 'qarz_daftarcha' | 'yetkazib_berish';
  amount: string;
  currency: 'USD' | 'RUB';
  description: string;
  client_id: string;
  date: string;
  vagon_id: string;
  yogoch_id: string;
  // Bir martalik mijoz uchun
  one_time_client_name: string;
  one_time_client_phone: string;
  client_type: 'existing' | 'one_time'; // Mijoz turi
  // Yogoch tolovi uchun qo'shimcha
  total_price: string; // Jami narx (qarz)
  paid_amount: string; // Hozir to'lanayotgan summa
  sold_quantity: string; // Sotilgan miqdor (dona)
}

interface ExpenseFormData {
  expense_source: 'transport' | 'bojxona' | 'ish_haqi' | 'yuklash_tushurish' | 'soliq' | 'sifatsiz_mahsulot';
  amount: string;
  currency: 'USD' | 'RUB';
  description: string;
  responsible_person: string;
  date: string;
  related_client_id: string;
  vagon_id: string;
  yogoch_id: string;
}

// Kirim Modal Component
interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function IncomeModal({ isOpen, onClose, onSuccess }: IncomeModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<IncomeFormData>({
    income_source: 'yogoch_tolovi',
    amount: '',
    currency: 'USD',
    description: '',
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    vagon_id: '',
    yogoch_id: '',
    one_time_client_name: '',
    one_time_client_phone: '',
    client_type: 'existing',
    total_price: '',
    paid_amount: '',
    sold_quantity: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mijozlar ro'yxati (autocomplete uchun har doim kerak)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-income'],
    queryFn: async () => {
      const response = await axios.get('/client');
      return response.data.clients || response.data || [];
    },
    enabled: isOpen // Modal ochilganda yuklanadi
  });

  // Vagonlar ro'yxati (faqat yogoch_tolovi va yetkazib_berish uchun)
  const { data: vagons = [], isLoading: vagonsLoading } = useQuery({
    queryKey: ['vagons-for-income'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100&status=active');
      return response.data.vagons || [];
    },
    enabled: isOpen && (formData.income_source === 'yogoch_tolovi' || formData.income_source === 'yetkazib_berish')
  });

  // Yog'ochlar ro'yxati (vagon tanlanganida, yogoch_tolovi va yetkazib_berish uchun)
  const { data: yogochlar = [] } = useQuery({
    queryKey: ['yogochlar-for-income', formData.vagon_id],
    queryFn: async () => {
      if (!formData.vagon_id) return [];
      const response = await axios.get(`/vagon-lot?vagon=${formData.vagon_id}`);
      return response.data || [];
    },
    enabled: !!formData.vagon_id && (formData.income_source === 'yogoch_tolovi' || formData.income_source === 'yetkazib_berish')
  });

  const saveMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      // Double submit prevention
      if (isSubmitting) {
        throw new Error('Takroriy yuborildi');
      }
      setIsSubmitting(true);
      
      // Yogoch tolovi uchun amount va currency ni paid_amount dan olish
      const finalAmount = data.income_source === 'yogoch_tolovi' 
        ? parseFloat(data.paid_amount) 
        : parseFloat(data.amount);
      const finalCurrency = data.income_source === 'yogoch_tolovi' 
        ? 'USD' 
        : data.currency;
      
      return await axios.post('/cash/income', {
        income_source: data.income_source,
        amount: finalAmount,
        currency: finalCurrency,
        description: data.description.trim(),
        client_id: data.client_id || null,
        date: data.date,
        vagon_id: data.vagon_id || null,
        yogoch_id: data.yogoch_id || null,
        client_type: data.client_type,
        one_time_client_name: data.one_time_client_name?.trim() || null,
        one_time_client_phone: data.one_time_client_phone?.trim() || null,
        // Yogoch tolovi uchun qo'shimcha
        total_price: data.total_price ? parseFloat(data.total_price) : null,
        paid_amount: data.paid_amount ? parseFloat(data.paid_amount) : null,
        sold_quantity: data.sold_quantity ? parseInt(data.sold_quantity) : null
      });
    },
    onSuccess: () => {
      showToast.success('Daromad muvaffaqiyatli saqlandi');
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        setErrors(error.response.data.errors || [error.response.data.message]);
      } else if (error.response?.status === 401) {
        showToast.error('Avtorizatsiya xatosi');
        // Redirect to login handled by axios interceptor
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

  const resetForm = () => {
    setFormData({
      income_source: 'yogoch_tolovi',
      amount: '',
      currency: 'USD',
      description: '',
      client_id: '',
      date: new Date().toISOString().split('T')[0],
      vagon_id: '',
      yogoch_id: '',
      one_time_client_name: '',
      one_time_client_phone: '',
      client_type: 'existing',
      total_price: '',
      paid_amount: '',
      sold_quantity: ''
    });
    setErrors([]);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    // Yogoch tolovi bo'lmagan holatlar uchun summa validatsiyasi
    if (formData.income_source !== 'yogoch_tolovi') {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        newErrors.push('Summa 0 dan katta bo\'lishi shart');
      }
      
      if (parseFloat(formData.amount) > 1e9) {
        newErrors.push('Summa juda katta (maksimal 1 milliard)');
      }
    }
    
    if (!formData.description || formData.description.trim().length < 3) {
      newErrors.push('Tavsif kamida 3 belgi bo\'lishi shart');
    }
    
    if (formData.description.length > 500) {
      newErrors.push('Tavsif 500 belgidan oshmasin');
    }
    
    if (formData.income_source === 'qarz_daftarcha' && !formData.client_id) {
      newErrors.push('Qarz daftarcha uchun mijoz tanlanishi shart');
    }
    
    // Yogoch tolovi uchun mijoz majburiy (ClientAutocomplete o'zi validation qiladi)
    if (formData.income_source === 'yogoch_tolovi') {
      if (!formData.client_id && !formData.one_time_client_name) {
        newErrors.push('Yogoch tolovi uchun mijoz tanlanishi shart');
      }
      if (formData.client_type === 'one_time' && formData.one_time_client_name && !formData.one_time_client_phone) {
        newErrors.push('Bir martalik mijoz uchun telefon raqami kiritilishi shart');
      }
      
      // Yogoch tolovi uchun qo'shimcha validatsiya
      if (!formData.sold_quantity || parseInt(formData.sold_quantity) <= 0) {
        newErrors.push('Sotilgan miqdor 0 dan katta bo\'lishi shart');
      }
      
      if (!formData.total_price || parseFloat(formData.total_price) <= 0) {
        newErrors.push('Jami narx 0 dan katta bo\'lishi shart');
      }
      
      if (!formData.paid_amount || parseFloat(formData.paid_amount) < 0) {
        newErrors.push('To\'lov summasi 0 dan kichik bo\'lmasin');
      }
      
      if (formData.total_price && formData.paid_amount && parseFloat(formData.paid_amount) > parseFloat(formData.total_price)) {
        newErrors.push('To\'lov summasi jami narxdan katta bo\'lmasin');
      }
    }
    
    // Yogoch tolovi uchun vagon va yogoch majburiy
    if (formData.income_source === 'yogoch_tolovi' && !formData.vagon_id) {
      newErrors.push('Yogoch tolovi uchun vagon tanlanishi shart');
    }
    
    if (formData.income_source === 'yogoch_tolovi' && formData.vagon_id && !formData.yogoch_id) {
      newErrors.push('Yogoch tolovi uchun yog\'och tanlanishi shart');
    }
    
    // Yetkazib berish uchun faqat vagon majburiy (yogoch ixtiyoriy)
    if (formData.income_source === 'yetkazib_berish' && !formData.vagon_id) {
      newErrors.push('Yetkazib berish uchun vagon tanlanishi shart');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate(formData);
  };

  const incomeTypes = [
    { 
      value: 'yogoch_tolovi', 
      label: 'Yog\'och to\'lovi', 
      icon: 'truck', 
      color: 'green',
      description: 'Yog\'och sotuvi daromadi'
    },
    { 
      value: 'qarz_daftarcha', 
      label: 'Qarz daftarcha', 
      icon: 'book-open', 
      color: 'blue',
      description: 'Mijozdan qarz qaytishi'
    },
    { 
      value: 'yetkazib_berish', 
      label: 'Yetkazib berish', 
      icon: 'truck', 
      color: 'purple',
      description: 'Yetkazib berish xizmati'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daromad qo'shish">
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

            {/* Daromad manbai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Daromad manbai *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {incomeTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({...formData, income_source: type.value as any})}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      formData.income_source === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <Icon name={type.icon} className="w-8 h-8 mb-2" />
                      <span className="font-medium text-center">{type.label}</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">{type.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vagon tanlash (yogoch_tolovi va yetkazib_berish uchun) */}
            {(formData.income_source === 'yogoch_tolovi' || formData.income_source === 'yetkazib_berish') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vagon *
                </label>
                <select
                  value={formData.vagon_id}
                  onChange={(e) => {
                    setFormData({...formData, vagon_id: e.target.value, yogoch_id: ''});
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Vagonni tanlang</option>
                  {vagons.map((vagon: any) => (
                    <option key={vagon._id} value={vagon._id}>
                      {vagon.vagonCode} - {vagon.sending_place} → {vagon.receiving_place}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Yog'och tanlash (vagon tanlanganida) */}
            {(formData.income_source === 'yogoch_tolovi' || formData.income_source === 'yetkazib_berish') && formData.vagon_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yog'och {formData.income_source === 'yogoch_tolovi' ? '*' : '(ixtiyoriy)'}
                </label>
                <select
                  value={formData.yogoch_id}
                  onChange={(e) => setFormData({...formData, yogoch_id: e.target.value})}
                  className="input-field"
                  required={formData.income_source === 'yogoch_tolovi'}
                >
                  <option value="">Yog'ochni tanlang</option>
                  {yogochlar.map((yogoch: any) => (
                    <option key={yogoch._id} value={yogoch._id}>
                      {yogoch.name || yogoch.dimensions} - {yogoch.quantity} dona ({yogoch.volume_m3.toFixed(2)} m³)
                    </option>
                  ))}
                </select>
                {yogochlar.length === 0 && formData.vagon_id && (
                  <p className="text-sm text-gray-500 mt-1">Bu vagonda yog'ochlar mavjud emas</p>
                )}
              </div>
            )}

            {/* Yog'och sotuvlari uchun qo'shimcha maydonlar */}
            {formData.income_source === 'yogoch_tolovi' && formData.yogoch_id && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                  <Icon name="package" className="h-4 w-4 mr-2" />
                  Yog'och sotuvlari ma'lumotlari
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sotilgan miqdor (dona) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.sold_quantity || ''}
                      onChange={(e) => setFormData({...formData, sold_quantity: e.target.value})}
                      placeholder="10"
                      className="input-field"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jami narx (USD) *
                    </label>
                    <FormattedInput
                      value={formData.total_price}
                      onChange={(value) => setFormData({...formData, total_price: value})}
                      placeholder="5000.00"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hozir to'lanayotgan summa (USD) *
                  </label>
                  <FormattedInput
                    value={formData.paid_amount}
                    onChange={(value) => setFormData({...formData, paid_amount: value})}
                    placeholder="3000.00"
                    required
                  />
                  {formData.total_price && formData.paid_amount && (
                    <div className="mt-2 text-sm">
                      {parseFloat(formData.paid_amount || '0') < parseFloat(formData.total_price || '0') ? (
                        <div className="text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                          <Icon name="alert-triangle" className="h-4 w-4 inline mr-1" />
                          Qarz: {formatCurrency(parseFloat(formData.total_price) - parseFloat(formData.paid_amount), 'USD')}
                          <br />
                          <span className="text-xs">Bu mijoz avtomatik qarz daftarchaga qo'shiladi</span>
                        </div>
                      ) : parseFloat(formData.paid_amount || '0') === parseFloat(formData.total_price || '0') ? (
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
              </div>
            )}

            {/* Mijoz tanlash (qarz daftarcha va yogoch tolovi uchun) */}
            {(formData.income_source === 'qarz_daftarcha' || formData.income_source === 'yogoch_tolovi') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mijoz *
                </label>
                
                {formData.income_source === 'qarz_daftarcha' ? (
                  // Qarz daftarcha uchun - faqat doimiy mijozlar
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Mijozni tanlang</option>
                    {clients.map((client: any) => (
                      <option key={client._id} value={client._id}>
                        {client.name} - {client.phone}
                      </option>
                    ))}
                  </select>
                ) : (
                  // Yogoch tolovi uchun - autocomplete
                  <ClientAutocomplete
                    clients={clients}
                    value={{
                      client_id: formData.client_id,
                      client_type: formData.client_type,
                      one_time_client_name: formData.one_time_client_name,
                      one_time_client_phone: formData.one_time_client_phone
                    }}
                    onChange={(value) => setFormData({
                      ...formData,
                      client_id: value.client_id,
                      client_type: value.client_type,
                      one_time_client_name: value.one_time_client_name,
                      one_time_client_phone: value.one_time_client_phone
                    })}
                    placeholder="Mijoz ismini kiriting..."
                    required
                  />
                )}
              </div>
            )}

            {/* Summa va valyuta (faqat yogoch_tolovi bo'lmagan holatlar uchun) */}
            {formData.income_source !== 'yogoch_tolovi' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Summa *
                  </label>
                  <FormattedInput
                    value={formData.amount}
                    onChange={(value) => setFormData({...formData, amount: value})}
                    placeholder="1000.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valyuta *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value as 'USD' | 'RUB'})}
                    className="input-field"
                  >
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tavsif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif * <span className="text-xs text-gray-500">(kamida 3 belgi)</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Daromad haqida qisqacha ma'lumot"
                className="input-field"
                maxLength={500}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 belgi
              </div>
            </div>

            {/* Sana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sana *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
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
            disabled={saveMutation.isPending || isSubmitting}
          >
            Saqlash
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// Chiqim Modal Component
interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function ExpenseModal({ isOpen, onClose, onSuccess }: ExpenseModalProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_source: 'transport',
    amount: '',
    currency: 'USD',
    description: '',
    responsible_person: '',
    date: new Date().toISOString().split('T')[0],
    related_client_id: '',
    vagon_id: '',
    yogoch_id: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mijozlar ro'yxati (lazy load)
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-expense'],
    queryFn: async () => {
      const response = await axios.get('/client');
      return response.data.clients || response.data || [];
    },
    enabled: false // Manual fetch when needed
  });

  // Vagonlar ro'yxati
  const { data: vagons = [] } = useQuery({
    queryKey: ['vagons-for-expense'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100');
      return response.data.vagons || [];
    },
    enabled: isOpen
  });

  // Yog'ochlar ro'yxati (vagon tanlanganida)
  const { data: yogochlar = [] } = useQuery({
    queryKey: ['yogochlar-for-expense', formData.vagon_id],
    queryFn: async () => {
      if (!formData.vagon_id) return [];
      const response = await axios.get(`/vagon-lot?vagon=${formData.vagon_id}`);
      return response.data || [];
    },
    enabled: !!formData.vagon_id
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      // Double submit prevention
      if (isSubmitting) {
        throw new Error('Takroriy yuborildi');
      }
      setIsSubmitting(true);
      
      return await axios.post('/cash/expense', {
        expense_source: data.expense_source,
        amount: parseFloat(data.amount),
        currency: data.currency,
        description: data.description.trim(),
        responsible_person: data.responsible_person.trim(),
        date: data.date,
        related_client_id: data.related_client_id || null,
        vagon_id: data.vagon_id || null,
        yogoch_id: data.yogoch_id || null
      });
    },
    onSuccess: () => {
      showToast.success('Xarajat muvaffaqiyatli saqlandi');
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        setErrors(error.response.data.errors || [error.response.data.message]);
      } else if (error.response?.status === 401) {
        showToast.error('Avtorizatsiya xatosi');
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

  const resetForm = () => {
    setFormData({
      expense_source: 'transport',
      amount: '',
      currency: 'USD',
      description: '',
      responsible_person: '',
      date: new Date().toISOString().split('T')[0],
      related_client_id: '',
      vagon_id: '',
      yogoch_id: ''
    });
    setErrors([]);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.push('Summa 0 dan katta bo\'lishi shart');
    }
    
    if (parseFloat(formData.amount) > 1e9) {
      newErrors.push('Summa juda katta (maksimal 1 milliard)');
    }
    
    if (!formData.description || formData.description.trim().length < 3) {
      newErrors.push('Tavsif kamida 3 belgi bo\'lishi shart');
    }
    
    if (formData.description.length > 500) {
      newErrors.push('Tavsif 500 belgidan oshmasin');
    }
    
    if (!formData.responsible_person || formData.responsible_person.trim().length === 0) {
      newErrors.push('Javobgar shaxs bo\'sh bo\'lmasin');
    }
    
    // Sifatsiz mahsulot uchun maxsus validatsiya
    if (formData.expense_source === 'sifatsiz_mahsulot' && formData.description.trim().length < 10) {
      newErrors.push('Sifatsiz mahsulot uchun tavsif kamida 10 belgi bo\'lishi shart');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate(formData);
  };

  const expenseTypes = [
    { 
      value: 'transport', 
      label: 'Transport', 
      icon: 'truck', 
      color: 'red',
      description: 'Transport xarajatlari'
    },
    { 
      value: 'bojxona', 
      label: 'Bojxona', 
      icon: 'file-text', 
      color: 'blue',
      description: 'Bojxona rasmiylashtiruvi'
    },
    { 
      value: 'ish_haqi', 
      label: 'Ish haqi', 
      icon: 'users', 
      color: 'green',
      description: 'Ishchilar maoshi'
    },
    { 
      value: 'yuklash_tushurish', 
      label: 'Yuklash/Tushirish', 
      icon: 'package', 
      color: 'yellow',
      description: 'Yuklash va tushirish'
    },
    { 
      value: 'soliq', 
      label: 'Soliq', 
      icon: 'percent', 
      color: 'purple',
      description: 'Soliq to\'lovlari'
    },
    { 
      value: 'sifatsiz_mahsulot', 
      label: 'Sifatsiz mahsulot', 
      icon: 'alert-triangle', 
      color: 'orange',
      description: 'Sifatsiz mahsulot zarari'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xarajat qo'shish">
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

            {/* Xarajat manbai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Xarajat turi *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {expenseTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({...formData, expense_source: type.value as any})}
                    className={`p-3 border-2 rounded-xl transition-all duration-200 ${
                      formData.expense_source === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <Icon name={type.icon} className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium text-center">{type.label}</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">{type.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summa va valyuta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summa *
                </label>
                <FormattedInput
                  value={formData.amount}
                  onChange={(value) => setFormData({...formData, amount: value})}
                  placeholder="1000.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valyuta *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value as 'USD' | 'RUB'})}
                  className="input-field"
                >
                  <option value="USD">USD</option>
                  <option value="RUB">RUB</option>
                </select>
              </div>
            </div>

            {/* Tavsif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tavsif * 
                <span className="text-xs text-gray-500">
                  ({formData.expense_source === 'sifatsiz_mahsulot' ? 'kamida 10 belgi' : 'kamida 3 belgi'})
                </span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder={formData.expense_source === 'sifatsiz_mahsulot' 
                  ? "Sifatsiz mahsulot sababi va tafsilotlari..." 
                  : "Xarajat haqida qisqacha ma'lumot"
                }
                className="input-field"
                rows={3}
                maxLength={500}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 belgi
              </div>
            </div>

            {/* Javobgar shaxs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Javobgar shaxs *
              </label>
              <input
                type="text"
                value={formData.responsible_person}
                onChange={(e) => setFormData({...formData, responsible_person: e.target.value})}
                placeholder="To'liq ismi"
                className="input-field"
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
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="input-field"
                required
              />
            </div>

            {/* Vagon tanlash (ixtiyoriy) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vagon (ixtiyoriy)
              </label>
              <select
                value={formData.vagon_id}
                onChange={(e) => {
                  setFormData({...formData, vagon_id: e.target.value, yogoch_id: ''});
                }}
                className="input-field"
              >
                <option value="">Vagonni tanlang</option>
                {vagons.map((vagon: any) => (
                  <option key={vagon._id} value={vagon._id}>
                    {vagon.vagonCode} - {vagon.sending_place} → {vagon.receiving_place}
                  </option>
                ))}
              </select>
            </div>

            {/* Yog'och tanlash (vagon tanlanganida) */}
            {formData.vagon_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yog'och (ixtiyoriy)
                </label>
                <select
                  value={formData.yogoch_id}
                  onChange={(e) => setFormData({...formData, yogoch_id: e.target.value})}
                  className="input-field"
                >
                  <option value="">Yog'ochni tanlang</option>
                  {yogochlar.map((yogoch: any) => (
                    <option key={yogoch._id} value={yogoch._id}>
                      {yogoch.name || yogoch.dimensions} - {yogoch.quantity} dona ({yogoch.volume_m3.toFixed(2)} m³)
                    </option>
                  ))}
                </select>
                {yogochlar.length === 0 && formData.vagon_id && (
                  <p className="text-sm text-gray-500 mt-1">Bu vagonda yog'ochlar mavjud emas</p>
                )}
              </div>
            )}

            {/* Bog'liq mijoz (ixtiyoriy) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bog'liq mijoz (ixtiyoriy)
              </label>
              <select
                value={formData.related_client_id}
                onChange={(e) => setFormData({...formData, related_client_id: e.target.value})}
                className="input-field"
              >
                <option value="">Mijozni tanlang</option>
                {clients.map((client: any) => (
                  <option key={client._id} value={client._id}>
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
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
            disabled={saveMutation.isPending || isSubmitting}
          >
            Saqlash
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default function CashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Parallel so'rovlar - balans va tranzaksiyalar
  const { data: balanceData, refetch: refetchBalance, error: balanceError } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: async () => {
      const response = await axios.get('/cash/balance/by-currency');
      return response.data;
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    }
  });

  const { data: transactionsData, refetch: refetchTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const response = await axios.get('/cash?page=1&limit=10');
      return response.data;
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    }
  });

  // Cache invalidation va refetch
  const handleModalSuccess = () => {
    // Barcha zarur querylarni invalidate qilish
    queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
    queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    
    // Manual refetch
    refetchBalance();
    refetchTransactions();
  };

  // 401 xatosi uchun redirect
  useEffect(() => {
    if (balanceError?.response?.status === 401) {
      showToast.error('Avtorizatsiya muddati tugagan');
      router.push('/login');
    }
  }, [balanceError, router]);

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Yuklanmoqda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  // Balans ma'lumotlarini formatlash
  const formatBalanceData = (balances: any) => {
    if (!balances || typeof balances !== 'object') return [];
    
    return Object.keys(balances).map(currency => ({
      _id: currency,
      jamiKirim: balances[currency]?.income || 0,
      xarajatlar: balances[currency]?.expense || 0,
      sof: balances[currency]?.balance || 0
    }));
  };

  const formattedBalanceData = formatBalanceData(balanceData);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="dollar-sign" className="h-7 w-7" />
                    </div>
                    Kassa Boshqaruvi
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    Daromad va xarajatlar markazi
                  </p>
                  <p className="text-sm opacity-75">
                    Barcha kirim va chiqimlarni manbalar bo'yicha boshqaring
                  </p>
                </div>
                
                {/* Asosiy 2 ta tugma */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setIncomeModalOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 flex items-center shadow-lg transition-all duration-200 font-semibold text-lg"
                  >
                    <Icon name="trending-up" className="mr-3 h-6 w-6" />
                    Daromad
                  </button>
                  <button
                    onClick={() => setExpenseModalOpen(true)}
                    className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-8 py-4 rounded-2xl hover:from-red-600 hover:to-rose-700 flex items-center shadow-lg transition-all duration-200 font-semibold text-lg"
                  >
                    <Icon name="trending-down" className="mr-3 h-6 w-6" />
                    Xarajat
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="px-6 py-8 max-w-7xl mx-auto">
          {/* Asosiy Moliyaviy Statistika */}
          {formattedBalanceData.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Icon name="bar-chart" className="mr-3 h-6 w-6 text-blue-600" />
                Moliyaviy Xulasa
              </h2>
              
              {/* Asosiy 3 ta karta: Jami Daromad, Jami Xarajat, Sof Foyda */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Jami Daromad */}
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Icon name="trending-up" className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jami Daromad</div>
                      <div className="text-xs text-green-600 font-semibold mt-1">💰 Barcha kirimlar</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {formattedBalanceData.map((balance: any) => (
                      <div key={balance._id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">{balance._id}:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(balance.jamiKirim || 0, balance._id)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Jami Xarajat */}
                <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Icon name="trending-down" className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jami Xarajat</div>
                      <div className="text-xs text-red-600 font-semibold mt-1">💸 Barcha chiqimlar</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {formattedBalanceData.map((balance: any) => (
                      <div key={balance._id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">{balance._id}:</span>
                        <span className="text-2xl font-bold text-red-600">
                          {formatCurrency(balance.xarajatlar || 0, balance._id)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Sof Foyda */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Icon name="dollar-sign" className="h-7 w-7 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sof Foyda</div>
                      <div className="text-xs text-blue-600 font-semibold mt-1">💎 Daromad - Xarajat</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {formattedBalanceData.map((balance: any) => {
                      const profit = (balance.sof || 0);
                      const isPositive = profit >= 0;
                      return (
                        <div key={balance._id} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">{balance._id}:</span>
                          <span className={`text-2xl font-bold ${isPositive ? 'text-blue-600' : 'text-yellow-600'}`}>
                            {formatCurrency(profit, balance._id)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <Card className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="dollar-sign" className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Hozircha tranzaksiya yo'q</h3>
                <p className="text-gray-500 mb-6">Birinchi daromad yoki xarajatni qo'shing</p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => setIncomeModalOpen(true)} variant="primary">
                    <Icon name="plus" className="mr-2 h-4 w-4" />
                    Daromad qo'shish
                  </Button>
                  <Button onClick={() => setExpenseModalOpen(true)} variant="secondary">
                    <Icon name="minus" className="mr-2 h-4 w-4" />
                    Xarajat qo'shish
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* So'nggi Tranzaksiyalar */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Icon name="list" className="mr-3 h-6 w-6 text-indigo-600" />
              So'nggi Tranzaksiyalar
            </h2>
            
            <Card className="p-6">
              {transactionsData?.transactions?.length > 0 ? (
                <div className="space-y-4">
                  {transactionsData.transactions.slice(0, 8).map((transaction: any) => (
                    <div key={transaction._id} className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                          transaction.type === 'expense' || transaction.type === 'delivery_expense'
                            ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                            : 'bg-gradient-to-r from-green-500 to-emerald-600'
                        }`}>
                          {transaction.type === 'expense' || transaction.type === 'delivery_expense' ? '💸' : '💰'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-lg">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.transaction_date)} • 
                            {transaction.createdBy?.username || 'Noma\'lum'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-xl ${
                          transaction.type === 'expense' || transaction.type === 'delivery_expense'
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {transaction.type === 'expense' || transaction.type === 'delivery_expense' ? '-' : '+'}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
                          {transaction.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon name="inbox" className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Hozircha tranzaksiya yo'q</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Modallar */}
        <IncomeModal
          isOpen={incomeModalOpen}
          onClose={() => setIncomeModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
        
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      </div>
    </Layout>
  );
}
