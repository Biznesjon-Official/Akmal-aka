'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import FormattedInput from '@/components/FormattedInput';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { showToast } from '@/utils/toast';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

interface ExchangeRate {
  _id: string;
  currency: string;
  rate: number;
  lastUpdated: string;
  updatedBy?: {
    username: string;
  } | null;
}

function ExchangeRatesContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [formData, setFormData] = useState({
    currency: 'USD',
    rate: ''
  });

  // Valyuta kurslarini olish
  const { data: exchangeRates, isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await axios.get('/exchange-rate');
      return response.data;
    }
  });

  // Valyuta kursini yangilash/yaratish
  const updateRateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post('/exchange-rate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      setShowForm(false);
      setEditingRate(null);
      setFormData({
        currency: 'USD',
        rate: ''
      });
      showToast.success(t.exchangeRates.updateSuccess);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || t.exchangeRates.updateError;
      showToast.error(errorMessage);
    }
  });

  // Faqat admin ko'ra oladi
  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="container-full-desktop text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">{t.exchangeRates.noAccess}</h2>
          <p className="mt-2 text-gray-600">{t.exchangeRates.noAccessMessage}</p>
        </div>
      </Layout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      currency: formData.currency,
      rate: Number(formData.rate)
    };
    updateRateMutation.mutate(submitData);
  };

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setFormData({
      currency: rate.currency,
      rate: rate.rate.toString()
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRate(null);
    setFormData({
      currency: 'USD',
      rate: ''
    });
  };

  const handleFormSubmit = () => {
    const e = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(e);
  };

  return (
    <Layout>
      <div className="container-full-desktop space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg className="w-8 h-8 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.exchangeRates.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {t.exchangeRates.subtitle}
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
            {t.exchangeRates.updateButton}
          </Button>
        </div>

        <Modal
          isOpen={showForm}
          onClose={handleCloseForm}
          title={editingRate ? t.exchangeRates.updateTitle : t.exchangeRates.addTitle}
        >
          <ModalBody>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t.common.currency}</label>
                <select
                  className="input-field"
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  disabled={!!editingRate}
                >
                  <option value="USD">USD (Dollar)</option>
                  <option value="RUB">RUB (Rubl)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {formData.currency === 'USD' ? '1 USD = ? RUB' : '1 RUB = ? USD'}
                </label>
                <FormattedInput
                  value={formData.rate}
                  onChange={(value) => setFormData({...formData, rate: value})}
                  placeholder={formData.currency === 'USD' ? '95.50' : '0.0105'}
                  required
                  step="0.0001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.currency === 'USD' ? 'USD → RUB kursi' : 'RUB → USD kursi'}
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={handleCloseForm}
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleFormSubmit}
              loading={updateRateMutation.isPending}
            >
              {t.common.save}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Joriy kurslar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 text-center py-8">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100 transition ease-in-out duration-150">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.exchangeRates.loading}
              </div>
            </div>
          ) : (
            <>
              {/* USD kursi */}
              {(() => {
                const usdRate = exchangeRates?.find(rate => rate.currency === 'USD');
                return (
                  <StatsCard
                    title="USD → RUB"
                    value={usdRate ? `1 USD = ${formatNumber(usdRate.rate)} RUB` : t.exchangeRates.notSet}
                    subtitle={usdRate && usdRate.updatedBy ? `${t.exchangeRates.updatedBy}: ${usdRate.updatedBy.username}` : 'Dollar → Rubl kursi'}
                    color="green"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                );
              })()}

              {/* RUB kursi */}
              {(() => {
                const rubRate = exchangeRates?.find(rate => rate.currency === 'RUB');
                return (
                  <StatsCard
                    title="RUB → USD"
                    value={rubRate ? `1 RUB = ${formatNumber(rubRate.rate)} USD` : t.exchangeRates.notSet}
                    subtitle={rubRate && rubRate.updatedBy ? `${t.exchangeRates.updatedBy}: ${rubRate.updatedBy.username}` : 'Rubl → Dollar kursi'}
                    color="blue"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                );
              })()}
            </>
          )}
        </div>

        <Table
          title={t.exchangeRates.rateHistory}
          subtitle={`${t.common.total}: ${exchangeRates?.length || 0} ${t.exchangeRates.rates}`}
        >
          <TableHeader>
            <TableHead>{t.common.currency}</TableHead>
            <TableHead>Kurs</TableHead>
            <TableHead>{t.exchangeRates.lastUpdated}</TableHead>
            <TableHead>{t.exchangeRates.updatedBy}</TableHead>
            <TableHead>{t.exchangeRates.actions}</TableHead>
          </TableHeader>
          <TableBody loading={isLoading} empty={!exchangeRates?.length}>
            {exchangeRates?.map((rate, index) => (
              <TableRow key={`${rate._id}-${rate.currency}-${index}`}>
                <TableCell>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 shadow-sm ${
                      rate.currency === 'USD' ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}></div>
                    <span className="text-sm font-bold text-gray-900">
                      {rate.currency === 'USD' ? 'USD' : 'RUB'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-bold text-gray-900">
                    {rate.currency === 'USD' ? `1 USD = ${formatNumber(rate.rate)} RUB` : `1 RUB = ${formatNumber(rate.rate)} USD`}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600 font-medium">
                  {new Date(rate.lastUpdated).toLocaleString('uz-UZ')}
                </TableCell>
                <TableCell className="text-sm text-gray-600 font-medium">
                  {rate.updatedBy?.username || '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(rate)}
                  >
                    {t.common.update}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Eslatma */}
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-yellow-800">
                {t.exchangeRates.importantNote}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {t.exchangeRates.systemNote}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default function ExchangeRatesPage() {
  return (
    <LanguageProvider>
      <ExchangeRatesContent />
    </LanguageProvider>
  );
}
