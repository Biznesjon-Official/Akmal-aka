'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import Layout from '@/components/Layout';
import VagonSaleTableSkeleton from '@/components/vagonSale/VagonSaleTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import axios from '@/lib/axios';

import Icon from '@/components/Icon';

interface Client {
  _id: string;
  name: string;
  phone: string;
}

interface SaleItem {
  lot: string;
  lotInfo: VagonLot;
  vagon: string; // YANGI: Vagon ID
  vagonInfo: Vagon; // YANGI: Vagon ma'lumotlari
  saleUnit: 'volume' | 'pieces';
  soldVolume: number;
  soldQuantity: number;
  pricePerM3: number;
  pricePerPiece: number;
  totalPrice: number;
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
  vagon?: {
    vagonCode: string;
  };
  lot?: {
    dimensions: string;
  };
  // Yangi: Erkin sotuv uchun
  wood_type?: string;
  dimensions?: string;
  sale_type: 'lot_based' | 'free_sale'; // Sotuv turi
  client: {
    name: string;
    phone: string;
  };
  sent_volume_m3?: number;
  sent_quantity?: number; // Yangi: dona soni
  accepted_volume_m3?: number;
  accepted_quantity?: number; // Yangi: qabul qilingan dona
  client_loss_m3?: number;
  client_loss_quantity?: number; // Yangi: yo'qolgan dona
  client_loss_responsible_person?: string;
  client_loss_reason?: string;
  sale_currency: string;
  price_per_m3?: number;
  price_per_piece?: number; // Yangi: dona narxi
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
  
  // ✅ LOADING STATES
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiSubmitting, setIsMultiSubmitting] = useState(false);
  
  // YANGI: Multi-lot selling
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentSaleItem, setCurrentSaleItem] = useState<Partial<SaleItem>>({});
  
  // Sotuv turi
  const [saleType, setSaleType] = useState<'single_lot' | 'multi_lot' | 'multi_vagon'>('single_lot');
  
  // Single lot sotuv uchun (eski logika)
  const [selectedVagon, setSelectedVagon] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  
  // Multi-lot sotuv uchun
  const [multiSelectedVagon, setMultiSelectedVagon] = useState('');
  
  // Multi-vagon sotuv uchun (YANGI)
  const [multiVagonSelectedVagon, setMultiVagonSelectedVagon] = useState('');
  const [multiVagonSelectedLot, setMultiVagonSelectedLot] = useState('');
  
  // Umumiy
  const [selectedClient, setSelectedClient] = useState('');
  const [soldVolumeM3, setSoldVolumeM3] = useState(''); // Hajm bo'yicha
  const [soldQuantity, setSoldQuantity] = useState(''); // Dona bo'yicha
  const [saleUnit, setSaleUnit] = useState<'volume' | 'pieces'>('volume'); // Sotuv birligi
  
  const [clientLossM3, setClientLossM3] = useState(''); // Hajm yo'qotishi
  const [clientLossQuantity, setClientLossQuantity] = useState(''); // Dona yo'qotishi
  const [clientLossResponsible, setClientLossResponsible] = useState('');
  const [clientLossReason, setClientLossReason] = useState('');
  
  // BRAK JAVOBGARLIK TAQSIMOTI
  const [brakVolume, setBrakVolume] = useState('');
  const [sellerLiabilityPercent, setSellerLiabilityPercent] = useState(100);
  const [buyerLiabilityPercent, setBuyerLiabilityPercent] = useState(0);
  const [saleCurrency, setSaleCurrency] = useState('USD'); // Faqat USD
  const [pricePerM3, setPricePerM3] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState(''); // Yangi: dona narxi
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
      const [salesRes, clientsRes, vagonsRes] = await Promise.all([
        axios.get('/vagon-sale'),
        axios.get('/client'),
        axios.get('/vagon')
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
    // ✅ VAGON O'ZGARTIRILGANDA BARCHA QIYMATLARNI TOZALASH
    setSoldVolumeM3('');
    setSoldQuantity('');
    setPricePerM3('');
    setPricePerPiece('');
    setSaleUnit('volume'); // Default qiymat
  };

  // YANGI: Multi-lot selling funksiyalari
  const getMultiSelectedVagonLots = () => {
    const vagon = vagons.find(v => v._id === multiSelectedVagon);
    return vagon?.lots || [];
  };

  // YANGI: Multi-vagon selling funksiyalari
  const getMultiVagonSelectedVagonLots = () => {
    const vagon = vagons.find(v => v._id === multiVagonSelectedVagon);
    return vagon?.lots || [];
  };

  const addMultiVagonSaleItem = () => {
    if (!multiVagonSelectedVagon || !multiVagonSelectedLot || !currentSaleItem.saleUnit) {
      showAlert({
        title: t.messages.error,
        message: 'Vagon, lot va sotuv birligini tanlang',
        type: 'warning'
      });
      return;
    }

    const vagonInfo = vagons.find(v => v._id === multiVagonSelectedVagon);
    const lotInfo = vagonInfo?.lots.find(l => l._id === multiVagonSelectedLot);
    
    if (!vagonInfo || !lotInfo) {
      showAlert({
        title: t.messages.error,
        message: 'Vagon yoki lot ma\'lumotlari topilmadi',
        type: 'error'
      });
      return;
    }

    let soldVolume = 0;
    let soldQuantity = 0;
    let totalPrice = 0;

    if (currentSaleItem.saleUnit === 'volume') {
      soldVolume = currentSaleItem.soldVolume || 0;
      if (soldVolume <= 0 || soldVolume > lotInfo.remaining_volume_m3) {
        showAlert({
          title: t.messages.error,
          message: `Hajm 0 dan katta va ${lotInfo.remaining_volume_m3.toFixed(2)} m³ dan kichik bo'lishi kerak`,
          type: 'warning'
        });
        return;
      }
      totalPrice = soldVolume * (currentSaleItem.pricePerM3 || 0);
    } else {
      soldQuantity = currentSaleItem.soldQuantity || 0;
      if (soldQuantity <= 0 || soldQuantity > (lotInfo.remaining_quantity || 0)) {
        showAlert({
          title: t.messages.error,
          message: `Dona soni 0 dan katta va ${lotInfo.remaining_quantity || 0} dan kichik bo'lishi kerak`,
          type: 'warning'
        });
        return;
      }
      // Dona bo'yicha sotishda hajmni hisoblash
      const volumePerPiece = lotInfo.volume_m3 / lotInfo.quantity;
      soldVolume = soldQuantity * volumePerPiece;
      totalPrice = soldQuantity * (currentSaleItem.pricePerPiece || 0);
    }

    const newSaleItem: SaleItem = {
      lot: multiVagonSelectedLot,
      lotInfo: lotInfo,
      vagon: multiVagonSelectedVagon,
      vagonInfo: vagonInfo,
      saleUnit: currentSaleItem.saleUnit,
      soldVolume: soldVolume,
      soldQuantity: soldQuantity,
      pricePerM3: currentSaleItem.pricePerM3 || 0,
      pricePerPiece: currentSaleItem.pricePerPiece || 0,
      totalPrice: totalPrice
    };

    setSaleItems([...saleItems, newSaleItem]);
    setCurrentSaleItem({}); // Reset current item
    setMultiVagonSelectedVagon(''); // Reset vagon selection
    setMultiVagonSelectedLot(''); // Reset lot selection
  };
  const addSaleItem = () => {
    if (!currentSaleItem.lot || !currentSaleItem.saleUnit) {
      showAlert({
        title: t.messages.error,
        message: 'Lot va sotuv birligini tanlang',
        type: 'warning'
      });
      return;
    }

    const lotInfo = getMultiSelectedVagonLots().find(l => l._id === currentSaleItem.lot);
    const vagonInfo = vagons.find(v => v._id === multiSelectedVagon);
    
    if (!lotInfo || !vagonInfo) {
      showAlert({
        title: t.messages.error,
        message: 'Lot yoki vagon ma\'lumotlari topilmadi',
        type: 'error'
      });
      return;
    }

    let soldVolume = 0;
    let soldQuantity = 0;
    let totalPrice = 0;

    if (currentSaleItem.saleUnit === 'volume') {
      soldVolume = currentSaleItem.soldVolume || 0;
      if (soldVolume <= 0 || soldVolume > lotInfo.remaining_volume_m3) {
        showAlert({
          title: t.messages.error,
          message: `Hajm 0 dan katta va ${lotInfo.remaining_volume_m3.toFixed(2)} m³ dan kichik bo'lishi kerak`,
          type: 'warning'
        });
        return;
      }
      totalPrice = soldVolume * (currentSaleItem.pricePerM3 || 0);
    } else {
      soldQuantity = currentSaleItem.soldQuantity || 0;
      if (soldQuantity <= 0 || soldQuantity > (lotInfo.remaining_quantity || 0)) {
        showAlert({
          title: t.messages.error,
          message: `Dona soni 0 dan katta va ${lotInfo.remaining_quantity || 0} dan kichik bo'lishi kerak`,
          type: 'warning'
        });
        return;
      }
      // Dona bo'yicha sotishda hajmni hisoblash
      const volumePerPiece = lotInfo.volume_m3 / lotInfo.quantity;
      soldVolume = soldQuantity * volumePerPiece;
      totalPrice = soldQuantity * (currentSaleItem.pricePerPiece || 0);
    }

    const newSaleItem: SaleItem = {
      lot: currentSaleItem.lot,
      lotInfo: lotInfo,
      vagon: multiSelectedVagon,
      vagonInfo: vagonInfo,
      saleUnit: currentSaleItem.saleUnit,
      soldVolume: soldVolume,
      soldQuantity: soldQuantity,
      pricePerM3: currentSaleItem.pricePerM3 || 0,
      pricePerPiece: currentSaleItem.pricePerPiece || 0,
      totalPrice: totalPrice
    };

    setSaleItems([...saleItems, newSaleItem]);
    setCurrentSaleItem({}); // Reset current item
  };

  const removeSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const getTotalSaleAmount = () => {
    return saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const getTotalSaleVolume = () => {
    return saleItems.reduce((sum, item) => sum + item.soldVolume, 0);
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
    
    // ✅ LOADING STATE BOSHLASH
    if (isSubmitting) return; // Double-click oldini olish
    setIsSubmitting(true);
    
    try {
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
      
      // Sotuv miqdori validatsiyasi
      if (saleUnit === 'volume') {
        if (!soldVolumeM3 || parseFloat(soldVolumeM3) <= 0) {
          showAlert({
            title: t.messages.error,
            message: t.messages.enterSoldVolume,
            type: 'warning'
          });
          return;
        }
      } else {
        if (!soldQuantity || parseInt(soldQuantity) <= 0) {
          showAlert({
            title: t.messages.error,
            message: t.messages.enterSoldQuantity || 'Sotilgan donani kiriting',
            type: 'warning'
          });
          return;
        }
      }
      
      if (!saleCurrency) {
        showAlert({
          title: t.messages.error,
          message: t.messages.selectCurrency,
          type: 'warning'
        });
        return;
      }
      
      // Narx validatsiyasi
      if (saleUnit === 'volume') {
        if (!pricePerM3 || parseFloat(pricePerM3) <= 0) {
          showAlert({
            title: t.messages.error,
            message: t.messages.enterPrice,
            type: 'warning'
          });
          return;
        }
      } else {
        if (!pricePerPiece || parseFloat(pricePerPiece) <= 0) {
          showAlert({
            title: t.messages.error,
            message: t.messages.enterPricePerPiece || 'Dona narxini kiriting',
            type: 'warning'
          });
          return;
        }
      }
      
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
      
      // Hajm yoki dona bo'yicha validatsiya
      let soldVolume, soldQty;
      if (saleUnit === 'volume') {
        soldVolume = parseFloat(soldVolumeM3);
        if (soldVolume > lotInfo.remaining_volume_m3) {
          showAlert({
            title: t.messages.error,
            message: `${t.messages.volumeExceedsRemaining}\n${t.messages.remaining}: ${lotInfo.remaining_volume_m3.toFixed(2)} m³`,
            type: 'error'
          });
          return;
        }
      } else {
        soldQty = parseInt(soldQuantity);
        if (soldQty > (lotInfo.remaining_quantity || 0)) {
          showAlert({
            title: t.messages.error,
            message: `${t.messages.quantityExceedsRemaining || 'Sotilgan dona qolgan donadan ko\'p'}\n${t.messages.remaining}: ${lotInfo.remaining_quantity || 0} dona`,
            type: 'error'
          });
          return;
        }
        // Dona bo'yicha sotishda hajmni hisoblash
        const volumePerPiece = lotInfo.volume_m3 / lotInfo.quantity;
        soldVolume = soldQty * volumePerPiece;
      }
      
      console.log('📤 Sending data:', {
        vagon: selectedVagon,
        lot: selectedLot,
        client: selectedClient,
        sale_type: 'lot_based',
        sale_unit: saleUnit,
        sent_volume_m3: soldVolume,
        sent_quantity: soldQty || null,
        sale_currency: saleCurrency,
        price_per_m3: saleUnit === 'volume' ? parseFloat(pricePerM3) : null,
        price_per_piece: saleUnit === 'pieces' ? parseFloat(pricePerPiece) : null,
        paid_amount: parseFloat(paidAmount) || 0,
        notes: notes
      });
      
      await axios.post('/vagon-sale', {
          vagon: selectedVagon,
          lot: selectedLot,
          client: selectedClient,
          sale_type: 'lot_based',
          sale_unit: saleUnit,
          sent_volume_m3: soldVolume,
          sent_quantity: soldQty || null,
          client_loss_m3: parseFloat(clientLossM3) || 0,
          client_loss_quantity: saleUnit === 'pieces' ? parseInt(clientLossQuantity) || 0 : null,
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
          price_per_m3: saleUnit === 'volume' ? parseFloat(pricePerM3) : null,
          price_per_piece: saleUnit === 'pieces' ? parseFloat(pricePerPiece) : null,
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
    } finally {
      // ✅ LOADING STATE TUGASHI
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSaleType('single_lot');
    setSelectedVagon('');
    setSelectedLot('');
    setMultiSelectedVagon('');
    setMultiVagonSelectedVagon(''); // YANGI
    setMultiVagonSelectedLot(''); // YANGI
    setSaleItems([]);
    setCurrentSaleItem({});
    setSelectedClient('');
    setSoldVolumeM3('');
    setSoldQuantity('');
    setSaleUnit('volume');
    setClientLossM3('');
    setClientLossQuantity('');
    setClientLossResponsible('');
    setClientLossReason('');
    
    // BRAK JAVOBGARLIK TAQSIMOTI
    setBrakVolume('');
    setSellerLiabilityPercent(100);
    setBuyerLiabilityPercent(0);
    setSaleCurrency('USD'); // Faqat USD
    setPricePerM3('');
    setPricePerPiece('');
    setPaidAmount('');
    setNotes('');
  };

  // YANGI: Multi-lot va Multi-vagon submit funksiyasi
  const handleMultiLotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ LOADING STATE BOSHLASH
    if (isMultiSubmitting) return; // Double-click oldini olish
    setIsMultiSubmitting(true);
    
    try {
      if (!selectedClient) {
        showAlert({
          title: t.messages.error,
          message: t.messages.selectClient,
          type: 'warning'
        });
        return;
      }

      if (saleItems.length === 0) {
        showAlert({
          title: t.messages.error,
          message: 'Hech bo\'lmaganda bitta lot qo\'shing',
          type: 'warning'
        });
        return;
      }

      const token = localStorage.getItem('token');
      
      // Har bir lot uchun alohida sotuv yaratish
      for (const item of saleItems) {
        const saleData = {
          vagon: item.vagon, // YANGI: Har bir item o'zining vagoniga ega
          lot: item.lot,
          client: selectedClient,
          sale_unit: item.saleUnit,
          warehouse_dispatched_volume_m3: item.soldVolume,
          sent_quantity: item.soldQuantity || null,
          transport_loss_m3: parseFloat(clientLossM3) || 0,
          transport_loss_quantity: item.saleUnit === 'pieces' ? parseInt(clientLossQuantity) || 0 : null,
          transport_loss_responsible_person: clientLossResponsible || null,
          transport_loss_reason: clientLossReason || null,
          sale_currency: saleCurrency,
          price_per_m3: item.saleUnit === 'volume' ? item.pricePerM3 : null,
          price_per_piece: item.saleUnit === 'pieces' ? item.pricePerPiece : null,
          paid_amount: 0, // Multi-lot da to'lov alohida qilinadi
          notes: notes
        };

        await axios.post('/vagon-sale', saleData);
      }
      
      const clientName = clients.find(c => c._id === selectedClient)?.name || 'Mijoz';
      const uniqueVagons = [...new Set(saleItems.map(item => item.vagonInfo.vagonCode))];
      
      showAlert({
        title: t.messages.success,
        message: `${clientName}ga ${saleItems.length} ta lot sotildi (${uniqueVagons.length} ta vagondan). Jami: ${getTotalSaleAmount().toLocaleString()} ${saleCurrency}`,
        type: 'success',
        autoCloseDelay: 4000
      });
      
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Multi-lot sale error:', error);
      
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || 'Multi-lot sotuvda xatolik',
        type: 'error'
      });
    } finally {
      // ✅ LOADING STATE TUGASHI
      setIsMultiSubmitting(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    // Vagon sotuvida faqat USD
    return '$';
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container-full-desktop space-y-6">
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
      <div className="container-full-desktop">
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
                    {(sale.client_loss_m3 || 0) > 0 && (
                      <div className="text-xs text-red-500">{t.vagonSale.lossLabel}: {(sale.client_loss_m3 || 0).toFixed(2)} m³</div>
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
                    {(sale.client_loss_m3 || 0) > 0 && (
                      <div>
                        <span className="text-gray-600">{t.vagonSale.lossLabel}:</span>
                        <span className="ml-2 font-semibold text-red-500">{(sale.client_loss_m3 || 0).toFixed(2)} m³</span>
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
              <form onSubmit={saleType === 'single_lot' ? handleSubmit : handleMultiLotSubmit} className="space-y-4">
                <div className="space-y-4">
                  {/* Sotuv turi tanlash */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Sotuv turi</label>
                    <div className="flex flex-col gap-2 mb-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="single_lot"
                          checked={saleType === 'single_lot'}
                          onChange={(e) => {
                            setSaleType(e.target.value as 'single_lot' | 'multi_lot' | 'multi_vagon');
                            // ✅ SALE TYPE O'ZGARTIRILGANDA BARCHA QIYMATLARNI TOZALASH
                            setSelectedVagon('');
                            setSelectedLot('');
                            setMultiSelectedVagon('');
                            setMultiVagonSelectedVagon('');
                            setMultiVagonSelectedLot('');
                            setSaleItems([]);
                            setCurrentSaleItem({});
                            setSoldVolumeM3('');
                            setSoldQuantity('');
                            setPricePerM3('');
                            setPricePerPiece('');
                            setSaleUnit('volume');
                          }}
                          className="mr-2"
                        />
                        <span className="font-medium">📋 Bitta lot sotish</span>
                        <span className="ml-2 text-sm text-gray-600 font-medium">(Oddiy sotuv)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="multi_lot"
                          checked={saleType === 'multi_lot'}
                          onChange={(e) => {
                            setSaleType(e.target.value as 'single_lot' | 'multi_lot' | 'multi_vagon');
                            // ✅ SALE TYPE O'ZGARTIRILGANDA BARCHA QIYMATLARNI TOZALASH
                            setSelectedVagon('');
                            setSelectedLot('');
                            setMultiSelectedVagon('');
                            setMultiVagonSelectedVagon('');
                            setMultiVagonSelectedLot('');
                            setSaleItems([]);
                            setCurrentSaleItem({});
                            setSoldVolumeM3('');
                            setSoldQuantity('');
                            setPricePerM3('');
                            setPricePerPiece('');
                            setSaleUnit('volume');
                          }}
                          className="mr-2"
                        />
                        <span className="font-medium">📦 Bir vagon ichidagi bir nechta lot</span>
                        <span className="ml-2 text-sm text-blue-600 font-medium">(Bitta vagon)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="multi_vagon"
                          checked={saleType === 'multi_vagon'}
                          onChange={(e) => {
                            setSaleType(e.target.value as 'single_lot' | 'multi_lot' | 'multi_vagon');
                            // ✅ SALE TYPE O'ZGARTIRILGANDA BARCHA QIYMATLARNI TOZALASH
                            setSelectedVagon('');
                            setSelectedLot('');
                            setMultiSelectedVagon('');
                            setMultiVagonSelectedVagon('');
                            setMultiVagonSelectedLot('');
                            setSaleItems([]);
                            setCurrentSaleItem({});
                            setSoldVolumeM3('');
                            setSoldQuantity('');
                            setPricePerM3('');
                            setPricePerPiece('');
                            setSaleUnit('volume');
                          }}
                          className="mr-2"
                        />
                        <span className="font-medium">🚂 Turli vagonlardan lot sotish</span>
                        <span className="ml-2 text-sm text-green-600 font-medium">(Bir nechta vagon)</span>
                      </label>
                    </div>
                  </div>

                  {saleType === 'single_lot' ? (
                    // BITTA LOT SOTISH (eski logika)
                    <>
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
                        onChange={(e) => {
                          setSelectedLot(e.target.value);
                          // ✅ LOT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                          setSoldVolumeM3('');
                          setSoldQuantity('');
                          setPricePerM3('');
                          setPricePerPiece('');
                          setSaleUnit('volume'); // Default qiymat
                        }}
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
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.saleUnit || 'Sotuv birligi'}</label>
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="volume"
                          checked={saleUnit === 'volume'}
                          onChange={(e) => {
                            setSaleUnit(e.target.value as 'volume' | 'pieces');
                            // ✅ SALE UNIT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                            setSoldVolumeM3('');
                            setSoldQuantity('');
                            setPricePerM3('');
                            setPricePerPiece('');
                          }}
                          className="mr-2"
                        />
                        {t.vagonSale.byVolume || 'Hajm bo\'yicha (m³)'}
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="pieces"
                          checked={saleUnit === 'pieces'}
                          onChange={(e) => {
                            setSaleUnit(e.target.value as 'volume' | 'pieces');
                            // ✅ SALE UNIT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                            setSoldVolumeM3('');
                            setSoldQuantity('');
                            setPricePerM3('');
                            setPricePerPiece('');
                          }}
                          className="mr-2"
                        />
                        {t.vagonSale.byPieces || 'Dona bo\'yicha'}
                      </label>
                    </div>
                  </div>

                  {saleUnit === 'volume' ? (
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
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {t.vagonSale.soldQuantityLabel || 'Sotilgan dona'}
                      </label>
                      <input
                        type="number"
                        value={soldQuantity}
                        onChange={(e) => setSoldQuantity(e.target.value)}
                        placeholder="25"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      {selectedLot && getSelectedLotInfo() && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t.vagonSale.remainingQuantityNote || 'Qolgan dona'}: <span className="font-semibold text-green-600">{getSelectedLotInfo()?.remaining_quantity || 0} dona</span>
                        </p>
                      )}
                    </div>
                  )}

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

                  {/* Vagon sotuvida faqat USD */}
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.vagonSale.saleCurrencyLabel}</label>
                    <div className="w-full px-3 py-2 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-center">
                        <span className="font-semibold text-blue-800">USD ($)</span>
                        <span className="ml-2 text-sm text-blue-600">- Vagon sotuvi faqat dollarda</span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      💡 Vagon sotuvi faqat USD valyutasida amalga oshiriladi
                    </p>
                  </div>

                  {saleUnit === 'volume' ? (
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
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">{t.vagonSale.pricePerPiece || 'Dona narxi'} ({saleCurrency})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricePerPiece}
                        onChange={(e) => setPricePerPiece(e.target.value)}
                        placeholder="25"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}

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
                    </>
                  ) : saleType === 'multi_lot' ? (
                    // BIR VAGON ICHIDAGI BIR NECHTA LOT SOTISH
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Vagonni tanlang</label>
                        <select
                          value={multiSelectedVagon}
                          onChange={(e) => {
                            setMultiSelectedVagon(e.target.value);
                            // ✅ VAGON O'ZGARTIRILGANDA BARCHA QIYMATLARNI TOZALASH
                            setCurrentSaleItem({});
                            setSaleItems([]);
                          }}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Vagonni tanlang</option>
                          {vagons.map(vagon => (
                            <option key={vagon._id} value={vagon._id}>
                              {vagon.vagonCode} ({vagon.lots?.length || 0} lot)
                            </option>
                          ))}
                        </select>
                      </div>

                      {multiSelectedVagon && (
                        <div className="bg-blue-50 p-4 rounded-lg border">
                          <h4 className="font-semibold mb-3">Lot qo'shish</h4>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-1">Lot</label>
                              <select
                                value={currentSaleItem.lot || ''}
                                onChange={(e) => {
                                  const lotInfo = getMultiSelectedVagonLots().find(l => l._id === e.target.value);
                                  setCurrentSaleItem({
                                    ...currentSaleItem,
                                    lot: e.target.value,
                                    lotInfo: lotInfo,
                                    // ✅ LOT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                                    soldVolume: 0,
                                    soldQuantity: 0,
                                    pricePerM3: 0,
                                    pricePerPiece: 0,
                                    totalPrice: 0,
                                    saleUnit: 'volume' // Default qiymat
                                  });
                                }}
                                className="w-full px-3 py-2 border rounded-lg"
                              >
                                <option value="">Lot tanlang</option>
                                {getMultiSelectedVagonLots().map(lot => (
                                  <option key={lot._id} value={lot._id}>
                                    {lot.dimensions} - {lot.remaining_volume_m3.toFixed(2)} m³ qolgan
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-1">Sotuv birligi</label>
                              <select
                                value={currentSaleItem.saleUnit || 'volume'}
                                onChange={(e) => {
                                  const newSaleUnit = e.target.value as 'volume' | 'pieces';
                                  setCurrentSaleItem({
                                    ...currentSaleItem,
                                    saleUnit: newSaleUnit,
                                    // ✅ SALE UNIT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                                    soldVolume: 0,
                                    soldQuantity: 0,
                                    pricePerM3: 0,
                                    pricePerPiece: 0,
                                    totalPrice: 0
                                  });
                                }}
                                className="w-full px-3 py-2 border rounded-lg"
                              >
                                <option value="volume">Hajm bo'yicha (m³)</option>
                                <option value="pieces">Dona bo'yicha</option>
                              </select>
                            </div>
                          </div>

                          {currentSaleItem.saleUnit === 'volume' ? (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">Sotilgan hajm (m³)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentSaleItem.soldVolume || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    soldVolume: parseFloat(e.target.value) || 0
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg"
                                  placeholder="2.50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Narx (m³ uchun)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentSaleItem.pricePerM3 || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    pricePerM3: parseFloat(e.target.value) || 0
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg"
                                  placeholder="500"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">Sotilgan dona</label>
                                <input
                                  type="number"
                                  value={currentSaleItem.soldQuantity || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    soldQuantity: parseInt(e.target.value) || 0
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg"
                                  placeholder="25"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Dona narxi</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentSaleItem.pricePerPiece || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    pricePerPiece: parseFloat(e.target.value) || 0
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg"
                                  placeholder="25"
                                />
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={addSaleItem}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            Lot qo'shish
                          </button>
                        </div>
                      )}

                      {/* Qo'shilgan lotlar ro'yxati */}
                      {saleItems.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3">Sotilayotgan lotlar ({saleItems.length})</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {saleItems.map((item, index) => (
                              <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                                <div className="flex-1">
                                  <div className="font-medium">{item.lotInfo.dimensions}</div>
                                  <div className="text-sm text-gray-600">
                                    {item.saleUnit === 'volume' 
                                      ? `${item.soldVolume.toFixed(2)} m³ × $${item.pricePerM3}`
                                      : `${item.soldQuantity} dona × $${item.pricePerPiece}`
                                    }
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">${item.totalPrice.toLocaleString()}</div>
                                  <button
                                    type="button"
                                    onClick={() => removeSaleItem(index)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    O'chirish
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between font-bold">
                              <span>Jami:</span>
                              <span>${getTotalSaleAmount().toLocaleString()} ({getTotalSaleVolume().toFixed(2)} m³)</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">Mijozni tanlang</label>
                        <select
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Mijozni tanlang</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Sotuv valyutasi</label>
                        <select
                          value={saleCurrency}
                          onChange={(e) => setSaleCurrency(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="USD">USD ($) - Vagon sotuvi faqat dollarda</option>
                          
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Izoh</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Multi-lot sotuv haqida izoh..."
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    // TURLI VAGONLARDAN LOT SOTISH (YANGI)
                    <>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-semibold mb-3 text-purple-800">🚂 Turli vagonlardan lot qo'shish</h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Vagon</label>
                            <select
                              value={multiVagonSelectedVagon}
                              onChange={(e) => {
                                setMultiVagonSelectedVagon(e.target.value);
                                setMultiVagonSelectedLot(''); // Reset lot selection
                                setCurrentSaleItem({
                                  ...currentSaleItem,
                                  // ✅ VAGON O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                                  soldVolume: 0,
                                  soldQuantity: 0,
                                  pricePerM3: 0,
                                  pricePerPiece: 0,
                                  totalPrice: 0,
                                  saleUnit: 'volume' // Default qiymat
                                });
                              }}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="">Vagon tanlang</option>
                              {vagons.map(vagon => (
                                <option key={vagon._id} value={vagon._id}>
                                  {vagon.vagonCode} ({vagon.lots?.length || 0} lot)
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Lot</label>
                            <select
                              value={multiVagonSelectedLot}
                              onChange={(e) => {
                                setMultiVagonSelectedLot(e.target.value);
                                const vagonInfo = vagons.find(v => v._id === multiVagonSelectedVagon);
                                const lotInfo = vagonInfo?.lots.find(l => l._id === e.target.value);
                                setCurrentSaleItem({
                                  ...currentSaleItem,
                                  lot: e.target.value,
                                  lotInfo: lotInfo,
                                  // ✅ LOT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                                  soldVolume: 0,
                                  soldQuantity: 0,
                                  pricePerM3: 0,
                                  pricePerPiece: 0,
                                  totalPrice: 0,
                                  saleUnit: 'volume' // Default qiymat
                                });
                              }}
                              className="w-full px-3 py-2 border rounded-lg"
                              disabled={!multiVagonSelectedVagon}
                            >
                              <option value="">Lot tanlang</option>
                              {multiVagonSelectedVagon && getMultiVagonSelectedVagonLots().map(lot => (
                                <option key={lot._id} value={lot._id}>
                                  {lot.dimensions} - {lot.remaining_volume_m3.toFixed(2)} m³ qolgan
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-1">Sotuv birligi</label>
                          <select
                            value={currentSaleItem.saleUnit || 'volume'}
                            onChange={(e) => {
                              const newSaleUnit = e.target.value as 'volume' | 'pieces';
                              setCurrentSaleItem({
                                ...currentSaleItem,
                                saleUnit: newSaleUnit,
                                // ✅ SALE UNIT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                                soldVolume: 0,
                                soldQuantity: 0,
                                pricePerM3: 0,
                                pricePerPiece: 0,
                                totalPrice: 0
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="volume">Hajm bo'yicha (m³)</option>
                            <option value="pieces">Dona bo'yicha</option>
                          </select>
                        </div>

                        {currentSaleItem.saleUnit === 'volume' ? (
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-1">Sotilgan hajm (m³)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentSaleItem.soldVolume || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  soldVolume: parseFloat(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="2.50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Narx (m³ uchun)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentSaleItem.pricePerM3 || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  pricePerM3: parseFloat(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-1">Sotilgan dona</label>
                              <input
                                type="number"
                                value={currentSaleItem.soldQuantity || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  soldQuantity: parseInt(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="25"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Dona narxi</label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentSaleItem.pricePerPiece || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  pricePerPiece: parseFloat(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="25"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={addMultiVagonSaleItem}
                          className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                        >
                          🚂 Vagon va lot qo'shish
                        </button>
                      </div>

                      {/* Qo'shilgan lotlar ro'yxati (turli vagonlardan) */}
                      {saleItems.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-3">Sotilayotgan lotlar ({saleItems.length})</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {saleItems.map((item, index) => (
                              <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    🚂 {item.vagonInfo.vagonCode} - {item.lotInfo.dimensions}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {item.saleUnit === 'volume' 
                                      ? `${item.soldVolume.toFixed(2)} m³ × ${item.pricePerM3}`
                                      : `${item.soldQuantity} dona × ${item.pricePerPiece}`
                                    }
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">${item.totalPrice.toLocaleString()}</div>
                                  <button
                                    type="button"
                                    onClick={() => removeSaleItem(index)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    O'chirish
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between font-bold">
                              <span>Jami:</span>
                              <span>${getTotalSaleAmount().toLocaleString()} ({getTotalSaleVolume().toFixed(2)} m³)</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {[...new Set(saleItems.map(item => item.vagonInfo.vagonCode))].length} ta vagondan
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">Mijozni tanlang</label>
                        <select
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Mijozni tanlang</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Sotuv valyutasi</label>
                        <select
                          value={saleCurrency}
                          onChange={(e) => setSaleCurrency(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="USD">USD ($) - Vagon sotuvi faqat dollarda</option>
                          
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Izoh</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Turli vagonlardan sotuv haqida izoh..."
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
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
                    disabled={saleType === 'single_lot' ? isSubmitting : isMultiSubmitting}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                      (saleType === 'single_lot' ? isSubmitting : isMultiSubmitting)
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {(saleType === 'single_lot' ? isSubmitting : isMultiSubmitting) ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {saleType === 'single_lot' ? 'Saqlanmoqda...' : 'Sotilmoqda...'}
                      </>
                    ) : (
                      saleType === 'single_lot' 
                        ? t.common.save 
                        : saleType === 'multi_lot'
                          ? `${saleItems.length} ta lot sotish (1 vagon)`
                          : `${saleItems.length} ta lot sotish (${[...new Set(saleItems.map(item => item.vagonInfo?.vagonCode))].length} vagon)`
                    )}
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
