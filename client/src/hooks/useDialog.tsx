'use client';

import { useState, useCallback } from 'react';

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

export function useDialog() {
  const [alertState, setAlertState] = useState<AlertOptions & { isOpen: boolean }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [confirmState, setConfirmState] = useState<ConfirmOptions & { 
    isOpen: boolean;
    onConfirm?: () => void;
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
        onConfirm: () => {
          resolve(true);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    // Alert
    alertState,
    showAlert,
    closeAlert,
    
    // Confirm
    confirmState,
    showConfirm,
    closeConfirm
  };
}
