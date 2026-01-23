'use client';

import { useState, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import DeliveryTable from '@/components/delivery/DeliveryTable';
import DeliveryTableSkeleton from '@/components/delivery/DeliveryTableSkeleton';
import MonthlyReportCard from '@/components/delivery/MonthlyReportCard';
import MonthlyReportSkeleton from '@/components/delivery/MonthlyReportSkeleton';

// Lazy load modal - faqat kerak bo'lganda yuklanadi
const DeliveryModal = lazy(() => import('@/components/delivery/DeliveryModal'));

export default function DeliveryPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Deliverylarni olish - cache bilan
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries', selectedMonth, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await axios.get(`/delivery?${params.toString()}`);
      return response.data;
    },
    staleTime: 30000, // 30 soniya cache
    gcTime: 5 * 60 * 1000, // 5 daqiqa garbage collection
  });

  // Oylik hisobotni olish - cache bilan
  const { data: monthlyReport } = useQuery({
    queryKey: ['delivery-monthly-report', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return null;
      const response = await axios.get(`/delivery/reports/monthly?month=${selectedMonth}`);
      return response.data;
    },
    enabled: !!selectedMonth,
    staleTime: 60000, // 1 daqiqa cache
    gcTime: 5 * 60 * 1000,
  });

  // Deliveryni o'chirish
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/delivery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-monthly-report'] });
    }
  });

  const handleAdd = () => {
    setSelectedDelivery(null);
    setIsModalOpen(true);
  };

  const handleEdit = (delivery: any) => {
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.delivery.deleteConfirm)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDelivery(null);
  };

  // Oylar ro'yxatini yaratish (oxirgi 12 oy)
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
    }
    return months;
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Icon name="transport" className="text-white" />
              </div>
              {t.delivery.title}
            </h1>
          <p className="text-gray-500 mt-1">{t.delivery.serviceDescription}</p>
        </div>
        
        <button
          onClick={handleAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Icon name="add" size="sm" />
          {t.delivery.addDelivery}
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.delivery.month}
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field"
            >
              <option value="">{t.common.filter}</option>
              {getMonthOptions().map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.delivery.paymentStatus}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">{t.common.filter}</option>
              <option value="paid">{t.delivery.paid}</option>
              <option value="partial">{t.delivery.partial}</option>
              <option value="unpaid">{t.delivery.unpaid}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Monthly Report */}
      {selectedMonth && (
        monthlyReport ? (
          <MonthlyReportCard report={monthlyReport} />
        ) : (
          <MonthlyReportSkeleton />
        )
      )}

      {/* Deliveries Table */}
      <Card>
        {isLoading ? (
          <DeliveryTableSkeleton />
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="transport" className="mx-auto text-gray-400 mb-4" size="lg" />
            <p className="text-gray-500">{t.delivery.noDeliveries}</p>
          </div>
        ) : (
          <DeliveryTable
            deliveries={deliveries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          </div>
        }>
          <DeliveryModal
            delivery={selectedDelivery}
            onClose={handleModalClose}
          />
        </Suspense>
      )}
      </div>
    </Layout>
  );
}
