'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import Layout from '@/components/Layout';
import ClientTableSkeleton from '@/components/client/ClientTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination'; // ⚡ PAGINATION IMPORT
import Icon from '@/components/Icon';
import { useScrollLock } from '@/hooks/useScrollLock';
import axios from '@/lib/axios';

interface Client {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  
  // YANGI VALYUTA BO'YICHA FIELD'LAR
  usd_total_received_volume: number;
  usd_total_debt: number;
  usd_total_paid: number;
  usd_current_debt: number;
  
  rub_total_received_volume: number;
  rub_total_debt: number;
  rub_total_paid: number;
  rub_current_debt: number;
  
  // DELIVERY QARZLARI (YANGI)
  delivery_total_debt?: number;
  delivery_total_paid?: number;
  delivery_current_debt?: number;
  
  // ESKI FIELD'LAR (Backward compatibility)
  total_received_volume: number;
  total_debt: number;
  total_paid: number;
  current_debt: number;
  
  notes?: string;
  createdAt: string;
}

export default function ClientPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useDialog();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Scroll lock for modal
  useScrollLock(showModal);
  
  // ⚡ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState<any>(null);
  
  // ✅ LOADING STATES
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDebtSubmitting, setIsDebtSubmitting] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'volume' | 'date'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'debt' | 'no-debt'>('all');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [debtData, setDebtData] = useState({
    amount: '',
    currency: 'USD',
    description: '',
    type: 'add' // 'add' yoki 'subtract'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user, currentPage, itemsPerPage, searchTerm, filterBy]); // ⚡ PAGINATION DEPENDENCIES

  const fetchClients = async () => {
    try {
      console.log('🔄 Mijozlar ro\'yxati yangilanmoqda...');
      
      // ⚡ PAGINATION PARAMS
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterBy !== 'all') params.append('hasDebt', filterBy === 'debt' ? 'true' : 'false');
      
      const response = await axios.get(`/client?${params}`);
      
      // Backend'dan pagination format kelishi mumkin
      if (response.data.clients) {
        setClients(response.data.clients);
        setPagination(response.data.pagination);
        console.log(`✅ ${response.data.clients.length} ta mijoz yuklandi`);
      } else {
        // Eski format (backward compatibility)
        setClients(response.data);
        console.log(`✅ ${response.data.length} ta mijoz yuklandi`);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]); // Xatolik bo'lsa bo'sh array
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ LOADING STATE BOSHLASH
    if (isSubmitting) return; // Double-click oldini olish
    setIsSubmitting(true);
    
    try {
      if (editingClient) {
        await axios.put(`/client/${editingClient._id}`, formData);
      } else {
        await axios.post('/client', formData);
      }
      
      fetchClients();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || t.client.saveError,
        type: 'error'
      });
    } finally {
      // ✅ LOADING STATE TUGASHI
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: t.client.deleteClient,
      message: t.client.deleteConfirm,
      type: 'danger',
      confirmText: t.common.delete
    });
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`/client/${id}`);
      fetchClients();
    } catch (error: any) {
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || t.client.deleteError,
        type: 'error'
      });
    }
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      address: client.address || '',
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  const openDebtModal = (client: Client) => {
    console.log('🔍 openDebtModal called for:', client.name);
    console.log('🔍 Current showDebtModal state:', showDebtModal);
    
    setEditingClient(client);
    setDebtData({
      amount: '',
      currency: 'USD',
      description: '',
      type: 'add'
    });
    setShowDebtModal(true);
    
    console.log('🔍 showDebtModal should now be true');
  };

  const handleDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ LOADING STATE BOSHLASH
    if (isDebtSubmitting) return; // Double-click oldini olish
    setIsDebtSubmitting(true);
    
    try {
      if (!editingClient || !debtData.amount || parseFloat(debtData.amount) <= 0) {
        showAlert({
          title: t.messages.error,
          message: t.messages.amountMustBePositive,
          type: 'warning'
        });
        return;
      }

      const amount = parseFloat(debtData.amount);
      
      const requestData = {
        amount: debtData.type === 'add' ? amount : -amount,
        currency: debtData.currency,
        description: debtData.description || `${debtData.type === 'add' ? t.client.addDebt : t.client.reduceDebt}: ${amount} ${debtData.currency}`,
        type: debtData.type === 'add' ? 'debt_increase' : 'debt_decrease'
      };
      
      console.log('🔍 Sending debt request:', {
        url: `/client/${editingClient._id}/debt`,
        data: requestData
      });
      
      const response = await axios.post(
        `/client/${editingClient._id}/debt`,
        requestData
      );
      
      console.log('✅ Debt response:', response.data);
      
      showAlert({
        title: t.messages.success,
        message: `${editingClient.name}ga ${debtData.type === 'add' ? t.client.addDebt : t.client.reduceDebt}: ${amount} ${debtData.currency}`,
        type: 'success'
      });
      
      fetchClients();
      setShowDebtModal(false);
      setDebtData({ amount: '', currency: 'USD', description: '', type: 'add' });
    } catch (error: any) {
      console.error('❌ Debt management error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      showAlert({
        title: t.messages.error,
        message: error.response?.data?.message || t.messages.errorOccurred,
        type: 'error'
      });
    } finally {
      // ✅ LOADING STATE TUGASHI
      setIsDebtSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setEditingClient(null);
  };

  const filteredClients = (clients || [])
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.phone.includes(searchTerm);
      
      const hasDebt = Math.max(0, client.usd_current_debt || 0) > 0 || 
                      Math.max(0, client.rub_current_debt || 0) > 0 || 
                      Math.max(0, client.delivery_current_debt || 0) > 0;
      
      if (filterBy === 'debt') return matchesSearch && hasDebt;
      if (filterBy === 'no-debt') return matchesSearch && !hasDebt;
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'debt':
          const aDebt = Math.max(0, a.usd_current_debt || 0) + 
                       Math.max(0, a.rub_current_debt || 0) * 0.011 + 
                       Math.max(0, a.delivery_current_debt || 0); // USD ekvivalenti
          const bDebt = Math.max(0, b.usd_current_debt || 0) + 
                       Math.max(0, b.rub_current_debt || 0) * 0.011 + 
                       Math.max(0, b.delivery_current_debt || 0);
          return bDebt - aDebt;
        case 'volume':
          const aVolume = (a.usd_total_received_volume || 0) + (a.rub_total_received_volume || 0);
          const bVolume = (b.usd_total_received_volume || 0) + (b.rub_total_received_volume || 0);
          return bVolume - aVolume;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  if (authLoading || loading) {
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
          <ClientTableSkeleton />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-6 py-12">
            <div className="w-full">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-8 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4 flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                      <Icon name="users" className="h-7 w-7" />
                    </div>
                    {t.client.title}
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    {t.client.appSubtitle}
                  </p>
                  <p className="text-sm opacity-75">
                    Mijozlar bilan ishlash va qarzlarni boshqarish
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
                  {t.client.addClient}
                </button>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        <div className="w-full px-6 py-8">
          {/* Filters and Search - Responsive */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Icon name="filter" className="h-5 w-5 text-white" />
                </div>
                {t.common.searchAndFilters}
              </h3>
              
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={t.client.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as any)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  >
                    <option value="all">{t.vagonSale.allClients}</option>
                    <option value="debt">{t.vagonSale.clientsWithDebt}</option>
                    <option value="no-debt">{t.vagonSale.clientsWithoutDebt}</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  >
                    <option value="name">{t.client.sortByName}</option>
                    <option value="debt">{t.client.sortByDebt}</option>
                    <option value="volume">{t.client.sortByVolume}</option>
                    <option value="date">{t.client.sortByDate}</option>
                  </select>
                  
                  <button
                    onClick={() => {
                      setLoading(true);
                      fetchClients();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-semibold"
                    title={t.common.update}
                  >
                    <Icon name="refresh-cw" size="sm" />
                    {t.common.update}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats - Responsive Grid */}
          <div className="mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon name="users" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">{clients.length}</div>
                  <div className="text-sm text-gray-600">{t.client.totalClients}</div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-600/5"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon name="alert-circle" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {clients.filter(c => 
                      Math.max(0, c.usd_current_debt || 0) > 0 || 
                      Math.max(0, c.rub_current_debt || 0) > 0 || 
                      Math.max(0, c.delivery_current_debt || 0) > 0
                    ).length}
                  </div>
                  <div className="text-sm text-gray-600">{t.vagonSale.clientsWithDebt}</div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon name="dollar-sign" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    ${clients.reduce((sum, c) => sum + Math.max(0, c.usd_current_debt || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">{t.client.usdDebt}</div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-600/5"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon name="ruble-sign" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {clients.reduce((sum, c) => sum + Math.max(0, c.rub_current_debt || 0), 0)} ₽
                  </div>
                  <div className="text-sm text-gray-600">{t.client.rubDebt}</div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-600/5"></div>
                <div className="relative p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon name="truck" className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    ${clients.reduce((sum, c) => sum + Math.max(0, c.delivery_current_debt || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">{t.client.deliveryDebt}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clients Grid - Responsive */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <Icon name="users" className="mx-auto text-gray-400 mb-4" size="lg" />
            <p className="text-gray-500">{t.client.noClients}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredClients.map((client) => (
              <div key={client._id} className="card hover-lift">
                <div className="mb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{client.name}</h3>
                      <p className="text-gray-600 text-base sm:text-lg">{client.phone}</p>
                      {client.address && (
                        <p className="text-sm sm:text-base text-gray-500 mt-1 truncate">{client.address}</p>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ml-2 ${
                      (Math.max(0, client.usd_current_debt || 0) > 0 || 
                       Math.max(0, client.rub_current_debt || 0) > 0 || 
                       Math.max(0, client.delivery_current_debt || 0) > 0) ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.client.totalReceived}:</span>
                    <span className="font-semibold">{((client.usd_total_received_volume || 0) + (client.rub_total_received_volume || 0)).toFixed(2)} m³</span>
                  </div>
                  
                  {/* USD qarz */}
                  {(client.usd_total_debt || 0) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.client.usdDebt}:</span>
                        <span className="font-semibold">${(client.usd_total_debt || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.client.usdPaid}:</span>
                        <span className="font-semibold text-green-600">${(client.usd_total_paid || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">{t.client.usdRemaining}:</span>
                        <span className={`font-bold ${(client.usd_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.max(0, client.usd_current_debt || 0)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {/* RUB qarz */}
                  {(client.rub_total_debt || 0) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.client.rubDebt}:</span>
                        <span className="font-semibold">{(client.rub_total_debt || 0)} ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t.client.rubPaid}:</span>
                        <span className="font-semibold text-green-600">{(client.rub_total_paid || 0)} ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">{t.client.rubRemaining}:</span>
                        <span className={`font-bold ${(client.rub_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {Math.max(0, client.rub_current_debt || 0)} ₽
                        </span>
                      </div>
                    </>
                  )}
                  
                  {/* OLIB KELIB BERISH QARZLARI */}
                  {(client.delivery_total_debt || 0) > 0 && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-purple-600 font-medium text-xs flex items-center gap-1">
                            <Icon name="truck" className="w-3 h-3" />
                            {t.client.deliveryDebt}:
                          </span>
                          <span className="font-semibold text-purple-600">${(client.delivery_total_debt || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600 text-xs flex items-center gap-1">
                            <Icon name="truck" className="w-3 h-3" />
                            {t.client.totalPaid}:
                          </span>
                          <span className="font-semibold text-green-600">${(client.delivery_total_paid || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600 font-semibold text-xs flex items-center gap-1">
                            <Icon name="truck" className="w-3 h-3" />
                            Qolgan:
                          </span>
                          <span className={`font-bold ${(client.delivery_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${Math.max(0, client.delivery_current_debt || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Agar hech qanday qarz bo'lmasa */}
                  {(client.usd_total_debt || 0) === 0 && (client.rub_total_debt || 0) === 0 && (client.delivery_total_debt || 0) === 0 && (
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 font-semibold">{t.client.statusLabel}:</span>
                      <span className="font-bold text-green-600">{t.client.noDebt}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔍 Debt button clicked for:', client.name);
                      openDebtModal(client);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm py-2.5 px-4 rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-200 flex items-center justify-center gap-1 relative z-10"
                    type="button"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Icon name="dollar-sign" className="w-5 h-5" />
                    <span>{t.client.debt}</span>
                  </button>
                  <button
                    onClick={() => openEditModal(client)}
                    className="btn-primary text-sm py-2.5 px-4 flex items-center justify-center gap-1"
                  >
                    <Icon name="edit" size="sm" />
                    <span className="hidden sm:inline">{t.common.edit}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(client._id)}
                    className="btn-danger text-sm py-2.5 px-4 flex items-center justify-center"
                  >
                    <Icon name="delete" size="sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ⚡ PAGINATION COMPONENT */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onPageChange={(page) => setCurrentPage(page)}
              onLimitChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1); // Reset to first page
              }}
              showLimitSelector={true}
              className="bg-white rounded-xl shadow-md p-6"
            />
          </div>
        )}

        {/* Modals - Responsive */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-slideUp">
              <div className="modal-header">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {editingClient ? t.client.editClient : t.client.addClient}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                    setFormData({ name: '', phone: '', address: '', notes: '' });
                  }}
                  className="btn-icon"
                >
                  <Icon name="close" size="md" />
                </button>
              </div>
              
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.client.name}</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t.client.namePlaceholder}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.client.phone}</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={t.client.phonePlaceholder}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.client.address}</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={t.client.addressPlaceholder}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.client.notes}</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder={t.client.notesPlaceholder}
                        className="input-field"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  {/* Mijoz uchun jami qarz ko'rsatish */}
                  {editingClient && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                          <Icon name="calculator" className="h-5 w-5 text-red-600 mr-2" />
                          {t.common.grandTotal}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-100 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            ${(editingClient.usd_current_debt || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">USD qarz</div>
                        </div>
                        <div className="text-center p-3 bg-blue-100 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            ₽{(editingClient.rub_current_debt || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">RUB qarz</div>
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
                        disabled={isSubmitting}
                        className="btn-primary order-1 sm:order-2"
                      >
                        {isSubmitting ? t.common.loading : t.common.save}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Debt Management Modal - Responsive */}
        {showDebtModal && editingClient && (
          <div className="modal-overlay">
            <div className="modal-content animate-slideUp">
              <div className="modal-header">
                <h2 className="text-lg sm:text-xl font-bold">
                  {t.client.manageDebt} - {editingClient.name}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowDebtModal(false);
                    setEditingClient(null);
                    setDebtData({ amount: '', currency: 'USD', description: '', type: 'add' });
                  }}
                  className="btn-icon"
                >
                  <Icon name="close" size="md" />
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleDebtSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.client.debtType || 'Amal turi'}</label>
                      <select
                        value={debtData.type}
                        onChange={(e) => setDebtData({ ...debtData, type: e.target.value })}
                        className="input-field"
                      >
                        <option value="add">{t.client.addDebt}</option>
                        <option value="subtract">{t.client.reduceDebt}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.common.amount}</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={debtData.amount}
                        onChange={(e) => setDebtData({ ...debtData, amount: e.target.value })}
                        placeholder="1000"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.common.currency}</label>
                      <select
                        value={debtData.currency}
                        onChange={(e) => setDebtData({ ...debtData, currency: e.target.value })}
                        className="input-field"
                      >
                        <option value="USD">USD</option>
                        <option value="RUB">RUB</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.common.description}</label>
                      <textarea
                        value={debtData.description}
                        onChange={(e) => setDebtData({ ...debtData, description: e.target.value })}
                        placeholder={t.client.debtDescriptionPlaceholder}
                        className="input-field"
                        rows={3}
                      />
                    </div>

                    {/* Hozirgi qarz ko'rsatish */}
                    <div className="form-section">
                      <h4 className="font-semibold mb-2">{t.client.currentDebtStatus}:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>USD:</span>
                          <span className={`font-semibold ${Math.max(0, editingClient.usd_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${Math.max(0, editingClient.usd_current_debt || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>RUB:</span>
                          <span className={`font-semibold ${Math.max(0, editingClient.rub_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.max(0, editingClient.rub_current_debt || 0).toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Qarz boshqaruv uchun jami summa */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                        <Icon name="calculator" className="h-5 w-5 text-orange-600 mr-2" />
                        {t.common.grandTotal}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-100 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          ${Math.max(0, editingClient.usd_current_debt || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">USD qarz</div>
                      </div>
                      <div className="text-center p-3 bg-blue-100 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          ₽{Math.max(0, editingClient.rub_current_debt || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">RUB qarz</div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDebtModal(false);
                          setEditingClient(null);
                          setDebtData({ amount: '', currency: 'USD', description: '', type: 'add' });
                        }}
                        className="btn-secondary order-2 sm:order-1"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={isDebtSubmitting}
                        className={`order-1 sm:order-2 ${
                          debtData.type === 'add' 
                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700' 
                            : 'btn-success'
                        } text-white px-4 py-2 rounded-xl transition-all duration-200`}
                      >
                        {isDebtSubmitting ? t.common.loading : 
                         debtData.type === 'add' ? t.client.addDebt : t.client.reduceDebt}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}