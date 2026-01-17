'use client';

import { useState } from 'react';
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

interface Sale {
  _id: string;
  woodLot: {
    _id: string;
    lotCode: string;
    kubHajmi: number;
  };
  birlikNarxi: number;
  valyuta: string;
  jamiSumma: number;
  xaridor: string;
  xaridorTelefon?: string;
  sotuvJoyi: string;
  sotuvSanasi: string;
  valyutaKursi: number;
  jamiRUB: number;
  tolovHolati: string;
  shartnoma?: string;
  izoh?: string;
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

function SaleContent() {
  const { t } = useLanguage();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    woodLot: '',
    birlikNarxi: '',
    valyuta: 'RUB',
    xaridor: '',
    xaridorTelefon: '',
    sotuvJoyi: '',
    sotuvSanasi: new Date().toISOString().split('T')[0],
    valyutaKursi: '',
    tolovHolati: 'to\'langan',
    shartnoma: '',
    izoh: ''
  });

  const queryClient = useQueryClient();

  const { data: saleData, isLoading } = useQuery<{sales: Sale[], total: number}>({
    queryKey: ['sales'],
    queryFn: async () => {
      const response = await axios.get('/sale');
      return response.data;
    }
  });

  const { data: woodData } = useQuery<{woods: Wood[]}>({
    queryKey: ['woods-for-sale'],
    queryFn: async () => {
      const response = await axios.get('/wood');
      // Faqat sotilmagan lotlarni ko'rsatish
      const availableWoods = response.data.woods?.filter((wood: Wood) => wood.status !== 'sotildi') || [];
      return { ...response.data, woods: availableWoods };
    }
  });

  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    }
  });

  const addSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingSale) {
        const response = await axios.put(`/sale/${editingSale._id}`, data);
        return response.data;
      } else {
        const response = await axios.post('/sale', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['woods'] });
      setShowForm(false);
      setEditingSale(null);
      setFormData({
        woodLot: '',
        birlikNarxi: '',
        valyuta: 'RUB',
        xaridor: '',
        xaridorTelefon: '',
        sotuvJoyi: '',
        sotuvSanasi: new Date().toISOString().split('T')[0],
        valyutaKursi: '',
        tolovHolati: 'to\'langan',
        shartnoma: '',
        izoh: ''
      });
      showToast.success(t.sale.saveSuccess);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.errors 
        ? error.response.data.errors.map((e: any) => e.msg).join(', ')
        : error.response?.data?.message || t.sale.saveError;
      showToast.error(errorMessage);
    }
  });

  // Sotuvni o'chirish
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/sale/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['woods'] });
      showToast.success(t.sale.deleteSuccess);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || t.sale.deleteError;
      showToast.error(errorMessage);
    }
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t.sale.deleteSale,
      message: t.sale.deleteConfirm,
      confirmText: t.common.yes,
      cancelText: t.common.cancel,
      type: 'danger'
    });
    
    if (confirmed) {
      deleteSaleMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const birlikNarxiValue = Number(formData.birlikNarxi);
    const valyutaKursiValue = Number(formData.valyutaKursi);
    
    console.log('📤 Yuborilayotgan ma\'lumotlar:', {
      birlikNarxi: formData.birlikNarxi,
      valyutaKursi: formData.valyutaKursi,
      birlikNarxiValue,
      valyutaKursiValue
    });
    
    if (!formData.birlikNarxi || isNaN(birlikNarxiValue) || birlikNarxiValue <= 0) {
      showToast.error('Iltimos, to\'g\'ri birlik narxini kiriting');
      return;
    }
    
    if (!formData.valyutaKursi || isNaN(valyutaKursiValue) || valyutaKursiValue <= 0) {
      showToast.error('Valyuta kursi topilmadi! Iltimos, "Valyuta Kurslari" sahifasida kursni belgilang.');
      return;
    }
    
    const submitData = {
      ...formData,
      birlikNarxi: birlikNarxiValue,
      valyutaKursi: valyutaKursiValue
    };
    
    addSaleMutation.mutate(submitData);
  };

  const handleFormSubmit = () => {
    const e = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(e);
  };

  const handleValyutaChange = (valyuta: string) => {
    setFormData({...formData, valyuta});
    
    if (exchangeRates && Array.isArray(exchangeRates)) {
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
    console.log('🔍 exchangeRates:', exchangeRates);
    const kurs = loadExchangeRate('RUB');
    console.log('💱 Yuklangan kurs:', kurs);
    
    setFormData({
      woodLot: '',
      birlikNarxi: '',
      valyuta: 'RUB',
      xaridor: '',
      xaridorTelefon: '',
      sotuvJoyi: '',
      sotuvSanasi: new Date().toISOString().split('T')[0],
      valyutaKursi: kurs,
      tolovHolati: 'to\'langan',
      shartnoma: '',
      izoh: ''
    });
    setShowForm(true);
  };

  const calculateTotal = () => {
    if (!formData.woodLot || !formData.birlikNarxi) return null;
    
    const wood = woodData?.woods?.find(w => w._id === formData.woodLot);
    if (!wood) return null;
    
    const birlikNarxi = Number(formData.birlikNarxi);
    const valyutaKursi = Number(formData.valyutaKursi) || 1;
    let jamiSumma = birlikNarxi * wood.kubHajmi;
    let jamiRUB = 0;
    let jamiUSD = 0;
    
    if (formData.valyuta === 'USD') {
      jamiUSD = jamiSumma;
      jamiRUB = jamiSumma * valyutaKursi; // USD -> RUB
    } else {
      jamiRUB = jamiSumma;
      // RUB -> USD konvertatsiya uchun RUB kursini topish
      const rubRate = exchangeRates?.find((r: any) => r.currency === 'RUB');
      if (rubRate && rubRate.rate) {
        jamiUSD = jamiSumma * rubRate.rate; // RUB -> USD
      }
    }
    
    // Foyda hisoblash (RUB asosida)
    let profitPreview = null;
    if (jamiRUB > 0 && (wood.jami_xarid || wood.jami_xarajat)) {
      const expectedProfit = jamiRUB - (wood.jami_xarid || 0) - (wood.jami_xarajat || 0);
      const profitPercent = (wood.jami_xarid && wood.jami_xarid > 0) ? (expectedProfit / wood.jami_xarid) * 100 : 0;
      profitPreview = { expectedProfit, profitPercent };
    }
    
    return {
      jamiSumma,
      kubHajmi: wood.kubHajmi,
      jamiRUB,
      jamiUSD,
      profitPreview,
      wood // wood obyektini ham qaytaramiz
    };
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      woodLot: sale.woodLot._id,
      birlikNarxi: sale.birlikNarxi.toString(),
      valyuta: sale.valyuta,
      xaridor: sale.xaridor,
      xaridorTelefon: sale.xaridorTelefon || '',
      sotuvJoyi: sale.sotuvJoyi,
      sotuvSanasi: new Date(sale.sotuvSanasi).toISOString().split('T')[0],
      valyutaKursi: sale.valyutaKursi.toString(),
      tolovHolati: sale.tolovHolati,
      shartnoma: sale.shartnoma || '',
      izoh: sale.izoh || ''
    });
    setShowForm(true);
  };

  const total = calculateTotal();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.sale.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {t.sale.title}
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
            {t.sale.addSale}
          </Button>
        </div>

        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingSale(null);
          }}
          title={editingSale ? t.sale.editSale : t.sale.addSale}
          size="lg"
        >
          <ModalBody>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.sale.selectLot}</label>
                <SearchableSelect
                  options={woodData?.woods?.map((wood) => ({
                    value: wood._id,
                    label: wood.lotCode,
                    subtitle: `${formatNumber(wood.kubHajmi)} m³`
                  })) || []}
                  value={formData.woodLot}
                  onChange={(value) => setFormData({...formData, woodLot: value})}
                  placeholder={t.sale.selectLot}
                  required
                />
              </div>

              <Card className="p-4">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.sale.unitPrice}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.sale.unitPrice}</label>
                    <FormattedInput
                      value={formData.birlikNarxi}
                      onChange={(value) => setFormData({...formData, birlikNarxi: value})}
                      placeholder="1500"
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
                  {t.sale.buyer}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.sale.buyer}</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={formData.xaridor}
                      onChange={(e) => setFormData({...formData, xaridor: e.target.value})}
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.sale.buyerPhone}</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.xaridorTelefon}
                      onChange={(e) => setFormData({...formData, xaridorTelefon: e.target.value})}
                      placeholder="+7 xxx xxx xx xx"
                    />
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.sale.salePlace}</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.sotuvJoyi}
                    onChange={(e) => setFormData({...formData, sotuvJoyi: e.target.value})}
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.sale.saleDate}</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.sotuvSanasi}
                    onChange={(e) => setFormData({...formData, sotuvSanasi: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.sale.exchangeRate}
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
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Kurs "Valyuta Kurslari" sahifasidan avtomatik olinadi
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.sale.contract}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.shartnoma}
                    onChange={(e) => setFormData({...formData, shartnoma: e.target.value})}
                    placeholder="SH-2024-002"
                  />
                </div>
              </div>

              {total && (
                <>
                  <Card className="p-4 bg-emerald-50 border-emerald-200">
                    <h4 className="font-semibold text-emerald-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {t.sale.totalAmount}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{t.sale.volume}:</span>
                        <span className="font-bold text-gray-900">{formatNumber(total.kubHajmi)} {t.sale.cubicMeters}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{t.common.total} ({formData.valyuta}):</span>
                        <span className="font-bold text-gray-900">{formatCurrency(total.jamiSumma, formData.valyuta)}</span>
                      </div>
                      {total.jamiRUB > 0 && (
                        <div className="flex justify-between text-lg border-t border-emerald-300 pt-2 mt-2">
                          <span className="text-emerald-900 font-semibold">{t.common.total} (RUB):</span>
                          <span className="font-bold text-emerald-900">{formatCurrency(total.jamiRUB, 'RUB')}</span>
                        </div>
                      )}
                      {total.jamiUSD > 0 && (
                        <div className="flex justify-between text-sm text-emerald-700">
                          <span>≈ USD:</span>
                          <span className="font-semibold">{formatCurrency(total.jamiUSD, 'USD')}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Foyda Preview */}
                  {total.profitPreview && (
                    <Card className={`p-4 ${total.profitPreview.expectedProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <h4 className={`font-semibold mb-3 flex items-center ${total.profitPreview.expectedProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        💰 {t.wood.netProfit}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{t.sale.title}:</span>
                          <span className="font-bold text-green-600">+{formatCurrency(total.jamiRUB, 'RUB')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{t.purchase.title}:</span>
                          <span className="font-bold text-red-600">-{formatCurrency(total.wood?.jami_xarid || 0, 'RUB')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{t.expense.title}:</span>
                          <span className="font-bold text-red-600">-{formatCurrency(total.wood?.jami_xarajat || 0, 'RUB')}</span>
                        </div>
                        <div className={`flex justify-between text-lg border-t pt-2 mt-2 ${total.profitPreview.expectedProfit >= 0 ? 'border-green-300' : 'border-red-300'}`}>
                          <span className={`font-semibold ${total.profitPreview.expectedProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                            {t.wood.netProfit}:
                          </span>
                          <div className="text-right">
                            <div className={`font-bold text-xl ${total.profitPreview.expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(total.profitPreview.expectedProfit, 'RUB')}
                            </div>
                            <div className={`text-sm ${total.profitPreview.expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({total.profitPreview.profitPercent.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                      {total.profitPreview.expectedProfit < 0 && (
                        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {t.common.warning}
                        </div>
                      )}
                    </Card>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.sale.notes}</label>
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
                setEditingSale(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleFormSubmit}
              loading={addSaleMutation.isPending}
            >
              {editingSale ? t.common.update : t.common.save}
            </Button>
          </ModalFooter>
        </Modal>

        <Table
          title={t.sale.title}
          subtitle={`${t.common.total}: ${saleData?.sales?.length || 0}`}
        >
          <TableHeader>
            <TableHead>{t.sale.lot}</TableHead>
            <TableHead>{t.sale.buyer}</TableHead>
            <TableHead>{t.sale.unitPrice}</TableHead>
            <TableHead>{t.common.total}</TableHead>
            <TableHead>{t.common.date}</TableHead>
            <TableHead>{t.common.actions}</TableHead>
          </TableHeader>
          <TableBody loading={isLoading} empty={!saleData?.sales?.length}>
            {saleData?.sales?.map((sale) => (
              <TableRow key={sale._id}>
                <TableCell>
                  <div className="text-sm font-bold text-gray-900">{sale.woodLot?.lotCode}</div>
                  <div className="text-xs text-gray-600">{formatNumber(sale.woodLot?.kubHajmi)} m³</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-semibold text-gray-900">{sale.xaridor}</div>
                  <div className="text-xs text-gray-600">{sale.sotuvJoyi}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(sale.birlikNarxi, sale.valyuta)}/m³
                  </div>
                  <div className="text-xs text-gray-600">{t.exchangeRates.rate}: {formatNumber(sale.valyutaKursi)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-emerald-600">
                    {formatCurrency(sale.jamiSumma, sale.valyuta)}
                  </div>
                  <div className="text-xs text-green-600">{formatCurrency(sale.jamiRUB || 0, sale.valyuta === 'USD' ? 'RUB' : 'USD')}</div>
                </TableCell>
                <TableCell className="text-sm text-gray-600 font-medium">
                  {new Date(sale.sotuvSanasi).toLocaleDateString('uz-UZ')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(sale)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      title={t.common.edit}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(sale._id)}
                      disabled={deleteSaleMutation.isPending}
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

export default function SalePage() {
  return (
    <LanguageProvider>
      <SaleContent />
    </LanguageProvider>
  );
}
