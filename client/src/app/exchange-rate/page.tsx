'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Icon from '@/components/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'react-hot-toast';
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

export default function ExchangeRatePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingRate, setEditingRate] = useState<{ currency: string; rate: string } | null>(null);

  // Kurslarni olish
  const { data, isLoading, refetch } = useQuery<ExchangeRateData>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    },
    refetchInterval: 30000, // 30 soniya
    staleTime: 15000, // 15 soniya cache
    refetchOnWindowFocus: true,
    retry: 2
  });

  // Qo'lda yangilash
  const updateManualMutation = useMutation({
    mutationFn: async ({ currency, rate }: { currency: string; rate: number }) => {
      const response = await axios.post('/exchange-rate', { currency, rate });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      setEditingRate(null);
      toast.success(t.exchangeRates.updateSuccess);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t.exchangeRates.updateError);
    }
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSourceBadge = (source: string, isRealTime: boolean) => {
    const badges = {
      api: { text: 'API', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      manual: { text: t.common.manual || 'Qo\'lda', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
      fallback: { text: 'Fallback', color: 'bg-amber-50 text-amber-700 border border-amber-200' }
    };

    const badge = badges[source as keyof typeof badges] || badges.manual;

    return (
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
          {badge.text}
        </span>
        {isRealTime && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-emerald-600 font-medium">{t.exchangeRates.widget.live}</span>
          </div>
        )}
      </div>
    );
  };

  const handleSaveRate = () => {
    if (!editingRate) return;

    const rate = parseFloat(editingRate.rate);
    if (isNaN(rate) || rate <= 0) {
      toast.error(t.messages.amountMustBePositive);
      return;
    }

    updateManualMutation.mutate({
      currency: editingRate.currency,
      rate
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="p-6 bg-white shadow-sm">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <Icon name="trending-up" className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {t.exchangeRates.page.title}
              </h1>
              <p className="text-gray-600 text-lg">
                {t.exchangeRates.page.subtitle}
              </p>
              
              {/* Refresh button */}
              <div className="mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="bg-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                >
                  <Icon name="refresh-cw" className="h-4 w-4 mr-2" />
                  {t.exchangeRates.page.refresh}
                </Button>
              </div>
            </div>

            {/* Real-time rates */}
            {data?.realTime && (
              <Card className="p-8 bg-gradient-to-r from-emerald-50 to-blue-50 border-0 shadow-lg">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-emerald-500 rounded-full shadow-lg">
                      <Icon name="wifi" className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {t.exchangeRates.page.realTimeRates}
                  </h2>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-600 font-semibold">{t.exchangeRates.page.live}</span>
                    <span className="text-gray-500 text-sm">
                      • {formatDateTime(data.realTime.lastUpdated)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-4 bg-emerald-100 rounded-xl">
                          <Icon name="dollar-sign" className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">1 USD</h3>
                          <p className="text-gray-500">{t.exchangeRates.page.americanDollar}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600">
                          {data.realTime.USD_TO_RUB.toFixed(4)}
                        </div>
                        <p className="text-gray-500 font-medium">RUB</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-4 bg-blue-100 rounded-xl">
                          <Icon name="ruble-sign" className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">1 RUB</h3>
                          <p className="text-gray-500">{t.exchangeRates.page.russianRuble}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">
                          {data.realTime.RUB_TO_USD.toFixed(4)}
                        </div>
                        <p className="text-gray-500 font-medium">USD</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Database rates */}
            <Card className="p-8 bg-white shadow-lg border-0">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-blue-500 rounded-full shadow-lg">
                    <Icon name="database" className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t.exchangeRates.page.databaseRates}
                </h2>
                <p className="text-gray-600 mt-2">
                  {t.exchangeRates.page.databaseRatesSubtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {data?.database.map((rate) => (
                  <div key={rate._id} className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`p-4 rounded-xl shadow-sm ${
                          rate.currency === 'USD' 
                            ? 'bg-emerald-100' 
                            : 'bg-blue-100'
                        }`}>
                          <Icon 
                            name={rate.currency === 'USD' ? 'dollar-sign' : 'ruble-sign'} 
                            className={`h-8 w-8 ${
                              rate.currency === 'USD'
                                ? 'text-emerald-600'
                                : 'text-blue-600'
                            }`} 
                          />
                        </div>

                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              1 {rate.currency}
                            </h3>
                            {getSourceBadge(rate.source, rate.isRealTime)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDateTime(rate.lastUpdated)}
                            {rate.updatedBy && ` • ${rate.updatedBy.username}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {editingRate?.currency === rate.currency ? (
                        <div className="flex items-center space-x-3 w-full">
                          <Input
                            type="number"
                            step="0.0001"
                            value={editingRate.rate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRate({ ...editingRate, rate: e.target.value })}
                            className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0.0000"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveRate}
                            disabled={updateManualMutation.isPending}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-md"
                          >
                            <Icon name="check" className="h-4 w-4 mr-1" />
                            {t.exchangeRates.page.save}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingRate(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
                          >
                            <Icon name="x" className="h-4 w-4 mr-1" />
                            {t.exchangeRates.page.cancel}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="text-3xl font-bold text-gray-900">
                              {rate.rate.toFixed(4)}
                            </div>
                            <span className="text-lg text-gray-500">
                              {rate.currency === 'USD' ? 'RUB' : 'USD'}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingRate({ currency: rate.currency, rate: rate.rate.toString() })}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-0 shadow-sm"
                          >
                            <Icon name="edit" className="h-4 w-4 mr-1" />
                            {t.exchangeRates.page.edit}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Info */}
            <Card className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
              <div className="flex items-start space-x-6">
                <div className="p-4 bg-blue-500 rounded-xl shadow-lg">
                  <Icon name="info" className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4">
                    {t.exchangeRates.page.realTimeInfo}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span>{t.exchangeRates.page.autoUpdate}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>{t.exchangeRates.page.manualUpdate}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <span>{t.exchangeRates.page.fallbackApi}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span>{t.exchangeRates.page.databaseInfo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}