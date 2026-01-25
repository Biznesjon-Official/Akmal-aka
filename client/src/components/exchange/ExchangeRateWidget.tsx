'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface ExchangeRate {
  _id: string;
  currency: string;
  rate: number;
  lastUpdated: string;
  updatedBy?: {
    username: string;
  };
  isRealTime: boolean;
  source: 'manual' | 'api' | 'fallback';
}

interface RealTimeRates {
  USD_TO_RUB: number;
  RUB_TO_USD: number;
  lastUpdated: string;
}

interface ExchangeRateData {
  database: ExchangeRate[];
  realTime: RealTimeRates | null;
  lastFetch: string;
}

export default function ExchangeRateWidget() {
  const { t } = useLanguage();
  const [showRealTime, setShowRealTime] = useState(true);

  const { data, isLoading, refetch } = useQuery<ExchangeRateData>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    },
    refetchInterval: 60000, // 1 daqiqa
    staleTime: 30000, // 30 soniya cache
    refetchOnWindowFocus: true,
    retry: 2
  });

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'api':
        return 'globe';
      case 'manual':
        return 'user';
      case 'fallback':
        return 'shield';
      default:
        return 'help-circle';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'api':
        return 'text-emerald-600';
      case 'manual':
        return 'text-blue-600';
      case 'fallback':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-white shadow-lg border-0">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6 bg-white shadow-lg border-0">
        <div className="text-center">
          <Icon name="alert-circle" className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{t.exchangeRates.widget.noDataLoaded}</p>
        </div>
      </Card>
    );
  }

  const displayRates = showRealTime && data.realTime ? [
    {
      currency: 'USD',
      rate: data.realTime.USD_TO_RUB,
      lastUpdated: data.realTime.lastUpdated,
      isRealTime: true,
      source: 'api'
    },
    {
      currency: 'RUB', 
      rate: data.realTime.RUB_TO_USD,
      lastUpdated: data.realTime.lastUpdated,
      isRealTime: true,
      source: 'api'
    }
  ] : data.database;

  return (
    <Card className="p-6 bg-white shadow-lg border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
            <Icon name="trending-up" className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {t.exchangeRates.widget.title}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Real-time toggle */}
          {data.realTime && (
            <button
              onClick={() => setShowRealTime(!showRealTime)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 shadow-sm ${
                showRealTime
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {showRealTime ? t.exchangeRates.widget.realTime : t.exchangeRates.widget.database}
            </button>
          )}
          
          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
          >
            <Icon name="refresh-cw" className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Rates */}
      <div className="space-y-4">
        {displayRates.map((rate, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl shadow-sm ${
                rate.currency === 'USD' 
                  ? 'bg-emerald-100' 
                  : 'bg-blue-100'
              }`}>
                <Icon 
                  name={rate.currency === 'USD' ? 'dollar-sign' : 'ruble-sign'} 
                  className={`h-5 w-5 ${
                    rate.currency === 'USD'
                      ? 'text-emerald-600'
                      : 'text-blue-600'
                  }`} 
                />
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900">
                    1 {rate.currency}
                  </span>
                  <Icon 
                    name={getSourceIcon(rate.source)} 
                    className={`h-3 w-3 ${getSourceColor(rate.source)}`}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {formatDateTime(rate.lastUpdated)}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-bold text-gray-900 text-lg">
                {rate.rate.toFixed(4)} {rate.currency === 'USD' ? 'RUB' : 'USD'}
              </p>
              {rate.isRealTime && (
                <div className="flex items-center justify-end space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-emerald-600 font-medium">{t.exchangeRates.widget.live}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t.exchangeRates.widget.lastUpdate}: {formatDateTime(data.lastFetch)}
          </span>
          {data.realTime && showRealTime && (
            <span className="flex items-center space-x-1 bg-emerald-50 px-2 py-1 rounded-full">
              <Icon name="wifi" className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-600 font-medium">{t.exchangeRates.widget.realTimeApi}</span>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}