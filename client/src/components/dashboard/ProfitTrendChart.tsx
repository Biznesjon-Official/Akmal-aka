'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { useLanguage } from '@/context/LanguageContext';

interface ProfitData {
  _id: {
    year: number;
    month: number;
    valyuta: string;
  };
  prixod: number;
  rasxod: number;
  profit: number;
}

interface Props {
  data: ProfitData[];
}

export default function ProfitTrendChart({ data }: Props) {
  const { t } = useLanguage();
  // Ma'lumotlarni grafik uchun tayyorlash
  const chartData = data.reduce((acc: any[], item) => {
    const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
    const existing = acc.find(d => d.month === monthKey);
    
    if (existing) {
      existing[`profit_${item._id.valyuta}`] = item.profit;
      existing[`income_${item._id.valyuta}`] = item.prixod;
      existing[`expense_${item._id.valyuta}`] = item.rasxod;
    } else {
      acc.push({
        month: monthKey,
        [`profit_${item._id.valyuta}`]: item.profit,
        [`income_${item._id.valyuta}`]: item.prixod,
        [`expense_${item._id.valyuta}`]: item.rasxod,
        formattedMonth: new Date(item._id.year, item._id.month - 1).toLocaleDateString('uz-UZ', {
          year: 'numeric',
          month: 'short'
        })
      });
    }
    
    return acc;
  }, []).sort((a, b) => a.month.localeCompare(b.month));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const [type, currency] = entry.dataKey.split('_');
            const typeNames = {
              profit: t.dashboard.profit,
              income: t.dashboard.income,
              expense: t.dashboard.expense
            };
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {typeNames[type as keyof typeof typeNames]} ({currency}): {formatCurrency(entry.value, currency)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>{t.dashboard.noProfitData}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="profitUSD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="profitRUB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedMonth" 
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* USD foyda maydoni */}
          <Area
            type="monotone"
            dataKey="profit_USD"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#profitUSD)"
            name={`USD ${t.dashboard.profit}`}
          />
          
          {/* RUB foyda maydoni */}
          <Area
            type="monotone"
            dataKey="profit_RUB"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#profitRUB)"
            name={`RUB ${t.dashboard.profit}`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}