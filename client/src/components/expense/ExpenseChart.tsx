'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface ChartData {
  monthlyTrend: Array<{
    _id: {
      year: number;
      month: number;
      valyuta: string;
      xarajatTuri: string;
    };
    totalSumma: number;
    count: number;
  }>;
  dailyTrend: Array<{
    _id: {
      date: string;
      valyuta: string;
    };
    totalSumma: number;
    count: number;
  }>;
  byExpenseType: Array<{
    _id: string;
    totalSumma: number;
    count: number;
  }>;
}

interface Props {
  data: ChartData;
}

export default function ExpenseChart({ data }: Props) {
  // Oylik trend uchun ma'lumotlarni tayyorlash
  const monthlyChartData = data.monthlyTrend.reduce((acc: any[], item) => {
    const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
    const existing = acc.find(d => d.month === monthKey);
    
    if (existing) {
      existing[`${item._id.valyuta}_total`] = (existing[`${item._id.valyuta}_total`] || 0) + item.totalSumma;
      existing[`${item._id.valyuta}_count`] = (existing[`${item._id.valyuta}_count`] || 0) + item.count;
    } else {
      acc.push({
        month: monthKey,
        [`${item._id.valyuta}_total`]: item.totalSumma,
        [`${item._id.valyuta}_count`]: item.count,
        formattedMonth: new Date(item._id.year, item._id.month - 1).toLocaleDateString('uz-UZ', {
          year: 'numeric',
          month: 'short'
        })
      });
    }
    
    return acc;
  }, []).sort((a, b) => a.month.localeCompare(b.month));

  // Kunlik trend uchun ma'lumotlarni tayyorlash
  const dailyChartData = data.dailyTrend.reduce((acc: any[], item) => {
    const existing = acc.find(d => d.date === item._id.date);
    
    if (existing) {
      existing[`${item._id.valyuta}_total`] = item.totalSumma;
      existing[`${item._id.valyuta}_count`] = item.count;
    } else {
      acc.push({
        date: item._id.date,
        [`${item._id.valyuta}_total`]: item.totalSumma,
        [`${item._id.valyuta}_count`]: item.count,
        formattedDate: new Date(item._id.date).toLocaleDateString('uz-UZ', {
          month: 'short',
          day: 'numeric'
        })
      });
    }
    
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  // Pie chart uchun ma'lumotlar
  const pieChartData = data.byExpenseType.slice(0, 6).map((item, index) => ({
    name: getExpenseTypeLabel(item._id),
    value: item.totalSumma,
    count: item.count,
    color: COLORS[index % COLORS.length]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Summa: {formatNumber(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Soni: {data.count} ta
          </p>
        </div>
      );
    }
    return null;
  };

  function getExpenseTypeLabel(type: string) {
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
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Oylik trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📈</span>
          Oylik Xarajat Trendi
        </h3>
        
        {monthlyChartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData}>
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
                
                <Line
                  type="monotone"
                  dataKey="USD_total"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  name="USD Xarajat"
                />
                
                <Line
                  type="monotone"
                  dataKey="RUB_total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  name="RUB Xarajat"
                />
                
                <Line
                  type="monotone"
                  dataKey="RUB_total"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  name="RUB Xarajat"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p>Oylik ma'lumotlar yo'q</p>
            </div>
          </div>
        )}
      </Card>

      {/* Kunlik trend */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          Kunlik Xarajat Trendi (30 kun)
        </h3>
        
        {dailyChartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
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
                
                <Bar dataKey="USD_total" fill="#10b981" name="USD" />
                <Bar dataKey="RUB_total" fill="#3b82f6" name="RUB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p>Kunlik ma'lumotlar yo'q</p>
            </div>
          </div>
        )}
      </Card>

      {/* Xarajat turlari pie chart */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">🥧</span>
          Xarajat Turlari Taqsimoti
        </h3>
        
        {pieChartData.length > 0 ? (
          <div className="flex flex-col lg:flex-row items-center">
            <div className="h-64 w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full lg:w-1/2 lg:pl-6">
              <div className="space-y-3">
                {pieChartData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatNumber(item.value)}</div>
                      <div className="text-sm text-gray-600">{item.count} ta</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🥧</div>
              <p>Taqsimot ma'lumotlari yo'q</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}