'use client';

import { Button } from './Button';
import Icon from '../Icon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showLimitSelector?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onLimitChange,
  showLimitSelector = true,
  className = ''
}: PaginationProps) {
  // Sahifa raqamlarini hisoblash
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Agar sahifalar kam bo'lsa, hammasini ko'rsat
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Ko'p sahifa bo'lsa, aqlli ko'rsatish
      if (currentPage <= 3) {
        // Boshida
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Oxirida
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // O'rtada
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Ma'lumot */}
      <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
        {totalItems > 0 ? (
          <>
            <span className="font-medium">{startItem}</span>
            {' - '}
            <span className="font-medium">{endItem}</span>
            {' / '}
            <span className="font-medium">{totalItems}</span>
            {' ta natija'}
          </>
        ) : (
          'Natija topilmadi'
        )}
      </div>

      {/* Sahifa o'tish tugmalari */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
          {/* Oldingi sahifa */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrevPage}
            className="px-2 sm:px-3 min-w-[44px]"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
          </Button>

          {/* Sahifa raqamlari - mobilda kamroq ko'rsat */}
          <div className="flex items-center gap-1">
            {getPageNumbers().slice(0, window.innerWidth < 640 ? 3 : undefined).map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-gray-400 text-xs sm:text-sm">...</span>
                ) : (
                  <Button
                    variant={page === currentPage ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="min-w-[36px] sm:min-w-[40px] px-2 sm:px-3 text-xs sm:text-sm"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Keyingi sahifa */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className="px-2 sm:px-3 min-w-[44px]"
          >
            <Icon name="chevron-right" className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Sahifa o'lchami tanlash */}
      {showLimitSelector && onLimitChange && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Sahifada:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}
    </div>
  );
}