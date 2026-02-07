'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { formatNumber, formatDate } from '@/utils/formatters';

export default function WarehousePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
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
      case 'active': return 'bg-green-100 text-green-800';
      case 'closing': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <Layout>
      <div className="container-full-desktop space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Icon name="warehouse" className="text-white" />
              </div>
              Omborlar
            </h1>
            <p className="text-gray-500 mt-1">Ombor hajmi va inventarizatsiya</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jami vagonlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalVagons}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Icon name="vagons" className="text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faol vagonlar</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeVagons}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Icon name="check-circle" className="text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jami hajm</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.totalVolume)} m³
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Icon name="cube" className="text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mavjud hajm</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(stats.availableVolume)} m³
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Icon name="package" className="text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sotilgan hajm</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(stats.soldVolume)} m³
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Icon name="trending-up" className="text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qolgan hajm</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(stats.remainingVolume)} m³
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Icon name="archive" className="text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="input-field"
              >
                <option value="">Barcha statuslar</option>
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
                placeholder="Vagon kodi, joy nomi..."
                className="input-field"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn-secondary w-full"
              >
                Tozalash
              </button>
            </div>
          </div>
        </Card>

        {/* Warehouse Table */}
        <Card>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Yuklanmoqda...</p>
            </div>
          ) : vagons.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="warehouse" className="mx-auto text-gray-400 mb-4" size="lg" />
              <p className="text-gray-500">Vagonlar topilmadi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableHead>Vagon kodi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jami hajm</TableHead>
                <TableHead>Mavjud hajm</TableHead>
                <TableHead>Sotilgan hajm</TableHead>
                <TableHead>Qolgan hajm</TableHead>
                <TableHead>Brak hajm</TableHead>
                <TableHead>Foydali %</TableHead>
                <TableHead>Sana</TableHead>
              </TableHeader>
              <TableBody>
                {vagons.map((vagon: any) => {
                  const utilizationPercent = vagon.total_volume_m3 > 0 
                    ? ((vagon.sold_volume_m3 || 0) / vagon.total_volume_m3 * 100)
                    : 0;

                  return (
                    <TableRow key={vagon._id}>
                      <TableCell className="font-semibold">
                        {vagon.vagon_code}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vagon.status)}`}>
                          {getStatusText(vagon.status)}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatNumber(vagon.total_volume_m3 || 0)} m³
                      </TableCell>
                      <TableCell className="text-blue-600 font-semibold">
                        {formatNumber(vagon.warehouse_available_volume_m3 || 0)} m³
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {formatNumber(vagon.sold_volume_m3 || 0)} m³
                      </TableCell>
                      <TableCell className="text-orange-600 font-semibold">
                        {formatNumber(vagon.warehouse_remaining_volume_m3 || 0)} m³
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatNumber(vagon.brak_volume_m3 || 0)} m³
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {utilizationPercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(vagon.month)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Summary Card */}
        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Ombor xulasasi
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-indigo-600 font-medium">Jami hajm:</span>
                  <p className="font-bold text-indigo-900">{formatNumber(stats.totalVolume)} m³</p>
                </div>
                <div>
                  <span className="text-green-600 font-medium">Sotilgan:</span>
                  <p className="font-bold text-green-700">{formatNumber(stats.soldVolume)} m³</p>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Mavjud:</span>
                  <p className="font-bold text-blue-700">{formatNumber(stats.availableVolume)} m³</p>
                </div>
                <div>
                  <span className="text-orange-600 font-medium">Foydali %:</span>
                  <p className="font-bold text-orange-700">
                    {stats.totalVolume > 0 ? ((stats.soldVolume / stats.totalVolume) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                <Icon name="warehouse" className="text-indigo-600" size="lg" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}