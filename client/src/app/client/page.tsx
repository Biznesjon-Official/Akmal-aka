'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ClientDetailsModal from '@/components/client/ClientDetailsModal';
import { formatCurrency } from '@/utils/formatters';
import axios from 'axios';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/client`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingClient) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/client/${editingClient._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/client`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      fetchClients();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.response?.data?.message || t.client.saveError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.client.deleteConfirm)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/client/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchClients();
    } catch (error: any) {
      alert(error.response?.data?.message || t.client.deleteError);
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

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setEditingClient(null);
  };

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.phone.includes(searchTerm);
      
      const hasDebt = (client.usd_current_debt || 0) > 0 || (client.rub_current_debt || 0) > 0;
      
      if (filterBy === 'debt') return matchesSearch && hasDebt;
      if (filterBy === 'no-debt') return matchesSearch && !hasDebt;
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'debt':
          const aDebt = (a.usd_current_debt || 0) + (a.rub_current_debt || 0) * 0.011; // USD ekvivalenti
          const bDebt = (b.usd_current_debt || 0) + (b.rub_current_debt || 0) * 0.011;
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
    return <LoadingSpinner />;
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
              <option value="name">Ism bo'yicha</option>
              <option value="debt">Qarz bo'yicha</option>
              <option value="volume">Hajm bo'yicha</option>
              <option value="date">Sana bo'yicha</option>
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
            <div className="text-sm text-blue-600">Jami mijozlar</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {clients.filter(c => (c.usd_current_debt || 0) > 0 || (c.rub_current_debt || 0) > 0).length}
            </div>
            <div className="text-sm text-red-600">{t.vagonSale.clientsWithDebt}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              ${clients.reduce((sum, c) => sum + (c.usd_current_debt || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-green-600">USD qarz</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">
              {clients.reduce((sum, c) => sum + (c.rub_current_debt || 0), 0).toLocaleString()} ₽
            </div>
            <div className="text-sm text-orange-600">RUB qarz</div>
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
                    ((client.usd_current_debt || 0) > 0 || (client.rub_current_debt || 0) > 0) ? 'bg-red-500' : 'bg-green-500'
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
                      <span className="text-gray-600">USD qarz:</span>
                      <span className="font-semibold">${(client.usd_total_debt || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">USD to'langan:</span>
                      <span className="font-semibold text-green-600">${(client.usd_total_paid || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-semibold">USD qolgan:</span>
                      <span className={`font-bold ${(client.usd_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${(client.usd_current_debt || 0).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                
                {/* RUB qarz */}
                {(client.rub_total_debt || 0) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RUB qarz:</span>
                      <span className="font-semibold">{(client.rub_total_debt || 0).toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RUB to'langan:</span>
                      <span className="font-semibold text-green-600">{(client.rub_total_paid || 0).toLocaleString()} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-semibold">RUB qolgan:</span>
                      <span className={`font-bold ${(client.rub_current_debt || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(client.rub_current_debt || 0).toLocaleString()} ₽
                      </span>
                    </div>
                  </>
                )}
                
                {/* Agar hech qanday qarz bo'lmasa */}
                {(client.usd_total_debt || 0) === 0 && (client.rub_total_debt || 0) === 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-semibold">Holat:</span>
                    <span className="font-bold text-green-600">Qarz yo'q</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openDetailsModal(client._id)}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                >
                  📊 Tafsilot
                </button>
                <button
                  onClick={() => openEditModal(client)}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                >
                  {t.common.edit}
                </button>
                <button
                  onClick={() => handleDelete(client._id)}
                  className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingClient ? t.client.editClient : t.client.addClient}
            </h2>
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
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {t.common.save}
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
    </div>
    </Layout>
  );
}
