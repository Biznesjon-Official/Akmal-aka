'use client';

import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/context/LanguageContext';
import Icon from '@/components/Icon';

interface Transport {
  _id: string;
  lotCode: string;
  kubHajmi: number;
  status: 'transport_kelish' | 'transport_ketish';
  createdAt: string;
}

interface Props {
  data: Transport[];
}

export default function ActiveTransportsMap({ data }: Props) {
  const { t } = useLanguage();
  const transportsByStatus = data.reduce((acc, transport) => {
    if (!acc[transport.status]) {
      acc[transport.status] = [];
    }
    acc[transport.status].push(transport);
    return acc;
  }, {} as Record<string, Transport[]>);

  const statusConfig = {
    transport_kelish: {
      title: 'Rossiya → O\'zbekiston',
      icon: 'truck',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    transport_ketish: {
      title: 'O\'zbekiston → Rossiya',
      icon: 'truck',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  };

  const calculateDaysInTransit = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
    return days;
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Icon name="truck" className="h-16 w-16 text-gray-400 mx-auto mb-2" />
        <p>{t.dashboard.noActiveVagons}</p>
        <p className="text-sm mt-1">{t.dashboard.allLotsInPlace}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.length}
            </div>
            <div className="text-sm text-gray-600">{t.dashboard.totalActiveVagons}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.reduce((sum, t) => sum + t.kubHajmi, 0).toFixed(1)} m³
            </div>
            <div className="text-sm text-gray-600">{t.vagonSale.totalVolumeLabel}</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(data.reduce((sum, t) => sum + calculateDaysInTransit(t.createdAt), 0) / data.length)}
            </div>
            <div className="text-sm text-gray-600">{t.dashboard.averageDays}</div>
          </div>
        </Card>
      </div>

      {/* Transport yo'nalishlari bo'yicha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(transportsByStatus).map(([status, transports]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          
          return (
            <Card key={status} className={`p-6 ${config.borderColor} border-2`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className={`font-semibold ${config.color} flex items-center`}>
                  <Icon name={config.icon} className="h-5 w-5 mr-2" />
                  {config.title}
                </h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                  {transports.length} {t.vagon.title.toLowerCase()}
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {transports.map((transport) => {
                  const daysInTransit = calculateDaysInTransit(transport.createdAt);
                  const isDelayed = daysInTransit > 7;

                  return (
                    <div
                      key={transport._id}
                      className={`p-3 rounded-lg border ${
                        isDelayed ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 flex items-center">
                            {transport.lotCode}
                            {isDelayed && (
                              <span className="ml-2 text-red-500 text-sm flex items-center">
                                <Icon name="alert-triangle" className="h-4 w-4 mr-1" />
                                {t.dashboard.delayed}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {transport.kubHajmi.toFixed(2)} m³
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            isDelayed ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {daysInTransit} {t.dashboard.days}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(transport.createdAt).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all ${
                              daysInTransit <= 3 ? 'bg-green-500' :
                              daysInTransit <= 7 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min((daysInTransit / 14) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{t.dashboard.started}</span>
                          <span>{t.dashboard.delayedDays}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Xarita placeholder */}
      <Card className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Icon name="dashboard" className="h-5 w-5 mr-2 text-blue-600" />
          Transport Xaritasi
        </h4>
        
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <Icon name="truck" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Interaktiv xarita</p>
          <p className="text-sm text-gray-500">
            Bu yerda vagonlarning real vaqtdagi joylashuvi ko'rsatiladi
          </p>
          
          {/* Simple route visualization */}
          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                RU
              </div>
              <div className="text-xs mt-1">Rossiya</div>
              <div className="text-xs text-blue-600">
                {transportsByStatus.transport_kelish?.length || 0} kelmoqda
              </div>
            </div>
            
            <div className="flex-1 relative">
              <div className="h-1 bg-gray-300 rounded"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Icon name="truck" className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                UZ
              </div>
              <div className="text-xs mt-1">O'zbekiston</div>
              <div className="text-xs text-green-600">
                {transportsByStatus.transport_ketish?.length || 0} ketmoqda
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}