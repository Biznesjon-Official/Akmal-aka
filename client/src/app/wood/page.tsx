'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import FormattedInput from '@/components/FormattedInput';
import { formatNumber, formatCurrency } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

interface Wood {
  _id: string;
  lotCode: string;
  qalinlik: number;
  eni: number;
  uzunlik: number;
  kubHajmi: number;
  soni: number;
  tonna: number;
  yogochZichligi: number;
  status: string;
  jami_xarid: number;
  jami_sotuv: number;
  jami_xarajat: number;
  sof_foyda: number;
  foyda_foizi: number;
  xarid_kursi?: number;
  sotuv_kursi?: number;
  izoh?: string;
  createdAt: string;
}

// Status labels moved to translation files

const statusColors: Record<string, string> = {
  xarid_qilindi: 'bg-blue-100 text-blue-800',
  transport_kelish: 'bg-yellow-100 text-yellow-800',
  omborda: 'bg-green-100 text-green-800',
  qayta_ishlash: 'bg-purple-100 text-purple-800',
  transport_ketish: 'bg-orange-100 text-orange-800',
  sotildi: 'bg-emerald-100 text-emerald-800',
  bekor_qilindi: 'bg-red-100 text-red-800'
};

function WoodContent() {
  const { t } = useLanguage();
  useAuth(); // Faqat autentifikatsiyani tekshirish uchun
  const { confirm, ConfirmDialog } = useConfirm();
  
  // Status labels with translations
  const statusLabels: Record<string, string> = {
    xarid_qilindi: t.wood.statusPurchased,
    transport_kelish: t.wood.statusTransportIn,
    omborda: t.wood.statusInStock,
    qayta_ishlash: t.wood.statusProcessing,
    transport_ketish: t.wood.statusTransportOut,
    sotildi: t.wood.statusSold,
    bekor_qilindi: t.wood.statusCancelled
  };
  const [woods, setWoods] = useState<Wood[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWood, setSelectedWood] = useState<Wood | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  
  const [formData, setFormData] = useState({
    lotCode: '',
    qalinlik: '',
    eni: '',
    uzunlik: '',
    kubHajmi: '',
    soni: '',
    tonna: '',
    yogochZichligi: '0.65',
    izoh: ''
  });

  // Automatic calculation
  useEffect(() => {
    const qalinlik = parseFloat(formData.qalinlik) || 0;
    const eni = parseFloat(formData.eni) || 0;
    const uzunlik = parseFloat(formData.uzunlik) || 0;
    const soni = parseFloat(formData.soni) || 0;
    const zichlik = parseFloat(formData.yogochZichligi) || 0.65;

    if (qalinlik > 0 && eni > 0 && uzunlik > 0 && soni > 0) {
      // Kub hajmi = (qalinlik_mm × eni_mm × uzunlik_m × soni) / 1,000,000
      const kubHajmi = (qalinlik * eni * uzunlik * soni) / 1000000;
      
      // Tonna = kub hajmi × zichlik
      const tonna = kubHajmi * zichlik;

      setFormData(prev => ({
        ...prev,
        kubHajmi: kubHajmi.toFixed(4),
        tonna: tonna.toFixed(4)
      }));
    } else {
      // Agar biror qiymat 0 bo'lsa, tozalash
      setFormData(prev => ({
        ...prev,
        kubHajmi: '',
        tonna: ''
      }));
    }
  }, [formData.qalinlik, formData.eni, formData.uzunlik, formData.soni, formData.yogochZichligi]);

  // 1 m³ da nechta dona borligini hisoblash
  const calculatePiecesPerCubicMeter = () => {
    const qalinlik = parseFloat(formData.qalinlik) || 0;
    const eni = parseFloat(formData.eni) || 0;
    const uzunlik = parseFloat(formData.uzunlik) || 0;

    if (qalinlik > 0 && eni > 0 && uzunlik > 0) {
      // 1 m³ = 1,000,000,000 mm³
      // 1 dona hajmi = qalinlik × eni × uzunlik (mm³)
      const oneDonaMm3 = qalinlik * eni * (uzunlik * 1000); // uzunlik m dan mm ga
      const piecesPerM3 = 1000000000 / oneDonaMm3;
      return Math.floor(piecesPerM3);
    }
    return 0;
  };

  useEffect(() => {
    fetchWoods();
  }, [filterStatus]);

  const fetchWoods = async () => {
    try {
      // Agar filter tanlangan bo'lsa, uni ishlatamiz
      // Aks holda, faqat sotilmagan lotlarni ko'rsatamiz
      let url = '/wood';
      
      if (filterStatus) {
        url = `/wood?status=${filterStatus}`;
      }
      
      const response = await axios.get(url);
      let woodsList = response.data.woods || [];
      
      // Agar filter yo'q bo'lsa, sotilgan lotlarni olib tashlaymiz
      if (!filterStatus) {
        woodsList = woodsList.filter((wood: Wood) => wood.status !== 'sotildi');
      }
      
      setWoods(woodsList);
    } catch (error) {
      console.error('Xato:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedWood
        ? `/wood/${selectedWood._id}`
        : '/wood';
      
      const method = selectedWood ? 'put' : 'post';
      
      const response = await axios[method](url, {
        ...formData,
        qalinlik: Number(formData.qalinlik),
        eni: Number(formData.eni),
        uzunlik: Number(formData.uzunlik),
        kubHajmi: Number(formData.kubHajmi),
        soni: Number(formData.soni),
        tonna: Number(formData.tonna),
        yogochZichligi: Number(formData.yogochZichligi)
      });

      setIsModalOpen(false);
      resetForm();
      fetchWoods();

      // Yangi lot yaratilganda xarid sahifasiga yo'naltirish
      if (!selectedWood && response.data) {
        const shouldRedirect = await confirm({
          title: t.messages.saveSuccess,
          message: t.purchase.purchaseInfo,
          confirmText: t.common.yes,
          cancelText: t.common.no,
          type: 'info'
        });
        
        if (shouldRedirect) {
          window.location.href = '/purchase';
        }
      }
    } catch (error) {
      console.error('Xato:', error);
      showToast.error(t.messages.errorOccurred);
    }
  };

  const handleStatusChange = async (woodId: string, newStatus: string) => {
    try {
      await axios.patch(`/wood/${woodId}/status`, { status: newStatus });
      fetchWoods();
    } catch (error) {
      console.error('Xato:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      lotCode: '',
      qalinlik: '',
      eni: '',
      uzunlik: '',
      kubHajmi: '',
      soni: '',
      tonna: '',
      yogochZichligi: '0.65',
      izoh: ''
    });
    setSelectedWood(null);
  };

  const handleEdit = (wood: Wood) => {
    setSelectedWood(wood);
    setFormData({
      lotCode: wood.lotCode,
      qalinlik: wood.qalinlik.toString(),
      eni: wood.eni.toString(),
      uzunlik: wood.uzunlik.toString(),
      kubHajmi: wood.kubHajmi.toString(),
      soni: wood.soni.toString(),
      tonna: wood.tonna.toString(),
      yogochZichligi: wood.yogochZichligi.toString(),
      izoh: wood.izoh || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (woodId: string, lotCode: string) => {
    const confirmed = await confirm({
      title: t.wood.deleteLot,
      message: t.wood.deleteConfirm,
      confirmText: t.common.yes + ', ' + t.common.delete.toLowerCase(),
      cancelText: t.common.cancel,
      type: 'danger'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`/wood/${woodId}`);
      showToast.success(t.messages.deleteSuccess);
      fetchWoods();
    } catch (error: any) {
      console.error('Xato:', error);
      const errorMessage = error.response?.data?.message || t.messages.deleteError;
      showToast.error(t.messages.error + ': ' + errorMessage);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">{t.common.loading}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t.wood.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.wood.title}</p>
        </div>
        {/* Yangi Lot tugmasi olib tashlandi - Xarid sahifasida lot yaratiladi */}
      </div>

      {/* Filter */}
      <Card>
        <div className="flex gap-4 items-center">
          <label className="font-medium">{t.common.status}:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">{t.common.selectAll}</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600">{t.dashboard.totalLots}</div>
          <div className="text-2xl font-bold">{woods.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">{t.wood.totalPurchase}</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(woods.reduce((sum, w) => sum + w.jami_xarid, 0))}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">{t.wood.totalSale}</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(woods.reduce((sum, w) => sum + w.jami_sotuv, 0))}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">{t.wood.netProfit}</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(woods.reduce((sum, w) => sum + w.sof_foyda, 0))}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHead className="min-w-[100px]">{t.wood.lotCode}</TableHead>
              <TableHead className="min-w-[120px]">{t.wood.thickness}×{t.wood.width}×{t.wood.length}</TableHead>
              <TableHead className="min-w-[80px]">{t.wood.volume}</TableHead>
              <TableHead className="min-w-[70px]">{t.wood.quantity}</TableHead>
              <TableHead className="min-w-[70px]">{t.wood.weight}</TableHead>
              <TableHead className="min-w-[110px]">{t.purchase.title}</TableHead>
              <TableHead className="min-w-[110px]">{t.sale.title}</TableHead>
              <TableHead className="min-w-[110px]">{t.expense.title}</TableHead>
              <TableHead className="min-w-[120px]">{t.wood.netProfit}</TableHead>
              <TableHead className="min-w-[80px]">{t.wood.profit} %</TableHead>
              <TableHead className="min-w-[120px]">{t.common.actions}</TableHead>
            </TableHeader>
            <TableBody loading={loading} empty={woods.length === 0}>
              {woods.map((wood) => (
                <TableRow key={wood._id}>
                  <TableCell className="font-semibold text-blue-600">{wood.lotCode}</TableCell>
                  <TableCell className="text-sm">{wood.qalinlik}×{wood.eni}×{wood.uzunlik}</TableCell>
                  <TableCell>{formatNumber(wood.kubHajmi)}</TableCell>
                  <TableCell>{formatNumber(wood.soni)}</TableCell>
                  <TableCell>{formatNumber(wood.tonna)}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(wood.jami_xarid)}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(wood.jami_sotuv)}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(wood.jami_xarajat)}</TableCell>
                  <TableCell>
                    <span className={`font-semibold text-sm ${wood.sof_foyda >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(wood.sof_foyda)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium text-sm ${wood.foyda_foizi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumber(wood.foyda_foizi)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(wood)}
                        className="text-sm py-1.5 px-3 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t.common.edit}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDelete(wood._id, wood.lotCode)}
                        className="text-sm py-1.5 px-3 text-red-600 hover:bg-red-50 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t.common.delete}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedWood ? t.wood.editLot : t.wood.addLot}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Lot Kodi */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.wood.lotCode} *</label>
              <input
                type="text"
                value={formData.lotCode}
                onChange={(e) => setFormData({ ...formData, lotCode: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="LOT-2024-001"
                required
              />
            </div>

            {/* O'lchamlar - 1-qadam */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">1</span>
                {t.purchase.lotInfo}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.thickness} *</label>
                  <input
                    type="number"
                    value={formData.qalinlik}
                    onChange={(e) => setFormData({ ...formData, qalinlik: e.target.value })}
                    placeholder="31"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.width} *</label>
                  <input
                    type="number"
                    value={formData.eni}
                    onChange={(e) => setFormData({ ...formData, eni: e.target.value })}
                    placeholder="125"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.length} *</label>
                  <input
                    type="number"
                    value={formData.uzunlik}
                    onChange={(e) => setFormData({ ...formData, uzunlik: e.target.value })}
                    placeholder="6"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.quantity} *</label>
                  <input
                    type="number"
                    value={formData.soni}
                    onChange={(e) => setFormData({ ...formData, soni: e.target.value })}
                    placeholder="100"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              {/* 1 m³ da nechta dona */}
              {calculatePiecesPerCubicMeter() > 0 && (
                <div className="mt-3 p-3 bg-white border border-blue-300 rounded-lg">
                  <p className="text-sm text-blue-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-semibold">1 m³:</span> 
                    <span className="text-lg font-bold text-blue-600">{calculatePiecesPerCubicMeter()}</span> {t.purchase.pieces}
                  </p>
                </div>
              )}
            </div>

            {/* Natijalar - 2-qadam */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">2</span>
                {t.purchase.totalAmount}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.wood.volume} *
                  </label>
                  <input
                    type="text"
                    value={formData.kubHajmi}
                    readOnly
                    className="w-full border-2 border-green-300 rounded-lg px-4 py-3 bg-white text-green-700 font-semibold text-lg cursor-not-allowed"
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.wood.weight} *
                  </label>
                  <input
                    type="text"
                    value={formData.tonna}
                    readOnly
                    className="w-full border-2 border-green-300 rounded-lg px-4 py-3 bg-white text-green-700 font-semibold text-lg cursor-not-allowed"
                    placeholder="0.0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.density}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.yogochZichligi}
                    onChange={(e) => setFormData({ ...formData, yogochZichligi: e.target.value })}
                    placeholder="0.65"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Izoh */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.purchase.notes}</label>
              <textarea
                value={formData.izoh}
                onChange={(e) => setFormData({ ...formData, izoh: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                rows={3}
                placeholder=""
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit">
              {selectedWood ? t.common.save : t.common.add}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
    <ConfirmDialog />
    </Layout>
  );
}

export default function WoodPage() {
  return (
    <LanguageProvider>
      <WoodContent />
    </LanguageProvider>
  );
}
