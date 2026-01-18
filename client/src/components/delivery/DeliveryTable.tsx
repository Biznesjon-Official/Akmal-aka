'use client';

import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';

interface DeliveryTableProps {
  deliveries: any[];
  onEdit: (delivery: any) => void;
  onDelete: (id: string) => void;
}

export default function DeliveryTable({ deliveries, onEdit, onDelete }: DeliveryTableProps) {
  const { t } = useLanguage();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return t.delivery.paid;
      case 'partial':
        return t.delivery.partial;
      case 'unpaid':
        return t.delivery.unpaid;
      default:
        return status;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.orderNumber}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.month}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.codeUZ} / {t.delivery.codeKZ}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.fromLocation} → {t.delivery.toLocation}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.roundedWeight}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.totalTariff}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.payment}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.debt}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.delivery.paymentStatus}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t.common.actions}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {deliveries.map((delivery) => (
            <tr key={delivery._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                #{delivery.orderNumber}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {delivery.month}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>{delivery.codeUZ}</div>
                <div className="text-gray-500">{delivery.codeKZ}</div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                <div className="flex items-center gap-2">
                  <span>{delivery.fromLocation}</span>
                  <Icon name="arrow-right" size="sm" className="text-gray-400" />
                  <span>{delivery.toLocation}</span>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {delivery.roundedWeight.toFixed(2)} т
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${delivery.totalTariff.toLocaleString()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600">
                ${delivery.payment.toLocaleString()}
              </td>
              <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                delivery.debt > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                ${delivery.debt.toLocaleString()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(delivery.paymentStatus)}`}>
                  {getStatusText(delivery.paymentStatus)}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(delivery)}
                    className="text-blue-600 hover:text-blue-900 transition-colors"
                    title={t.common.edit}
                  >
                    <Icon name="edit" size="sm" />
                  </button>
                  <button
                    onClick={() => onDelete(delivery._id)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title={t.common.delete}
                  >
                    <Icon name="delete" size="sm" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
