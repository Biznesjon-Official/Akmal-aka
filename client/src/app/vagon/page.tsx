'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import VagonTableSkeleton from '@/components/vagon/VagonTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import VagonDetailsModal from '@/components/vagon/VagonDetailsModal';
import Pagination from '@/components/ui/Pagination'; // ⚡ PAGINATION IMPORT
import Icon from '@/components/Icon';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import axios from '@/lib/axios';

interface VagonLot {
  _id: string;
  dimensions: string;
  quantity: number;
  volume_m3: number;
  loss_volume_m3: number;
  loss_responsible_person?: string;
  loss_reason?: string;
  loss_date?: string;
  // YANGI TERMINOLOGIYA
  warehouse_available_volume_m3: number;
  warehouse_dispatched_volume_m3: number;
  warehouse_remaining_volume_m3: number;
  total_investment: number;
  realized_profit: number;
  unrealized_value: number;
  break_even_price_per_m3: number;
  // ESKI (Backward compatibility)
  currency: string;
  purchase_amount: number;
  remaining_quantity: number;
  remaining_volume_m3: number;
}

interface Vagon {
  _id: string;
  vagonCode: string;
  month: string;
  sending_place: string;
  receiving_place: string;
  status: string;
  // Yopilish ma'lumotlari
  closure_date?: string;
  closure_reason?: string;
  closure_notes?: string;
  // YANGI TERMINOLOGIYA
  total_volume_m3: number;
  total_loss_m3: number;
  available_volume_m3: number;
  sold_volume_m3: number;
  remaining_volume_m3: number;
  // Moliyaviy (backend field nomlari)
  usd_total_cost: number;
  usd_total_revenue: number;
  usd_profit: number;
  rub_total_cost: number;
  rub_total_revenue: number;
  rub_profit: number;
  // ESKI (Backward compatibility)
  total_investment_usd?: number;
  total_investment_rub?: number;
  realized_profit_usd?: number;
  realized_profit_rub?: number;
  unrealized_value_usd?: number;
  unrealized_value_rub?: number;
  total_purchase_usd?: number;
  total_purchase_rub?: number;
  total_expenses_usd?: number;
  total_expenses_rub?: number;
  total_revenue_usd?: number;
  total_revenue_rub?: number;
  profit_usd?: number;
  profit_rub?: number;
  lots: VagonLot[];
}

interface LotInput {
  _id?: string; // Tahrirlash uchun
  thickness: string;
  width: string;
  length: string;
  quantity: string;
  loss_volume_m3: string; // Brak hajmi (m³)
  loss_responsible_person: string; // Brak uchun javobgar shaxs
  loss_reason: string; // Brak sababi
  currency: string;
  purchase_amount: string;
}

export default function VagonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useDialog();
  
  // State management
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVagonId, setSelectedVagonId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVagon, setEditingVagon] = useState<Vagon | null>(null);

  // ⚡ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Debounced search
  const { searchValue, debouncedSearchValue, setSearchValue, clearSearch, isSearching } = useDebouncedSearch('', 300);

  // ⚡ OPTIMIZED: Pagination bilan data fetching
  const {
    data: vagonData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['vagons', statusFilter, monthFilter, debouncedSearchValue, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        includeLots: 'true'
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (monthFilter) params.append('month', monthFilter);
      if (debouncedSearchValue) params.append('search', debouncedSearchValue);
      
      const response = await axios.get(`/vagon?${params}`);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });

  const vagons = vagonData?.vagons || [];
  
  // Vagon ma'lumotlari
  const [vagonCode, setVagonCode] = useState('');
  const [month, setMonth] = useState('');
  const [sendingPlace, setSendingPlace] = useState('');
  const [receivingPlace, setReceivingPlace] = useState('');
  
  // Bugungi sanani avtomatik o'rnatish
  useEffect(() => {
    if (!month) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const monthNum = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setMonth(`${day}/${monthNum}/${year}`);
    }
  }, []);
  
  // Lotlar ro'yxati
  const [lots, setLots] = useState<LotInput[]>([
    { thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', currency: 'USD', purchase_amount: '' }
  ]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  const addLotRow = () => {
    setLots([...lots, { thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', currency: 'USD', purchase_amount: '' }]);
  };

  const removeLotRow = (index: number) => {
    if (lots.length > 1) {
      setLots(lots.filter((_, i) => i !== index));
    }
  };

  const updateLot = (index: number, field: keyof LotInput, value: string) => {
    const newLots = [...lots];
    newLots[index][field] = value;
    setLots(newLots);
  };

  const calculateLotVolume = (lot: LotInput): number => {
    const thickness = parseFloat(lot.thickness) || 0;
    const width = parseFloat(lot.width) || 0;
    const length = parseFloat(lot.length) || 0;
    const quantity = parseInt(lot.quantity) || 0;
    
    if (thickness && width && length && quantity) {
      // Hajm = (qalinlik_mm × eni_mm × uzunlik_m × soni) / 1,000,000
      return (thickness * width * length * quantity) / 1000000;
    }
    return 0;
  };

  const calculateTotalVolume = (): number => {
    return lots.reduce((sum, lot) => sum + calculateLotVolume(lot), 0);
  };

  // Xavfsiz raqam formatlash
  const safeToFixed = (value: any, decimals: number = 4): string => {
    const num = parseFloat(value) || 0;
    return num.toFixed(decimals);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ LOADING STATE BOSHLASH
    if (isSubmitting) return; // Double-click oldini olish
    setIsSubmitting(true);
    
    try {
      // Validatsiya - faqat to'liq to'ldirilgan lotlarni olish
      const validLots = lots.filter(lot => 
        lot.thickness && 
        lot.width && 
        lot.length && 
        lot.quantity && 
        lot.purchase_amount &&
        parseFloat(lot.thickness) > 0 &&
        parseFloat(lot.width) > 0 &&
        parseFloat(lot.length) > 0 &&
        parseInt(lot.quantity) > 0 &&
        parseFloat(lot.purchase_amount) > 0
      );
      
      if (validLots.length === 0 && !editingVagon) {
        showAlert({
          title: t.messages.error,
          message: t.messages.enterCompleteLotInfo,
          type: 'warning'
        });
        return;
      }
      
      const token = localStorage.getItem('token');
      
      if (editingVagon) {
        // TAHRIRLASH REJIMI
        // 1. Vagon ma'lumotlarini yangilash
        const vagonData = {
          month,
          sending_place: sendingPlace,
          receiving_place: receivingPlace
        };
        
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vagon/${editingVagon._id}`,
          vagonData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // 2. Lotlarni yangilash
        for (const lot of validLots) {
          const volume = calculateLotVolume(lot);
          
          const lotData = {
            dimensions: `${lot.thickness}×${lot.width}×${lot.length}`,
            quantity: parseInt(lot.quantity),
            volume_m3: volume,
            loss_volume_m3: parseFloat(lot.loss_volume_m3) || 0,
            loss_responsible_person: lot.loss_responsible_person || null,
            loss_reason: lot.loss_reason || null,
            loss_date: parseFloat(lot.loss_volume_m3) > 0 ? new Date() : null,
            purchase_currency: lot.currency,
            purchase_amount: parseFloat(lot.purchase_amount)
          };
          
          if (lot._id) {
            // Mavjud lotni yangilash
            await axios.put(
              `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-lot/${lot._id}`,
              lotData,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } else {
            // Yangi lot qo'shish
            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-lot`,
              { ...lotData, vagon: editingVagon._id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
        
        showAlert({
          title: t.messages.success,
          message: t.messages.vagonUpdated || 'Vagon muvaffaqiyatli yangilandi',
          type: 'success'
        });
      } else {
        // YANGI YARATISH REJIMI
        // 1. Vagon yaratish
        const vagonData = {
          vagonCode,
          month,
          sending_place: sendingPlace,
          receiving_place: receivingPlace
        };
        
        const vagonResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vagon`,
          vagonData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const vagonId = vagonResponse.data._id;
        
        // 2. Har bir lot uchun so'rov yuborish
        for (const lot of validLots) {
          // Hajmni hisoblash
          const volume = calculateLotVolume(lot);
          
          const lotData = {
            vagon: vagonId,
            dimensions: `${lot.thickness}×${lot.width}×${lot.length}`,
            quantity: parseInt(lot.quantity),
            volume_m3: volume,
            loss_volume_m3: parseFloat(lot.loss_volume_m3) || 0,
            loss_responsible_person: lot.loss_responsible_person || null,
            loss_reason: lot.loss_reason || null,
            loss_date: parseFloat(lot.loss_volume_m3) > 0 ? new Date() : null,
            purchase_currency: lot.currency,
            purchase_amount: parseFloat(lot.purchase_amount)
          };
          
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/vagon-lot`,
            lotData,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        showAlert({
          title: t.messages.success,
          message: t.messages.vagonAndLotsAdded,
          type: 'success'
        });
      }
      
      refetch();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || t.messages.errorOccurred,
        type: 'error'
      });
    } finally {
      // ✅ LOADING STATE TUGASHI
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setVagonCode('');
    setMonth('');
    setSendingPlace('');
    setReceivingPlace('');
    setLots([{ thickness: '', width: '', length: '', quantity: '', loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', currency: 'USD', purchase_amount: '' }]);
    setEditingVagon(null);
  };

  const openEditModal = (vagon: Vagon) => {
    setEditingVagon(vagon);
    setVagonCode(vagon.vagonCode);
    setMonth(vagon.month);
    setSendingPlace(vagon.sending_place);
    setReceivingPlace(vagon.receiving_place);
    
    // Lotlarni yuklash
    if (vagon.lots && vagon.lots.length > 0) {
      const loadedLots = vagon.lots.map(lot => {
        // dimensions formatidan o'lchamlarni ajratib olish: "31×125×6"
        const dims = lot.dimensions.split('×');
        return {
          _id: lot._id,
          thickness: dims[0] || '',
          width: dims[1] || '',
          length: dims[2] || '',
          quantity: lot.quantity.toString(),
          loss_volume_m3: (lot.loss_volume_m3 || 0).toString(),
          loss_responsible_person: lot.loss_responsible_person || '',
          loss_reason: lot.loss_reason || '',
          currency: lot.currency || 'USD',
          purchase_amount: (lot.purchase_amount || 0).toString()
        };
      });
      setLots(loadedLots);
    }
    
    setShowModal(true);
  };

  const closeVagon = async (vagonId: string, reason: string = 'manual_closure') => {
    const reasonText = {
      'manual_closure': t.vagon.closureReasons?.manualClosure || 'qo\'lda yopish',
      'business_decision': t.vagon.closureReasons?.businessDecision || 'biznes qaror',
      'fully_sold': t.vagon.closureReasons?.fullySold || 'to\'liq sotilgan',
      'remaining_too_small': t.vagonSale.remainingVolumeTooSmall
    }[reason] || reason;
    
    const confirmed = await showConfirm({
      title: t.vagon.forceClose,
      message: `${t.vagon.confirmCloseMessage || 'Rostdan ham bu vagonni yopmoqchimisiz?'}\n${t.messages.reason}: ${reasonText}`,
      type: 'warning',
      confirmText: t.common.yes,
      cancelText: t.common.no
    });
    
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vagon/${vagonId}/close`,
        { 
          reason: reason,
          notes: `Frontend orqali yopildi: ${reasonText}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Close vagon response:', response.data);
      
      showAlert({
        title: t.messages.success,
        message: `${t.messages.vagonSuccessfullyClosed}\n${t.messages.reason}: ${reasonText}`,
        type: 'success'
      });
      refetch();
    } catch (error: any) {
      console.error('Close vagon error:', error);
      console.error('Error response:', error.response?.data);
      
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || error.message || t.messages.errorOccurred,
        type: 'error'
      });
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'RUB': return '₽';
      default: return '';
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container-full-desktop space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          {/* Filter skeleton */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          <VagonTableSkeleton />
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
                      <Icon name="truck" className="h-7 w-7" />
                    </div>
                    {t.vagon.title}
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    Professional vagon boshqaruv tizimi
                  </p>
                  <p className="text-sm opacity-75">
                    Vagonlar, lotlar va hajm statistikasini kuzatib boring
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
                  {t.vagon.addVagon}
                </button>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Modern Filters */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <Icon name="filter" className="h-6 w-6 text-white" />
                </div>
                Filtrlar va Qidiruv
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.statusFilterLabel}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">{t.vagon.allStatuses}</option>
                    <option value="active">{t.vagon.activeVagon}</option>
                    <option value="closed">{t.vagon.closedVagon}</option>
                    <option value="archived">{t.vagon.archivedVagon}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.monthFilterLabel}</label>
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => {
                      setMonthFilter(e.target.value);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.searchLabel}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={t.vagon.searchPlaceholder}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                    {isSearching && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                    {searchValue && !isSearching && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Icon name="x" className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-gray-300 rounded"></div>
                    <div className="h-16 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : vagons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">
              <Icon name="package" className="w-16 h-16 mx-auto text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Vagonlar topilmadi</h3>
            <p className="text-gray-500">Yangi vagon qo'shish uchun yuqoridagi tugmani bosing</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {vagons.map((vagon: Vagon) => (
              <div key={vagon._id} className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{vagon.vagonCode}</h3>
                      <p className="text-sm opacity-90 mb-1">{vagon.month}</p>
                      <p className="text-sm opacity-90 flex items-center">
                        <Icon name="map-pin" className="h-4 w-4 mr-1" />
                        {vagon.sending_place} → {vagon.receiving_place}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{safeToFixed(vagon.total_volume_m3)} m³</div>
                      <div className="text-sm opacity-90">{t.vagon.totalVolumeLabel}</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Main Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors">
                      <div className="text-xl font-bold text-green-600" title="Barcha sotuvlar (dona va hajm) kub hisobida">
                        {safeToFixed(vagon.sold_volume_m3)} m³
                      </div>
                      <div className="text-sm text-gray-600">{t.vagon.soldLabel}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(vagon.total_volume_m3 || 0) > 0 ? `${safeToFixed(((vagon.sold_volume_m3 || 0) / (vagon.total_volume_m3 || 1)) * 100, 1)}%` : '0%'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors">
                      <div className="text-xl font-bold text-purple-600">{safeToFixed(vagon.remaining_volume_m3)} m³</div>
                      <div className="text-sm text-gray-600">{t.vagon.remainingLabel}</div>
                    </div>
                  </div>

                  {/* Lot Information */}
                  <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700">{t.vagon.lots}:</span>
                    <span className="font-bold text-gray-900">{vagon.lots?.length || 0} ta</span>
                  </div>

                  {/* Financial Information */}
                  <div className="space-y-3 mb-6">
                    {(vagon.usd_total_cost || 0) > 0 && (
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-700">USD {t.vagon.vagonDetailsModal.profitLabel}</span>
                        <span className={`font-bold ${(vagon.usd_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${(vagon.usd_profit || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {(vagon.rub_total_cost || 0) > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-700">RUB {t.vagon.vagonDetailsModal.profitLabel}</span>
                        <span className={`font-bold ${(vagon.rub_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₽{(vagon.rub_profit || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-semibold text-gray-700">{t.common.status}:</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      vagon.status === 'active' ? 'bg-green-100 text-green-700' : 
                      vagon.status === 'closed' ? 'bg-red-100 text-red-700' :
                      vagon.status === 'closing' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {vagon.status === 'active' ? t.vagon.activeVagon : 
                       vagon.status === 'closed' ? t.vagon.closedVagon :
                       vagon.status === 'closing' ? t.vagon.closingStatus : vagon.status}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setSelectedVagonId(vagon._id);
                        setShowDetailsModal(true);
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm font-semibold flex items-center justify-center"
                    >
                      <Icon name="eye" className="mr-2 h-4 w-4" />
                      <span>{t.vagon.details}</span>
                    </button>
                    {vagon.status !== 'closed' && vagon.status !== 'archived' && (
                      <button
                        onClick={() => openEditModal(vagon)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 text-sm font-semibold flex items-center justify-center"
                      >
                        <Icon name="edit" className="mr-2 h-4 w-4" />
                        <span>{t.vagon.edit}</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600"></div>
              </div>
            ))}
          </div>

          {/* ⚡ PAGINATION COMPONENT */}
          {vagonData?.pagination && vagonData.pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={vagonData.pagination.currentPage}
                totalPages={vagonData.pagination.totalPages}
                totalItems={vagonData.pagination.totalItems}
                itemsPerPage={vagonData.pagination.itemsPerPage}
                hasNextPage={vagonData.pagination.hasNextPage}
                hasPrevPage={vagonData.pagination.hasPrevPage}
                onPageChange={(page) => setCurrentPage(page)}
                onLimitChange={(limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1); // Reset to first page
                }}
                showLimitSelector={true}
                className="bg-white rounded-2xl shadow-lg p-6"
              />
            </div>
          )}
        </>
        )}
      </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
                    <Icon name="truck" className="h-7 w-7 text-white" />
                  </div>
                  {editingVagon ? t.vagon.vagonModal.editVagonTitle : t.vagon.vagonModal.newVagonTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-3 rounded-xl hover:bg-gray-100 group"
                  aria-label={t.vagon.vagonModal.closeButton}
                >
                  <Icon name="x" className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                {/* Vagon ma'lumotlari */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl mb-8 border border-blue-200">
                  <h3 className="font-bold text-xl mb-6 flex items-center text-blue-900">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <Icon name="info" className="h-5 w-5 text-white" />
                    </div>
                    {t.vagon.vagonModal.vagonInfoSection}
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.vagonCodeLabel}</label>
                      <input
                        type="text"
                        required
                        value={vagonCode}
                        onChange={(e) => setVagonCode(e.target.value)}
                        placeholder={t.vagon.vagonModal.vagonCodePlaceholder}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        disabled={!!editingVagon}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.monthLabel}</label>
                      <input
                        type="text"
                        required
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        placeholder={t.vagon.vagonModal.monthPlaceholder}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.sendingPlace}</label>
                      <input
                        type="text"
                        required
                        value={sendingPlace}
                        onChange={(e) => setSendingPlace(e.target.value)}
                        placeholder={t.vagon.vagonModal.sendingPlacePlaceholder}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">{t.vagon.receivingPlace}</label>
                      <input
                        type="text"
                        required
                        value={receivingPlace}
                        onChange={(e) => setReceivingPlace(e.target.value)}
                        placeholder={t.vagon.vagonModal.receivingPlacePlaceholder}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                  {editingVagon && (
                    <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-xl text-sm text-blue-800">
                      <Icon name="info" className="inline mr-2 h-4 w-4" />
                      {t.vagon.vagonModal.editInfoMessage}
                    </div>
                  )}
                </div>

                {/* Lotlar - yangi vagon yaratishda va tahrirlashda */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                          <Icon name="package" className="h-6 w-6 text-white" />
                        </div>
                        {t.vagon.vagonModal.lotsSection}
                      </h3>
                      <div className="text-right bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 rounded-2xl border-2 border-orange-200">
                        <div className="text-3xl font-bold text-orange-600">
                          {safeToFixed(calculateTotalVolume())} m³
                        </div>
                        <div className="text-sm text-gray-600 font-semibold">{t.vagon.totalVolumeLabel}</div>
                      </div>
                    </div>

                  <div className="space-y-6">
                    {lots.map((lot, index) => (
                      <div key={index} className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-lg">{index + 1}</span>
                            </div>
                            <div className="font-bold text-xl text-blue-900">{t.vagon.vagonModal.lotNumber} {index + 1}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right bg-white px-6 py-3 rounded-xl shadow-sm border-2 border-orange-200">
                              <div className="text-2xl font-bold text-orange-600">
                                {safeToFixed(calculateLotVolume(lot))} m³
                              </div>
                              <div className="text-xs text-gray-500 font-semibold mt-1">
                                {lot.quantity && calculateLotVolume(lot) > 0 ? `1m³ = ${safeToFixed(parseInt(lot.quantity) / calculateLotVolume(lot), 0)} ${t.vagon.pieces}` : 'Hajm'}
                              </div>
                            </div>
                            {lots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLotRow(index)}
                                className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-3 rounded-xl transition-all duration-200"
                                title="Lotni o'chirish"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">{t.vagon.thickness} (mm)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={lot.thickness}
                              onChange={(e) => updateLot(index, 'thickness', e.target.value)}
                              placeholder={t.vagon.vagonModal.thicknessPlaceholder}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">{t.vagon.width} (mm)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={lot.width}
                              onChange={(e) => updateLot(index, 'width', e.target.value)}
                              placeholder={t.vagon.vagonModal.widthPlaceholder}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">{t.vagon.length} (m)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={lot.length}
                              onChange={(e) => updateLot(index, 'length', e.target.value)}
                              placeholder={t.vagon.vagonModal.lengthPlaceholder}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">{t.vagon.quantity} (dona)</label>
                            <input
                              type="number"
                              value={lot.quantity}
                              onChange={(e) => updateLot(index, 'quantity', e.target.value)}
                              placeholder={t.vagon.vagonModal.quantityPlaceholder}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-red-600 mb-2">{t.vagon.brakVolume} (m³)</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={lot.loss_volume_m3}
                              onChange={(e) => updateLot(index, 'loss_volume_m3', e.target.value)}
                              placeholder={t.vagon.vagonModal.brakVolumePlaceholder}
                              className="w-full px-3 py-3 border-2 border-red-300 rounded-xl text-center font-bold text-lg text-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">{t.vagon.vagonCurrency}</label>
                            <select
                              value={lot.currency}
                              onChange={(e) => updateLot(index, 'currency', e.target.value)}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            >
                              <option value="USD">USD $</option>
                              <option value="RUB">RUB ₽</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2">{t.vagon.price}</label>
                            <input
                              type="number"
                              step="0.01"
                              value={lot.purchase_amount}
                              onChange={(e) => updateLot(index, 'purchase_amount', e.target.value)}
                              placeholder={t.vagon.vagonModal.pricePlaceholder}
                              className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                          </div>
                        </div>
                        
                        {/* Brak ma'lumotlari (agar brak mavjud bo'lsa) */}
                        {parseFloat(lot.loss_volume_m3) > 0 && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl">
                            <h5 className="text-sm font-bold text-red-700 mb-3 flex items-center">
                              <Icon name="alert-triangle" className="h-4 w-4 mr-2" />
                              {t.vagon.vagonModal.brakInfoSection}
                            </h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-red-600 mb-2">{t.vagon.responsiblePerson}</label>
                                <input
                                  type="text"
                                  value={lot.loss_responsible_person}
                                  onChange={(e) => updateLot(index, 'loss_responsible_person', e.target.value)}
                                  placeholder={t.vagon.vagonModal.responsiblePersonPlaceholder}
                                  className="w-full px-3 py-2 border-2 border-red-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-red-600 mb-2">{t.vagon.brakReasonLabel}</label>
                                <input
                                  type="text"
                                  value={lot.loss_reason}
                                  onChange={(e) => updateLot(index, 'loss_reason', e.target.value)}
                                  placeholder={t.vagon.vagonModal.brakReasonPlaceholder}
                                  className="w-full px-3 py-2 border-2 border-red-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addLotRow}
                    className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center"
                  >
                    <Icon name="plus" className="mr-3 h-5 w-5" />
                    {t.vagon.vagonModal.addLotButton}
                  </button>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-300 font-bold text-lg transition-all duration-200"
                  >
                    {t.vagon.vagonModal.cancelButton}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-6 py-4 rounded-xl transition-all duration-200 flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-xl ${
                      isSubmitting
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.vagon.vagonModal.loadingText}...
                      </>
                    ) : (
                      <>
                        <Icon name="save" className="mr-3 h-5 w-5" />
                        {t.vagon.vagonModal.saveButton}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Vagon Details Modal */}
        {showDetailsModal && selectedVagonId && (
          <VagonDetailsModal
            vagonId={selectedVagonId}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedVagonId(null);
            }}
          />
        )}

      </div>
    </Layout>
  );
}
