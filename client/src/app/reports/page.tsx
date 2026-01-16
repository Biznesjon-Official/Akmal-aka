'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, StatsCard } from '@/components/ui/Card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

interface ProfitLoss {
  _id: string;
  daromad: number;
  xarajat: number;
  sof_foyda: number;
}

interface MonthlyData {
  _id: {
    month: number;
    valyuta: string;
  };
  otpr: number;
  prixod: number;
  rasxod: number;
  klentPrixod: number;
  chistiyFoyda: number;
}

function ReportsContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [valyuta, setValyuta] = useState('');

  // Month names function
  const getMonthName = (monthIndex: number) => {
    const monthNames = [
      t.reports.january, t.reports.february, t.reports.march, t.reports.april, 
      t.reports.may, t.reports.june, t.reports.july, t.reports.august, 
      t.reports.september, t.reports.october, t.reports.november, t.reports.december
    ];
    return monthNames[monthIndex - 1];
  };
  const { data: profitLoss, isLoading: profitLoading } = useQuery<ProfitLoss[]>({
    queryKey: ['profit-loss', period, selectedYear, valyuta],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Period bo'yicha sana oralig'ini hisoblash
      const now = new Date();
      let startDate = '';
      let endDate = now.toISOString().split('T')[0];
      
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split('T')[0];
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString().split('T')[0];
      } else if (period === 'year') {
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      }
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (valyuta) params.append('valyuta', valyuta);
      
      const response = await axios.get(`/reports/profit-loss?${params}`);
      return response.data;
    }
  });

  // Oylik hisobot
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyData[]>({
    queryKey: ['monthly-report', selectedYear, valyuta],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', selectedYear.toString());
      if (valyuta) params.append('valyuta', valyuta);
      
      const response = await axios.get(`/reports/monthly?${params}`);
      return response.data;
    },
    enabled: period === 'year'
  });

  // Profit/loss report
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <svg className="w-8 h-8 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t.reports.title}
          </h1>
          <p className="mt-2 text-gray-600">
            {t.reports.systemStats}
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t.reports.filters}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.reports.period}</label>
              <select
                className="input-field"
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
              >
                <option value="week">{t.reports.weekly}</option>
                <option value="month">{t.reports.monthlyThirtyDays}</option>
                <option value="year">{t.reports.yearly}</option>
              </select>
            </div>
            {period === 'year' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.reports.year}</label>
                <select
                  className="input-field"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {[2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.exchangeRates.currency}</label>
              <select
                className="input-field"
                value={valyuta}
                onChange={(e) => setValyuta(e.target.value)}
              >
                <option value="">{t.reports.allCurrencies}</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
                <option value="UZS">UZS</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Foyda/Zarar hisoboti */}
        <Card>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl p-6">
            <h3 className="text-xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.reports.profitLossReport}
              <span className="ml-auto text-sm font-normal opacity-90">
                {period === 'week' ? t.reports.weekly : period === 'month' ? t.reports.monthly : `${selectedYear} ${t.reports.year}`}
              </span>
            </h3>
          </div>
          {profitLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100 transition ease-in-out duration-150">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.reports.loading}
              </div>
            </div>
          ) : profitLoss && profitLoss.length > 0 ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {profitLoss.map((profit) => (
                  <div key={profit._id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">{profit._id}</h4>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        profit.sof_foyda >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {profit.sof_foyda >= 0 ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t.reports.income}:
                        </span>
                        <span className="font-bold text-green-700">
                          {formatCurrency(profit.daromad, profit._id)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-red-600 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                          {t.reports.expense}:
                        </span>
                        <span className="font-bold text-red-700">
                          {formatCurrency(profit.xarajat, profit._id)}
                        </span>
                      </div>
                      <div className="border-t-2 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900 flex items-center">
                            {profit.sof_foyda >= 0 ? (
                              <>
                                <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t.reports.profit}:
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t.reports.loss}:
                              </>
                            )}
                          </span>
                          <span className={`font-bold text-xl ${
                            profit.sof_foyda >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(profit.sof_foyda), profit._id)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">{t.reports.noDataForPeriod}</p>
            </div>
          )}
        </Card>

        {/* Oylik hisobot (faqat yillik ko'rinishda) */}
        {period === 'year' && (
          <Card>
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-2xl p-6">
              <h3 className="text-xl font-bold flex items-center">
                📅 {t.reports.monthlyReport}
                <span className="ml-auto text-sm font-normal opacity-90">
                  {selectedYear} {t.reports.year}
                </span>
              </h3>
            </div>
            {monthlyLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-purple-500 bg-purple-100 transition ease-in-out duration-150">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t.reports.loading}
                </div>
              </div>
            ) : monthlyData && monthlyData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.reports.month}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.exchangeRates.currency}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.reports.otpr}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.reports.prixod}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.reports.klentPrixod}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.reports.rasxod}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.reports.netProfit}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.map((data, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getMonthName(data._id.month)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {data._id.valyuta}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(data.otpr, data._id.valyuta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(data.prixod, data._id.valyuta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(data.klentPrixod, data._id.valyuta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                          {formatCurrency(data.rasxod, data._id.valyuta)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                          data.chistiyFoyda >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(data.chistiyFoyda, data._id.valyuta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">{t.reports.noDataForYear.replace('{year}', selectedYear.toString())}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}

export default function ReportsPage() {
  return (
    <LanguageProvider>
      <ReportsContent />
    </LanguageProvider>
  );
}
