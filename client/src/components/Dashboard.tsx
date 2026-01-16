'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface BalanceData {
  _id: string;
  otpr: number;
  prixod: number;
  rasxod: number;
  klentPrixod: number;
  chistiyPrixod: number;
}

interface WoodStat {
  count: number;
  totalKub: number;
  totalTonna: number;
}

interface WoodStatusStat {
  status: string;
  count: number;
  totalKub: number;
}

interface TransportStat {
  count: number;
}

interface KassaStat {
  _id: {
    turi: string;
    valyuta: string;
  };
  totalSumma: number;
  count: number;
}

interface StatsData {
  woodStats: WoodStat;
  woodStatusStats: WoodStatusStat[];
  transportStats: TransportStat;
  kassaStats: KassaStat[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Kassa balansini olish
  const { data: balanceData } = useQuery<BalanceData[]>({
    queryKey: ['balance'],
    queryFn: async () => {
      const response = await axios.get('/kassa/balance');
      return response.data;
    }
  });

  // Valyuta kurslarini olish
  const { data: exchangeRates } = useQuery<Array<{currency: string, rate: number}>>({
    queryKey: ['exchange-rates-dashboard'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    }
  });
  // Umumiy statistika
  const { data: statsData } = useQuery<StatsData>({
    queryKey: ['general-stats'],
    queryFn: async () => {
      const response = await axios.get('/reports/general');
      return response.data;
    }
  });

  // Status labels
  const statusLabels: Record<string, string> = {
    xarid_qilindi: t.wood.statusPurchased,
    transport_kelish: t.wood.statusTransportIn,
    omborda: t.wood.statusInStock,
    qayta_ishlash: t.wood.statusProcessing,
    transport_ketish: t.wood.statusTransportOut,
    sotildi: t.wood.statusSold,
    bekor_qilindi: t.wood.statusCancelled
  };

  const statusIcons: Record<string, React.ReactElement> = {
    xarid_qilindi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    transport_kelish: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    omborda: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    qayta_ishlash: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    transport_ketish: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
    sotildi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    bekor_qilindi: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{t.dashboard.title}</h1>
            <p className="text-blue-100 mt-2">
              {t.dashboard.statistics}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="text-2xl font-bold text-white">
                {new Date().toLocaleDateString('uz-UZ')}
              </div>
              <div className="text-blue-100 text-sm">{t.dashboard.today}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Kassa balansi */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">💰 {t.dashboard.balance}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {balanceData?.map((balance) => (
            <div key={balance._id} className="stats-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {balance._id}
                </h3>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  💰
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-medium">{t.dashboard.income}:</span>
                  <span className="font-bold text-lg text-green-700">
                    {(balance.otpr + balance.prixod + balance.klentPrixod).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-medium">{t.dashboard.expense}:</span>
                  <span className="font-bold text-lg text-red-700">{balance.rasxod.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">{t.dashboard.netIncome}:</span>
                    <span className={`font-bold text-xl ${balance.chistiyPrixod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.chistiyPrixod.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Valyuta kurslari */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">💱 {t.dashboard.currentRates}</h2>
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exchangeRates?.map((rate) => (
              <div key={rate.currency} className="form-section">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-xl mr-3 flex items-center justify-center text-white font-bold shadow-md ${
                      rate.currency === 'USD' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}>
                      {rate.currency === 'USD' ? '$' : '₽'}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{rate.currency}</span>
                      <p className="text-sm text-gray-500">
                        {rate.currency === 'USD' ? t.dashboard.usd : t.dashboard.rub}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">
                      {rate.rate.toLocaleString()}
                    </span>
                    <p className="text-sm text-gray-500">UZS</p>
                  </div>
                </div>
              </div>
            ))}
            {(!exchangeRates || exchangeRates.length === 0) && (
              <div className="col-span-2 text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">{t.dashboard.noRatesSet}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin statistikasi */}
      {statsData && (
        <>
          {/* Lot Status Breakdown */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">📦 Lotlar Holati</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsData.woodStatusStats?.map((stat) => (
                <div key={stat.status} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-blue-600">{statusIcons[stat.status] || <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}</div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{stat.count}</div>
                      <div className="text-xs text-gray-500">lot</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {statusLabels[stat.status] || stat.status}
                  </div>
                  <div className="text-xs text-gray-600">
                    {stat.totalKub.toFixed(2)} m³
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tizim statistikasi */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">📊 {t.dashboard.systemStats}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yog'och statistikasi */}
              <div className="card">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg mr-4">
                    🌳
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t.dashboard.woodLots}
                  </h3>
                </div>
                <div className="space-y-4">
                  {statsData.woodStats && (
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                      <span className="font-medium text-green-800">{t.dashboard.totalLots}</span>
                      <div className="text-right">
                        <div className="font-bold text-green-700">{statsData.woodStats.count} {t.dashboard.lot}</div>
                        <div className="text-sm text-green-600">{statsData.woodStats.totalKub.toFixed(2)} m³</div>
                        <div className="text-sm text-green-600">{statsData.woodStats.totalTonna.toFixed(2)} t</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transport statistikasi */}
              <div className="card">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg mr-4">
                    🚂
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t.dashboard.trainTransport}
                  </h3>
                </div>
                <div className="space-y-4">
                  {statsData.transportStats && (
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                      <span className="font-medium text-purple-800">{t.dashboard.totalTrains}</span>
                      <span className="font-bold text-purple-700">{statsData.transportStats.count} {t.dashboard.pieces}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}