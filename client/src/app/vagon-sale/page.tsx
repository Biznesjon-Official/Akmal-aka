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
  vagonCode?: string; // Direct field
  lot?: {
    dimensions: string;
  };
  dimensions?: string; // Direct field
  // Yangi: Erkin sotuv uchun
  wood_type?: string;
  sale_type: 'lot_based' | 'free_sale'; // Sotuv turi
  client: {
    name: string;
    phone: string;
  };
  sent_volume_m3?: number;
  warehouse_dispatched_volume_m3?: number; // Yangi field
  sent_quantity?: number; // Yangi: dona soni
  accepted_volume_m3?: number;
  accepted_quantity?: number; // Yangi: qabul qilingan dona
  client_loss_m3?: number;
  client_loss_quantity?: number; // Yangi: yo'qolgan dona
  client_loss_responsible_person?: string;
  client_loss_reason?: string;
  sale_unit?: string; // Sotuv birligi: 'volume' yoki 'pieces'
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
  
  // ✅ TAB SYSTEM
  const [activeTab, setActiveTab] = useState<'sales' | 'history'>('sales');
  
  // ✅ HISTORY STATES
  const [salesHistory, setSalesHistory] = useState<VagonSale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    clientId: '',
    vagonId: '',
    minAmount: '',
    maxAmount: ''
  });
  
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
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]); // YANGI: Sotuv sanasi
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

  // ✅ HISTORY DATA LOADING
  const fetchSalesHistory = async () => {
    try {
      setHistoryLoading(true);
      console.log('🔄 Sotuvlar tarixi yuklanmoqda...');
      
      const params = new URLSearchParams();
      if (historyFilters.startDate) params.append('startDate', historyFilters.startDate);
      if (historyFilters.endDate) params.append('endDate', historyFilters.endDate);
      if (historyFilters.clientId) params.append('clientId', historyFilters.clientId);
      if (historyFilters.vagonId) params.append('vagonId', historyFilters.vagonId);
      if (historyFilters.minAmount) params.append('minAmount', historyFilters.minAmount);
      if (historyFilters.maxAmount) params.append('maxAmount', historyFilters.maxAmount);
      params.append('limit', '100'); // Ko'proq ma'lumot olish uchun
      
      console.log('📤 So\'rov parametrlari:', params.toString());
      
      const response = await axios.get(`/vagon-sale/history?${params}`);
      
      console.log('📥 Server javobi:', response.data);
      
      if (response.data.success && response.data.sales) {
        setSalesHistory(response.data.sales);
        console.log(`✅ ${response.data.sales.length} ta tarixiy sotuv yuklandi`);
      } else {
        setSalesHistory([]);
        console.log('⚠️ Sotuvlar tarixi bo\'sh');
      }
    } catch (error: any) {
      console.error('❌ Sotuvlar tarixini yuklashda xatolik:', error);
      console.error('❌ Xatolik tafsilotlari:', error.response?.data);
      
      setSalesHistory([]);
      
      showAlert({
        title: 'Xatolik',
        message: error.response?.data?.message || 'Sotuvlar tarixini yuklashda xatolik yuz berdi',
        type: 'error'
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // History tab ochilganda ma'lumotlarni yuklash
  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchSalesHistory();
    }
  }, [activeTab, historyFilters, user]);

  const fetchData = async () => {
    try {
      console.log('🔄 Vagon sotuv ma\'lumotlari yangilanmoqda...');
      const [salesRes, clientsRes, vagonsRes] = await Promise.all([
        axios.get('/vagon-sale'),
        axios.get('/client'),
        axios.get('/vagon')
      ]);
      
      // Sales data (pagination format bo'lishi mumkin)
      if (salesRes.data.sales) {
        setSales(salesRes.data.sales);
        console.log(`✅ ${salesRes.data.sales.length} ta sotuv yuklandi`);
      } else {
        setSales(salesRes.data || []);
        console.log(`✅ ${salesRes.data?.length || 0} ta sotuv yuklandi`);
      }
      
      // Clients data (pagination format bo'lishi mumkin)
      if (clientsRes.data.clients) {
        setClients(clientsRes.data.clients);
        console.log(`✅ ${clientsRes.data.clients.length} ta mijoz yuklandi`);
      } else {
        setClients(clientsRes.data || []);
        console.log(`✅ ${clientsRes.data?.length || 0} ta mijoz yuklandi`);
      }
      
      // Vagons data (pagination format bo'lishi mumkin)
      let vagonsData = [];
      if (vagonsRes.data.vagons) {
        vagonsData = vagonsRes.data.vagons;
      } else {
        vagonsData = vagonsRes.data || [];
      }
      
      // Faqat aktiv vagonlarni filter qilish
      const activeVagons = vagonsData.filter((v: any) => v.status !== 'closed');
      setVagons(activeVagons);
      console.log(`✅ ${activeVagons.length} ta aktiv vagon yuklandi`);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Xatolik bo'lsa bo'sh arraylar o'rnatish
      setSales([]);
      setClients([]);
      setVagons([]);
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
          message: t.messages.clientSelectCurrency,
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
          sale_date: saleDate, // YANGI: Sotuv sanasi
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
    setSaleDate(new Date().toISOString().split('T')[0]); // YANGI: Sana reset
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
          sale_date: saleDate, // YANGI: Sotuv sanasi
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="shopping-cart" className="h-7 w-7" />
                    </div>
                    {t.vagonSale.title}
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    Professional vagon sotuvlari boshqaruvi
                  </p>
                  <p className="text-sm opacity-75">
                    Sotuvlar, tarix va hisobotlarni kuzatib boring
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl hover:bg-white/30 flex items-center shadow-lg transition-all duration-200 font-semibold"
                >
                  <Icon name="plus" className="mr-3 h-6 w-6" />
                  {t.vagonSale.addSale}
                </button>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Modern Tabs */}
          <div className="mb-8">
            <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-lg">
              <button
                onClick={() => setActiveTab('sales')}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center ${
                  activeTab === 'sales'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon name="shopping-cart" className="mr-2 h-5 w-5" />
                Sotuvlar
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon name="clock" className="mr-2 h-5 w-5" />
                Sotuvlar Tarixi
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'sales' ? (
            // EXISTING SALES CONTENT
            <div className="space-y-6">

              {sales.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon name="shopping-cart" className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {t.vagonSale.noSales}
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Birinchi sotuvni qo'shish uchun yuqoridagi tugmani bosing
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
            {(sales || []).map((sale) => (
              <div key={sale._id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{sale.vagon?.vagonCode || 'N/A'}</h3>
                      <p className="text-sm opacity-90">{sale.lot?.dimensions || 'N/A'}</p>
                      <p className="text-xs opacity-75">
                        {new Date(sale.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {sale.sale_unit === 'pieces' 
                          ? `${sale.sent_quantity || 0}`
                          : `${sale.sent_volume_m3?.toFixed(2) || '0.00'}`
                        }
                      </div>
                      <div className="text-sm opacity-90">
                        {sale.sale_unit === 'pieces' ? 'dona' : 'm³'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client info */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Icon name="user" className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{sale.client?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-600">{sale.client?.phone || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Main stats */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {sale.sale_unit === 'pieces' 
                          ? (
                              <span title={t.vagonSale.pieceToVolumeNote}>
                                {sale.accepted_quantity || 0}
                                <span className="text-sm text-gray-500 block">
                                  (≈ {sale.accepted_volume_m3?.toFixed(2) || '0.00'} m³)
                                </span>
                              </span>
                            )
                          : `${sale.accepted_volume_m3?.toFixed(2) || '0.00'} m³`
                        }
                      </div>
                      <div className="text-xs text-gray-600">{t.vagonSale.acceptedLabel}</div>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {sale.sale_unit === 'pieces' 
                          ? `${sale.price_per_piece?.toLocaleString() || '0'}`
                          : `${sale.price_per_m3?.toLocaleString() || '0'}`
                        } {getCurrencySymbol(sale.sale_currency)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {sale.sale_unit === 'pieces' ? 'Dona narxi' : 'Kub narxi'}
                      </div>
                    </div>
                  </div>

                  {/* Transport loss if exists */}
                  {(sale.client_loss_m3 || 0) > 0 && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <div className="flex items-center gap-2">
                        <Icon name="alert-triangle" className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-700">
                          {t.vagonSale.lossLabel}: {(sale.client_loss_m3 || 0).toFixed(2)} m³
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial summary */}
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {sale.total_price?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600">{t.vagonSale.totalPriceLabel}</div>
                      <div className="text-xs text-gray-500">{getCurrencySymbol(sale.sale_currency)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {sale.paid_amount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600">{t.vagonSale.paidLabel}</div>
                      <div className="text-xs text-gray-500">{getCurrencySymbol(sale.sale_currency)}</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${(sale.debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {sale.debt?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600">{t.vagonSale.debtLabel}</div>
                      <div className="text-xs text-gray-500">{getCurrencySymbol(sale.sale_currency)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-slideUp">
              <div className="modal-header">
                <h2 className="text-xl sm:text-2xl font-bold">{t.vagonSale.addSale}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-icon"
                >
                  <Icon name="close" size="md" />
                </button>
              </div>
              
              <div className="modal-body">
                <form onSubmit={saleType === 'single_lot' ? handleSubmit : handleMultiLotSubmit} className="space-y-4">
                  <div className="space-y-4">
                  {/* Sotuv turi tanlash */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Sotuv turi</label>
                    <div className="flex flex-col gap-2 mb-3">
                      <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                          className="mr-3"
                        />
                        <Icon name="clipboard" className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium">Bitta lot sotish</span>
                        <span className="ml-2 text-sm text-gray-600 font-medium">(Oddiy sotuv)</span>
                      </label>
                      <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                          className="mr-3"
                        />
                        <Icon name="package" className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-medium">Bir vagon ichidagi bir nechta lot</span>
                        <span className="ml-2 text-sm text-blue-600 font-medium">(Bitta vagon)</span>
                      </label>
                      <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                          className="mr-3"
                        />
                        <Icon name="truck" className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-medium">Turli vagonlardan lot sotish</span>
                        <span className="ml-2 text-sm text-green-600 font-medium">(Bir nechta vagon)</span>
                      </label>
                    </div>
                  </div>

                  {saleType === 'single_lot' ? (
                    // BITTA LOT SOTISH (eski logika)
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.vagonSale.selectVagonLabel}</label>
                        <select
                          value={selectedVagon}
                          onChange={(e) => handleVagonChange(e.target.value)}
                          className="input-field"
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
                      <label className="block text-sm font-medium mb-2">{t.vagonSale.selectLotLabel}</label>
                      {/* Tanlangan lot ko'rsatish */}
                      {selectedLot && (
                        <div className="mb-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-green-800">
                                ✅ Tanlangan: {getSelectedLotInfo()?.dimensions}
                              </div>
                              <div className="text-sm text-green-600">
                                {getSelectedLotInfo()?.remaining_volume_m3.toFixed(2)} m³ mavjud • {getSelectedLotInfo()?.purchase_currency} {getSelectedLotInfo()?.purchase_amount.toLocaleString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLot('');
                                setSoldVolumeM3('');
                                setSoldQuantity('');
                                setPricePerM3('');
                                setPricePerPiece('');
                                setSaleUnit('volume');
                              }}
                              className="text-green-600 hover:text-green-800 ml-2"
                              title="Tanlovni bekor qilish"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                        {getSelectedVagonLots().map(lot => (
                          <div 
                            key={lot._id} 
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              selectedLot === lot._id 
                                ? 'bg-blue-100 border-blue-500 shadow-lg ring-2 ring-blue-200' 
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                            }`}
                            onClick={() => {
                              setSelectedLot(lot._id);
                              // ✅ LOT O'ZGARTIRILGANDA ESKI QIYMATLARNI TOZALASH
                              setSoldVolumeM3('');
                              setSoldQuantity('');
                              setPricePerM3('');
                              setPricePerPiece('');
                              setSaleUnit('volume'); // Default qiymat
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {/* Yangilangan galochka (Checkmark) */}
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                  selectedLot === lot._id 
                                    ? 'bg-blue-500 border-blue-500 scale-110' 
                                    : 'border-gray-300 hover:border-blue-400'
                                }`}>
                                  {selectedLot === lot._id && (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                
                                <div>
                                  <div className={`font-semibold ${selectedLot === lot._id ? 'text-blue-800' : 'text-gray-800'}`}>
                                    📦 {lot.dimensions}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    💎 {lot.remaining_volume_m3.toFixed(2)} m³ qolgan • {lot.purchase_currency}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className={`font-bold ${selectedLot === lot._id ? 'text-blue-600' : 'text-green-600'}`}>
                                  {lot.purchase_amount.toLocaleString()} {lot.purchase_currency}
                                </div>
                                <div className="text-sm text-gray-500">
                                  📊 {lot.volume_m3.toFixed(2)} m³ jami
                                </div>
                              </div>
                            </div>
                            
                            {/* Tanlangan lot uchun qo'shimcha ma'lumot */}
                            {selectedLot === lot._id && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="text-xs text-blue-700 font-medium">
                                  🎯 Bu lot tanlangan va sotuvga tayyor
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {selectedLot && getSelectedLotInfo() && (
                        <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span className="font-semibold text-blue-800">Tanlangan lot ma'lumotlari</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.remainingVolumeLabel}:</span>
                              <span className="font-semibold text-green-600">{getSelectedLotInfo()?.remaining_volume_m3.toFixed(2)} m³</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.totalVolumeLabel}:</span>
                              <span className="font-semibold">{getSelectedLotInfo()?.volume_m3.toFixed(2)} m³</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.purchaseCurrency}:</span>
                              <span className="font-semibold">{getSelectedLotInfo()?.purchase_currency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">{t.vagonSale.purchaseAmount}:</span>
                              <span className="font-semibold">{getSelectedLotInfo()?.purchase_amount.toLocaleString()} {getSelectedLotInfo()?.purchase_currency}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">{t.vagonSale.selectClientLabel}</label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="input-field"
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

                  {/* YANGI: Sotuv sanasi */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      📅 Sotuv sanasi
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="input-field"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Bu sana hisobotlarda va tarixda ko'rsatiladi
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t.vagonSale.saleUnit || 'Sotuv birligi'}</label>
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
                      <label className="block text-sm font-medium mb-2">
                        {t.vagonSale.soldVolumeM3Label || 'Sotilgan hajm (m³)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={soldVolumeM3}
                        onChange={(e) => setSoldVolumeM3(e.target.value)}
                        placeholder="2.50"
                        className="input-field"
                      />
                      {selectedLot && getSelectedLotInfo() && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t.vagonSale.remainingVolumeNote}: <span className="font-semibold text-green-600">{getSelectedLotInfo()?.remaining_volume_m3.toFixed(2)} m³</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t.vagonSale.soldQuantityLabel || 'Sotilgan dona'}
                      </label>
                      <input
                        type="number"
                        value={soldQuantity}
                        onChange={(e) => setSoldQuantity(e.target.value)}
                        placeholder="25"
                        className="input-field"
                      />
                      {selectedLot && getSelectedLotInfo() && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t.vagonSale.remainingQuantityNote || 'Qolgan dona'}: <span className="font-semibold text-green-600">{getSelectedLotInfo()?.remaining_quantity || 0} dona</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">
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
                      className="input-field"
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
                          <label className="block text-sm font-medium mb-2">{t.vagonSale.sellerLiability}</label>
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
                            className="input-field"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">{t.vagonSale.buyerLiability}</label>
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
                            className="input-field"
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
                        <label className="block text-sm font-medium mb-2 text-red-600">
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
                        <label className="block text-sm font-medium mb-2 text-red-600">
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
                    <label className="block text-sm font-medium mb-2">{t.vagonSale.saleCurrencyLabel}</label>
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
                      <label className="block text-sm font-medium mb-2">{t.vagonSale.pricePerM3.replace('{currency}', saleCurrency)}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricePerM3}
                        onChange={(e) => setPricePerM3(e.target.value)}
                        placeholder="500"
                        className="input-field"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.vagonSale.pricePerPiece || 'Dona narxi'} ({saleCurrency})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricePerPiece}
                        onChange={(e) => setPricePerPiece(e.target.value)}
                        placeholder="25"
                        className="input-field"
                      />
                      {/* Dona bo'yicha sotishda kub hisoblashni ko'rsatish */}
                      {selectedLot && pricePerPiece && (
                        <div className="mt-2 text-sm text-gray-600">
                          {(() => {
                            const lotInfo = getSelectedVagonLots().find((lot: any) => lot._id === selectedLot);
                            if (!lotInfo) return null;
                            const volumePerPiece = lotInfo.volume_m3 / lotInfo.quantity;
                            const pricePerM3 = parseFloat(pricePerPiece) / volumePerPiece;
                            return (
                              <div>
                                <div>1 dona = {volumePerPiece.toFixed(4)} m³</div>
                                <div>Kub narxi: ${pricePerM3.toFixed(2)}/m³</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">{t.vagonSale.paidAmountLabel.replace('{currency}', saleCurrency)}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t.vagonSale.notesLabel}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.vagonSale.notesPlaceholder}
                      className="input-field"
                      rows={3}
                    />
                  </div>
                    </>
                  ) : saleType === 'multi_lot' ? (
                    // BIR VAGON ICHIDAGI BIR NECHTA LOT SOTISH
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Vagonni tanlang</label>
                        <select
                          value={multiSelectedVagon}
                          onChange={(e) => {
                            setMultiSelectedVagon(e.target.value);
                            // ✅ VAGON O'ZGARTIRILGANDA BARCHA QIYMATLARNI TOZALASH
                            setCurrentSaleItem({});
                            setSaleItems([]);
                          }}
                          className="input-field"
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
                          <h4 className="font-semibold mb-3">📦 Lot qo'shish</h4>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Lot tanlash</label>
                              {/* Tanlangan lot ko'rsatish */}
                              {currentSaleItem.lot && (
                                <div className="mb-2 p-2 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                  <div className="flex items-center">
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-bold text-blue-800 text-sm">
                                        ✅ {getMultiSelectedVagonLots().find(l => l._id === currentSaleItem.lot)?.dimensions}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCurrentSaleItem({
                                          ...currentSaleItem,
                                          lot: undefined,
                                          lotInfo: undefined,
                                          soldVolume: 0,
                                          soldQuantity: 0,
                                          pricePerM3: 0,
                                          pricePerPiece: 0,
                                          totalPrice: 0
                                        });
                                      }}
                                      className="text-blue-600 hover:text-blue-800 ml-1"
                                      title="Tanlovni bekor qilish"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                                {getMultiSelectedVagonLots().map(lot => (
                                  <div 
                                    key={lot._id} 
                                    className={`p-2 border-2 rounded cursor-pointer transition-all duration-200 ${
                                      currentSaleItem.lot === lot._id 
                                        ? 'bg-blue-100 border-blue-500 shadow-md ring-1 ring-blue-200' 
                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                    onClick={() => {
                                      const lotInfo = getMultiSelectedVagonLots().find(l => l._id === lot._id);
                                      setCurrentSaleItem({
                                        ...currentSaleItem,
                                        lot: lot._id,
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
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        {/* Yangilangan galochka */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                          currentSaleItem.lot === lot._id 
                                            ? 'bg-blue-500 border-blue-500 scale-110' 
                                            : 'border-gray-300 hover:border-blue-400'
                                        }`}>
                                          {currentSaleItem.lot === lot._id && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </div>
                                        <div>
                                          <div className={`font-medium text-sm ${currentSaleItem.lot === lot._id ? 'text-blue-800' : 'text-gray-800'}`}>
                                            📦 {lot.dimensions}
                                          </div>
                                          <div className="text-xs text-gray-500">💎 {lot.remaining_volume_m3.toFixed(2)} m³ qolgan</div>
                                        </div>
                                      </div>
                                      
                                      {/* Tanlangan lot uchun qo'shimcha indikator */}
                                      {currentSaleItem.lot === lot._id && (
                                        <div className="text-xs text-blue-700 font-medium">
                                          🎯 Tanlangan
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Sotuv birligi</label>
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
                                className="input-field"
                              >
                                <option value="volume">Hajm bo'yicha (m³)</option>
                                <option value="pieces">Dona bo'yicha</option>
                              </select>
                            </div>
                          </div>

                          {currentSaleItem.saleUnit === 'volume' ? (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Sotilgan hajm (m³)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentSaleItem.soldVolume || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    soldVolume: parseFloat(e.target.value) || 0
                                  })}
                                  className="input-field"
                                  placeholder="2.50"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Narx (m³ uchun)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentSaleItem.pricePerM3 || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    pricePerM3: parseFloat(e.target.value) || 0
                                  })}
                                  className="input-field"
                                  placeholder="500"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-sm font-medium mb-2">Sotilgan dona</label>
                                <input
                                  type="number"
                                  value={currentSaleItem.soldQuantity || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    soldQuantity: parseInt(e.target.value) || 0
                                  })}
                                  className="input-field"
                                  placeholder="25"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Dona narxi</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentSaleItem.pricePerPiece || ''}
                                  onChange={(e) => setCurrentSaleItem({
                                    ...currentSaleItem,
                                    pricePerPiece: parseFloat(e.target.value) || 0
                                  })}
                                  className="input-field"
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
                        <label className="block text-sm font-medium mb-2">Mijozni tanlang</label>
                        <select
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          className="input-field"
                        >
                          <option value="">Mijozni tanlang</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* YANGI: Sotuv sanasi */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          📅 Sotuv sanasi
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="date"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                          className="input-field"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Bu sana hisobotlarda va tarixda ko'rsatiladi
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Sotuv valyutasi</label>
                        <select
                          value={saleCurrency}
                          onChange={(e) => setSaleCurrency(e.target.value)}
                          className="input-field"
                        >
                          <option value="USD">USD ($) - Vagon sotuvi faqat dollarda</option>
                          
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Izoh</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Multi-lot sotuv haqida izoh..."
                          className="input-field"
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
                            <label className="block text-sm font-medium mb-2">Vagon</label>
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
                              className="input-field"
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
                            <label className="block text-sm font-medium mb-2">Lot tanlash</label>
                            {/* Tanlangan lot ko'rsatish */}
                            {multiVagonSelectedLot && (
                              <div className="mb-2 p-2 bg-purple-50 border-2 border-purple-300 rounded-lg">
                                <div className="flex items-center">
                                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-purple-800 text-sm">
                                      ✅ {getMultiVagonSelectedVagonLots().find(l => l._id === multiVagonSelectedLot)?.dimensions}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMultiVagonSelectedLot('');
                                      setCurrentSaleItem({
                                        ...currentSaleItem,
                                        lot: undefined,
                                        lotInfo: undefined,
                                        soldVolume: 0,
                                        soldQuantity: 0,
                                        pricePerM3: 0,
                                        pricePerPiece: 0,
                                        totalPrice: 0
                                      });
                                    }}
                                    className="text-purple-600 hover:text-purple-800 ml-1"
                                    title="Tanlovni bekor qilish"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            <div className="space-y-1 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                              {multiVagonSelectedVagon ? getMultiVagonSelectedVagonLots().map(lot => (
                                <div 
                                  key={lot._id} 
                                  className={`p-2 border-2 rounded cursor-pointer transition-all duration-200 ${
                                    multiVagonSelectedLot === lot._id 
                                      ? 'bg-purple-100 border-purple-500 shadow-md ring-1 ring-purple-200' 
                                      : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                  }`}
                                  onClick={() => {
                                    setMultiVagonSelectedLot(lot._id);
                                    const vagonInfo = vagons.find(v => v._id === multiVagonSelectedVagon);
                                    const lotInfo = vagonInfo?.lots.find(l => l._id === lot._id);
                                    setCurrentSaleItem({
                                      ...currentSaleItem,
                                      lot: lot._id,
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
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {/* Yangilangan galochka */}
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                        multiVagonSelectedLot === lot._id 
                                          ? 'bg-purple-500 border-purple-500 scale-110' 
                                          : 'border-gray-300 hover:border-purple-400'
                                      }`}>
                                        {multiVagonSelectedLot === lot._id && (
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      <div>
                                        <div className={`font-medium text-sm ${multiVagonSelectedLot === lot._id ? 'text-purple-800' : 'text-gray-800'}`}>
                                          📦 {lot.dimensions}
                                        </div>
                                        <div className="text-xs text-gray-500">💎 {lot.remaining_volume_m3.toFixed(2)} m³ qolgan</div>
                                      </div>
                                    </div>
                                    
                                    {/* Tanlangan lot uchun qo'shimcha indikator */}
                                    {multiVagonSelectedLot === lot._id && (
                                      <div className="text-xs text-purple-700 font-medium">
                                        🎯 Tanlangan
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center text-gray-500 text-sm py-4">
                                  Avval vagon tanlang
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-medium mb-2">Sotuv birligi</label>
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
                            className="input-field"
                          >
                            <option value="volume">Hajm bo'yicha (m³)</option>
                            <option value="pieces">Dona bo'yicha</option>
                          </select>
                        </div>

                        {currentSaleItem.saleUnit === 'volume' ? (
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Sotilgan hajm (m³)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentSaleItem.soldVolume || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  soldVolume: parseFloat(e.target.value) || 0
                                })}
                                className="input-field"
                                placeholder="2.50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Narx (m³ uchun)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentSaleItem.pricePerM3 || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  pricePerM3: parseFloat(e.target.value) || 0
                                })}
                                className="input-field"
                                placeholder="500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Sotilgan dona</label>
                              <input
                                type="number"
                                value={currentSaleItem.soldQuantity || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  soldQuantity: parseInt(e.target.value) || 0
                                })}
                                className="input-field"
                                placeholder="25"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Dona narxi</label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentSaleItem.pricePerPiece || ''}
                                onChange={(e) => setCurrentSaleItem({
                                  ...currentSaleItem,
                                  pricePerPiece: parseFloat(e.target.value) || 0
                                })}
                                className="input-field"
                                placeholder="25"
                              />
                              {/* Dona bo'yicha sotishda kub hisoblashni ko'rsatish */}
                              {currentSaleItem.lotInfo && currentSaleItem.pricePerPiece && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {(() => {
                                    const volumePerPiece = currentSaleItem.lotInfo.volume_m3 / currentSaleItem.lotInfo.quantity;
                                    const pricePerM3 = currentSaleItem.pricePerPiece / volumePerPiece;
                                    return (
                                      <div>
                                        <div>1 dona = {volumePerPiece.toFixed(4)} m³</div>
                                        <div>Kub narxi: ${pricePerM3.toFixed(2)}/m³</div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
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
                        <label className="block text-sm font-medium mb-2">Mijozni tanlang</label>
                        <select
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          className="input-field"
                        >
                          <option value="">Mijozni tanlang</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* YANGI: Sotuv sanasi */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          📅 Sotuv sanasi
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="date"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                          className="input-field"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Bu sana hisobotlarda va tarixda ko'rsatiladi
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Sotuv valyutasi</label>
                        <select
                          value={saleCurrency}
                          onChange={(e) => setSaleCurrency(e.target.value)}
                          className="input-field"
                        >
                          <option value="USD">USD ($) - Vagon sotuvi faqat dollarda</option>
                          
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Izoh</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Turli vagonlardan sotuv haqida izoh..."
                          className="input-field"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Jami summa ko'rsatish */}
                {(saleType === 'multi_lot' || saleType === 'multi_vagon') && saleItems.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Icon name="calculator" className="h-5 w-5 text-green-600 mr-2" />
                        {t.common.grandTotal}
                      </h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {saleItems.reduce((total, item) => total + (item.totalPrice || 0), 0).toLocaleString()} {saleCurrency}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {[...new Set(saleItems.map(item => item.lot))].length} ta lot, {saleItems.length} marta sotuv
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Yagona lot uchun jami summa */}
                {saleType === 'single_lot' && getTotalSaleAmount() > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Icon name="calculator" className="h-5 w-5 text-blue-600 mr-2" />
                        {t.common.grandTotal}
                      </h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {getTotalSaleAmount().toLocaleString()} {saleCurrency}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          1 ta lot
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                  <div className="modal-footer">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          resetForm();
                        }}
                        className="btn-secondary order-2 sm:order-1"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={saleType === 'single_lot' ? isSubmitting : isMultiSubmitting}
                        className="btn-primary order-1 sm:order-2"
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
                              ? `${[...new Set(saleItems.map(item => item.lot))].length} ta lot sotish (${saleItems.length} marta, 1 vagon)`
                              : `${[...new Set(saleItems.map(item => item.lot))].length} ta lot sotish (${saleItems.length} marta, ${[...new Set(saleItems.map(item => item.vagonInfo?.vagonCode))].length} vagon)`
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
            </div>
          ) : (
            // HISTORY TAB CONTENT
            <div className="space-y-8">
              {/* History Filters */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="filter" className="h-6 w-6 text-white" />
                  </div>
                  Sotuvlar Tarixi Filtrlari
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Boshlanish sanasi</label>
                    <input
                      type="date"
                      value={historyFilters.startDate}
                      onChange={(e) => setHistoryFilters({...historyFilters, startDate: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Tugash sanasi</label>
                    <input
                      type="date"
                      value={historyFilters.endDate}
                      onChange={(e) => setHistoryFilters({...historyFilters, endDate: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Mijoz</label>
                    <select
                      value={historyFilters.clientId}
                      onChange={(e) => setHistoryFilters({...historyFilters, clientId: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    >
                      <option value="">Barcha mijozlar</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Vagon</label>
                    <select
                      value={historyFilters.vagonId}
                      onChange={(e) => setHistoryFilters({...historyFilters, vagonId: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    >
                      <option value="">Barcha vagonlar</option>
                      {vagons.map((vagon) => (
                        <option key={vagon._id} value={vagon._id}>
                          {vagon.vagonCode}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Min summa</label>
                    <input
                      type="number"
                      value={historyFilters.minAmount}
                      onChange={(e) => setHistoryFilters({...historyFilters, minAmount: e.target.value})}
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Max summa</label>
                    <input
                      type="number"
                      value={historyFilters.maxAmount}
                      onChange={(e) => setHistoryFilters({...historyFilters, maxAmount: e.target.value})}
                      placeholder="999999"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setHistoryFilters({
                      startDate: '',
                      endDate: '',
                      clientId: '',
                      vagonId: '',
                      minAmount: '',
                      maxAmount: ''
                    })}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold flex items-center"
                  >
                    <Icon name="refresh-cw" className="mr-2 h-5 w-5" />
                    Filtrlarni tozalash
                  </button>
                  <button
                    onClick={fetchSalesHistory}
                    disabled={historyLoading}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center disabled:opacity-50"
                  >
                    {historyLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Yuklanmoqda...
                      </>
                    ) : (
                      <>
                        <Icon name="search" className="mr-2 h-5 w-5" />
                        Qidirish
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* History Statistics */}
              {salesHistory.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold mb-6 flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="bar-chart" className="h-6 w-6 text-white" />
                    </div>
                    Statistika
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600">{salesHistory.length}</div>
                      <div className="text-sm text-gray-600 mt-2">Jami sotuvlar</div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
                      <div className="text-3xl font-bold text-green-600">
                        ${salesHistory.reduce((sum, sale) => sum + (sale.total_price || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">Jami summa</div>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-2xl border border-purple-200">
                      <div className="text-3xl font-bold text-purple-600">
                        {salesHistory.reduce((sum, sale) => sum + (sale.sent_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0), 0).toFixed(2)} m³
                      </div>
                      <div className="text-sm text-gray-600 mt-2">Jami hajm</div>
                    </div>
                    <div className="text-center p-6 bg-orange-50 rounded-2xl border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600">
                        ${Math.max(1, (salesHistory.reduce((sum, sale) => sum + (sale.total_price || 0), 0) / Math.max(salesHistory.reduce((sum, sale) => sum + (sale.sent_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0), 0), 1))).toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">O'rtacha narx/m³</div>
                    </div>
                  </div>
                </div>
              )}

              {/* History List */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="list" className="h-6 w-6 text-white" />
                  </div>
                  Sotuvlar Tarixi
                </h3>
                
                {historyLoading ? (
                  <div className="space-y-4">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="animate-pulse flex space-x-4 p-6 border-2 border-gray-100 rounded-2xl">
                        <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                ) : salesHistory.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon name="clock" className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Sotuvlar tarixi topilmadi
                    </h3>
                    <p className="text-gray-600 text-lg">
                      Filtrlarni o'zgartirib qayta urinib ko'ring
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {salesHistory.map((sale) => (
                      <div key={sale._id} className="flex items-center justify-between p-6 border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {sale.vagon?.vagonCode?.slice(-2) || sale.vagonCode?.slice(-2) || 'N/A'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">
                              {sale.client?.name || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(sale.createdAt).toLocaleDateString('uz-UZ')} • 
                              {sale.vagon?.vagonCode || sale.vagonCode || 'N/A'} • 
                              {sale.lot?.dimensions || sale.dimensions || 'N/A'}
                            </p>
                            <p className="text-sm text-blue-600 font-medium">
                              {sale.sale_unit === 'pieces' 
                                ? `${sale.sent_quantity || sale.accepted_quantity || 0} dona`
                                : `${(sale.sent_volume_m3 || sale.warehouse_dispatched_volume_m3 || 0).toFixed(2)} m³`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-2xl text-green-600">
                            ${(sale.total_price || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {sale.sale_currency || 'USD'}
                          </p>
                          {(sale.debt || 0) > 0 && (
                            <p className="text-sm text-red-600 font-medium">
                              Qarz: ${(sale.debt || 0).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
