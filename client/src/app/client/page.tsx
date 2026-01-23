'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDialog } from '@/context/DialogContext';
import Layout from '@/components/Layout';
import ClientDetailsModal from '@/components/client/ClientDetailsModal';
import ClientTableSkeleton from '@/components/client/ClientTableSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import Icon from '@/components/Icon';
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
  
  // ✅ LOADING STATES
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDebtSubmitting, setIsDebtSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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
  }, [user]);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/client');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
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

  const openDetailsModal = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowDetailsModal(true);
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
    setEditingClient(client);
    setDebtData({
      amount: '',
      currency: 'USD',
      description: '',
      type: 'add'
    });
    setShowDebtModal(true);
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
      
      await axios.post(
        `/client/${editingClient._id}/debt`,
        {
          amount: debtData.type === 'add' ? amount : -amount,
          currency: debtData.currency,
          description: debtData.description || `${debtData.type === 'add' ? 'Qarz qo\'shildi' : 'Qarz kamaytrildi'}: ${amount} ${debtData.currency}`,
          type: debtData.type === 'add' ? 'debt_increase' : 'debt_decrease'
        }
      );
      
      showAlert({
        title: t.messages.success,
        message: `${editingClient.name}ga ${debtData.type === 'add' ? 'qarz qo\'shildi' : 'qarz kamaytrildi'}: ${amount} ${debtData.currency}`,
        type: 'success'
      });
      
      fetchClients();
      setShowDebtModal(false);
      setDebtData({ amount: '', currency: 'USD', description: '', type: 'add' });
    } catch (error: any) {
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

  const filteredClients = clients
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
        <div className="p-6 space-y-6">
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
      <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.client.title}</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {t.client.addClient}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t.client.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">{t.vagonSale.allClients}</option>
              <option value="debt">{t.vagonSale.clientsWithDebt}</option>
              <option value="no-debt">{t.vagonSale.clientsWithoutDebt}</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="name">{t.client.sortByName}</option>
              <option value="debt">{t.client.sortByDebt}</option>
              <option value="volume">{t.client.sortByVolume}</option>
              <option value="date">{t.client.sortByDate}</option>
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
            <div className="text-sm text-blue-600">{t.client.totalClients}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {clients.filter(c => 
                Math.max(0, c.usd_current_debt || 0) > 0 || 
                Math.max(0, c.rub_current_debt || 0) > 0 || 
                Math.max(0, c.delivery_current_debt || 0) > 0
              ).length}
            </div>
            <div className="text-sm text-red-600">{t.vagonSale.clientsWithDebt}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              ${clients.reduce((sum, c) => sum + Math.max(0, c.usd_current_debt || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-600">{t.client.usdDebt}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">
              {clients.reduce((sum, c) => sum + Math.max(0, c.rub_current_debt || 0), 0).toLocaleString()} ₽
            </div>
            <div className="text-sm text-orange-600">{t.client.rubDebt}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              ${clients.reduce((sum, c) => sum + Math.max(0, c.delivery_current_debt || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">🚚 Olib kelib berish qarzi</div>
          </div>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t.client.noClients}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div key={client._id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{client.name}</h3>
                    <p className="text-gray-600">{client.phone}</p>
                    {client.address && (
                      <p className="text-sm text-gray-500 mt-1">{client.address}</p>
                    )}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    (Math.max(0, client.usd_current_debt || 0) > 0 || 
                     Math.max(0, client.rub_current_debt || 0) > 0 || 
                     Math.max(0, client.delivery_current_debt || 0) > 0) ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.client.totalReceived}:</span>
                  <span className="font-semibold">{((client.usd_total_received_volume || 0) + (client.rub_total_received_volume || 0)).toFixed(2)} m³</span>
                </div>
                
                {/* USD qarz */}
                {(client.usd_total_debt || 0) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.client.usdDebt}:</span>
                      <span className="font-semibold">${(client.usd_total_debt || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.client.usdPaid}:</span>
                      <span className="font-semibold text-green-600">${(client.usd_total_paid || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-semibold">{t.client.usdRemaining}:</span>
                      <span className={`font-bold ${(client.usd_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${Math.max(0, client.usd_current_debt || 0).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                
                {/* RUB qarz */}
                {(client.rub_total_debt || 0) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.client.rubDebt}:</span>
                      <span className="font-semibold">{(client.rub_total_debt || 0).toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t.client.rubPaid}:</span>
                      <span className="font-semibold text-green-600">{(client.rub_total_paid || 0).toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-semibold">{t.client.rubRemaining}:</span>
                      <span className={`font-bold ${(client.rub_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.max(0, client.rub_current_debt || 0).toLocaleString()} ₽
                      </span>
                    </div>
                  </>
                )}
                
                {/* OLIB KELIB BERISH QARZLARI (YANGI) */}
                {(client.delivery_total_debt || 0) > 0 && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-purple-600 font-medium">🚚 Olib kelib berish qarzi:</span>
                        <span className="font-semibold text-purple-600">${(client.delivery_total_debt || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-600">🚚 Olib kelib berish to'langan:</span>
                        <span className="font-semibold text-green-600">${(client.delivery_total_paid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-600 font-semibold">🚚 Olib kelib berish qolgan:</span>
                        <span className={`font-bold ${(client.delivery_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Math.max(0, client.delivery_current_debt || 0).toLocaleString()}
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

              <div className="flex gap-2">
                <button
                  onClick={() => openDetailsModal(client._id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-medium"
                >
                  <Icon name="details" size="sm" />
                  {t.client.details}
                </button>
                <button
                  onClick={() => openDebtModal(client)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-3 py-2 rounded-xl hover:from-orange-600 hover:to-amber-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-medium"
                >
                  <Icon name="cash" size="sm" />
                  {t.client.manageDebt || 'Qarz'}
                </button>
                <button
                  onClick={() => openEditModal(client)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 text-xs font-medium"
                >
                  <Icon name="edit" size="sm" />
                  {t.common.edit}
                </button>
                <button
                  onClick={() => handleDelete(client._id)}
                  className="flex items-center justify-center bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 py-2 rounded-xl hover:from-red-600 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Icon name="delete" size="sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {editingClient ? t.client.editClient : t.client.addClient}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingClient(null);
                  setFormData({ name: '', phone: '', address: '', notes: '' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 group"
                aria-label="Yopish"
              >
                <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.client.name}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.client.namePlaceholder}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.client.phone}</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t.client.phonePlaceholder}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.client.address}</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t.client.addressPlaceholder}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.client.notes}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t.client.notesPlaceholder}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                    isSubmitting
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saqlanmoqda...
                    </>
                  ) : (
                    t.common.save
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showDetailsModal && selectedClientId && (
        <ClientDetailsModal
          clientId={selectedClientId}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedClientId(null);
          }}
        />
      )}

      {/* Debt Management Modal */}
      {showDebtModal && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {t.client.manageDebt || 'Qarz boshqaruvi'} - {editingClient.name}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowDebtModal(false);
                  setEditingClient(null);
                  setDebtData({ amount: '', currency: 'USD', description: '', type: 'add' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 group"
                aria-label="Yopish"
              >
                <Icon name="close" size="md" className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            <form onSubmit={handleDebtSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.client.debtType || 'Amal turi'}</label>
                  <select
                    value={debtData.type}
                    onChange={(e) => setDebtData({ ...debtData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="add">{t.client.addDebt || 'Qarz qo\'shish'}</option>
                    <option value="subtract">{t.client.reduceDebt || 'Qarz kamaytirish'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t.common.amount}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={debtData.amount}
                    onChange={(e) => setDebtData({ ...debtData, amount: e.target.value })}
                    placeholder="1000"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t.common.currency}</label>
                  <select
                    value={debtData.currency}
                    onChange={(e) => setDebtData({ ...debtData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t.common.description}</label>
                  <textarea
                    value={debtData.description}
                    onChange={(e) => setDebtData({ ...debtData, description: e.target.value })}
                    placeholder={t.client.debtDescriptionPlaceholder || 'Qarz sababi yoki izoh...'}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                {/* Hozirgi qarz ko'rsatish */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-semibold mb-2">{t.client.currentDebtStatus || 'Hozirgi qarz'}:</h4>
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

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDebtModal(false);
                    setEditingClient(null);
                    setDebtData({ amount: '', currency: 'USD', description: '', type: 'add' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isDebtSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                    isDebtSubmitting
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : debtData.type === 'add' 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isDebtSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {debtData.type === 'add' ? 'Qo\'shilmoqda...' : 'Kamaytirilmoqda...'}
                    </>
                  ) : (
                    debtData.type === 'add' ? (t.client.addDebt || 'Qarz qo\'shish') : (t.client.reduceDebt || 'Qarz kamaytirish')
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
