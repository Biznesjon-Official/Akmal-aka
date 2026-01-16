'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { showToast } from '@/utils/toast';
import { useConfirm } from '@/hooks/useConfirm';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

interface Backup {
  filename: string;
  size: number;
  created: string;
  timestamp: string;
  collections: number;
  database: string;
}

function BackupContent() {
  const { t } = useLanguage();
  const { confirm, ConfirmDialog } = useConfirm();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/backup/list');
      setBackups(response.data.backups);
    } catch (error) {
      console.error('Backuplarni olishda xato:', error);
      showToast.error(t.backup.fetchError);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    const confirmed = await confirm({
      title: t.backup.createTitle,
      message: t.backup.createMessage,
      confirmText: t.backup.createConfirm,
      cancelText: t.common.cancel,
      type: 'info'
    });
    
    if (!confirmed) return;

    try {
      setCreating(true);
      const response = await axios.post('/backup/create');
      showToast.success(t.backup.createSuccessDetail
        .replace('{filename}', response.data.filename)
        .replace('{size}', formatBytes(response.data.size))
        .replace('{collections}', response.data.collections));
      fetchBackups();
    } catch (error) {
      console.error('Backup yaratishda xato:', error);
      showToast.error(t.backup.createError);
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const response = await axios.get(`/backup/download/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Faylni yuklashda xato:', error);
      showToast.error(t.backup.downloadError);
    }
  };

  const restoreBackup = async (filename: string) => {
    const confirmed1 = await confirm({
      title: '⚠️ ' + t.backup.warningTitle.toUpperCase() + '!',
      message: t.backup.warningRestore,
      confirmText: t.common.yes + ', ' + t.common.next.toLowerCase(),
      cancelText: t.common.cancel,
      type: 'danger'
    });
    
    if (!confirmed1) return;

    const confirmed2 = await confirm({
      title: t.common.confirm + '?',
      message: t.backup.restoreConfirm,
      confirmText: t.common.yes + ', ' + t.common.confirm.toLowerCase(),
      cancelText: t.common.cancel,
      type: 'danger'
    });
    
    if (!confirmed2) return;

    try {
      setLoading(true);
      const response = await axios.post(`/backup/restore/${filename}`);
      showToast.success(t.backup.restoreSuccessDetail
        .replace('{collections}', response.data.restored.collections)
        .replace('{documents}', response.data.restored.documents));
      
      // Sahifani yangilash
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Backupni tiklashda xato:', error);
      showToast.error(t.backup.restoreError);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    const confirmed = await confirm({
      title: t.backup.deleteTitle,
      message: `${filename} ${t.common.delete.toLowerCase()}?`,
      confirmText: t.common.yes + ', ' + t.common.delete.toLowerCase(),
      cancelText: t.common.cancel,
      type: 'danger'
    });
    
    if (!confirmed) return;

    try {
      await axios.delete(`/backup/${filename}`);
      showToast.success(t.messages.deleteSuccess);
      fetchBackups();
    } catch (error) {
      console.error('Backupni o\'chirishda xato:', error);
      showToast.error(t.backup.deleteError);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Backup va Restore</h1>
          <p className="text-gray-600 mt-1">Ma'lumotlarni zaxiralash va tiklash</p>
        </div>
        <Button
          variant="primary"
          onClick={createBackup}
          disabled={creating}
        >
          {creating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t.common.loading}
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {t.backup.newBackup}
            </>
          )}
        </Button>
      </div>

      {/* Warning Card */}
      <Card>
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">{t.backup.warningTitle}</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• {t.backup.warningBackup}</li>
              <li>• {t.backup.warningRestore}</li>
              <li>• {t.backup.warningBeforeRestore}</li>
              <li>• {t.backup.infoDownload}</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Backups Table */}
      <Table
        title={t.backup.title}
        subtitle={`${t.common.total}: ${backups.length} ${t.backup.title.toLowerCase()}`}
      >
        <TableHeader>
          <TableHead>{t.backup.filename}</TableHead>
          <TableHead>{t.backup.date}</TableHead>
          <TableHead>{t.backup.size}</TableHead>
          <TableHead>{t.backup.collections}</TableHead>
          <TableHead>{t.backup.actions}</TableHead>
        </TableHeader>
        <TableBody loading={loading} empty={!backups.length} emptyMessage={t.backup.emptyMessage}>
          {backups.map((backup) => (
            <TableRow key={backup.filename}>
              <TableCell>
                <div className="font-medium text-gray-900">{backup.filename}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-600">
                  {new Date(backup.created).toLocaleString('uz-UZ')}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-600">{formatBytes(backup.size)}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-600">{backup.collections}</div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadBackup(backup.filename)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    title="Yuklash"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => restoreBackup(backup.filename)}
                    className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                    title={t.backup.restoreBackup}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.filename)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
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

      {/* Info Card */}
      <Card>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">{t.backup.infoTitle}</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {t.backup.infoBackupContains}</li>
                <li>• {t.backup.infoDailyBackup}</li>
                <li>• {t.backup.infoDownload}</li>
                <li>• {t.backup.infoCleanup}</li>
                <li>• {t.backup.infoImportantChanges}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
      <ConfirmDialog />
      </div>
    </Layout>
  );
}


export default function BackupPage() {
  return (
    <LanguageProvider>
      <BackupContent />
    </LanguageProvider>
  );
}
