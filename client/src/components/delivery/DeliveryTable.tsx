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
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6">
                  {t.delivery.orderNumber}
                </th>
                <th className="hidden px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:table-cell">
                  {t.delivery.month}
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="hidden sm:inline">{t.delivery.codeUZ} / {t.delivery.codeKZ}</span>
                  <span className="sm:hidden">Kodlar</span>
                </th>
                <th className="hidden px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider lg:table-cell">
                  {t.delivery.fromLocation} → {t.delivery.toLocation}
                </th>
                <th className="hidden px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:table-cell">
                  {t.delivery.roundedWeight}
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="hidden sm:inline">{t.delivery.totalTariff}</span>
                  <span className="sm:hidden">Tarif</span>
                </th>
                <th className="hidden px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:table-cell">
                  {t.delivery.payment}
                </th>
                <th className="hidden px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:table-cell">
                  {t.delivery.debt}
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="hidden sm:inline">{t.delivery.paymentStatus}</span>
                  <span className="sm:hidden">Holat</span>
                </th>
                <th className="relative px-3 py-3.5 sm:px-6">
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {deliveries.map((delivery) => (
                <tr key={delivery._id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 sm:px-6">
                    <div className="font-semibold">#{delivery.orderNumber}</div>
                    <div className="text-xs text-gray-500 sm:hidden">{delivery.month}</div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell">
                    {delivery.month}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    <div className="font-medium">{delivery.codeUZ}</div>
                    <div className="text-gray-500 text-xs">{delivery.codeKZ}</div>
                  </td>
                  <td className="hidden px-3 py-4 text-sm text-gray-900 lg:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-20">{delivery.fromLocation}</span>
                      <Icon name="arrow-right" size="sm" className="text-gray-400 flex-shrink-0" />
                      <span className="truncate max-w-20">{delivery.toLocation}</span>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-900 md:table-cell">
                    {delivery.roundedWeight?.toFixed(2) || '0.00'} т
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                    <div className="font-semibold">${delivery.totalTariff?.toLocaleString() || '0'}</div>
                    <div className="text-xs text-gray-500 sm:hidden">
                      T: ${delivery.payment?.toLocaleString() || '0'} | Q: ${delivery.debt?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-green-600 sm:table-cell">
                    ${delivery.payment?.toLocaleString() || '0'}
                  </td>
                  <td className={`hidden whitespace-nowrap px-3 py-4 text-sm font-medium sm:table-cell ${
                    (delivery.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${delivery.debt?.toLocaleString() || '0'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getStatusColor(delivery.paymentStatus)}`}>
                      <span className="hidden sm:inline">{getStatusText(delivery.paymentStatus)}</span>
                      <span className="sm:hidden">
                        {delivery.paymentStatus === 'paid' ? '✓' : 
                         delivery.paymentStatus === 'partial' ? '◐' : '✗'}
                      </span>
                    </span>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(delivery)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
                        title={t.common.edit}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(delivery._id)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 shadow-sm"
                        title={t.common.delete}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
