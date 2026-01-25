'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/utils/formatters';
import Icon from '@/components/Icon';

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
  const { t } = useLanguage();
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
      icon: 'alert-triangle'
    },
    medium: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: 'alert-circle'
    },
    low: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: 'lightbulb'
    }
  };

  const typeConfig = {
    debt: {
      title: t.dashboard.debt,
      icon: 'credit-card',
      color: 'text-red-600'
    },
    low_stock: {
      title: t.dashboard.lowStock,
      icon: 'package',
      color: 'text-orange-600'
    },
    transport_delay: {
      title: t.dashboard.transportDelay,
      icon: 'truck',
      color: 'text-blue-600'
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="bell" className="h-5 w-5 text-gray-600 mr-2" />
            {t.dashboard.alerts}
          </h3>
          <Icon name="check-circle" className="h-6 w-6 text-green-500" />
        </div>
        <div className="text-center text-gray-500 py-8">
          <Icon name="party" className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p>{t.dashboard.noAlerts}</p>
          <p className="text-sm mt-1">{t.dashboard.allProcessesNormal}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Icon name="bell" className="h-5 w-5 text-gray-600 mr-2" />
          {t.dashboard.alerts} ({alerts.length})
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
              {priority === 'all' ? t.dashboard.all : 
               priority === 'high' ? t.dashboard.high :
               priority === 'medium' ? t.dashboard.medium : t.dashboard.low}
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
                  <Icon 
                    name={priorityStyle.icon} 
                    className={`h-5 w-5 ${priorityStyle.color} mt-0.5`} 
                  />
                  
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
                        {alert.priority === 'high' ? t.dashboard.high :
                         alert.priority === 'medium' ? t.dashboard.medium : t.dashboard.low}
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
                            <p><strong>{t.client.name}:</strong> {alert.data.name}</p>
                            <p><strong>{t.dashboard.debtAmount}:</strong> {formatCurrency(alert.data.total_debt, 'USD')}</p>
                          </div>
                        )}
                        
                        {alert.type === 'low_stock' && (
                          <div className="text-sm text-gray-600">
                            <p><strong>{t.vagon.vagonCode}:</strong> {alert.data.lotCode}</p>
                            <p><strong>{t.vagonSale.remainingVolumeLabel}:</strong> {alert.data.kubHajmi.toFixed(2)} m³</p>
                          </div>
                        )}
                        
                        {alert.type === 'transport_delay' && (
                          <div className="text-sm text-gray-600">
                            <p><strong>{t.vagon.vagonCode}:</strong> {alert.data.lotCode}</p>
                            <p><strong>{t.common.status}:</strong> {alert.data.status}</p>
                            <p><strong>{t.common.date}:</strong> {
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
          <p>{t.dashboard.noAlertsAtThisLevel}</p>
        </div>
      )}
    </Card>
  );
}