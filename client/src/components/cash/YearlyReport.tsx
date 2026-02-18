'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@/components/Icon';
import { formatCurrency } from '@/utils/formatters';
import axios from '@/lib/axios';

interface YearlyReportProps {
  currency?: 'USD' | 'RUB';
}

export default function YearlyReport({ currency = 'USD' }: YearlyReportProps) {
  const [year, setYear] = useState(new Date().getFullYear());

  // Ma'lumotlarni olish
  const { data, isLoading } = useQuery({
    queryKey: ['yearly-report', year, currency],
    queryFn: async () => {
      const response = await axios.get('/cash/report/yearly', {
        params: { year, currency }
      });
      return response.data.data;
    }
  });

  const months = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
    'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'
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
    closing_balance: 0,
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    profit_margin: 0,
    monthly_breakdown: [],
    best_month: null,
    worst_month: null
  };

  const maxProfit = Math.max(...report.monthly_breakdown.map((m: any) => Math.abs(m.profit)), 1);

  return (
    <div className="space-y-6">
      {/* Yil tanlash */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Yillik Hisobot</h3>
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

        {/* Asosiy ko'rsatkichlar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-xs text-blue-600 mb-1">Boshlang'ich</div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(report.opening_balance, currency)}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-600 mb-1">Jami Kirim</div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(report.total_income, currency)}
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-xs text-red-600 mb-1">Jami Chiqim</div>
            <div className="text-lg font-bold text-red-700">
              {formatCurrency(report.total_expense, currency)}
            </div>
          </div>
          
          <div className={`rounded-lg p-4 border-2 ${
            report.net_profit >= 0 
              ? 'bg-green-50 border-green-300' 
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="text-xs text-gray-600 mb-1">Sof Foyda</div>
            <div className={`text-lg font-bold ${
              report.net_profit >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatCurrency(report.net_profit, currency)}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-xs text-purple-600 mb-1">Oxirgi</div>
            <div className="text-lg font-bold text-purple-700">
              {formatCurrency(report.closing_balance, currency)}
            </div>
          </div>
        </div>

        {/* Foyda foizi */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Foyda Foizi:</span>
            <span className="text-2xl font-bold text-blue-700">
              {(report.profit_margin * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Oylik taqsimot */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-6">Oylik Taqsimot</h4>
        
        <div className="space-y-3">
          {report.monthly_breakdown.map((month: any) => {
            const profitPercentage = (Math.abs(month.profit) / maxProfit) * 100;
            const isProfit = month.profit >= 0;
            
            return (
              <div key={month.month} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium text-gray-600">
                  {months[month.month - 1]}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className={`h-6 rounded-full transition-all duration-300 ${
                          isProfit ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${profitPercentage}%` }}
                      />
                    </div>
                    <div className={`text-sm font-bold w-32 text-right ${
                      isProfit ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {isProfit ? '+' : ''}
                      {formatCurrency(month.profit, currency)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Kirim: {formatCurrency(month.income, currency)}</span>
                    <span>Chiqim: {formatCurrency(month.expense, currency)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eng yaxshi va yomon oylar */}
      {report.best_month && report.worst_month && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-300 p-6">
            <div className="flex items-center mb-4">
              <Icon name="trophy" className="h-6 w-6 text-green-600 mr-2" />
              <h4 className="text-lg font-semibold text-green-900">Eng Yaxshi Oy</h4>
            </div>
            <div className="text-3xl font-bold text-green-700 mb-2">
              {months[report.best_month.month - 1]}
            </div>
            <div className="text-2xl font-bold text-green-600">
              +{formatCurrency(report.best_month.profit, currency)}
            </div>
            <div className="mt-3 text-sm text-green-700">
              Kirim: {formatCurrency(report.best_month.income, currency)}
            </div>
            <div className="text-sm text-green-700">
              Chiqim: {formatCurrency(report.best_month.expense, currency)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-sm border-2 border-red-300 p-6">
            <div className="flex items-center mb-4">
              <Icon name="alert-triangle" className="h-6 w-6 text-red-600 mr-2" />
              <h4 className="text-lg font-semibold text-red-900">Eng Yomon Oy</h4>
            </div>
            <div className="text-3xl font-bold text-red-700 mb-2">
              {months[report.worst_month.month - 1]}
            </div>
            <div className="text-2xl font-bold text-red-600">
              {report.worst_month.profit >= 0 ? '+' : ''}
              {formatCurrency(report.worst_month.profit, currency)}
            </div>
            <div className="mt-3 text-sm text-red-700">
              Kirim: {formatCurrency(report.worst_month.income, currency)}
            </div>
            <div className="text-sm text-red-700">
              Chiqim: {formatCurrency(report.worst_month.expense, currency)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
