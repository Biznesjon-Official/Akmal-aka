'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@/components/Icon';
import { formatCurrency } from '@/utils/formatters';
import axios from '@/lib/axios';

interface MonthlyReportProps {
  currency?: 'USD' | 'RUB';
}

export default function MonthlyReport({ currency = 'USD' }: MonthlyReportProps) {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  // Ma'lumotlarni olish
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-report', year, month, currency],
    queryFn: async () => {
      const response = await axios.get('/cash/report/monthly', {
        params: { year, month, currency }
      });
      return response.data.data;
    }
  });

  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const report = data || {
    opening_balance: 0,
    income: { total: 0, by_source: {} },
    expense: { total: 0, by_source: {} },
    closing_balance: 0,
    net_profit: 0,
    profit_margin: 0
  };

  return (
    <div className="space-y-6">
      {/* Oy va yil tanlash */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Oylik Hisobot</h3>
          <div className="flex gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Asosiy ko'rsatkichlar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 mb-1">Boshlang'ich</div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(report.opening_balance, currency)}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 mb-1">Kirim</div>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(report.income.total, currency)}
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-600 mb-1">Chiqim</div>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(report.expense.total, currency)}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 mb-1">Oxirgi</div>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(report.closing_balance, currency)}
            </div>
          </div>
        </div>

        {/* Foyda */}
        <div className={`mt-4 rounded-lg p-4 border-2 ${
          report.net_profit >= 0 
            ? 'bg-green-50 border-green-300' 
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Sof Foyda</div>
              <div className={`text-3xl font-bold ${
                report.net_profit >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {report.net_profit >= 0 ? '+' : ''}
                {formatCurrency(report.net_profit, currency)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Foyda foizi</div>
              <div className={`text-2xl font-bold ${
                report.net_profit >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {(report.profit_margin * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kirim manbalari */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Icon name="trending-up" className="h-5 w-5 text-green-600 mr-2" />
          Kirim Manbalari
        </h4>
        <div className="space-y-3">
          {Object.entries(report.income.by_source).length === 0 ? (
            <p className="text-gray-500 text-center py-4">Kirim yo'q</p>
          ) : (
            Object.entries(report.income.by_source).map(([source, amount]) => {
              const percentage = report.income.total > 0 
                ? ((amount as number) / report.income.total) * 100 
                : 0;
              
              const sourceLabels: Record<string, string> = {
                yogoch_tolovi: 'Yog\'och to\'lovi',
                qarz_daftarcha: 'Qarz to\'lovi',
                yetkazib_berish: 'Yetkazib berish'
              };

              return (
                <div key={source} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {sourceLabels[source] || source}
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="font-bold text-green-700">
                      {formatCurrency(amount as number, currency)}
                    </div>
                    <div className="text-sm text-green-600">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chiqim manbalari */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Icon name="trending-down" className="h-5 w-5 text-red-600 mr-2" />
          Chiqim Manbalari
        </h4>
        <div className="space-y-3">
          {Object.entries(report.expense.by_source).length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chiqim yo'q</p>
          ) : (
            Object.entries(report.expense.by_source).map(([source, amount]) => {
              const percentage = report.expense.total > 0 
                ? ((amount as number) / report.expense.total) * 100 
                : 0;
              
              const sourceLabels: Record<string, string> = {
                transport: 'Transport',
                bojxona: 'Bojxona',
                ish_haqi: 'Ish haqi',
                yuklash_tushurish: 'Yuklash/Tushirish',
                soliq: 'Soliq',
                sifatsiz_mahsulot: 'Sifatsiz mahsulot'
              };

              return (
                <div key={source} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {sourceLabels[source] || source}
                    </div>
                    <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="font-bold text-red-700">
                      {formatCurrency(amount as number, currency)}
                    </div>
                    <div className="text-sm text-red-600">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
