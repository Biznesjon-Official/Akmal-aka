'use client';

import { useLanguage } from '@/context/LanguageContext';
import { Card } from '@/components/ui/Card';
import Icon from '@/components/Icon';

interface MonthlyReportCardProps {
  report: {
    month: string;
    totalOrders: number;
    totalTariff: number;
    totalPayment: number;
    totalDebt: number;
    paidOrders: number;
    partialOrders: number;
    unpaidOrders: number;
  };
}

export default function MonthlyReportCard({ report }: MonthlyReportCardProps) {
  const { t } = useLanguage();

  const stats = [
    {
      label: t.delivery.totalOrders,
      value: report.totalOrders,
      icon: 'transport',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: t.delivery.totalTariff,
      value: `$${report.totalTariff.toLocaleString()}`,
      icon: 'usd',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: t.delivery.payment,
      value: `$${report.totalPayment.toLocaleString()}`,
      icon: 'success',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: t.delivery.debt,
      value: `$${report.totalDebt.toLocaleString()}`,
      icon: 'warning',
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  const statusStats = [
    {
      label: t.delivery.paidOrders,
      value: report.paidOrders,
      color: 'text-green-600'
    },
    {
      label: t.delivery.partialOrders,
      value: report.partialOrders,
      color: 'text-yellow-600'
    },
    {
      label: t.delivery.unpaidOrders,
      value: report.unpaidOrders,
      color: 'text-red-600'
    }
  ];

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="reports" />
          {t.delivery.monthlyReport}: {report.month}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon name={stat.icon as any} size="sm" className={stat.color} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="grid grid-cols-3 gap-4">
          {statusStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
