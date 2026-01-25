'use client';

import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/formatters';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';

interface KassaData {
  _id: {
    turi: string;
    valyuta: string;
  };
  totalSumma: number;
  count: number;
}

interface Props {
  data: KassaData[];
}

export default function CashFlowWidget({ data }: Props) {
  const { t } = useLanguage();
  // Ma'lumotlarni guruhlash
  const summary = data.reduce((acc, item) => {
    const { valyuta, turi } = item._id;
    
    if (!acc[valyuta]) {
      acc[valyuta] = {
        kirim: 0,
        chiqim: 0,
        net: 0
      };
    }
    
    if (turi === 'prixod' || turi === 'klent_prixod') {
      acc[valyuta].kirim += item.totalSumma;
    } else if (turi === 'rasxod' || turi === 'otpr') {
      acc[valyuta].chiqim += Math.abs(item.totalSumma);
    }
    
    acc[valyuta].net = acc[valyuta].kirim - acc[valyuta].chiqim;
    
    return acc;
  }, {} as Record<string, { kirim: number; chiqim: number; net: number }>);

  const currencies = Object.keys(summary);

  if (currencies.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="dollar-sign" className="h-5 w-5 text-gray-600 mr-2" />
            {t.dashboard.todayCash}
          </h3>
          <Icon name="trending-down" className="h-6 w-6 text-gray-400" />
        </div>
        <div className="text-center text-gray-500 py-4">
          <p>{t.dashboard.noTransactionsToday}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {currencies.map(currency => {
        const data = summary[currency];
        const isPositive = data.net >= 0;
        
        return (
          <Card key={currency} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Icon name="dollar-sign" className="h-5 w-5 text-gray-600 mr-2" />
                {t.dashboard.todayCash} ({currency})
              </h3>
              <Icon 
                name={isPositive ? "trending-up" : "trending-down"} 
                className={`h-6 w-6 ${isPositive ? 'text-green-500' : 'text-red-500'}`} 
              />
            </div>
            
            <div className="space-y-3">
              {/* Kirim */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  <Icon name="arrow-up" className="h-4 w-4 text-green-500 mr-2" />
                  {t.dashboard.income}
                </span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(data.kirim, currency)}
                </span>
              </div>
              
              {/* Chiqim */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  <Icon name="arrow-down" className="h-4 w-4 text-red-500 mr-2" />
                  {t.dashboard.expense}
                </span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(data.chiqim, currency)}
                </span>
              </div>
              
              {/* Divider */}
              <hr className="border-gray-200" />
              
              {/* Net */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  {t.dashboard.netMovement}
                </span>
                <span className={`font-bold text-lg ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{formatCurrency(data.net, currency)}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t.dashboard.incomeExpenseRatio}</span>
                <span>
                  {data.chiqim > 0 ? 
                    `${((data.kirim / data.chiqim) * 100).toFixed(0)}%` : 
                    '∞'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    data.kirim >= data.chiqim ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: data.chiqim > 0 ? 
                      `${Math.min((data.kirim / data.chiqim) * 100, 100)}%` : 
                      '100%'
                  }}
                ></div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}