'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import Layout from '@/components/Layout';
import VagonSaleTableSkeleton from '@/components/vagonSale/VagonSaleTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import axios from 'axios';

import Icon from '@/components/Icon';

interface Client {
  _id: string;
  name: string;
  phone: string;
}

interface VagonLot {
  _id: string;
  dimensions: string;
  quantity: number;
  volume_m3: number;
  purchase_currency: string;
  purchase_amount: number;
  remaining_quantity: number;
  remaining_volume_m3: number;
}

interface Vagon {
  _id: string;
  vagonCode: string;
  status: string;
  lots: VagonLot[];
}

interface VagonSale {
  _id: string;
  vagon: {
    vagonCode: string;
  };
  lot: {
    dimensions: string;
  };
  client: {
    name: string;
    phone: string;
  };
  sent_volume_m3: number;
  accepted_volume_m3: number;
  client_loss_m3: number;
  client_loss_responsible_person?: string;
  client_loss_reason?: string;
  sale_currency: string;
  price_per_m3: number;
  total_price: number;
  paid_amount: number;
  debt: number;
  createdAt: string;
}

export default function VagonSalePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useDialog();
  const [sales, setSales] = useState<VagonSale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vagons, setVagons] = useState<Vagon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVagon, setSelectedVagon] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [soldVolumeM3, setSoldVolumeM3] = useState(''); // O'zgartirildi: hajm bo'yicha sotuv
  const [clientLossM3, setClientLossM3] = useState(''); // Yangi: mijoz yo'qotishi
  const [clientLossResponsible, setClientLossResponsible] = useState(''); // Javobgar shaxs
  const [clientLossReason, setClientLossReason] = useState(''); // Yo'qotish sababi
  
  // BRAK JAVOBGARLIK TAQSIMOTI
  const [brakVolume, setBrakVolume] = useState(''); // Jami brak hajmi
  const [sellerLiabilityPercent, setSellerLiabilityPercent] = useState(100); // Sotuvchi javobgarlik %
  const [buyerLiabilityPercent, setBuyerLiabilityPercent] = useState(0); // Xaridor javobgarlik %
  const [saleCurrency, setSaleCurrency] = useState('USD'); // Yangi: valyuta tanlash
  const [pricePerM3, setPricePerM3] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [salesRes, clientsRes, vagonsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon-sale`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/client`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vagon`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSales(salesRes.data);
      setClients(clientsRes.data);
      
      // Faqat aktiv vagonlarni filter qilish
      const activeVagons = vagonsRes.data.filter((v: any) => v.status !== 'closed');
      setVagons(activeVagons);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVagonChange = (vagonId: string) => {
    setSelectedVagon(vagonId);
    setSelectedLot(''); // Reset lot selection
  };

  const getSelectedVagonLots = () => {
    const vagon = vagons.find(v => v._id === selectedVagon);
    return vagon?.lots || [];
  };

  const getSelectedLotInfo = () => {
    const lots = getSelectedVagonLots();
    return lots.find(l => l._id === selectedLot);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validatsiya
    if (!selectedVagon) {
      showAlert({
        title: t.messages.error,
        message: t.messages.selectVagon,
        type: 'warning'
      });
      return;
    }
    if (!selectedLot) {
      showAlert({
        title: t.messages.error,
        message: t.messages.selectLot,
        type: 'warning'
      });
      return;
    }
    if (!selectedClient) {
      showAlert({
        title: t.messages.error,
        message: t.messages.selectClient,
        type: 'warning'
      });
      return;
    }
    if (!soldVolumeM3 || parseFloat(soldVolumeM3) <= 0) {
      showAlert({
        title: t.messages.error,
        message: t.messages.enterSoldVolume,
        type: 'warning'
      });
      return;
    }
    if (!saleCurrency) {
      showAlert({
        title: t.messages.error,
        message: t.messages.selectCurrency,
        type: 'warning'
      });
      return;
    }
    if (!pricePerM3 || parseFloat(pricePerM3) <= 0) {
      showAlert({
        title: t.messages.error,
        message: t.messages.enterPrice,
        type: 'warning'
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Lotni topish va hajmni tekshirish
      const lotInfo = getSelectedLotInfo();
      if (!lotInfo) {
        showAlert({
          title: t.messages.error,
          message: t.messages.lotInfoNotFound,
          type: 'error'
        });
        return;
      }
      
      // Hajmni tekshirish - qolgan hajmdan ko'p bo'lmasligi kerak
      const soldVolume = parseFloat(soldVolumeM3);
      if (soldVolume > lotInfo.remaining_volume_m3) {
        showAlert({
          title: t.messages.error,
          message: `${t.messages.volumeExceedsRemaining}\n${t.messages.remaining}: ${lotInfo.remaining_volume_m3.toFixed(2)} m³`,
          type: 'error'
        });
        return;
      }
      
      console.log('📤 Sending data:', {
        vagon: selectedVagon,
        lot: selectedLot,
        client: selectedClient,
        sent_volume_m3: soldVolume,
        sale_currency: saleCurrency,
        price_per_m3: parseFloat(pricePerM3),
        paid_amount: parseFloat(paidAmount) || 0,
        notes: notes
      });
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-sale`,
        {
          vagon: selectedVagon,
          lot: selectedLot,
          client: selectedClient,
          sent_volume_m3: soldVolume,
          client_loss_m3: parseFloat(clientLossM3) || 0,
          client_loss_responsible_person: clientLossResponsible || null,
          client_loss_reason: clientLossReason || null,
          
          // BRAK JAVOBGARLIK TAQSIMOTI
          brak_liability_distribution: parseFloat(brakVolume) > 0 ? {
            seller_percentage: sellerLiabilityPercent,
            buyer_percentage: buyerLiabilityPercent,
            total_brak_volume_m3: parseFloat(brakVolume),
            seller_liable_volume_m3: (parseFloat(brakVolume) * sellerLiabilityPercent) / 100,
            buyer_liable_volume_m3: (parseFloat(brakVolume) * buyerLiabilityPercent) / 100,
            buyer_must_pay_for_brak: buyerLiabilityPercent > 0
          } : null,
          
          sale_currency: saleCurrency,
          price_per_m3: parseFloat(pricePerM3),
          paid_amount: parseFloat(paidAmount) || 0,
          notes: notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Mijoz nomini olish
      const clientName = clients.find(c => c._id === selectedClient)?.name || 'Mijoz';
      showAlert({
        title: t.messages.success,
        message: `${clientName}${t.messages.saleSuccessfullySaved}\n\n💡 ${t.messages.ifPreviouslySold}`,
        type: 'success',
        autoCloseDelay: 4000
      });
      
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error:', error);
      
      let errorMessage = t.vagonSale.saveError;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert({
        title: t.messages.error,
        message: errorMessage,
        type: 'error'
      });
    }
  };

  const resetForm = () => {
    setSelectedVagon('');
    setSelectedLot('');
    setSelectedClient('');
    setSoldVolumeM3(''); // O'zgartirildi
    setClientLossM3(''); // Yangi
    setClientLossResponsible(''); // Javobgar shaxs
    setClientLossReason(''); // Yo'qotish sababi
    
    // BRAK JAVOBGARLIK TAQSIMOTI
    setBrakVolume('');
    setSellerLiabilityPercent(100);
    setBuyerLiabilityPercent(0);
    setSaleCurrency('USD');
    setPricePerM3('');
    setPaidAmount('');
    setNotes('');
  };

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      default: return '';
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded" />
          </div>
          
          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </div>
          
          <VagonSaleTableSkeleton />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <Icon name="sales" className="mr-3" size="lg" />
            {t.vagonSale.title}
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Icon name="add" className="mr-2" />
            {t.vagonSale.addSale}
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t.vagonSale.noSales}
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale._id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{sale.vagon?.vagonCode || 'N/A'}</h3>
                    <p className="text-sm text-gray-600">{sale.lot?.dimensions || 'N/A'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{t.vagonSale.sentVolumeLabel}</div>
                    <div className="text-lg font-bold">{sale.sent_volume_m3?.toFixed(2) || '0.00'} m³</div>
                    {sale.client_loss_m3 > 0 && (
                      <div className="text-xs text-red-500">{t.vagonSale.lossLabel}: {sale.client_loss_m3.toFixed(2)} m³</div>
                    )}
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-semibold">{sale.client?.name || 'N/A'}</div>
                  <div className="text-sm text-gray-600">{sale.client?.phone || 'N/A'}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-gray-600">{t.vagonSale.sentLabel}:</span>
                      <span className="ml-2 font-semibold">{sale.sent_volume_m3?.toFixed(2) || '0.00'} m³</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t.vagonSale.acceptedLabel}:</span>
                      <span className="ml-2 font-semibold text-green-600">{sale.accepted_volume_m3?.toFixed(2) || '0.00'} m³</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{t.vagonSale.pricePerM3Label}:</span>
                      <span className="ml-2 font-semibold">
                        {sale.price_per_m3?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                      </span>
                    </div>
                    {sale.client_loss_m3 > 0 && (
                      <div>
                        <span className="text-gray-600">{t.vagonSale.lossLabel}:</span>
                        <span className="ml-2 font-semibold text-red-500">{sale.client_loss_m3?.toFixed(2) || '0.00'} m³</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-600">{t.vagonSale.totalPriceLabel}</div>
                    <div className="text-lg font-bold">
                      {sale.total_price?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{t.vagonSale.paidLabel}</div>
                    <div className="text-lg font-bold text-green-600">
                      {sale.paid_amount?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{t.vagonSale.debtLabel}</div>
                    <div className={`text-lg font-bold ${(sale.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {sale.debt?.toLocaleString() || '0'} {getCurrencySymbol(sale.sale_currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl my-8 max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-3 border-b">
                <h2 className="text-xl sm:text-2xl font-bold">{t.vagonSale.addSale}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 group"
                  aria-label="Yopish"
                >
                  <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.selectVagonLabel}</label>
                    <select
                      value={selectedVagon}
                      onChange={(e) => handleVagonChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">{t.vagonSale.selectVagonLabel}</option>
                      {vagons.map(vagon => (
                        <option key={vagon._id} value={vagon._id}>
                          {vagon.vagonCode} ({vagon.lots?.length || 0} {t.vagonSale.lotsRemaining})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedVagon && (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t.vagonSale.selectLotLabel}</label>
                      <select
                        value={selectedLot}
                        onChange={(e) => setSelectedLot(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">{t.vagonSale.selectLotLabel}</option>
                        {getSelectedVagonLots().map(lot => (
                          <option key={lot._id} value={lot._id}>
                            {lot.dimensions} - {lot.remaining_volume_m3.toFixed(2)} {t.vagonSale.m3Remaining} - {lot.purchase_currency}
                          </option>
                        ))}
                      </select>
                      {selectedLot && getSelectedLotInfo() && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-600">{t.vagonSale.remainingVolumeLabel}:</span>
                              <span className="ml-2 font-semibold text-green-600">{getSelectedLotInfo()?.remaining_volume_m3.toFixed(2)} m³</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{t.vagonSale.totalVolumeLabel}:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.volume_m3.toFixed(2)} m³</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{t.vagonSale.purchaseCurrency}:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.purchase_currency}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">{t.vagonSale.purchaseAmount}:</span>
                              <span className="ml-2 font-semibold">{getSelectedLotInfo()?.purchase_amount.toLocaleString()} {getSelectedLotInfo()?.purchase_currency}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.selectClientLabel}</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">{t.vagonSale.selectClientLabel}</option>
                      {clients.map(client => (
                        <option key={client._id} value={client._id}>
                          {client.name} - {client.phone}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-blue-600 mt-2 font-semibold">
                      💡 {t.vagonSale.previousSaleNote}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t.vagonSale.soldVolumeM3Label || 'Sotilgan hajm (m³)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={soldVolumeM3}
                      onChange={(e) => setSoldVolumeM3(e.target.value)}
                      placeholder="2.50"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    {selectedLot && getSelectedLotInfo() && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t.vagonSale.remainingVolumeNote}: <span className="font-semibold text-green-600">{getSelectedLotInfo()?.remaining_volume_m3.toFixed(2)} m³</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {t.vagonSale.clientLossM3Label || 'Mijoz yo\'qotishi (m³)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={clientLossM3}
                      onChange={(e) => {
                        const value = e.target.value;
                        setClientLossM3(value);
                        setBrakVolume(value); // Brak bilan sinxronlash
                      }}
                      placeholder="0.10"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 {t.vagonSale.clientLossNote}
                    </p>
                  </div>

                  {/* BRAK JAVOBGARLIK TAQSIMOTI - faqat brak kiritilganda ko'rinadi */}
                  {parseFloat(brakVolume) > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-3">🔄 {t.vagonSale.brakLiabilityTitle}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">{t.vagonSale.sellerLiability}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sellerLiabilityPercent}
                            onChange={(e) => {
                              const sellerPercent = parseInt(e.target.value) || 0;
                              setSellerLiabilityPercent(sellerPercent);
                              setBuyerLiabilityPercent(100 - sellerPercent);
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">{t.vagonSale.buyerLiability}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={buyerLiabilityPercent}
                            onChange={(e) => {
                              const buyerPercent = parseInt(e.target.value) || 0;
                              setBuyerLiabilityPercent(buyerPercent);
                              setSellerLiabilityPercent(100 - buyerPercent);
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                      
                      {/* Hisoblash ko'rsatkichlari */}
                      <div className="mt-4 p-3 bg-white rounded border">
                        <h5 className="font-medium mb-2 text-sm">📊 {t.vagonSale.calculationResults}:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-red-600">
                              <strong>{t.vagonSale.sellerResponsible}:</strong> {((parseFloat(brakVolume) || 0) * sellerLiabilityPercent / 100).toFixed(2)} m³
                            </div>
                            <div className="text-gray-600 text-xs">
                              {t.vagonSale.loss}: {((parseFloat(brakVolume) || 0) * sellerLiabilityPercent / 100 * (parseFloat(pricePerM3) || 0)).toFixed(2)} {saleCurrency}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-600">
                              <strong>{t.vagonSale.buyerResponsible}:</strong> {((parseFloat(brakVolume) || 0) * buyerLiabilityPercent / 100).toFixed(2)} m³
                            </div>
                            <div className="text-gray-600 text-xs">
                              {buyerLiabilityPercent > 0 ? 
                                `${t.vagonSale.mustPay}: ${((parseFloat(brakVolume) || 0) * buyerLiabilityPercent / 100 * (parseFloat(pricePerM3) || 0)).toFixed(2)} ${saleCurrency}` :
                                t.vagonSale.noPay
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-yellow-700">
                        💡 <strong>{t.common.description}:</strong> {t.vagonSale.liabilityExplanation}
                      </div>
                    </div>
                  )}

                  {/* Javobgarlik ma'lumotlari - faqat yo'qotish kiritilganda */}
                  {parseFloat(clientLossM3) > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-red-600">
                          {t.vagonSale.lossResponsiblePersonLabel || 'Javobgar shaxs'}
                        </label>
                        <input
                          type="text"
                          value={clientLossResponsible}
                          onChange={(e) => setClientLossResponsible(e.target.value)}
                          placeholder="F.I.O"
                          className="w-full px-3 py-2 border border-red-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-red-600">
                          {t.vagonSale.lossReasonLabel || 'Yo\'qotish sababi'}
                        </label>
                        <input
                          type="text"
                          value={clientLossReason}
                          onChange={(e) => setClientLossReason(e.target.value)}
                          placeholder="Transport vaqtida shikastlangan"
                          className="w-full px-3 py-2 border border-red-300 rounded-lg"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.saleCurrencyLabel}</label>
                    <select
                      value={saleCurrency}
                      onChange={(e) => setSaleCurrency(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="RUB">RUB (₽)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 {t.vagonSale.saleCurrencyInfoLabel}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.pricePerM3.replace('{currency}', saleCurrency)}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pricePerM3}
                      onChange={(e) => setPricePerM3(e.target.value)}
                      placeholder="500"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.paidAmountLabel.replace('{currency}', saleCurrency)}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.notesLabel}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.vagonSale.notesPlaceholder}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-6 sticky bottom-0 bg-white pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t.common.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
