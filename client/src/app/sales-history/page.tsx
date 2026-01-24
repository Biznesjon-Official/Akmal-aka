'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

interface SoldWood {
  _id: string;
  lotCode: string;
  kubHajmi: number;
  tonna: number;
  status: string;
  jami_xarid: number;
  jami_sotuv: number;
  jami_xarajat: number;
  sof_foyda: number;
  foyda_foizi: number;
  createdAt: string;
  purchase?: {
    birlikNarxi: number;
    valyuta: string;
    jamiSumma: number;
    jamiRUB: number;
    sotuvchi: string;
    xaridJoyi: string;
    xaridSanasi: string;
    valyutaKursi: number;
  };
  sale?: {
    birlikNarxi: number;
    valyuta: string;
    jamiSumma: number;
    jamiRUB: number;
    xaridor: string;
    sotuvJoyi: string;
    sotuvSanasi: string;
    valyutaKursi: number;
  };
  expenses?: Array<{
    xarajatTuri: string;
    summa: number;
    valyuta: string;
    summaRUB: number;
    tavsif: string;
    sana: string;
  }>;
}

interface Stats {
  totalLots: number;
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
}

function SalesHistoryContent() {
  const { t } = useLanguage();
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days' | 'year'>('30days');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateFilter) {
      case '7days':
        start.setDate(start.getDate() - 7);
        break;
      case '30days':
        start.setDate(start.getDate() - 30);
        break;
      case '90days':
        start.setDate(start.getDate() - 90);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        return {};
    }
    
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const { data, isLoading } = useQuery<{ woods: SoldWood[], stats: Stats, total: number }>({
    queryKey: ['sales-history', dateFilter],
    queryFn: async () => {
      const dateRange = getDateRange();
      const params = new URLSearchParams(dateRange as any);
      const response = await axios.get(`/wood/sold-history?${params}`);
      return response.data;
    }
  });

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <Layout>
      <div className="container-full-desktop space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 mr-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {t.salesHistory.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {t.salesHistory.subtitle}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === '7days'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {t.salesHistory.days7}
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === '30days'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {t.salesHistory.days30}
            </button>
            <button
              onClick={() => setDateFilter('90days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === '90days'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {t.salesHistory.days90}
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'year'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {t.salesHistory.year1}
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {t.salesHistory.all}
            </button>
          </div>
        </div>

        {/* Statistika Kartlari */}
        {data?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t.salesHistory.totalLots}</p>
                  <p className="text-2xl font-bold text-gray-900">{data.stats.totalLots}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t.salesHistory.totalPurchase}</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.stats.totalCost, 'RUB')}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t.salesHistory.totalSale}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(data.stats.totalRevenue, 'RUB')}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t.salesHistory.totalExpenses}</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.stats.totalExpenses, 'RUB')}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className={`p-4 ${data.stats.totalProfit >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-pink-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t.salesHistory.netProfit}</p>
                  <p className={`text-2xl font-bold ${data.stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.stats.totalProfit, 'RUB')}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.stats.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <svg className={`w-6 h-6 ${data.stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Jadval */}
        <Table
          title={t.salesHistory.soldLots}
          subtitle={`${t.common.total}: ${data?.total || 0} ta`}
        >
          <TableHeader>
            <TableHead>{t.salesHistory.lotCode}</TableHead>
            <TableHead>{t.salesHistory.volume}</TableHead>
            <TableHead>{t.salesHistory.purchase}</TableHead>
            <TableHead>{t.salesHistory.sale}</TableHead>
            <TableHead>{t.salesHistory.expenses}</TableHead>
            <TableHead>{t.salesHistory.profit}</TableHead>
            <TableHead>{t.salesHistory.actions}</TableHead>
          </TableHeader>
          <TableBody loading={isLoading} empty={!data?.woods?.length}>
            {data?.woods?.map((wood) => (
              <React.Fragment key={wood._id}>
                <TableRow>
                  <TableCell>
                    <div className="text-sm font-bold text-gray-900">{wood.lotCode}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(wood.createdAt).toLocaleDateString('uz-UZ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-gray-900">{formatNumber(wood.kubHajmi)} m³</div>
                    <div className="text-xs text-gray-600">{formatNumber(wood.tonna)} t</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-orange-600">
                      {formatCurrency(wood.jami_xarid, 'RUB')}
                    </div>
                    {wood.purchase && (
                      <div className="text-xs text-gray-600">{wood.purchase.sotuvchi}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(wood.jami_sotuv, 'RUB')}
                    </div>
                    {wood.sale && (
                      <div className="text-xs text-gray-600">{wood.sale.xaridor}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-purple-600">
                      {formatCurrency(wood.jami_xarajat, 'RUB')}
                    </div>
                    {wood.expenses && (
                      <div className="text-xs text-gray-600">{wood.expenses.length} {t.salesHistory.expenses.toLowerCase()}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm font-bold ${wood.sof_foyda >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(wood.sof_foyda, 'RUB')}
                    </div>
                    <div className={`text-xs ${wood.foyda_foizi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {wood.foyda_foizi.toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleRow(wood._id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedRow === wood._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {expandedRow === wood._id ? t.salesHistory.close : t.salesHistory.details}
                    </button>
                  </TableCell>
                </TableRow>
                
                {/* Batafsil ma'lumot */}
                {expandedRow === wood._id && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Purchase info */}
                          {wood.purchase && (
                            <Card className="p-4">
                              <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {t.salesHistory.purchaseInfo}
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.seller}:</span>
                                  <span className="font-semibold">{wood.purchase.sotuvchi}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.location}:</span>
                                  <span className="font-semibold">{wood.purchase.xaridJoyi}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.unitPrice}:</span>
                                  <span className="font-semibold">{formatCurrency(wood.purchase.birlikNarxi, wood.purchase.valyuta)}/m³</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.exchangeRate}:</span>
                                  <span className="font-semibold">{formatNumber(wood.purchase.valyutaKursi)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-gray-600">{t.salesHistory.total}:</span>
                                  <span className="font-bold text-orange-600">{formatCurrency(wood.purchase.jamiRUB || wood.purchase.jamiSumma, wood.purchase.valyuta)}</span>
                                </div>
                              </div>
                            </Card>
                          )}

                          {/* Sale info */}
                          {wood.sale && (
                            <Card className="p-4">
                              <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {t.salesHistory.saleInfo}
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.sale.buyer}:</span>
                                  <span className="font-semibold">{wood.sale.xaridor}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.location}:</span>
                                  <span className="font-semibold">{wood.sale.sotuvJoyi}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.unitPrice}:</span>
                                  <span className="font-semibold">{formatCurrency(wood.sale.birlikNarxi, wood.sale.valyuta)}/m³</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">{t.salesHistory.exchangeRate}:</span>
                                  <span className="font-semibold">{formatNumber(wood.sale.valyutaKursi)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                  <span className="text-gray-600">{t.salesHistory.total}:</span>
                                  <span className="font-bold text-green-600">{formatCurrency(wood.sale.jamiRUB || wood.sale.jamiSumma, wood.sale.valyuta)}</span>
                                </div>
                              </div>
                            </Card>
                          )}
                        </div>

                        {/* Expenses */}
                        {wood.expenses && wood.expenses.length > 0 && (
                          <Card className="p-4">
                            <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {t.salesHistory.expensesList} ({wood.expenses.length})
                            </h4>
                            <div className="space-y-2">
                              {wood.expenses.map((expense, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b pb-2">
                                  <div>
                                    <div className="font-semibold">{expense.tavsif}</div>
                                    <div className="text-xs text-gray-600">{expense.xarajatTuri}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-purple-600">{formatCurrency(expense.summaRUB || expense.summa, expense.valyuta || 'RUB')}</div>
                                    <div className="text-xs text-gray-600">{new Date(expense.sana).toLocaleDateString('uz-UZ')}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}


export default function SalesHistoryPage() {
  return (
    <LanguageProvider>
      <SalesHistoryContent />
    </LanguageProvider>
  );
}
