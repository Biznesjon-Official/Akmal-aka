'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { showToast } from '@/utils/toast';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Icon from '@/components/Icon';
import FormattedInput from '@/components/FormattedInput';
import { formatCurrency } from '@/utils/formatters';

interface VagonExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  vagonId: string;
  vagonCode: string;
}

interface CustomExpense {
  id: string;
  name: string;
  amount: string;
}

export default function VagonExpenseModal({ isOpen, onClose, vagonId, vagonCode }: VagonExpenseModalProps) {
  const queryClient = useQueryClient();
  
  // Yog'och xaridi summasi (RUB)
  const { data: vagonData, isLoading: vagonLoading } = useQuery({
    queryKey: ['vagon-details', vagonId],
    queryFn: async () => {
      const response = await axios.get(`/vagon/${vagonId}`);
      return response.data;
    },
    enabled: isOpen && !!vagonId
  });
  
  // Mavjud xarajatlar
  const { data: existingExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['vagon-expenses', vagonId],
    queryFn: async () => {
      const response = await axios.get(`/vagon-expense?vagon=${vagonId}`);
      return response.data;
    },
    enabled: isOpen && !!vagonId
  });
  
  const [formData, setFormData] = useState({
    wood_purchase: '', // YANGI: Yog'och xaridi (RUB)
    uz_bojxona: '',
    kz_bojxona: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  // YANGI: Mavjud xarajatlarni formData ga yuklash
  useEffect(() => {
    if (existingExpenses && existingExpenses.length > 0) {
      const newFormData = { ...formData };
      const loadedCustomExpenses: CustomExpense[] = [];
      
      existingExpenses.forEach((expense: any) => {
        if (expense.expense_type === 'yogoch_xaridi' || expense.expense_type === 'wood_purchase') {
          newFormData.wood_purchase = expense.amount.toString();
        } else if (expense.expense_type === 'uz_bojxona' || expense.expense_type === 'uz_customs') {
          newFormData.uz_bojxona = expense.amount.toString();
        } else if (expense.expense_type === 'kz_bojxona' || expense.expense_type === 'kz_customs') {
          newFormData.kz_bojxona = expense.amount.toString();
        } else if (expense.expense_type === 'boshqa' || expense.expense_type === 'other') {
          // Boshqa xarajatlarni custom expenses ga qo'shish
          loadedCustomExpenses.push({
            id: expense._id,
            name: expense.description || 'Boshqa xarajat',
            amount: expense.amount.toString()
          });
        }
      });
      
      setFormData(newFormData);
      if (loadedCustomExpenses.length > 0) {
        setCustomExpenses(loadedCustomExpenses);
      }
    }
  }, [existingExpenses]);

  // Yog'och xaridi jami summasi (RUB)
  const woodPurchaseTotal = vagonData?.lots?.reduce((sum: number, lot: any) => {
    return sum + (lot.purchase_amount || 0);
  }, 0) || 0;
  
  const expenseMutation = useMutation({
    mutationFn: async () => {
      const expenses = [];
      
      // Yog'och xaridi (RUB)
      if (formData.wood_purchase && parseFloat(formData.wood_purchase) > 0) {
        expenses.push({
          vagon: vagonId, // TUZATILDI: vagon_id emas, vagon
          expense_type: 'yogoch_xaridi',
          amount: parseFloat(formData.wood_purchase),
          currency: 'RUB',
          description: 'Yog\'och sotib olish xarajati',
          expense_date: formData.date
        });
      }
      
      // UZ Bojxona
      if (formData.uz_bojxona && parseFloat(formData.uz_bojxona) > 0) {
        expenses.push({
          vagon: vagonId,
          expense_type: 'uz_bojxona',
          amount: parseFloat(formData.uz_bojxona),
          currency: 'USD',
          description: 'O\'zbekiston bojxona to\'lovi',
          expense_date: formData.date
        });
      }
      
      // KZ Bojxona
      if (formData.kz_bojxona && parseFloat(formData.kz_bojxona) > 0) {
        expenses.push({
          vagon: vagonId,
          expense_type: 'kz_bojxona',
          amount: parseFloat(formData.kz_bojxona),
          currency: 'USD',
          description: 'Qozog\'iston bojxona to\'lovi',
          expense_date: formData.date
        });
      }
      
      // Boshqa xarajatlar
      for (const expense of customExpenses) {
        if (expense.amount && parseFloat(expense.amount) > 0) {
          expenses.push({
            vagon: vagonId,
            expense_type: 'boshqa',
            amount: parseFloat(expense.amount),
            currency: 'USD',
            description: expense.name,
            expense_date: formData.date
          });
        }
      }
      
      if (expenses.length === 0) {
        throw new Error('Kamida bitta xarajat kiritilishi kerak');
      }
      
      // Barcha xarajatlarni yuborish
      const promises = expenses.map(expense => axios.post('/vagon-expense', expense));
      await Promise.all(promises);
      
      return expenses;
    },
    onSuccess: () => {
      showToast.success('Xarajatlar muvaffaqiyatli qo\'shildi');
      queryClient.invalidateQueries({ queryKey: ['vagons'] });
      queryClient.invalidateQueries({ queryKey: ['vagon-expenses', vagonId] });
      queryClient.invalidateQueries({ queryKey: ['vagon-details', vagonId] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || error.message || 'Xatolik yuz berdi');
    }
  });

  const resetForm = () => {
    setFormData({
      wood_purchase: '',
      uz_bojxona: '',
      kz_bojxona: '',
      date: new Date().toISOString().split('T')[0]
    });
    setCustomExpenses([]);
    setNewExpenseName('');
    setNewExpenseAmount('');
  };
  
  const addCustomExpense = () => {
    if (!newExpenseName.trim()) {
      showToast.error('Xarajat nomi kiritilishi kerak');
      return;
    }
    
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) {
      showToast.error('Summa 0 dan katta bo\'lishi kerak');
      return;
    }
    
    setCustomExpenses([
      ...customExpenses,
      {
        id: Date.now().toString(),
        name: newExpenseName.trim(),
        amount: newExpenseAmount
      }
    ]);
    
    setNewExpenseName('');
    setNewExpenseAmount('');
  };
  
  const removeCustomExpense = (id: string) => {
    setCustomExpenses(customExpenses.filter(e => e.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasAnyExpense = 
      (formData.wood_purchase && parseFloat(formData.wood_purchase) > 0) ||
      (formData.uz_bojxona && parseFloat(formData.uz_bojxona) > 0) ||
      (formData.kz_bojxona && parseFloat(formData.kz_bojxona) > 0) ||
      customExpenses.length > 0;
    
    if (!hasAnyExpense) {
      showToast.error('Kamida bitta xarajat kiritilishi kerak');
      return;
    }
    
    expenseMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vagon xarajatlari - ${vagonCode}`} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalBody>
          {vagonLoading || expensesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Yuklanmoqda...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Yog'och xaridi - kiritish mumkin */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="package" className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">Yog'och xaridi</h3>
                    <p className="text-sm text-gray-600">Rossiyada sotib olingan (RUB)</p>
                  </div>
                </div>
                
                {/* Mavjud yog'och xaridi */}
                {woodPurchaseTotal > 0 && (
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Vagon yaratishda kiritilgan:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(woodPurchaseTotal, 'RUB')}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Qo'shimcha yog'och xaridi */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Qo'shimcha yog'och xaridi (RUB)
                  </label>
                  <FormattedInput
                    value={formData.wood_purchase}
                    onChange={(value) => setFormData({...formData, wood_purchase: value})}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Agar qo'shimcha yog'och sotib olingan bo'lsa, bu yerga kiriting
                  </p>
                </div>
              </div>

              {/* Bojxona xarajatlari - Grid layout */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Icon name="file-text" className="h-5 w-5 mr-2 text-blue-600" />
                  Bojxona xarajatlari
                </h3>
                
                <div className="space-y-3">
                  {/* UZ Bojxona */}
                  <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">🇺🇿</span>
                      <span className="font-medium text-gray-700">O'zbekiston</span>
                    </div>
                    <div className="flex-1">
                      <FormattedInput
                        value={formData.uz_bojxona}
                        onChange={(value) => setFormData({...formData, uz_bojxona: value})}
                        placeholder="0 USD"
                      />
                    </div>
                  </div>

                  {/* KZ Bojxona */}
                  <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">🇰🇿</span>
                      <span className="font-medium text-gray-700">Qozog'iston</span>
                    </div>
                    <div className="flex-1">
                      <FormattedInput
                        value={formData.kz_bojxona}
                        onChange={(value) => setFormData({...formData, kz_bojxona: value})}
                        placeholder="0 USD"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Boshqa xarajatlar */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Icon name="list" className="h-5 w-5 mr-2 text-purple-600" />
                  Boshqa xarajatlar (USD)
                </h3>
                
                {/* Mavjud boshqa xarajatlar */}
                {customExpenses.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {customExpenses.map((expense) => (
                      <div key={expense.id} className="bg-white rounded-lg p-3 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{expense.name}</p>
                          <p className="text-sm text-gray-600">${parseFloat(expense.amount).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomExpense(expense.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Icon name="trash-2" className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Yangi xarajat qo'shish - bitta qatorda */}
                <div className="bg-white rounded-lg p-3">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newExpenseName}
                      onChange={(e) => setNewExpenseName(e.target.value)}
                      placeholder="Xarajat nomi"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                    />
                    <div className="w-32">
                      <FormattedInput
                        value={newExpenseAmount}
                        onChange={(value) => setNewExpenseAmount(value)}
                        placeholder="Summa"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addCustomExpense}
                      variant="secondary"
                      className="whitespace-nowrap px-3"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Transport, Ish haqi, Soliq va boshqalar</p>
                </div>
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📅 Sana *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start">
                  <Icon name="info" className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">💡 Eslatma:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Yog'och xaridi RUB da kiritiladi (qo'shimcha kiritish mumkin)</li>
                      <li>Bojxona va boshqa xarajatlar USD da kiritiladi</li>
                      <li>Barcha xarajatlar USD hisobidan ayriladi</li>
                      <li>Kamida bitta xarajat kiritilishi kerak</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            loading={expenseMutation.isPending}
            disabled={expenseMutation.isPending || vagonLoading || expensesLoading}
          >
            Saqlash
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
