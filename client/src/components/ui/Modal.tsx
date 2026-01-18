import React, { useEffect } from 'react';
import Icon from '@/components/Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-3xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl'
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black/40 via-blue-900/30 to-purple-900/30 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4 animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div 
        className={`
          bg-white rounded-none sm:rounded-2xl lg:rounded-3xl shadow-2xl border-0 sm:border border-gray-200/50 w-full ${sizeClasses[size]} 
          h-full sm:h-auto sm:max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 animate-slideUp
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-3 sm:px-6 py-3 sm:py-5 flex items-center justify-between shadow-lg sticky top-0 z-10">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-4v-4H5v-2h5V7h4v4h5v2h-5v4z" />
              </svg>
            </div>
            <span className="truncate">{title}</span>
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-all duration-200 p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-white/20 backdrop-blur-sm group flex-shrink-0 ml-2"
              aria-label="Yopish"
            >
              <Icon name="close" size="sm" className="text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-56px)] sm:h-auto sm:max-h-[calc(90vh-100px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50/50 to-blue-50/30 ${className}`}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-gray-50 to-blue-50/50 border-t border-gray-200/70 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 shadow-inner sticky bottom-0 ${className}`}>
      {children}
    </div>
  );
}