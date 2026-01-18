'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Alert from '@/components/ui/Alert';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AlertOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface DialogContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertOptions & { isOpen: boolean }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [confirmState, setConfirmState] = useState<ConfirmOptions & { 
    isOpen: boolean;
    resolver?: (value: boolean) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning'
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      ...options,
      isOpen: true
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        resolver: resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolver) {
      confirmState.resolver(true);
    }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, [confirmState.resolver]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolver) {
      confirmState.resolver(false);
    }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, [confirmState.resolver]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Global Alert */}
      <Alert
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        autoClose={alertState.autoClose}
        autoCloseDelay={alertState.autoCloseDelay}
      />
      
      {/* Global Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
