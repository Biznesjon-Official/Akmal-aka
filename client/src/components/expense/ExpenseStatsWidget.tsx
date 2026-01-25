'use client';

import { Card } from '@/components/ui/Card';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import Icon from '@/components/Icon';

interface StatsData {
  byExpenseType: Array<{
    _id: string;
    totalSumma: number;
    totalSummaRUB: number;
    count: number;
    avgSumma: number;
  }>;
  byCurrency: Array<{
    _id: string;
    totalSumma: number;
    count: number;
  }>;
  summary: {
    totalExpenses: number;
    totalAmount: number;
    avgExpense: number;
  };
}

interface Props {
  data: StatsData;
}

export default function ExpenseStatsWidget({ data }: Props) {
  const getExpenseTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'transport_kelish': 'Transport (Kelish)',
      'transport_ketish': 'Transport (Ketish)',
      'bojxona_kelish': 'Bojxona (Import)',
      'bojxona_ketish': 'Bojxona (Export)',
      'yuklash_tushirish': 'Yuklash/Tushirish',
      'saqlanish': 'Ombor/Saqlanish',
      'ishchilar': 'Ishchilar',
      'qayta_ishlash': 'Qayta ishlash',
      'boshqa': 'Boshqa'
    };
    return labels[type] || type;
  };

  const getExpenseTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'transport_kelish': 'truck',
      'transport_ketish': 'truck',
      'bojxona_kelish': 'building',
      'bojxona_ketish': 'building',
      'yuklash_tushirish': 'package',
      'saqlanish': 'building',
      'ishchilar': 'users',
      'qayta_ishlash': 'settings',
      'boshqa': 'clipboard'
    };
    return icons[type] || 'dashboard';
  };

  return (
    <div className="space-y-6">
      {/* Umumiy statistika */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Jami xarajatlar</p>
              <p className="text-3xl font-bold">{data.summary.totalExpenses}</p>
            </div>
            <Icon name="dashboard" className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Jami summa</p>
              <p className="text-2xl font-bold">{formatNumber(data.summary.totalAmount)}</p>
            </div>
            <Icon name="dollar-sign" className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">O'rtacha xarajat</p>
              <p className="text-2xl font-bold">{formatNumber(data.summary.avgExpense)}</p>
            </div>
            <Icon name="trending-up" className="h-10 w-10 opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Eng ko'p tur</p>
              <p className="text-lg font-bold">
                {data.byExpenseType.length > 0 ? 
                  getExpenseTypeLabel(data.byExpenseType[0]._id) : 
                  'Ma\'lumot yo\'q'
                }
              </p>
            </div>
            <Icon name="trending-up" className="h-10 w-10 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Valyuta bo'yicha breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.byCurrency.map((currency) => (
          <Card key={currency._id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Icon 
                  name={currency._id === 'USD' ? 'dollar-sign' : 'dollar-sign'} 
                  className="h-5 w-5 mr-2 text-green-600" 
                />
                {currency._id}
              </h3>
              <span className="text-sm text-gray-500">
                {currency.count} ta xarajat
              </span>
            </div>
            
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(currency.totalSumma, currency._id)}
            </div>
            
            <div className="text-sm text-gray-600">
              O'rtacha: {formatCurrency(currency.totalSumma / currency.count, currency._id)}
            </div>
          </Card>
        ))}
      </div>

      {/* Xarajat turlari bo'yicha */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Icon name="clipboard" className="h-5 w-5 text-blue-600 mr-2" />
          Xarajat turlari bo'yicha taqsimot
        </h3>
        
        <div className="space-y-3">
          {data.byExpenseType.slice(0, 8).map((type, index) => {
            const percentage = (type.totalSumma / data.summary.totalAmount) * 100;
            
            return (
              <div key={type._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1">
                  <Icon name={getExpenseTypeIcon(type._id)} className="h-6 w-6 text-blue-600 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {getExpenseTypeLabel(type._id)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {type.count} ta xarajat • O'rtacha: {formatNumber(type.avgSumma)}
                    </div>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <div className="font-bold text-lg">
                    {formatNumber(type.totalSumma)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
                
                <div className="ml-4 w-24">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {data.byExpenseType.length > 8 && (
          <div className="text-center mt-4">
            <span className="text-sm text-gray-500">
              va yana {data.byExpenseType.length - 8} ta tur...
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}