'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { useLanguage } from '@/context/LanguageContext';

interface SalesData {
  _id: {
    date: string;
    valyuta: string;
  };
  totalSales: number;
  count: number;
  totalVolume?: number;
}

interface Props {
  data: SalesData[];
}

export default function SalesDynamicsChart({ data }: Props) {
  const { t } = useLanguage();
  // Ma'lumotlarni grafik uchun tayyorlash
  const chartData = data.reduce((acc: any[], item) => {
    const date = item._id.date;
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      existing[`sales_${item._id.valyuta}`] = item.totalSales;
      existing[`count_${item._id.valyuta}`] = item.count;
    } else {
      acc.push({
        date,
        [`sales_${item._id.valyuta}`]: item.totalSales,
        [`count_${item._id.valyuta}`]: item.count,
        formattedDate: new Date(date).toLocaleDateString('uz-UZ', {
          month: 'short',
          day: 'numeric'
        })
      });
    }
    
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const currency = entry.dataKey.split('_')[1];
            const isCount = entry.dataKey.startsWith('count_');
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {isCount ? 
                  `${currency} ${t.dashboard.salesCount}: ${entry.value}` :
                  `${currency} ${t.dashboard.sales}: ${formatCurrency(entry.value, currency)}`
                }
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
          <div className="text-4xl mb-2">📊</div>
          <p>{t.dashboard.noDataAvailable}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate" 
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
          
          {/* USD sotuv chizig'i */}
          <Line
            type="monotone"
            dataKey="sales_USD"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            name={`USD ${t.dashboard.sales}`}
            connectNulls={false}
          />
          
          {/* RUB sotuv chizig'i */}
          <Line
            type="monotone"
            dataKey="sales_RUB"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name={`RUB ${t.dashboard.sales}`}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}