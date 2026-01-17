'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/formatters';

interface Alert {
  type: 'debt' | 'low_stock' | 'transport_delay';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  data: any;
}

interface Props {
  alerts: Alert[];
}

export default function AlertsWidget({ alerts }: Props) {
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredAlerts = filter === 'all' ? 
    alerts : 
    alerts.filter(alert => alert.priority === filter);

  const priorityConfig = {
    high: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '🚨'
    },
    medium: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '⚠️'
    },
    low: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: '💡'
    }
  };

  const typeConfig = {
    debt: {
      title: 'Qarz',
      icon: '💳',
      color: 'text-red-600'
    },
    low_stock: {
      title: 'Kam qoldi',
      icon: '📦',
      color: 'text-orange-600'
    },
    transport_delay: {
      title: 'Transport kechikmoqda',
      icon: '🚛',
      color: 'text-blue-600'
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🔔 Ogohlantirishlar</h3>
          <div className="text-green-500 text-2xl">✅</div>
        </div>
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p>Hech qanday ogohlantirish yo'q!</p>
          <p className="text-sm mt-1">Barcha jarayonlar normal holatda</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🔔 Ogohlantirishlar ({alerts.length})
        </h3>
        
        {/* Filter */}
        <div className="flex space-x-2">
          {['all', 'high', 'medium', 'low'].map(priority => (
            <button
              key={priority}
              onClick={() => setFilter(priority as any)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === priority
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {priority === 'all' ? 'Barchasi' : 
               priority === 'high' ? 'Yuqori' :
               priority === 'medium' ? 'O\'rta' : 'Past'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.map((alert, index) => {
          const priorityStyle = priorityConfig[alert.priority];
          const typeStyle = typeConfig[alert.type];
          const isExpanded = expandedAlert === index;

          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-sm ${
                priorityStyle.bgColor
              } ${priorityStyle.borderColor}`}
              onClick={() => setExpandedAlert(isExpanded ? null : index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="text-xl">
                    {priorityStyle.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-semibold ${priorityStyle.color}`}>
                        {alert.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.priority === 'high' ? 'bg-red-100 text-red-700' :
                        alert.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {alert.priority === 'high' ? 'Yuqori' :
                         alert.priority === 'medium' ? 'O\'rta' : 'Past'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700">
                      {alert.message}
                    </p>
                    
                    {/* Qo'shimcha ma'lumotlar */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {alert.type === 'debt' && (
                          <div className="text-sm text-gray-600">
                            <p><strong>Mijoz:</strong> {alert.data.name}</p>
                            <p><strong>Qarz miqdori:</strong> {formatCurrency(alert.data.total_debt, 'USD')}</p>
                          </div>
                        )}
                        
                        {alert.type === 'low_stock' && (
                          <div className="text-sm text-gray-600">
                            <p><strong>{t.vagon.lotCode}:</strong> {alert.data.lotCode}</p>
                            <p><strong>{t.vagonSale.remainingVolumeColon}</strong> {alert.data.kubHajmi.toFixed(2)} m³</p>
                          </div>
                        )}
                        
                        {alert.type === 'transport_delay' && (
                          <div className="text-sm text-gray-600">
                            <p><strong>{t.vagon.lotCode}:</strong> {alert.data.lotCode}</p>
                            <p><strong>{t.common.status}:</strong> {alert.data.status}</p>
                            <p><strong>{t.vagon.lastUpdate}:</strong> {
                              new Date(alert.data.updatedAt).toLocaleDateString('uz-UZ')
                            }</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-gray-400 text-sm">
                  {isExpanded ? '▲' : '▼'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredAlerts.length === 0 && filter !== 'all' && (
        <div className="text-center text-gray-500 py-4">
          <p>Bu darajada ogohlantirishlar yo'q</p>
        </div>
      )}
    </Card>
  );
}