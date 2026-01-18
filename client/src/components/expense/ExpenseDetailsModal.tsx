'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { formatCurrency } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';

interface Props {
  expenseId: string;
  onClose: () => void;
}

export default function ExpenseDetailsModal({ expenseId, onClose }: Props) {
  const { data: expense, isLoading, error } = useQuery({
    queryKey: ['expense-details', expenseId],
    queryFn: async () => {
      const response = await axios.get(`/expense-advanced/${expenseId}/details`);
      return response.data;
    },
    enabled: !!expenseId
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Xatolik yuz berdi</h3>
          <p className="text-gray-600 mb-4">Xarajat ma'lumotlarini yuklashda muammo</p>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Yopish
          </button>
        </div>
      </div>
    );
  }

  const getExpenseTypeInfo = (type: string) => {
    const info: { [key: string]: { name: string; icon: string; description: string } } = {
      'transport_kelish': {
        name: 'Transport (Kelish)',
        icon: '🚛➡️',
        description: 'Rossiya → O\'zbekiston transport xarajatlari'
      },
      'transport_ketish': {
        name: 'Transport (Ketish)',
        icon: '🚛⬅️',
        description: 'O\'zbekiston → Rossiya transport xarajatlari'
      },
      'bojxona_kelish': {
        name: 'Bojxona (Import)',
        icon: '🛃📥',
        description: 'Import bojxona to\'lovlari va rasmiylashtirish'
      },
      'bojxona_ketish': {
        name: 'Bojxona (Export)',
        icon: '🛃📤',
        description: 'Export bojxona to\'lovlari va rasmiylashtirish'
      },
      'yuklash_tushirish': {
        name: 'Yuklash/Tushirish',
        icon: '📦⬆️⬇️',
        description: 'Yog\'ochni yuklash va tushirish xizmatlari'
      },
      'saqlanish': {
        name: 'Ombor/Saqlanish',
        icon: '🏢📦',
        description: 'Omborda saqlash va boshqa xarajatlar'
      },
      'ishchilar': {
        name: 'Ishchilar maoshi',
        icon: '👷💰',
        description: 'Ishchilar maoshi va mehnat haqqi'
      },
      'qayta_ishlash': {
        name: 'Qayta ishlash',
        icon: '⚙️🪚',
        description: 'Yog\'ochni qayta ishlash, kesish va tayyorlash'
      },
      'boshqa': {
        name: 'Boshqa xarajatlar',
        icon: '📝💸',
        description: 'Boshqa turli xil xarajatlar'
      }
    };
    return info[type] || { name: type, icon: '📊', description: 'Noma\'lum xarajat turi' };
  };

  const typeInfo = getExpenseTypeInfo(expense.xarajatTuri);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <span className="text-3xl mr-3">{typeInfo.icon}</span>
                Xarajat Tafsilotlari
              </h2>
              <p className="text-orange-100 mt-1">{typeInfo.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-all duration-200 p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm group"
              aria-label="Yopish"
            >
              <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asosiy ma'lumotlar */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                Asosiy Ma'lumotlar
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Xarajat turi:</span>
                  <span className="font-semibold flex items-center">
                    <span className="mr-2">{typeInfo.icon}</span>
                    {typeInfo.name}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Summa:</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(expense.summa, expense.valyuta)}
                  </span>
                </div>
                
                {expense.valyuta !== 'RUB' && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">RUB da:</span>
                    <span className="font-semibold text-gray-700">
                      {formatCurrency(expense.summaRUB, 'RUB')}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Xarajat sanasi:</span>
                  <span className="font-semibold">
                    {new Date(expense.createdAt).toLocaleDateString('uz-UZ')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Yaratuvchi:</span>
                  <span className="font-semibold">
                    {expense.yaratuvchi?.username || 'Noma\'lum'}
                  </span>
                </div>
                
                {expense.woodLot && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Bog'langan lot:</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                      {expense.woodLot.lotCode}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Qo'shimcha ma'lumotlar */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📝</span>
                Qo'shimcha Ma'lumotlar
              </h3>
              
              <div className="space-y-4">
                {expense.additionalInfo?.javobgarShaxs && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Javobgar shaxs:</label>
                    <p className="font-semibold text-gray-900">
                      {expense.additionalInfo.javobgarShaxs}
                    </p>
                  </div>
                )}
                
                {expense.additionalInfo?.tolovSanasi && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">To'lov sanasi:</label>
                    <p className="font-semibold text-gray-900">
                      {new Date(expense.additionalInfo.tolovSanasi).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                )}
                
                {expense.additionalInfo?.hujjatRaqami && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Hujjat raqami:</label>
                    <p className="font-semibold text-gray-900">
                      {expense.additionalInfo.hujjatRaqami}
                    </p>
                  </div>
                )}
                
                {expense.additionalInfo?.qoshimchaMalumot && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Qo'shimcha ma'lumot:</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {expense.additionalInfo.qoshimchaMalumot}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Tavsif */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">💬</span>
                Tavsif
              </h3>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900 leading-relaxed">
                  {expense.tavsif || 'Tavsif kiritilmagan'}
                </p>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p><strong>Xarajat turi haqida:</strong> {typeInfo.description}</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}