'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import FormattedInput from '@/components/FormattedInput';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

interface Purchase {
  _id: string;
  woodLot: {
    _id: string;
    lotCode: string;
    kubHajmi: number;
    qalinlik?: number;
    eni?: number;
    uzunlik?: number;
    soni?: number;
    yogochZichligi?: number;
  };
  birlikNarxi: number;
  valyuta: string;
  jamiSumma: number;
  sotuvchi: string;
  sotuvchiTelefon?: string;
  xaridJoyi: string;
  xaridSanasi: string;
  valyutaKursi: number;
  jamiRUB: number;
  tolovHolati: string;
  shartnoma?: string;
  izoh?: string;
  yaratuvchi: {
    username: string;
  };
}

interface Wood {
  _id: string;
  lotCode: string;
  kubHajmi: number;
  status: string;
  jami_xarid?: number;
  jami_sotuv?: number;
  jami_xarajat?: number;
}

function PurchaseContent() {
  const { t } = useLanguage();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState({
    // Lot ma'lumotlari (o'lchamlar)
    lotCode: '',
    qalinlik: '',
    eni: '',
    uzunlik: '',
    soni: '',
    yogochZichligi: '0.65',
    // Xarid ma'lumotlari
    birlikNarxi: '',
    valyuta: 'RUB',
    sotuvchi: '',
    sotuvchiTelefon: '',
    xaridJoyi: '',
    xaridSanasi: new Date().toISOString().split('T')[0],
    valyutaKursi: '',
    tolovHolati: 'to\'langan',
    shartnoma: '',
    izoh: ''
  });

  const queryClient = useQueryClient();

  // Avtomatik hisoblash (Lot uchun)
  const [calculatedLot, setCalculatedLot] = useState({
    kubHajmi: '',
    tonna: '',
    piecesPerM3: 0
  });

  // O'lchamlar o'zgarganda avtomatik hisoblash
  useEffect(() => {
    const qalinlik = parseFloat(formData.qalinlik) || 0;
    const eni = parseFloat(formData.eni) || 0;
    const uzunlik = parseFloat(formData.uzunlik) || 0;
    const soni = parseFloat(formData.soni) || 0;
    const zichlik = parseFloat(formData.yogochZichligi) || 0.65;

    if (qalinlik > 0 && eni > 0 && uzunlik > 0 && soni > 0) {
      const kubHajmi = (qalinlik * eni * uzunlik * soni) / 1000000;
      const tonna = kubHajmi * zichlik;
      const oneDonaMm3 = qalinlik * eni * (uzunlik * 1000);
      const piecesPerM3 = Math.floor(1000000000 / oneDonaMm3);

      setCalculatedLot({
        kubHajmi: kubHajmi.toFixed(4),
        tonna: tonna.toFixed(4),
        piecesPerM3
      });
    } else {
      setCalculatedLot({ kubHajmi: '', tonna: '', piecesPerM3: 0 });
    }
  }, [formData.qalinlik, formData.eni, formData.uzunlik, formData.soni, formData.yogochZichligi]);

  // Xaridlarni olish
  const { data: purchaseData, isLoading } = useQuery<{purchases: Purchase[], total: number}>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const response = await axios.get('/purchase');
      return response.data;
    }
  });

  // Lotlarni olish kerak emas - xarid qilganda lot yaratiladi
  // const { data: woodData } = useQuery<{woods: Wood[]}>({
  //   queryKey: ['woods-for-purchase'],
  //   queryFn: async () => {
  //     const response = await axios.get('/wood');
  //     return response.data;
  //   }
  // });

  // Valyuta kurslarini olish
  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    }
  });

  // Yangi xarid qo'shish yoki tahrirlash
  const addPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPurchase) {
        const response = await axios.put(`/purchase/${editingPurchase._id}`, data);
        return response.data;
      } else {
        const response = await axios.post('/purchase', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['woods'] });
      setShowForm(false);
      setEditingPurchase(null);
      setFormData({
        lotCode: '',
        qalinlik: '',
        eni: '',
        uzunlik: '',
        soni: '',
        yogochZichligi: '0.65',
        birlikNarxi: '',
        valyuta: 'RUB',
        sotuvchi: '',
        sotuvchiTelefon: '',
        xaridJoyi: '',
        xaridSanasi: new Date().toISOString().split('T')[0],
        valyutaKursi: '',
        tolovHolati: 'to\'langan',
        shartnoma: '',
        izoh: ''
      });
      showToast.success(t.purchase.saveSuccess);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.errors 
        ? error.response.data.errors.map((e: any) => e.msg).join(', ')
        : error.response?.data?.message || t.purchase.saveError;
      showToast.error(errorMessage);
    }
  });

  // Xaridni o'chirish
  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/purchase/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['woods'] });
      showToast.success(t.purchase.deleteSuccess);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || t.purchase.deleteError;
      showToast.error(errorMessage);
    }
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t.purchase.deletePurchase,
      message: t.purchase.deleteConfirm,
      confirmText: t.common.yes,
      cancelText: t.common.cancel,
      type: 'danger'
    });
    
    if (confirmed) {
      deletePurchaseMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const birlikNarxiValue = Number(formData.birlikNarxi);
    const valyutaKursiValue = Number(formData.valyutaKursi);
    
    if (!formData.birlikNarxi || isNaN(birlikNarxiValue) || birlikNarxiValue <= 0) {
      showToast.error('Iltimos, to\'g\'ri birlik narxini kiriting');
      return;
    }
    
    if (!formData.valyutaKursi || isNaN(valyutaKursiValue) || valyutaKursiValue <= 0) {
      showToast.error('Valyuta kursi topilmadi! Iltimos, "Valyuta Kurslari" sahifasida kursni belgilang.');
      return;
    }
    
    if (!calculatedLot.kubHajmi) {
      showToast.error('Iltimos, o\'lchamlarni to\'liq kiriting');
      return;
    }
    
    const submitData = {
      // Lot ma'lumotlari
      lotCode: formData.lotCode,
      qalinlik: Number(formData.qalinlik),
      eni: Number(formData.eni),
      uzunlik: Number(formData.uzunlik),
      soni: Number(formData.soni),
      yogochZichligi: Number(formData.yogochZichligi),
      // Xarid ma'lumotlari
      birlikNarxi: birlikNarxiValue,
      valyuta: formData.valyuta,
      sotuvchi: formData.sotuvchi,
      sotuvchiTelefon: formData.sotuvchiTelefon,
      xaridJoyi: formData.xaridJoyi,
      xaridSanasi: formData.xaridSanasi,
      valyutaKursi: valyutaKursiValue,
      shartnoma: formData.shartnoma,
      tolovHolati: formData.tolovHolati,
      izoh: formData.izoh
    };
    
    addPurchaseMutation.mutate(submitData);
  };

  const handleFormSubmit = () => {
    const e = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(e);
  };

  // Valyuta o'zgarganda kursni avtomatik to'ldirish
  const handleValyutaChange = (valyuta: string) => {
    setFormData({...formData, valyuta});
    
    if (exchangeRates && Array.isArray(exchangeRates) && exchangeRates.length > 0) {
      const rate = exchangeRates.find((r: any) => r.currency === valyuta);
      if (rate && rate.rate) {
        setFormData(prev => ({...prev, valyuta, valyutaKursi: rate.rate.toString()}));
      }
    }
  };

  const loadExchangeRate = (valyuta: string) => {
    if (exchangeRates && Array.isArray(exchangeRates)) {
      const rate = exchangeRates.find((r: any) => r.currency === valyuta);
      if (rate && rate.rate) {
        return rate.rate.toString();
      }
    }
    return '';
  };

  const handleOpenForm = () => {
    const kurs = loadExchangeRate('RUB');
    setFormData({
      lotCode: '',
      qalinlik: '',
      eni: '',
      uzunlik: '',
      soni: '',
      yogochZichligi: '0.65',
      birlikNarxi: '',
      valyuta: 'RUB',
      sotuvchi: '',
      sotuvchiTelefon: '',
      xaridJoyi: '',
      xaridSanasi: new Date().toISOString().split('T')[0],
      valyutaKursi: kurs,
      tolovHolati: 'to\'langan',
      shartnoma: '',
      izoh: ''
    });
    setEditingPurchase(null);
    setShowForm(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      lotCode: purchase.woodLot?.lotCode || '',
      qalinlik: purchase.woodLot?.qalinlik?.toString() || '',
      eni: purchase.woodLot?.eni?.toString() || '',
      uzunlik: purchase.woodLot?.uzunlik?.toString() || '',
      soni: purchase.woodLot?.soni?.toString() || '',
      yogochZichligi: purchase.woodLot?.yogochZichligi?.toString() || '0.65',
      birlikNarxi: purchase.birlikNarxi.toString(),
      valyuta: purchase.valyuta,
      sotuvchi: purchase.sotuvchi,
      sotuvchiTelefon: purchase.sotuvchiTelefon || '',
      xaridJoyi: purchase.xaridJoyi,
      xaridSanasi: new Date(purchase.xaridSanasi).toISOString().split('T')[0],
      valyutaKursi: purchase.valyutaKursi.toString(),
      tolovHolati: purchase.tolovHolati,
      shartnoma: purchase.shartnoma || '',
      izoh: purchase.izoh || ''
    });
    setShowForm(true);
  };

  // Jami summani hisoblash
  const calculateTotal = () => {
    if (!calculatedLot.kubHajmi || !formData.birlikNarxi) return null;
    
    const birlikNarxi = Number(formData.birlikNarxi);
    const valyutaKursi = Number(formData.valyutaKursi) || 0;
    const kubHajmi = Number(calculatedLot.kubHajmi);
    const jamiSumma = birlikNarxi * kubHajmi;
    const jamiRUB = valyutaKursi > 0 ? (formData.valyuta === 'USD' ? jamiSumma * valyutaKursi : jamiSumma) : 0;
    
    return {
      jamiSumma,
      kubHajmi,
      jamiRUB,
      profitPreview: null, // Xaridda foyda yo'q
      wood: null
    };
  };

  const total = calculateTotal();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {t.purchase.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {t.purchase.purchaseInfo}
            </p>
          </div>
          <Button
            onClick={handleOpenForm}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            {t.purchase.addPurchase}
          </Button>
        </div>

        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={editingPurchase ? t.purchase.editPurchase : t.purchase.addPurchase}
          size="lg"
        >
          <ModalBody>
            <div className="space-y-6">
              {/* QADAM 1: O'lchamlar */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">1</span>
                  {t.purchase.lotInfo}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.lotCode} *</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={formData.lotCode}
                      onChange={(e) => setFormData({...formData, lotCode: e.target.value})}
                      placeholder="LOT-2024-001"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.thickness} (mm) *</label>
                      <input
                        type="number"
                        required
                        className="input-field"
                        value={formData.qalinlik}
                        onChange={(e) => setFormData({...formData, qalinlik: e.target.value})}
                        placeholder="31"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.width} (mm) *</label>
                      <input
                        type="number"
                        required
                        className="input-field"
                        value={formData.eni}
                        onChange={(e) => setFormData({...formData, eni: e.target.value})}
                        placeholder="125"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.length} (m) *</label>
                      <input
                        type="number"
                        required
                        className="input-field"
                        value={formData.uzunlik}
                        onChange={(e) => setFormData({...formData, uzunlik: e.target.value})}
                        placeholder="6"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.quantity} *</label>
                      <input
                        type="number"
                        required
                        className="input-field"
                        value={formData.soni}
                        onChange={(e) => setFormData({...formData, soni: e.target.value})}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  {/* Avtomatik hisoblangan natijalar */}
                  {calculatedLot.kubHajmi && (
                    <div className="bg-white border border-blue-300 rounded-lg p-3">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">{t.purchase.volume}:</span>
                          <div className="font-bold text-blue-600">{calculatedLot.kubHajmi} {t.purchase.cubicMeters}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t.purchase.weight}:</span>
                          <div className="font-bold text-blue-600">{calculatedLot.tonna} {t.purchase.tons}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">1 m³:</span>
                          <div className="font-bold text-blue-600">{calculatedLot.piecesPerM3} {t.purchase.pieces}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* QADAM 2: Lot tanlash o'rniga o'lchamlar kiritildi */}
              {/* Eski lot tanlash qismi olib tashlandi */}

              <Card className="p-4">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.purchase.purchaseInfo}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.unitPrice}</label>
                    <FormattedInput
                      value={formData.birlikNarxi}
                      onChange={(value) => setFormData({...formData, birlikNarxi: value})}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.common.currency}</label>
                    <select
                      className="input-field"
                      value={formData.valyuta}
                      onChange={(e) => handleValyutaChange(e.target.value)}
                    >
                      <option value="RUB">RUB</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.purchase.seller}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.seller}</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={formData.sotuvchi}
                      onChange={(e) => setFormData({...formData, sotuvchi: e.target.value})}
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.purchase.sellerPhone}</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.sotuvchiTelefon}
                      onChange={(e) => setFormData({...formData, sotuvchiTelefon: e.target.value})}
                      placeholder="+7 xxx xxx xx xx"
                    />
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.purchase.purchasePlace}</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.xaridJoyi}
                    onChange={(e) => setFormData({...formData, xaridJoyi: e.target.value})}
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.purchase.purchaseDate}</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.xaridSanasi}
                    onChange={(e) => setFormData({...formData, xaridSanasi: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.purchase.exchangeRate}
                  </label>
                  <div className="input-field bg-gray-50 cursor-not-allowed flex items-center justify-between">
                    <span className="text-gray-700 font-semibold">
                      {formData.valyutaKursi ? 
                        (formData.valyuta === 'USD' ? 
                          `1 USD = ${formatNumber(Number(formData.valyutaKursi))} RUB` : 
                          `1 RUB = ${formatNumber(Number(formData.valyutaKursi))} USD`
                        ) : 
                        t.dashboard.noRatesSet
                      }
                    </span>
                    <a 
                      href="/exchange-rates" 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                      title={t.dashboard.setRates}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t.dashboard.setRates}
                    </a>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.purchase.contract}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.shartnoma}
                    onChange={(e) => setFormData({...formData, shartnoma: e.target.value})}
                    placeholder="SH-2024-001"
                  />
                </div>
              </div>

              {total && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {t.purchase.totalAmount}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{t.purchase.volume}:</span>
                      <span className="font-bold text-gray-900">{formatNumber(total.kubHajmi)} {t.purchase.cubicMeters}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">{t.common.total} ({formData.valyuta}):</span>
                      <span className="font-bold text-gray-900">{formatCurrency(total.jamiSumma, formData.valyuta)}</span>
                    </div>
                    {total.jamiRUB > 0 && (
                      <div className="flex justify-between text-lg border-t border-green-300 pt-2 mt-2">
                        <span className="text-green-900 font-semibold">{t.common.total} (RUB):</span>
                        <span className="font-bold text-green-900">{formatCurrency(total.jamiRUB, 'RUB')}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.purchase.notes}</label>
                <textarea
                  rows={2}
                  className="input-field"
                  value={formData.izoh}
                  onChange={(e) => setFormData({...formData, izoh: e.target.value})}
                  placeholder=""
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingPurchase(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleFormSubmit}
              loading={addPurchaseMutation.isPending}
            >
              {editingPurchase ? t.common.update : t.common.save}
            </Button>
          </ModalFooter>
        </Modal>

        <Table
          title={t.purchase.title}
          subtitle={`${t.common.total}: ${purchaseData?.purchases?.length || 0}`}
        >
          <TableHeader>
            <TableHead>{t.purchase.lotCode}</TableHead>
            <TableHead>{t.purchase.seller}</TableHead>
            <TableHead>{t.purchase.unitPrice}</TableHead>
            <TableHead>{t.common.total}</TableHead>
            <TableHead>{t.common.date}</TableHead>
            <TableHead>{t.common.actions}</TableHead>
          </TableHeader>
          <TableBody loading={isLoading} empty={!purchaseData?.purchases?.length}>
            {purchaseData?.purchases?.map((purchase) => (
              <TableRow key={purchase._id}>
                <TableCell>
                  <div className="text-sm font-bold text-gray-900">{purchase.woodLot?.lotCode}</div>
                  <div className="text-xs text-gray-600">{formatNumber(purchase.woodLot?.kubHajmi)} m³</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-semibold text-gray-900">{purchase.sotuvchi}</div>
                  <div className="text-xs text-gray-600">{purchase.xaridJoyi}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(purchase.birlikNarxi, purchase.valyuta)}/m³
                  </div>
                  <div className="text-xs text-gray-600">{t.exchangeRates.rate}: {formatNumber(purchase.valyutaKursi)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-orange-600">
                    {formatCurrency(purchase.jamiSumma, purchase.valyuta)}
                  </div>
                  <div className="text-xs text-green-600">{formatCurrency(purchase.jamiRUB || 0, 'RUB')}</div>
                </TableCell>
                <TableCell className="text-sm text-gray-600 font-medium">
                  {new Date(purchase.xaridSanasi).toLocaleDateString('uz-UZ')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(purchase)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      title={t.common.edit}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(purchase._id)}
                      disabled={deletePurchaseMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                      title={t.common.delete}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog />
    </Layout>
  );
}

export default function PurchasePage() {
  return (
    <LanguageProvider>
      <PurchaseContent />
    </LanguageProvider>
  );
}
