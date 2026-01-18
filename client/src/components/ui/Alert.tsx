'use client';

import { useEffect } from 'react';

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function Alert({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose = true,
  autoCloseDelay = 3000
}: AlertProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      icon: '✅',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50'
    },
    error: {
      icon: '❌',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      bgColor: 'bg-red-50'
    },
    warning: {
      icon: '⚠️',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      bgColor: 'bg-yellow-50'
    },
    info: {
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50'
    }
  };

  const style = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Alert */}
        <div className={`relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 ${style.borderColor} transform transition-all animate-in fade-in zoom-in duration-200`}>
          {/* Icon */}
          <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full ${style.iconBg} mb-4`}>
            <span className="text-3xl">{style.icon}</span>
          </div>
          
          {/* Content */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {message}
            </p>
          </div>
          
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            OK
          </button>
          
          {/* Auto-close progress bar */}
          {autoClose && (
            <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${style.iconBg} transition-all`}
                style={{
                  animation: `shrink ${autoCloseDelay}ms linear forwards`
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
