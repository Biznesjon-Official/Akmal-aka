'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { formatNumber, formatDate } from '@/utils/formatters';

export default function WarehousePage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  // Omborlar ma'lumotlarini olish (vagonlar asosida)
  const { data: warehouseData, isLoading } = useQuery({
    queryKey: ['warehouse', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`/vagon?${params.toString()}`);
      return response.data;
    },
    staleTime: 30000,
  });

  const vagons = warehouseData?.vagons || [];

  // Statistikalarni hisoblash
  const stats = {
    totalVagons: vagons.length,
    activeVagons: vagons.filter((v: any) => v.status === 'active').length,
    totalVolume: vagons.reduce((sum: number, v: any) => sum + (v.total_volume_m3 || 0), 0),
    availableVolume: vagons.reduce((sum: number, v: any) => sum + (v.warehouse_available_volume_m3 || 0), 0),
    soldVolume: vagons.reduce((sum: number, v: any) => sum + (v.sold_volume_m3 || 0), 0),
    remainingVolume: vagons.reduce((sum: number, v: any) => sum + (v.warehouse_remaining_volume_m3 || 0), 0)
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      search: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'closing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'closing': return 'Yopilmoqda';
      case 'closed': return 'Yopilgan';
      default: return status;
    }
  };

  // Foiz hisoblash
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
        {/* Ultra Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
          
          <div className="relative px-6 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                      <Icon name="package" className="h-9 w-9 text-white" />
                    </div>
                    <div>
                      <h1 className="text-5xl lg:text-6xl font-bold text-white mb-2">
                        Omborlar
                      </h1>
                      <p className="text-xl text-white/90">
                        Ombor hajmi va inventarizatsiya tizimi
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-white">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">{stats.totalVagons}</div>
                      <div className="text-sm opacity-90">Jami vagonlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">{stats.activeVagons}</div>
                      <div className="text-sm opacity-90">Faol vagonlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {formatNumber(stats.totalVolume)} m³
                      </div>
                      <div className="text-sm opacity-90">Jami hajm</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {formatNumber(stats.remainingVolume)} m³
                      </div>
                      <div className="text-sm opacity-90">Qolgan hajm</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Holat
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Barcha holatlar</option>
                    <option value="active">Faol</option>
                    <option value="closing">Yopilmoqda</option>
                    <option value="closed">Yopilgan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qidiruv
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Vagon kodi"
                    className="input-field"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Icon name="refresh-cw" className="h-4 w-4" />
                    Tozalash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
              </div>
            ) : vagons.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <Icon name="package" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Vagonlar topilmadi</h3>
                <p className="text-gray-600">Hozircha hech qanday vagon mavjud emas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vagons.map((vagon: any) => {
                  const totalVolume = vagon.total_volume_m3 || 0;
                  const remainingVolume = vagon.warehouse_remaining_volume_m3 || 0;
                  const soldVolume = vagon.sold_volume_m3 || 0;
                  const usedPercentage = getPercentage(soldVolume, totalVolume);
                  
                  return (
                    <Card key={vagon._id} className="p-6 hover:shadow-xl transition-all duration-300 group">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon name="package" className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{vagon.vagonCode}</h3>
                            <p className="text-sm text-gray-500">{vagon.month}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(vagon.status)}`}>
                          {getStatusText(vagon.status)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Foydalanish</span>
                          <span className="font-bold text-emerald-600">{usedPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${usedPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Volume Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xs text-blue-600 mb-1">Jami hajm</div>
                          <div className="text-lg font-bold text-blue-900">
                            {formatNumber(totalVolume)} m³
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-green-600 mb-1">Qolgan</div>
                          <div className="text-lg font-bold text-green-900">
                            {formatNumber(remainingVolume)} m³
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="text-xs text-orange-600 mb-1">Sotilgan</div>
                          <div className="text-lg font-bold text-orange-900">
                            {formatNumber(soldVolume)} m³
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <div className="text-xs text-purple-600 mb-1">Mavjud</div>
                          <div className="text-lg font-bold text-purple-900">
                            {formatNumber(vagon.warehouse_available_volume_m3 || 0)} m³
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-600">
                            <Icon name="map-pin" className="h-4 w-4 mr-2" />
                            <span>{vagon.sending_place || '-'}</span>
                          </div>
                          <Icon name="arrow-right" className="h-4 w-4 text-gray-400" />
                          <div className="flex items-center text-gray-600">
                            <Icon name="map-pin" className="h-4 w-4 mr-2" />
                            <span>{vagon.receiving_place || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
