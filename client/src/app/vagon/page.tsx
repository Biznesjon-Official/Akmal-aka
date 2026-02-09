'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import VagonDetailsModal from '@/components/vagon/VagonDetailsModal';
import Pagination from '@/components/ui/Pagination';
import Icon from '@/components/Icon';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { useScrollLock } from '@/hooks/useScrollLock';
import axios from '@/lib/axios';

// Constants
const QUERY_STALE_TIME = 30000; // 30 seconds
const QUERY_CACHE_TIME = 300000; // 5 minutes
const DEFAULT_ITEMS_PER_PAGE = 12;
const SEARCH_DEBOUNCE_DELAY = 300;

interface VagonYogoch {
  _id: string;
  name?: string; // Yog'och nomi
  dimensions: string;
  quantity: number;
  volume_m3: number;
  loss_volume_m3: number;
  loss_responsible_person?: string;
  loss_reason?: string;
  loss_date?: string;
  warehouse_available_volume_m3: number;
  warehouse_dispatched_volume_m3: number;
  warehouse_remaining_volume_m3: number;
  total_investment: number;
  realized_profit: number;
  unrealized_value: number;
  break_even_price_per_m3: number;
  currency: string;
  purchase_amount: number;
  remaining_quantity: number;
  remaining_volume_m3: number;
  recommended_sale_price_per_m3?: number; // Tavsiya etilgan sotuv narxi
}

interface Vagon {
  _id: string;
  vagonCode: string;
  month: string;
  sending_place: string;
  receiving_place: string;
  status: string;
  closure_date?: string;
  closure_reason?: string;
  closure_notes?: string;
  total_volume_m3: number;
  total_loss_m3: number;
  available_volume_m3: number;
  sold_volume_m3: number;
  remaining_volume_m3: number;
  usd_total_cost: number;
  usd_total_revenue: number;
  usd_profit: number;
  rub_total_cost: number;
  rub_total_revenue: number;
  rub_profit: number;
  lots: VagonYogoch[];
}

interface YogochInput {
  _id?: string;
  name?: string; // Yangi field - yog'och nomi
  thickness: string;
  width: string;
  length: string;
  quantity: string;
  loss_volume_m3: string;
  loss_responsible_person: string;
  loss_reason: string;
  currency: string;
  purchase_amount: string;
  recommended_sale_price_per_m3: string; // YANGI: Tavsiya etilgan sotuv narxi
}

// VagonCard Component
interface VagonCardProps {
  vagon: Vagon;
  onEdit: (vagon: Vagon) => void;
  onDelete: (id: string, code: string) => void;
  onClose: (id: string, reason: string) => void;
  onViewDetails: (id: string) => void;
  user: any;
  t: any;
  safeToFixed: (value: any, decimals?: number) => string;
  calculatePercentage: (sold: number, total: number) => string;
}

const VagonCard: React.FC<VagonCardProps> = ({ 
  vagon, 
  onEdit, 
  onDelete, 
  onClose, 
  onViewDetails, 
  user, 
  t, 
  safeToFixed, 
  calculatePercentage 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      case 'closing': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'closed': return 'Yopilgan';
      case 'closing': return 'Yopilmoqda';
      default: return status;
    }
  };

  const soldPercentage = calculatePercentage(vagon.sold_volume_m3 || 0, vagon.total_volume_m3 || 0);

  return (
    <div className="group relative overflow-hidden bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(vagon.status)}`}>
          {getStatusText(vagon.status)}
        </span>
      </div>

      {/* Header with Gradient */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white p-6 pb-8">
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                <Icon name="truck" className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">{vagon.vagonCode}</h3>
                <p className="text-sm opacity-90">{vagon.month}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{safeToFixed(vagon.total_volume_m3, 1)} m³</div>
              <div className="text-xs opacity-90">Jami hajm</div>
            </div>
          </div>
          
          <div className="flex items-center text-sm opacity-90">
            <Icon name="map-pin" className="h-4 w-4 mr-2" />
            <span className="truncate">{vagon.sending_place} → {vagon.receiving_place}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-gray-600">Sotish jarayoni</span>
            <span className="text-indigo-600">{soldPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(parseFloat(soldPercentage), 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-100">
            <div className="flex items-center mb-2">
              <Icon name="check-circle" className="h-5 w-5 text-emerald-600 mr-2" />
              <span className="text-sm font-semibold text-gray-700">Sotilgan</span>
            </div>
            <div className="text-xl font-bold text-emerald-700">
              {safeToFixed(vagon.sold_volume_m3, 1)} m³
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-center mb-2">
              <Icon name="package" className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-semibold text-gray-700">Qolgan</span>
            </div>
            <div className="text-xl font-bold text-purple-700">
              {safeToFixed(vagon.remaining_volume_m3, 1)} m³
            </div>
          </div>
        </div>

        {/* Yog'ochlar Info */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Icon name="layers" className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-sm font-semibold text-gray-700">Yog'ochlar</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{vagon.lots?.length || 0} ta</span>
          </div>
        </div>

        {/* Financial Info */}
        {((vagon.usd_total_cost || 0) > 0 || (vagon.rub_total_cost || 0) > 0) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
              <Icon name="dollar-sign" className="h-4 w-4 mr-2" />
              Moliyaviy ko'rsatkichlar
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {(vagon.usd_total_cost || 0) > 0 && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-sm font-medium text-gray-700">USD foyda</span>
                  <span className={`font-bold ${(vagon.usd_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${safeToFixed(vagon.usd_profit || 0, 0)}
                  </span>
                </div>
              )}
              {(vagon.rub_total_cost || 0) > 0 && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-sm font-medium text-gray-700">RUB foyda</span>
                  <span className={`font-bold ${(vagon.rub_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₽{safeToFixed(vagon.rub_profit || 0, 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onViewDetails(vagon._id)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 text-sm font-semibold flex items-center justify-center group"
            >
              <Icon name="eye" className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Batafsil
            </button>
            
            {vagon.status !== 'closed' && vagon.status !== 'archived' && (
              <button
                onClick={() => onEdit(vagon)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-2xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 text-sm font-semibold flex items-center justify-center group"
              >
                <Icon name="edit" className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Tahrirlash
              </button>
            )}
          </div>
          
          {/* Secondary Actions */}
          {(vagon.status === 'active' || (user?.role === 'admin' && (vagon.sold_volume_m3 || 0) === 0)) && (
            <div className="grid grid-cols-2 gap-3">
              {vagon.status === 'active' && (
                <button
                  onClick={() => onClose(vagon._id, 'manual_closure')}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-3 rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-300 text-xs font-semibold flex items-center justify-center"
                >
                  <Icon name="x-circle" className="mr-1 h-3 w-3" />
                  Yopish
                </button>
              )}
              
              {user?.role === 'admin' && vagon.status !== 'closed' && (vagon.sold_volume_m3 || 0) === 0 && (
                <button
                  onClick={() => onDelete(vagon._id, vagon.vagonCode)}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 text-xs font-semibold flex items-center justify-center"
                >
                  <Icon name="trash" className="mr-1 h-3 w-3" />
                  O'chirish
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600"></div>
    </div>
  );
};

export default function VagonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useDialog();
  const queryClient = useQueryClient(); // CRITICAL FIX: Add queryClient hook
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVagonId, setSelectedVagonId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVagon, setEditingVagon] = useState<Vagon | null>(null);

  useScrollLock(showModal);

  const [currentPage, setCurrentPage] = useState(1);

  const { searchValue, debouncedSearchValue, setSearchValue, clearSearch, isSearching } = useDebouncedSearch('', SEARCH_DEBOUNCE_DELAY);

  const {
    data: vagonData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['vagons', statusFilter, monthFilter, debouncedSearchValue, currentPage, DEFAULT_ITEMS_PER_PAGE],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: DEFAULT_ITEMS_PER_PAGE.toString(),
        includeLots: 'true'
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (monthFilter) params.append('month', monthFilter);
      if (debouncedSearchValue) params.append('search', debouncedSearchValue);
      
      const response = await axios.get(`/vagon?${params}`);
      return response.data;
    },
    staleTime: QUERY_STALE_TIME,
    gcTime: QUERY_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const vagons = vagonData?.vagons || [];
  
  const [vagonCode, setVagonCode] = useState(''); // Yangi state
  const [month, setMonth] = useState('');
  const [sendingPlace, setSendingPlace] = useState('');
  const [receivingPlace, setReceivingPlace] = useState('');
  
  useEffect(() => {
    if (!month) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const monthNum = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setMonth(`${day}/${monthNum}/${year}`);
    }
  }, []);
  
  const [yogochlar, setYogochlar] = useState<YogochInput[]>([]);
  const [currentYogoch, setCurrentYogoch] = useState<YogochInput>({
    name: '', thickness: '', width: '', length: '', quantity: '', 
    loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', 
    currency: 'USD', purchase_amount: '', recommended_sale_price_per_m3: ''
  });
  const [isAddingYogoch, setIsAddingYogoch] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  const calculateYogochVolume = useCallback((yogoch: YogochInput): number => {
    const thickness = parseFloat(yogoch.thickness) || 0;
    const width = parseFloat(yogoch.width) || 0;
    const length = parseFloat(yogoch.length) || 0;
    const quantity = parseInt(yogoch.quantity) || 0;
    
    if (thickness && width && length && quantity) {
      return (thickness * width * length * quantity) / 1000000;
    }
    return 0;
  }, []);

  const calculatePercentage = useCallback((sold: number, total: number): string => {
    return total > 0 ? ((sold / total) * 100).toFixed(1) : '0';
  }, []);

  const safeToFixed = (value: any, decimals: number = 2): string => {
    const num = parseFloat(value) || 0;
    return num.toFixed(decimals);
  };

  const addYogochRow = useCallback(() => {
    setIsAddingYogoch(true);
    setCurrentYogoch({
      name: '', thickness: '', width: '', length: '', quantity: '', 
      loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', 
      currency: 'USD', purchase_amount: '', recommended_sale_price_per_m3: ''
    });
  }, []);

  const saveCurrentYogoch = useCallback(() => {
    // Validate current yogoch
    if (!currentYogoch.name?.trim() || !currentYogoch.thickness || !currentYogoch.width || 
        !currentYogoch.length || !currentYogoch.quantity || !currentYogoch.purchase_amount) {
      showAlert({
        title: 'Xatolik',
        message: 'Barcha majburiy maydonlarni to\'ldiring',
        type: 'warning'
      });
      return;
    }

    const volume = calculateYogochVolume(currentYogoch);
    if (volume <= 0) {
      showAlert({
        title: 'Xatolik',
        message: 'Yog\'och hajmi 0 dan katta bo\'lishi kerak',
        type: 'warning'
      });
      return;
    }

    // Add to yogochlar list
    setYogochlar(prev => [...prev, { ...currentYogoch }]);
    
    // Reset form
    setCurrentYogoch({
      name: '', thickness: '', width: '', length: '', quantity: '', 
      loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', 
      currency: 'USD', purchase_amount: '', recommended_sale_price_per_m3: ''
    });
    setIsAddingYogoch(false);

    showAlert({
      title: 'Muvaffaqiyat',
      message: 'Yog\'och muvaffaqiyatli qo\'shildi',
      type: 'success'
    });
  }, [currentYogoch, calculateYogochVolume, showAlert]);

  const cancelAddingYogoch = useCallback(() => {
    setCurrentYogoch({
      name: '', thickness: '', width: '', length: '', quantity: '', 
      loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', 
      currency: 'USD', purchase_amount: '', recommended_sale_price_per_m3: ''
    });
    setIsAddingYogoch(false);
  }, []);

  const removeYogochRow = useCallback((index: number) => {
    setYogochlar(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateCurrentYogoch = useCallback((field: keyof YogochInput, value: string) => {
    setCurrentYogoch(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Check if we have yogochlar
    if (yogochlar.length === 0 && !editingVagon) {
      showAlert({
        title: 'Xatolik',
        message: 'Kamida bitta yog\'och qo\'shing',
        type: 'warning'
      });
      return;
    }
    
    // Vagon kodi validatsiyasi (faqat yangi vagon uchun)
    if (!editingVagon && vagonCode.trim() && vagonCode.trim().length < 3) {
      showAlert({
        title: 'Xatolik',
        message: 'Vagon kodi kamida 3 belgi bo\'lishi kerak yoki bo\'sh qoldiring',
        type: 'warning'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingVagon) {
        // Update existing vagon
        const vagonData = {
          month,
          sending_place: sendingPlace,
          receiving_place: receivingPlace
        };
        
        await axios.put(
          `/vagon/${editingVagon._id}`,
          vagonData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Update yogochlar
        for (const yogoch of yogochlar) {
          const volume = calculateYogochVolume(yogoch);
          
          const yogochData = {
            name: yogoch.name || undefined,
            dimensions: `${yogoch.thickness}×${yogoch.width}×${yogoch.length}`,
            quantity: parseInt(yogoch.quantity),
            volume_m3: volume,
            loss_volume_m3: parseFloat(yogoch.loss_volume_m3) || 0,
            loss_responsible_person: yogoch.loss_responsible_person || null,
            loss_reason: yogoch.loss_reason || null,
            loss_date: parseFloat(yogoch.loss_volume_m3) > 0 ? new Date() : null,
            purchase_currency: yogoch.currency,
            purchase_amount: parseFloat(yogoch.purchase_amount),
            recommended_sale_price_per_m3: parseFloat(yogoch.recommended_sale_price_per_m3) || 0 // YANGI
          };
          
          if (yogoch._id) {
            await axios.put(
              `/vagon-lot/${yogoch._id}`,
              yogochData,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } else {
            await axios.post(
              `/vagon-lot`,
              { ...yogochData, vagon: editingVagon._id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
        
        showAlert({
          title: 'Muvaffaqiyat',
          message: 'Vagon muvaffaqiyatli yangilandi',
          type: 'success'
        });
      } else {
        // Create new vagon
        const vagonData = {
          vagonCode: vagonCode.trim() || undefined, // Qo'lda kiritilgan kod yoki undefined
          month,
          sending_place: sendingPlace,
          receiving_place: receivingPlace
        };
        
        const vagonResponse = await axios.post(
          `/vagon`,
          vagonData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const vagonId = vagonResponse.data._id;
        
        // Create all yogochlar
        for (const yogoch of yogochlar) {
          const volume = calculateYogochVolume(yogoch);
          
          const yogochData = {
            vagon: vagonId,
            name: yogoch.name || undefined,
            dimensions: `${yogoch.thickness}×${yogoch.width}×${yogoch.length}`,
            quantity: parseInt(yogoch.quantity),
            volume_m3: volume,
            loss_volume_m3: parseFloat(yogoch.loss_volume_m3) || 0,
            loss_responsible_person: yogoch.loss_responsible_person || null,
            loss_reason: yogoch.loss_reason || null,
            loss_date: parseFloat(yogoch.loss_volume_m3) > 0 ? new Date() : null,
            purchase_currency: yogoch.currency,
            purchase_amount: parseFloat(yogoch.purchase_amount),
            recommended_sale_price_per_m3: parseFloat(yogoch.recommended_sale_price_per_m3) || 0 // YANGI
          };
          
          await axios.post(
            `/vagon-lot`,
            yogochData,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        showAlert({
          title: 'Muvaffaqiyat',
          message: `Vagon va ${yogochlar.length} ta yog'och muvaffaqiyatli saqlandi`,
          type: 'success'
        });
      }
      
      refetch();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      showAlert({
        title: 'Xatolik',
        message: error.response?.data?.message || 'Xatolik yuz berdi',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setVagonCode(''); // Yangi field reset
    setMonth('');
    setSendingPlace('');
    setReceivingPlace('');
    setYogochlar([]);
    setCurrentYogoch({
      name: '', thickness: '', width: '', length: '', quantity: '', 
      loss_volume_m3: '0', loss_responsible_person: '', loss_reason: '', 
      currency: 'USD', purchase_amount: '', recommended_sale_price_per_m3: ''
    });
    setIsAddingYogoch(false);
    setEditingVagon(null);
  };

  const openEditModal = (vagon: Vagon) => {
    setEditingVagon(vagon);
    setMonth(vagon.month);
    setSendingPlace(vagon.sending_place);
    setReceivingPlace(vagon.receiving_place);
    
    if (vagon.lots && vagon.lots.length > 0) {
      const loadedYogochlar: YogochInput[] = vagon.lots.map(yogoch => {
        const dims = yogoch.dimensions.split('×');
        return {
          _id: yogoch._id,
          name: yogoch.name || '',
          thickness: dims[0] || '',
          width: dims[1] || '',
          length: dims[2] || '',
          quantity: yogoch.quantity.toString(),
          loss_volume_m3: (yogoch.loss_volume_m3 || 0).toString(),
          loss_responsible_person: yogoch.loss_responsible_person || '',
          loss_reason: yogoch.loss_reason || '',
          currency: yogoch.currency || 'USD',
          purchase_amount: (yogoch.purchase_amount || 0).toString(),
          recommended_sale_price_per_m3: (yogoch.recommended_sale_price_per_m3 || 0).toString()
        };
      });
      setYogochlar(loadedYogochlar);
    } else {
      setYogochlar([]);
    }
    
    setIsAddingYogoch(false);
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
      await axios.patch(
        `/vagon/${vagonId}/close`,
        { 
          reason: reason,
          notes: `Frontend orqali yopildi: ${reasonText}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showAlert({
        title: t.messages.success,
        message: `${t.messages.vagonSuccessfullyClosed}\n${t.messages.reason}: ${reasonText}`,
        type: 'success'
      });
      refetch();
    } catch (error: any) {
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || error.message || t.messages.errorOccurred,
        type: 'error'
      });
    }
  };

  const deleteVagon = async (vagonId: string, vagonCode: string) => {
    const confirmed = await showConfirm({
      title: 'Vagonni o\'chirish',
      message: `Rostdan ham "${vagonCode}" vagonini o'chirmoqchimisiz?\n\n⚠️ DIQQAT: Bu amal qaytarib bo'lmaydi!\n\n• Vagon va uning barcha yog'ochlari o'chiriladi\n• Faqat sotilmagan vagonlarni o'chirish mumkin\n• Barcha ma'lumotlar doimiy ravishda o'chiriladi`,
      type: 'danger',
      confirmText: 'Ha, o\'chirish',
      cancelText: 'Bekor qilish'
    });
    
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // CRITICAL FIX: Optimistic update - remove from UI immediately
      queryClient.setQueryData(
        ['vagons', statusFilter, monthFilter, debouncedSearchValue, currentPage, DEFAULT_ITEMS_PER_PAGE],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            vagons: oldData.vagons.filter((v: any) => v._id !== vagonId)
          };
        }
      );
      
      await axios.delete(
        `/vagon/${vagonId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // CRITICAL FIX: Invalidate all vagon-related queries
      await queryClient.invalidateQueries({ queryKey: ['vagons'] });
      await queryClient.invalidateQueries({ queryKey: ['vagon', vagonId] });
      
      showAlert({
        title: t.messages.success,
        message: `"${vagonCode}" vagoni va uning barcha yog'ochlari muvaffaqiyatli o'chirildi`,
        type: 'success'
      });
      
    } catch (error: any) {
      // CRITICAL FIX: Revert optimistic update on error
      await queryClient.invalidateQueries({ queryKey: ['vagons'] });
      
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || error.message || t.messages.errorOccurred,
        type: 'error'
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
          <div className="space-y-8">
            <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
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
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700">
          <div className="absolute inset-0 bg-black/5"></div>
          
          <div className="relative px-6 py-16">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-6 shadow-lg">
                      <Icon name="truck" className="h-9 w-9 text-white" />
                    </div>
                    <div>
                      <h1 className="text-5xl lg:text-6xl font-bold text-white mb-2">
                        {t.vagon.title}
                      </h1>
                      <p className="text-xl text-white/90">
                        Professional vagon management system
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-white">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">{vagons.length}</div>
                      <div className="text-sm opacity-90">Jami vagonlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-2xl font-bold">
                        {vagons.reduce((sum: number, v: Vagon) => sum + (v.lots?.length || 0), 0)}
                      </div>
                      <div className="text-sm opacity-90">Jami yog'ochlar</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {safeToFixed(vagons.reduce((sum: number, v: Vagon) => sum + (v.total_volume_m3 || 0), 0), 1)} m³
                      </div>
                      <div className="text-sm opacity-90">Jami hajm</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <div className="text-xl font-bold">
                        {safeToFixed(vagons.reduce((sum: number, v: Vagon) => sum + (v.sold_volume_m3 || 0), 0), 1)} m³
                      </div>
                      <div className="text-sm opacity-90">Sotilgan</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => {
                      resetForm();
                      setShowModal(true);
                    }}
                    className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl hover:bg-white/30 flex items-center justify-center shadow-lg transition-all duration-300 font-semibold text-lg group"
                  >
                    <Icon name="plus" className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
                    {t.vagon.addVagon}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Enhanced Filters */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                  <Icon name="filter" className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Qidirish va filtrlash</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Qidirish</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Icon name="search" className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder="Vagon kodi, jo'natish yoki qabul qilish joyi..."
                      className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    />
                    {isSearching && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
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
                
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Holat</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="">Barcha holatlar</option>
                    <option value="active">Faol</option>
                    <option value="closed">Yopilgan</option>
                    <option value="archived">Arxivlangan</option>
                  </select>
                </div>
                
                {/* Month Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Oy</label>
                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {vagons.length === 0 ? (
            <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Icon name="package" className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-3xl font-bold text-gray-700 mb-4">Vagonlar topilmadi</h3>
              <p className="text-gray-500 text-lg mb-8">Yangi vagon qo'shish uchun yuqoridagi tugmani bosing</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold text-lg flex items-center mx-auto"
              >
                <Icon name="plus" className="mr-3 h-6 w-6" />
                Birinchi vagonni qo'shish
              </button>
            </div>
          ) : (
            <>
              {/* Vagon Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {vagons.map((vagon: Vagon) => (
                  <VagonCard 
                    key={vagon._id} 
                    vagon={vagon} 
                    onEdit={openEditModal}
                    onDelete={deleteVagon}
                    onClose={closeVagon}
                    onViewDetails={(id) => {
                      setSelectedVagonId(id);
                      setShowDetailsModal(true);
                    }}
                    user={user}
                    t={t}
                    safeToFixed={safeToFixed}
                    calculatePercentage={calculatePercentage}
                  />
                ))}
              </div>

              {/* Pagination */}
              {vagonData?.pagination && vagonData.pagination.totalPages > 1 && (
                <div className="mt-12">
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                    <Pagination
                      currentPage={vagonData.pagination.currentPage}
                      totalPages={vagonData.pagination.totalPages}
                      totalItems={vagonData.pagination.totalItems}
                      itemsPerPage={vagonData.pagination.itemsPerPage}
                      hasNextPage={vagonData.pagination.hasNextPage}
                      hasPrevPage={vagonData.pagination.hasPrevPage}
                      onPageChange={(page: number) => setCurrentPage(page)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedVagonId && (
        <VagonDetailsModal
          vagonId={selectedVagonId}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedVagonId(null);
          }}
          onVagonUpdated={() => {
            refetch();
          }}
        />
      )}

      {/* Compact Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl w-full max-w-4xl my-8 shadow-2xl border border-white/20">
              {/* Compact Modal Header */}
              <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white p-6 rounded-t-3xl">
                <div className="absolute inset-0 bg-black/10 rounded-t-3xl"></div>
                
                <div className="relative flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4">
                      <Icon name={editingVagon ? "edit" : "plus"} className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        {editingVagon ? 'Vagonni tahrirlash' : 'Yangi vagon yaratish'}
                      </h2>
                      <p className="text-white/80 text-sm">
                        {editingVagon ? 'Ma\'lumotlarni yangilang' : 'Vagon va yog\'ochlar ma\'lumotlari'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-300"
                  >
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Compact Modal Content */}
              <div className="p-6 space-y-6">
                {/* Vagon Information - Compact */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                    <Icon name="truck" className="h-5 w-5 mr-2" />
                    Vagon ma'lumotlari
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Vagon kodi 
                        <span className="text-xs text-gray-500 ml-1">(ixtiyoriy)</span>
                      </label>
                      {editingVagon ? (
                        <input
                          type="text"
                          value={editingVagon.vagonCode}
                          className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 font-semibold"
                          disabled
                        />
                      ) : (
                        <input
                          type="text"
                          value={vagonCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            // Faqat harf, raqam, tire va pastki chiziq ruxsat etiladi
                            const cleanValue = value.replace(/[^A-Z0-9\-_]/g, '');
                            setVagonCode(cleanValue);
                          }}
                          placeholder="Masalan: VAG-2025-MAXSUS yoki bo'sh qoldiring"
                          className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                          maxLength={20}
                        />
                      )}
                      {!editingVagon && (
                        <div className="text-xs mt-1">
                          {vagonCode.length > 0 ? (
                            vagonCode.length < 3 ? (
                              <p className="text-red-500">Kamida 3 belgi bo'lishi kerak</p>
                            ) : (
                              <p className="text-green-600">✓ To'g'ri format</p>
                            )
                          ) : (
                            <p className="text-gray-500">Bo'sh qoldirsangiz avtomatik yaratiladi (VAG-2026-XXX)</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Sana</label>
                      <input
                        type="date"
                        value={month ? new Date(month.split('/').reverse().join('-')).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const date = new Date(e.target.value);
                            const day = String(date.getDate()).padStart(2, '0');
                            const monthNum = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            setMonth(`${day}/${monthNum}/${year}`);
                          } else {
                            setMonth('');
                          }
                        }}
                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Jo'natish joyi</label>
                      <input
                        type="text"
                        value={sendingPlace}
                        onChange={(e) => setSendingPlace(e.target.value)}
                        placeholder="Moskva"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Qabul qilish joyi</label>
                      <input
                        type="text"
                        value={receivingPlace}
                        onChange={(e) => setReceivingPlace(e.target.value)}
                        placeholder="Toshkent"
                        className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Yog'ochlar Section - Compact */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-purple-900 flex items-center">
                      <Icon name="package" className="h-5 w-5 mr-2" />
                      Yog'ochlar ({yogochlar.length} ta)
                    </h3>
                    {!isAddingYogoch && (
                      <button
                        type="button"
                        onClick={addYogochRow}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 text-sm font-semibold flex items-center"
                      >
                        <Icon name="plus" className="mr-2 h-4 w-4" />
                        Yog'och qo'shish
                      </button>
                    )}
                  </div>

                  {/* Added Yogochlar List */}
                  {yogochlar.length > 0 && (
                    <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                      {yogochlar.map((yogoch, index) => (
                        <div key={index} className="bg-white/80 rounded-xl p-3 border border-purple-200 flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-semibold text-purple-900">{yogoch.name}</div>
                            <div className="text-xs text-gray-600">
                              {yogoch.thickness}×{yogoch.width}×{yogoch.length} mm/m × {yogoch.quantity} dona
                              = {safeToFixed(calculateYogochVolume(yogoch), 3)} m³
                            </div>
                            <div className="text-xs text-gray-500">
                              {yogoch.purchase_amount} {yogoch.currency}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeYogochRow(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-all duration-300"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Yogoch Form */}
                  {isAddingYogoch && (
                    <div className="bg-white/80 rounded-xl p-4 border-2 border-purple-300 mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-purple-900">Yangi yog'och qo'shish</h4>
                        <button
                          type="button"
                          onClick={cancelAddingYogoch}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Icon name="x" className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Compact Yogoch Form */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Yog'och nomi *</label>
                          <input
                            type="text"
                            value={currentYogoch.name || ''}
                            onChange={(e) => updateCurrentYogoch('name', e.target.value)}
                            placeholder="Premium yog'och"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Qalinlik (mm)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentYogoch.thickness}
                              onChange={(e) => updateCurrentYogoch('thickness', e.target.value)}
                              placeholder="31"
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Eni (mm)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentYogoch.width}
                              onChange={(e) => updateCurrentYogoch('width', e.target.value)}
                              placeholder="125"
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Uzunlik (m)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentYogoch.length}
                              onChange={(e) => updateCurrentYogoch('length', e.target.value)}
                              placeholder="6"
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Soni</label>
                            <input
                              type="number"
                              value={currentYogoch.quantity}
                              onChange={(e) => updateCurrentYogoch('quantity', e.target.value)}
                              placeholder="100"
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Valyuta</label>
                            <select
                              value={currentYogoch.currency}
                              onChange={(e) => updateCurrentYogoch('currency', e.target.value)}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="USD">USD</option>
                              <option value="RUB">RUB</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Tannarx</label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentYogoch.purchase_amount}
                              onChange={(e) => updateCurrentYogoch('purchase_amount', e.target.value)}
                              placeholder="1000"
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Hajm</label>
                            <div className="w-full px-2 py-2 bg-purple-100 border border-purple-200 rounded-lg text-sm font-bold text-purple-800">
                              {safeToFixed(calculateYogochVolume(currentYogoch), 3)} m³
                            </div>
                          </div>
                        </div>

                        {/* YANGI: Sotuv narxi */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Sotuv narxi (m³ uchun) <span className="text-gray-500">(ixtiyoriy)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentYogoch.recommended_sale_price_per_m3}
                              onChange={(e) => updateCurrentYogoch('recommended_sale_price_per_m3', e.target.value)}
                              placeholder="Masalan: 150"
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Kutilayotgan foyda
                            </label>
                            <div className="w-full px-2 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700">
                              {(() => {
                                const volume = calculateYogochVolume(currentYogoch);
                                const cost = parseFloat(currentYogoch.purchase_amount) || 0;
                                const salePrice = parseFloat(currentYogoch.recommended_sale_price_per_m3) || 0;
                                const costPerM3 = volume > 0 ? cost / volume : 0;
                                const profitPerM3 = salePrice - costPerM3;
                                const totalProfit = profitPerM3 * volume;
                                const margin = salePrice > 0 ? ((profitPerM3 / salePrice) * 100).toFixed(1) : '0';
                                return totalProfit > 0 
                                  ? `${safeToFixed(totalProfit, 2)} ${currentYogoch.currency} (${margin}%)`
                                  : '—';
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={cancelAddingYogoch}
                            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            onClick={saveCurrentYogoch}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 text-sm font-semibold"
                          >
                            Qo'shish
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Volume Display */}
                  {yogochlar.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-purple-900">Jami hajm:</span>
                        <span className="text-xl font-bold text-purple-900">
                          {safeToFixed(yogochlar.reduce((sum, yogoch) => sum + calculateYogochVolume(yogoch), 0), 3)} m³
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-3 text-sm border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-semibold"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || yogochlar.length === 0}
                    className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-8 py-3 text-sm rounded-xl hover:from-indigo-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saqlanmoqda...
                      </>
                    ) : (
                      <>
                        <Icon name="save" className="mr-2 h-4 w-4" />
                        {editingVagon ? 'Yangilash' : `Saqlash (${yogochlar.length} ta yog'och)`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}