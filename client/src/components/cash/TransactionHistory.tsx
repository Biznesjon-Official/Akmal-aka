'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@/components/Icon';
import { formatCurrency, formatDate } from '@/utils/formatters';
import axios from '@/lib/axios';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  income_source?: string;
  expense_source?: string;
  amount: number;
  currency: 'USD' | 'RUB';
  description: string;
  date: string;
  balance_before: number;
  balance_after: number;
  client?: { name: string; phone: string };
  vagon?: { vagonCode: string; sending_place: string; receiving_place: string };
  created_by?: { username: string };
  created_at: string;
}

interface TransactionHistoryProps {
  currency?: 'USD' | 'RUB' | 'all';
}

export default function TransactionHistory({ currency = 'USD' }: TransactionHistoryProps) {
  const [filters, setFilters] = useState({
    type: 'all',
    currency: currency,
    start_date: '',
    end_date: '',
    page: 1,
    limit: 20
  });

  // Ma'lumotlarni olish
  const { data, isLoading, error } = useQuery({
    queryKey: ['cash-transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const response = await axios.get(`/cash/transactions?${params}`);
      return response.data.data;
    }
  });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  // Manbani formatlash
  const getSourceLabel = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      const sources: Record<string, string> = {
        yogoch_tolovi: 'Yog\'och to\'lovi',
        qarz_daftarcha: 'Qarz to\'lovi',
        yetkazib_berish: 'Yetkazib berish',
        other: 'Boshqa'
      };
      return sources[transaction.income_source || 'other'] || transaction.income_source;
    } else {
      const sources: Record<string, string> = {
        transport: 'Transport',
        bojxona: 'Bojxona',
        ish_haqi: 'Ish haqi',
        yuklash_tushurish: 'Yuklash/Tushirish',
        soliq: 'Soliq',
        sifatsiz_mahsulot: 'Sifatsiz mahsulot',
        other: 'Boshqa'
      };
      return sources[transaction.expense_source || 'other'] || transaction.expense_source;
    }
  };

  // Sana filtrlarini o'rnatish
  const setDateFilter = (period: string) => {
    const today = new Date();
    let start_date = '';
    let end_date = today.toISOString().split('T')[0];

    switch (period) {
      case 'today':
        start_date = end_date;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start_date = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start_date = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        start_date = yearAgo.toISOString().split('T')[0];
        break;
      case 'all':
        start_date = '';
        end_date = '';
        break;
    }

    setFilters({ ...filters, start_date, end_date, page: 1 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center">
          <Icon name="alert-circle" className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-700">Ma'lumotlarni yuklashda xatolik</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtrlar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtrlar</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tur filtri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operatsiya turi
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, type: 'all', page: 1 })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.type === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Barchasi
              </button>
              <button
                onClick={() => setFilters({ ...filters, type: 'income', page: 1 })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.type === 'income'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kirim
              </button>
              <button
                onClick={() => setFilters({ ...filters, type: 'expense', page: 1 })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.type === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Chiqim
              </button>
            </div>
          </div>

          {/* Valyuta filtri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valyuta
            </label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value as any, page: 1 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Barchasi</option>
              <option value="USD">USD</option>
              <option value="RUB">RUB</option>
            </select>
          </div>

          {/* Sana filtri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Davr
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDateFilter('today')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Bugun
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Hafta
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Oy
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Barchasi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operatsiyalar ro'yxati */}
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Icon name="inbox" className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Operatsiyalar topilmadi</p>
          </div>
        ) : (
          transactions.map((transaction: Transaction) => (
            <div
              key={transaction._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Chap tomon - Ma'lumotlar */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <Icon 
                        name={transaction.type === 'income' ? 'trending-up' : 'trending-down'} 
                        className="h-5 w-5" 
                      />
                    </div>

                    {/* Manba va sana */}
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {getSourceLabel(transaction)}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.date)} • {new Date(transaction.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Tavsif */}
                  <p className="text-sm text-gray-600 mb-3 ml-14">
                    {transaction.description}
                  </p>

                  {/* Qo'shimcha ma'lumotlar */}
                  <div className="flex flex-wrap gap-4 ml-14 text-sm">
                    {transaction.client && (
                      <div className="flex items-center text-gray-600">
                        <Icon name="user" className="h-4 w-4 mr-1" />
                        {transaction.client.name}
                      </div>
                    )}
                    {transaction.vagon && (
                      <div className="flex items-center text-gray-600">
                        <Icon name="truck" className="h-4 w-4 mr-1" />
                        {transaction.vagon.vagonCode}
                      </div>
                    )}
                    {transaction.created_by && (
                      <div className="flex items-center text-gray-400">
                        <Icon name="user-check" className="h-4 w-4 mr-1" />
                        {transaction.created_by.username}
                      </div>
                    )}
                  </div>
                </div>

                {/* O'ng tomon - Summa va balans */}
                <div className="text-right ml-6">
                  <div className={`text-2xl font-bold mb-2 ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Oldingi: {formatCurrency(transaction.balance_before, transaction.currency)}</div>
                    <div className="font-semibold text-gray-700">
                      Keyingi: {formatCurrency(transaction.balance_after, transaction.currency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Jami: {pagination.total} ta operatsiya
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
            
            <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-700">
              {filters.page} / {pagination.pages}
            </div>
            
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.pages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
