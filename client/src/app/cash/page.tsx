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
import VagonCheckboxSelector from '@/components/cash/VagonCheckboxSelector';
import { Wallet, TrendingUp, TrendingDown, DollarSign, List, Inbox } from 'lucide-react';

// Types
interface SelectedYogochCheckbox {
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

interface SelectedVagonCheckbox {
  vagon_id: string;
  vagon_code: string;
  selected: boolean;
  yogochlar: SelectedYogochCheckbox[];
}

interface IncomeFormData {
  income_source: 'yogoch_tolovi' | 'qarz_daftarcha' | 'yetkazib_berish';
  amount: string;
  currency: 'USD' | 'RUB';
  description: string;
  client_id: string;
  date: string;
  // Yetkazib berish uchun
  vagon_id: string;
  // Bir martalik mijoz uchun
  one_time_client_name: string;
  one_time_client_phone: string;
  client_type: 'existing' | 'one_time';
  // Yogoch tolovi uchun qo'shimcha
  total_price: string; // Jami narx (avtomatik hisoblanadi)
  paid_amount: string; // Hozir to'lanayotgan summa
  // Checkbox tanlash
  use_checkbox_selection: boolean;
  selected_vagons_checkbox: SelectedVagonCheckbox[];
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
    one_time_client_name: '',
    one_time_client_phone: '',
    client_type: 'existing',
    total_price: '',
    paid_amount: '',
    use_checkbox_selection: false,
    selected_vagons_checkbox: []
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

  // Vagonlar ro'yxati (faqat yetkazib_berish uchun - yogoch_tolovi checkbox ishlatadi)
  const { data: vagons = [], isLoading: vagonsLoading } = useQuery({
    queryKey: ['vagons-for-income'],
    queryFn: async () => {
      const response = await axios.get('/vagon?limit=100&status=active');
      return response.data.vagons || [];
    },
    enabled: isOpen && formData.income_source === 'yetkazib_berish'
  });

  // Yog'ochlar ro'yxati (faqat yetkazib_berish uchun - yogoch_tolovi checkbox ishlatadi)
  const { data: yogochlar = [] } = useQuery({
    queryKey: ['yogochlar-for-income', formData.vagon_id],
    queryFn: async () => {
      if (!formData.vagon_id) return [];
      const response = await axios.get(`/vagon-lot?vagon=${formData.vagon_id}`);
      return response.data || [];
    },
    enabled: !!formData.vagon_id && formData.income_source === 'yetkazib_berish'
  });

  const saveMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      // Double submit prevention
      if (isSubmitting) {
        throw new Error('Takroriy yuborildi');
      }
      setIsSubmitting(true);
      
      // Checkbox bilan ko'p vagonli sotuv
      if (data.income_source === 'yogoch_tolovi' && data.use_checkbox_selection) {
        // Checkbox'dan sale_items yaratish
        const saleItems: any[] = [];
        data.selected_vagons_checkbox.forEach(vagon => {
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
          income_source: data.income_source,
          is_multi_sale: true,
          sale_items: saleItems,
          paid_amount: data.paid_amount ? parseFloat(data.paid_amount) : 0,
          description: data.description.trim(),
          client_id: data.client_id || null,
          client_type: data.client_type,
          one_time_client_name: data.one_time_client_name?.trim() || null,
          one_time_client_phone: data.one_time_client_phone?.trim() || null,
          date: data.date,
          currency: 'USD'
        });
      }
      
      // Boshqa daromad turlari (qarz daftarcha, yetkazib berish)
      const finalAmount = parseFloat(data.amount);
      const finalCurrency = data.currency;
      
      return await axios.post('/cash/income', {
        income_source: data.income_source,
        amount: finalAmount,
        currency: finalCurrency,
        description: data.description.trim(),
        client_id: data.client_id || null,
        date: data.date,
        vagon_id: data.vagon_id || null // Yetkazib berish uchun
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
      one_time_client_name: '',
      one_time_client_phone: '',
      client_type: 'existing',
      total_price: '',
      paid_amount: '',
      use_checkbox_selection: false,
      selected_vagons_checkbox: []
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
    
    // Yogoch tolovi uchun mijoz majburiy
    if (formData.income_source === 'yogoch_tolovi') {
      if (!formData.client_id && !formData.one_time_client_name) {
        newErrors.push('Yogoch tolovi uchun mijoz tanlanishi shart');
      }
      if (formData.client_type === 'one_time' && formData.one_time_client_name && !formData.one_time_client_phone) {
        newErrors.push('Bir martalik mijoz uchun telefon raqami kiritilishi shart');
      }
      
      // Checkbox bilan ko'p vagonli sotuv validatsiyasi
      if (formData.use_checkbox_selection) {
        let selectedCount = 0;
        formData.selected_vagons_checkbox.forEach(vagon => {
          vagon.yogochlar.forEach(yogoch => {
            if (yogoch.selected_quantity && parseFloat(yogoch.selected_quantity) > 0) {
              selectedCount++;
              
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
        
        if (selectedCount === 0) {
          newErrors.push('Kamida 1 ta yog\'och tanlang va dona sonini kiriting');
        }
        
        const totalPrice = formData.selected_vagons_checkbox.reduce((sum, vagon) => {
          return sum + vagon.yogochlar.reduce((vSum, yogoch) => {
            return vSum + (yogoch.total_price || 0);
          }, 0);
        }, 0);
        
        const paidAmount = parseFloat(formData.paid_amount) || 0;
        
        if (paidAmount < 0) {
          newErrors.push('To\'lov summasi 0 dan kichik bo\'lmasin');
        }
        
        if (paidAmount > totalPrice) {
          newErrors.push('To\'lov summasi jami narxdan katta bo\'lmasin');
        }
      } else {
        // Agar checkbox ishlatilmasa, xabar berish
        newErrors.push('Yogoch sotish uchun "Ko\'p vagondan bir nechta yog\'och sotish" checkboxini belgilang');
      }
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

            {/* Ko'p vagonli sotuv checkbox toggle (faqat yogoch_tolovi uchun) */}
            {formData.income_source === 'yogoch_tolovi' && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.use_checkbox_selection}
                    onChange={(e) => {
                      const useCheckbox = e.target.checked;
                      setFormData({
                        ...formData, 
                        use_checkbox_selection: useCheckbox,
                        // Checkbox tanlanganda barcha maydonlarni tozalash
                        selected_vagons_checkbox: useCheckbox ? formData.selected_vagons_checkbox : []
                      });
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-semibold text-gray-900">
                      Ko'p vagondan bir nechta yog'och sotish
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Checkbox bilan vagon va yog'ochlarni tanlash (m³ da)
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* YANGI: Checkbox selector */}
            {formData.income_source === 'yogoch_tolovi' && formData.use_checkbox_selection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vagon va yog'ochlarni tanlang *
                </label>
                <VagonCheckboxSelector
                  selectedVagons={formData.selected_vagons_checkbox}
                  onChange={(vagons) => {
                    // Jami narxni hisoblash
                    const total = vagons.reduce((sum, vagon) => {
                      return sum + vagon.yogochlar.reduce((vSum, yogoch) => {
                        return vSum + (yogoch.total_price || 0);
                      }, 0);
                    }, 0);
                    setFormData({
                      ...formData,
                      selected_vagons_checkbox: vagons,
                      total_price: total.toString()
                    });
                  }}
                  currency="USD"
                />
                
                {/* To'lov summasi (checkbox tanlanganda) */}
                {formData.selected_vagons_checkbox.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hozir to'lanayotgan summa (USD) *
                    </label>
                    <FormattedInput
                      value={formData.paid_amount}
                      onChange={(value) => setFormData({...formData, paid_amount: value})}
                      placeholder="0.00"
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
                )}
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

            {/* Vagon tanlash (yetkazib_berish uchun) */}
            {formData.income_source === 'yetkazib_berish' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vagon *
                </label>
                <select
                  value={formData.vagon_id}
                  onChange={(e) => setFormData({...formData, vagon_id: e.target.value})}
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
  
  // YANGI: Statistika modal uchun state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'income' | 'expense' | 'profit' | null>(null);
  const [statsModalCurrency, setStatsModalCurrency] = useState<'USD' | 'RUB' | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // YANGI: Statistika modal uchun lazy loading query
  const { data: statsTransactions, isLoading: statsLoading } = useQuery({
    queryKey: ['stats-transactions', statsModalType, statsModalCurrency],
    queryFn: async () => {
      if (!statsModalType || !statsModalCurrency) return [];
      
      const params = new URLSearchParams({
        currency: statsModalCurrency,
        limit: '100' // Oxirgi 100 ta tranzaksiya
      });
      
      if (statsModalType === 'income') {
        params.append('type', 'income');
      } else if (statsModalType === 'expense') {
        params.append('type', 'expense');
      }
      // profit uchun barcha tranzaksiyalar kerak
      
      const response = await axios.get(`/cash/transactions?${params}`);
      return response.data.transactions || [];
    },
    enabled: statsModalOpen && !!statsModalType && !!statsModalCurrency,
    staleTime: 30000 // 30 soniya
  });
  
  const openStatsModal = (type: 'income' | 'expense' | 'profit', currency: 'USD' | 'RUB') => {
    setStatsModalType(type);
    setStatsModalCurrency(currency);
    setStatsModalOpen(true);
  };
  
  const closeStatsModal = () => {
    setStatsModalOpen(false);
    setStatsModalType(null);
    setStatsModalCurrency(null);
  };
  
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        {/* iOS Style Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-7xl mx-auto">
              {/* Flex Container - Left and Right */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                
                {/* Left Side - Title and Balance Summary */}
                <div className="flex-1 max-w-md">
                  {/* Title Section */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg mr-3">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">
                          Kassa
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm">
                          Moliyaviy operatsiyalar
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Minimalistic Balance Summary */}
                  {formattedBalanceData.length > 0 && (
                    <div className="space-y-3">
                      {formattedBalanceData.map((balance: any) => {
                        const profit = (balance.sof || 0);
                        const isPositive = profit >= 0;
                        const isRUB = balance._id === 'RUB';
                        const currentBalance = balance.balance || 0;
                        
                        return (
                          <div key={balance._id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-white/70 text-sm font-medium">{balance._id}</div>
                              <div className="text-white font-bold text-base flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                {formatCurrency(currentBalance, balance._id).replace(/\s/g, '')}
                              </div>
                            </div>
                            
                            {isRUB ? (
                              // RUB uchun faqat xarajat
                              <div className="flex justify-center">
                                <div className="cursor-pointer hover:bg-white/10 rounded-xl p-3 transition-all flex-1 text-center" onClick={() => openStatsModal('expense', balance._id)}>
                                  <div className="text-white/60 text-xs mb-1 flex items-center justify-center gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    Xarajat
                                  </div>
                                  <div className="text-white font-bold text-lg">
                                    {formatCurrency(balance.xarajatlar || 0, balance._id).replace(/\s/g, '')}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // USD uchun barcha ma'lumotlar
                              <div className="grid grid-cols-3 gap-2">
                                {/* Daromad */}
                                <div className="cursor-pointer hover:bg-white/10 rounded-xl p-2 transition-all" onClick={() => openStatsModal('income', balance._id)}>
                                  <div className="text-white/60 text-xs mb-1 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Kirim
                                  </div>
                                  <div className="text-white font-bold text-base">
                                    {formatCurrency(balance.jamiKirim || 0, balance._id).replace(/\s/g, '')}
                                  </div>
                                </div>
                                {/* Xarajat */}
                                <div className="cursor-pointer hover:bg-white/10 rounded-xl p-2 transition-all" onClick={() => openStatsModal('expense', balance._id)}>
                                  <div className="text-white/60 text-xs mb-1 flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    Chiqim
                                  </div>
                                  <div className="text-white font-bold text-base">
                                    {formatCurrency(balance.xarajatlar || 0, balance._id).replace(/\s/g, '')}
                                  </div>
                                </div>
                                {/* Foyda */}
                                <div className="cursor-pointer hover:bg-white/10 rounded-xl p-2 transition-all">
                                  <div className="text-white/60 text-xs mb-1 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Foyda
                                  </div>
                                  <div className={`font-bold text-base ${isPositive ? 'text-white' : 'text-red-200'}`}>
                                    {formatCurrency(profit, balance._id).replace(/\s/g, '')}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Right Side - Action Buttons */}
                <div className="lg:pt-16">
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setIncomeModalOpen(true)}
                      className="group bg-white/95 backdrop-blur-xl text-green-600 px-8 py-4 rounded-2xl hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center font-bold text-lg min-w-[180px]"
                    >
                      <TrendingUp className="mr-3 h-6 w-6" />
                      Daromad
                    </button>
                    <button
                      onClick={() => setExpenseModalOpen(true)}
                      className="group bg-white/95 backdrop-blur-xl text-red-600 px-8 py-4 rounded-2xl hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center font-bold text-lg min-w-[180px]"
                    >
                      <TrendingDown className="mr-3 h-6 w-6" />
                      Xarajat
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
          {/* So'nggi Tranzaksiyalar */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <List className="mr-3 h-6 w-6 text-indigo-600" />
              So'nggi Tranzaksiyalar
            </h2>
            
            <Card className="p-6">
              {transactionsData?.transactions?.length > 0 ? (
                <div className="space-y-4">
                  {transactionsData.transactions.slice(0, 8).map((transaction: any) => (
                    <div key={transaction._id} className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                          transaction.type === 'expense' || transaction.type === 'delivery_expense' || transaction.type === 'currency_transfer_out'
                            ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                            : 'bg-gradient-to-r from-green-500 to-emerald-600'
                        }`}>
                          {transaction.type === 'expense' || transaction.type === 'delivery_expense' || transaction.type === 'currency_transfer_out' 
                            ? <TrendingDown className="h-6 w-6" />
                            : <TrendingUp className="h-6 w-6" />
                          }
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
                          transaction.type === 'expense' || transaction.type === 'delivery_expense' || transaction.type === 'currency_transfer_out'
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {transaction.type === 'expense' || transaction.type === 'delivery_expense' || transaction.type === 'currency_transfer_out' ? '-' : '+'}
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
                    <Inbox className="h-8 w-8 text-gray-400" />
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
      
      {/* YANGI: Statistika Modal */}
      <Modal
        isOpen={statsModalOpen}
        onClose={closeStatsModal}
        title={
          statsModalType === 'income' 
            ? `Daromadlar Tarixi (${statsModalCurrency})`
            : statsModalType === 'expense'
            ? `Xarajatlar Tarixi (${statsModalCurrency})`
            : `Barcha Tranzaksiyalar (${statsModalCurrency})`
        }
        size="xl"
      >
        <ModalBody>
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Yuklanmoqda...</span>
            </div>
          ) : statsTransactions && statsTransactions.length > 0 ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {statsTransactions.map((transaction: any) => (
                <div 
                  key={transaction._id} 
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    transaction.type === 'expense' || transaction.type === 'delivery_expense'
                      ? 'border-red-100 bg-red-50 hover:border-red-200'
                      : 'border-green-100 bg-green-50 hover:border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                        transaction.type === 'expense' || transaction.type === 'delivery_expense'
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600'
                      }`}>
                        {transaction.type === 'expense' || transaction.type === 'delivery_expense' ? (
                          <TrendingDown className="h-5 w-5" />
                        ) : (
                          <TrendingUp className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {transaction.description || 'Tavsif yo\'q'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.date)}
                          {transaction.client_name && ` • ${transaction.client_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        transaction.type === 'expense' || transaction.type === 'delivery_expense'
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {transaction.type === 'expense' || transaction.type === 'delivery_expense' ? '-' : '+'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {transaction.type === 'income' ? 'Daromad' : 
                         transaction.type === 'expense' ? 'Xarajat' : 
                         transaction.type === 'delivery_expense' ? 'Yetkazib berish xarajati' : 
                         transaction.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Hozircha tranzaksiya yo'q</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={closeStatsModal} variant="secondary">
            Yopish
          </Button>
        </ModalFooter>
      </Modal>
      
      {/* Modals */}
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
    </Layout>
  );
}
