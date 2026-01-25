'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Client {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  total_received_volume: number;
  total_debt: number;
  total_paid: number;
  // YANGI: Delivery qarzlari
  delivery_total_debt?: number;
  delivery_total_paid?: number;
  delivery_current_debt?: number;
  notes?: string;
  createdAt: string;
}

interface Sale {
  _id: string;
  woodLot: {
    lotCode: string;
    kubHajmi: number;
    qalinlik: number;
    eni: number;
    uzunlik: number;
  };
  birlikNarxi: number;
  jamiSumma: number;
  valyuta: string;
  soni: number;
  kubHajmi: number;
  sotuvSanasi: string;
  tolangan: number;
}

interface Payment {
  _id: string;
  summa: number;
  valyuta: string;
  tavsif: string;
  createdAt: string;
}

interface ClientDetailsData {
  client: Client;
  sales: Sale[];
  salesStats: any[];
  payments: Payment[];
  debtByCurrency: any[];
  monthlySales: any[];
  summary: {
    totalSales: number;
    totalVolume: number;
    totalValue: number;
    lastSaleDate: string;
  };
}

interface Props {
  clientId: string;
  onClose: () => void;
}

export default function ClientDetailsModal({ clientId, onClose }: Props) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'payments' | 'lots'>('overview');

  const { data: clientDetails, isLoading, error } = useQuery<ClientDetailsData>({
    queryKey: ['client-details', clientId],
    queryFn: async () => {
      const response = await axios.get(`/client/${clientId}/details`);
      return response.data;
    },
    enabled: !!clientId
  });

  const { data: clientLots } = useQuery({
    queryKey: ['client-lots', clientId],
    queryFn: async () => {
      const response = await axios.get(`/client/${clientId}/lots`);
      return response.data;
    },
    enabled: !!clientId && activeTab === 'lots'
  });

  const { data: clientPayments } = useQuery({
    queryKey: ['client-payments', clientId],
    queryFn: async () => {
      const response = await axios.get(`/client/${clientId}/payments`);
      return response.data;
    },
    enabled: !!clientId && activeTab === 'payments'
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !clientDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <Icon name="alert-triangle" className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Xatolik yuz berdi</h3>
          <p className="text-gray-600 mb-4">Mijoz ma'lumotlarini yuklashda muammo</p>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Yopish
          </button>
        </div>
      </div>
    );
  }

  const { client, sales, salesStats, payments, debtByCurrency, monthlySales, summary } = clientDetails;

  const tabs = [
    { id: 'overview', name: 'Umumiy', icon: 'dashboard' },
    { id: 'sales', name: 'Sotuvlar', icon: 'trending-up' },
    { id: 'payments', name: 'To\'lovlar', icon: 'credit-card' },
    { id: 'lots', name: 'Lotlar', icon: 'package' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{client.name}</h2>
              <p className="text-blue-100 mt-1">{client.phone}</p>
              {client.address && (
                <p className="text-blue-100 text-sm mt-1">{client.address}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-all duration-200 p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm group"
              aria-label="Yopish"
            >
              <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.totalSales}</div>
              <div className="text-blue-100 text-sm">{t.dashboard.totalSales}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(summary.totalVolume)} m³</div>
              <div className="text-blue-100 text-sm">{t.vagonSale.totalVolumeLabel}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {salesStats.reduce((sum, stat) => sum + stat.totalSales, 0).toLocaleString()}
              </div>
              <div className="text-blue-100 text-sm">{t.dashboard.totalValue}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {summary.lastSaleDate ? 
                  new Date(summary.lastSaleDate).toLocaleDateString('uz-UZ') : 
                  t.dashboard.none
                }
              </div>
              <div className="text-blue-100 text-sm">{t.dashboard.lastSale}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Qarz holati */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Icon name="credit-card" className="h-5 w-5 text-blue-600 mr-2" />
                    Vagon sotuv qarzi
                  </h3>
                  {debtByCurrency && debtByCurrency.length > 0 ? (
                    <div className="space-y-3">
                      {debtByCurrency.map((debt, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{debt._id}</span>
                            <span className={`font-bold ${
                              debt.remainingDebt > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(debt.remainingDebt, debt._id)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Jami: {formatCurrency(debt.totalDebt, debt._id)} | 
                            To'langan: {formatCurrency(debt.totalPaid, debt._id)}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min((debt.totalPaid / debt.totalDebt) * 100, 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <Icon name="check-circle" className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>Vagon sotuv qarzi yo'q</p>
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Icon name="truck" className="h-5 w-5 text-purple-600 mr-2" />
                    Olib kelib berish qarzi
                  </h3>
                  {client.delivery_current_debt !== undefined ? (
                    <div className="space-y-3">
                      <div className="border-l-4 border-purple-500 pl-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">USD</span>
                          <span className={`font-bold ${
                            client.delivery_current_debt > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(client.delivery_current_debt, 'USD')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Jami: {formatCurrency(client.delivery_total_debt || 0, 'USD')} | 
                          To'langan: {formatCurrency(client.delivery_total_paid || 0, 'USD')}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(((client.delivery_total_paid || 0) / (client.delivery_total_debt || 1)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <Icon name="check-circle" className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>Olib kelib berish qarzi yo'q</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Sotuv statistikasi */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Icon name="trending-up" className="h-5 w-5 text-green-600 mr-2" />
                  Sotuv statistikasi
                </h3>
                {salesStats && salesStats.length > 0 ? (
                  <div className="space-y-3">
                    {salesStats.map((stat, index) => (
                      <div key={index} className="border-l-4 border-green-500 pl-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{stat._id}</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(stat.totalSales, stat._id)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {stat.count} ta sotuv | {formatNumber(stat.totalVolume)} m³
                        </div>
                        <div className="text-sm text-gray-600">
                          O'rtacha narx: {formatCurrency(stat.avgPrice, stat._id)}/m³
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <Icon name="dashboard" className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p>Sotuvlar yo'q</p>
                  </div>
                )}
              </Card>

              {/* Oylik dinamika */}
              {monthlySales && monthlySales.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Icon name="trending-up" className="h-5 w-5 text-blue-600 mr-2" />
                    Oylik sotuv dinamikasi
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="_id.month"
                          tickFormatter={(value, index) => {
                            const item = monthlySales[index];
                            return item ? `${item._id.month}/${item._id.year}` : value;
                          }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            formatCurrency(value as number, name as string), 
                            'Sotuv'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalSales" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Icon name="trending-up" className="h-5 w-5 text-green-600 mr-2" />
                Sotuvlar tarixi
              </h3>
              {sales && sales.length > 0 ? (
                <div className="space-y-3">
                  {sales.map((sale) => (
                    <Card key={sale._id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-lg">
                            {sale.woodLot?.lotCode || 'Noma\'lum lot'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {sale.woodLot && 
                              `${sale.woodLot.qalinlik}×${sale.woodLot.eni}×${sale.woodLot.uzunlik}mm`
                            }
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {sale.soni} dona × {formatNumber(sale.kubHajmi)} m³ = {formatNumber(sale.soni * sale.kubHajmi)} m³
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(sale.sotuvSanasi).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(sale.jamiSumma, sale.valyuta)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(sale.birlikNarxi, sale.valyuta)}/m³
                          </div>
                          {sale.tolangan > 0 && (
                            <div className="text-sm text-green-600 mt-1">
                              To'langan: {formatCurrency(sale.tolangan, sale.valyuta)}
                            </div>
                          )}
                          {sale.jamiSumma - sale.tolangan > 0 && (
                            <div className="text-sm text-red-600">
                              Qarz: {formatCurrency(sale.jamiSumma - sale.tolangan, sale.valyuta)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Icon name="trending-up" className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p>Sotuvlar yo'q</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && clientPayments && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Icon name="credit-card" className="h-5 w-5 text-blue-600 mr-2" />
                To'lovlar tarixi
              </h3>
              {clientPayments.payments && clientPayments.payments.length > 0 ? (
                <div className="space-y-3">
                  {clientPayments.payments.map((payment: Payment) => (
                    <Card key={payment._id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">
                            {formatCurrency(payment.summa, payment.valyuta)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {payment.tavsif}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(payment.createdAt).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                        <div className="text-green-600">
                          <Icon name="check-circle" className="h-6 w-6" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Icon name="credit-card" className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p>To'lovlar yo'q</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lots' && clientLots && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Icon name="package" className="h-5 w-5 text-orange-600 mr-2" />
                Sotib olgan lotlar
              </h3>
              {clientLots.lotStats && clientLots.lotStats.length > 0 ? (
                <div className="space-y-3">
                  {clientLots.lotStats.map((lot: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-lg">
                            {lot.lotCode}
                          </div>
                          <div className="text-sm text-gray-600">
                            {lot.dimensions}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {lot.totalPurchased} dona | {formatNumber(lot.totalVolume)} m³
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {lot.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(lot.totalAmount, lot.currency)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {lot.sales.length} ta sotuv
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Icon name="package" className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p>Lotlar yo'q</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}