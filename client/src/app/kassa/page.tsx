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

interface Kassa {
  _id: string;
  turi: string;
  xarajatTuri?: string;
  summa: number;
  valyuta: string;
  summaRUB: number;
  tavsif: string;
  sana: string;
  yaratuvchi: {
    username: string;
  };
  woodLot?: {
    _id: string;
    lotCode: string;
  };
  purchase?: { _id: string };
  sale?: { _id: string };
  expense?: { _id: string };
}

function KassaContent() {
  const { t } = useLanguage();
  const { confirm, ConfirmDialog } = useConfirm();
  
  // Dynamic labels using translations
  const turiLabels: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
    prixod: { 
      label: t.kassa.income, 
      color: 'text-green-600 bg-green-50', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
    },
    rasxod: { 
      label: t.kassa.expense, 
      color: 'text-red-600 bg-red-50', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
    },
    otpr: { 
      label: t.kassa.shipment, 
      color: 'text-blue-600 bg-blue-50', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
    },
    klent_prixod: { 
      label: t.kassa.clientPayment, 
      color: 'text-purple-600 bg-purple-50', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
  };

  const xarajatTuriLabels: Record<string, { label: string; icon: React.ReactElement }> = {
    transport_kelish: { 
      label: t.kassa.transportIn, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    },
    transport_ketish: { 
      label: t.kassa.transportOut, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
    },
    bojxona_kelish: { 
      label: t.kassa.customsIn, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    },
    bojxona_ketish: { 
      label: t.kassa.customsOut, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    },
    yuklash_tushirish: { 
      label: t.kassa.loading, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },
    saqlanish: { 
      label: t.kassa.storage, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },
    ishchilar: { 
      label: t.kassa.workers, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    qayta_ishlash: { 
      label: t.kassa.processing, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    boshqa: { 
      label: t.kassa.other, 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [filterTuri, setFilterTuri] = useState('');
  const [formData, setFormData] = useState({
    turi: 'rasxod',
    xarajatTuri: 'transport_kelish',
    summa: '',
    valyuta: 'RUB',
    valyutaKursi: '',
    tavsif: '',
    woodLot: '',
    sana: new Date().toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

  // Kassa yozuvlarini olish
  const { data: kassaData, isLoading } = useQuery<{ kassa: Kassa[], total: number }>({
    queryKey: ['kassa', filterTuri],
    queryFn: async () => {
      const url = filterTuri ? `/kassa?turi=${filterTuri}` : '/kassa';
      const response = await axios.get(url);
      return response.data;
    }
  });

  // Lotlarni olish
  const { data: woodData } = useQuery({
    queryKey: ['woods-for-kassa'],
    queryFn: async () => {
      const response = await axios.get('/wood');
      return response.data;
    }
  });

  // Valyuta kurslarini olish
  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    }
  });

  // Yangi yozuv qo'shish
  const addKassaMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/kassa', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kassa'] });
      setShowForm(false);
      setFormData({
        turi: 'rasxod',
        xarajatTuri: 'transport_kelish',
        summa: '',
        valyuta: 'RUB',
        valyutaKursi: '',
        tavsif: '',
        woodLot: '',
        sana: new Date().toISOString().split('T')[0]
      });
      showToast.success(t.kassa.saveSuccess);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || t.messages.errorOccurred;
      showToast.error(t.messages.error + ': ' + errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const summaValue = Number(formData.summa);
    if (!formData.summa || isNaN(summaValue) || summaValue <= 0) {
      showToast.error(t.expense.enterAmount);
      return;
    }

    // Asosiy valyutada qiymatini hisoblash (RUB)
    let summaRUB = summaValue;
    let summaUSD = 0;
    
    if (formData.valyuta === 'USD') {
      const kurs = Number(formData.valyutaKursi);
      if (!kurs || kurs <= 0) {
        showToast.error('Iltimos, valyuta kursini kiriting');
        return;
      }
      summaRUB = summaValue * kurs; // USD -> RUB
    } else if (formData.valyuta === 'RUB') {
      // RUB -> USD konvertatsiya uchun
      const usdRate = exchangeRates?.find((r: any) => r.currency === 'RUB');
      if (usdRate && usdRate.rate) {
        summaUSD = summaValue * usdRate.rate; // RUB -> USD
      }
    }

    const submitData: any = {
      turi: formData.turi,
      summa: summaValue,
      valyuta: formData.valyuta,
      summaRUB,
      summaUSD,
      tavsif: formData.tavsif,
      sana: formData.sana
    };

    if (formData.turi === 'rasxod' && formData.xarajatTuri) {
      submitData.xarajatTuri = formData.xarajatTuri;
    }

    if (formData.woodLot) {
      submitData.woodLot = formData.woodLot;
    }

    addKassaMutation.mutate(submitData);
  };

  const handleFormSubmit = () => {
    const e = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(e);
  };

  // Valyuta o'zgarganda kursni yuklash
  const handleValyutaChange = (valyuta: string) => {
    setFormData({...formData, valyuta});
    
    if (exchangeRates && Array.isArray(exchangeRates)) {
      const rate = exchangeRates.find((r: any) => r.currency === valyuta);
      if (rate && rate.rate) {
        setFormData(prev => ({...prev, valyuta, valyutaKursi: rate.rate.toString()}));
      }
    }
  };

  // Balansni hisoblash (RUB asosida)
  const calculateBalance = () => {
    if (!kassaData?.kassa) return { kirim: 0, chiqim: 0, balans: 0 };
    
    const kirim = kassaData.kassa
      .filter(k => k.turi === 'prixod' || k.turi === 'klent_prixod')
      .reduce((sum, k) => sum + (k.summaRUB || 0), 0);
    
    const chiqim = kassaData.kassa
      .filter(k => k.turi === 'rasxod' || k.turi === 'otpr')
      .reduce((sum, k) => sum + (k.summaRUB || 0), 0);
    
    return {
      kirim,
      chiqim,
      balans: kirim - chiqim
    };
  };

  const balance = calculateBalance();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {t.kassa.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {t.kassa.subtitle}
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            {t.kassa.addTransaction}
          </Button>
        </div>

        {/* Balans kartochkalari */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">{t.kassa.totalIncome}</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(balance.kirim, 'RUB')}</p>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">{t.kassa.totalExpense}</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(balance.chiqim, 'RUB')}</p>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Card>
          
          <Card className={`p-6 bg-gradient-to-br ${balance.balans >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${balance.balans >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balans</p>
                <p className={`text-2xl font-bold mt-1 ${balance.balans >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                  {formatCurrency(balance.balans, 'RUB')}
                </p>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {balance.balans >= 0 ? (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Filter */}
        <Card className="p-4">
          <div className="flex gap-4 items-center">
            <label className="font-medium">Filter:</label>
            <select
              value={filterTuri}
              onChange={(e) => setFilterTuri(e.target.value)}
              className="input-field"
            >
              <option value="">{t.kassa.allTransactions}</option>
              <option value="prixod">{t.kassa.income}</option>
              <option value="rasxod">{t.kassa.expense}</option>
              <option value="otpr">{t.kassa.shipment}</option>
              <option value="klent_prixod">{t.kassa.clientPayment}</option>
            </select>
          </div>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={t.kassa.newTransaction}
          size="lg"
        >
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.typeLabel} *</label>
                <select
                  className="input-field"
                  value={formData.turi}
                  onChange={(e) => setFormData({...formData, turi: e.target.value})}
                  required
                >
                  <option value="prixod">{t.kassa.income}</option>
                  <option value="rasxod">{t.kassa.expenseIncome}</option>
                  <option value="otpr">{t.kassa.shipment}</option>
                  <option value="klent_prixod">{t.kassa.clientPayment}</option>
                </select>
              </div>

              {formData.turi === 'rasxod' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.expenseTypeLabel} *</label>
                  <select
                    className="input-field"
                    value={formData.xarajatTuri}
                    onChange={(e) => setFormData({...formData, xarajatTuri: e.target.value})}
                  >
                    {Object.entries(xarajatTuriLabels).map(([value, data]) => (
                      <option key={value} value={value}>{data.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.lotLabel}</label>
                <SearchableSelect
                  options={woodData?.woods?.map((wood: any) => ({
                    value: wood._id,
                    label: wood.lotCode,
                    subtitle: `${formatNumber(wood.kubHajmi)} m³`
                  })) || []}
                  value={formData.woodLot}
                  onChange={(value) => setFormData({...formData, woodLot: value})}
                  placeholder={t.kassa.lotPlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.amountLabel} *</label>
                  <FormattedInput
                    value={formData.summa}
                    onChange={(value) => setFormData({...formData, summa: value})}
                    placeholder="1000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.currencyLabel} *</label>
                  <select
                    className="input-field"
                    value={formData.valyuta}
                    onChange={(e) => handleValyutaChange(e.target.value)}
                  >
                    <option value="RUB">RUB (Rubl)</option>
                    <option value="USD">USD (Dollar)</option>
                  </select>
                </div>
              </div>

              {formData.valyuta !== 'RUB' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.exchangeRateLabel}</label>
                  <FormattedInput
                    value={formData.valyutaKursi}
                    onChange={(value) => setFormData({...formData, valyutaKursi: value})}
                    placeholder="95.50"
                  />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formData.valyuta === 'USD' ? '1 USD = ? RUB' : '1 RUB = ? USD'}: {formData.valyutaKursi || t.kassa.exchangeRateNotFound}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.descriptionLabel} *</label>
                <textarea
                  rows={3}
                  className="input-field"
                  value={formData.tavsif}
                  onChange={(e) => setFormData({...formData, tavsif: e.target.value})}
                  placeholder={t.kassa.descriptionPlaceholder}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.kassa.dateLabel} *</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.sana}
                  onChange={(e) => setFormData({...formData, sana: e.target.value})}
                  required
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleFormSubmit}
              loading={addKassaMutation.isPending}
            >
              {t.common.save}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Jadval */}
        <Table
          title={t.kassa.kassaRecords}
          subtitle={`${t.kassa.total}: ${kassaData?.kassa?.length || 0} ${t.kassa.records}`}
        >
          <TableHeader>
            <TableHead>{t.kassa.type}</TableHead>
            <TableHead>{t.kassa.description}</TableHead>
            <TableHead>{t.kassa.lot}</TableHead>
            <TableHead>{t.kassa.amount}</TableHead>
            <TableHead>{t.kassa.date}</TableHead>
            <TableHead>{t.common.user}</TableHead>
          </TableHeader>
          <TableBody loading={isLoading} empty={!kassaData?.kassa?.length}>
            {kassaData?.kassa?.map((item) => {
              const turiInfo = turiLabels[item.turi] || { 
                label: item.turi, 
                color: 'text-gray-600', 
                icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              };
              return (
                <TableRow key={item._id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${turiInfo.color}`}>
                        {turiInfo.icon} {turiInfo.label}
                      </span>
                      {item.xarajatTuri && xarajatTuriLabels[item.xarajatTuri] && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          {xarajatTuriLabels[item.xarajatTuri].icon}
                          {xarajatTuriLabels[item.xarajatTuri].label}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{item.tavsif}</div>
                    {(item.purchase || item.sale || item.expense) && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        {item.purchase && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Xarid
                          </span>
                        )}
                        {item.sale && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Sotuv
                          </span>
                        )}
                        {item.expense && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            Xarajat
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.woodLot ? (
                      <span className="text-sm font-medium text-blue-600">{item.woodLot.lotCode}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.summa, item.valyuta)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatCurrency(item.summaRUB || 0, 'RUB')}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(item.sana).toLocaleDateString('uz-UZ')}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.yaratuvchi?.username}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog />
    </Layout>
  );
}

export default function KassaPage() {
  return (
    <LanguageProvider>
      <KassaContent />
    </LanguageProvider>
  );
}
