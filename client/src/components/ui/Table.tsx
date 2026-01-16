import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface TableProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Table({ children, className = '', title, subtitle, actions }: TableProps) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            {title && <h3 className="text-lg sm:text-xl font-bold">{title}</h3>}
            {subtitle && <p className="text-blue-100 text-xs sm:text-sm mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">{actions}</div>}
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <table className="w-full divide-y divide-gray-200">
          {children}
        </table>
      </div>
    </div>
  );
}

interface TableHeaderProps {
  children: React.ReactNode;
}

export function TableHeader({ children }: TableHeaderProps) {
  return (
    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
      <tr>
        {children}
      </tr>
    </thead>
  );
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  onSort?: () => void;
}

export function TableHead({ children, className = '', sortable = false, onSort }: TableHeadProps) {
  return (
    <th 
      className={`px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider ${sortable ? 'cursor-pointer hover:bg-gray-200' : ''} ${className}`}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center">
        {children}
        {sortable && (
          <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
      </div>
    </th>
  );
}

interface TableBodyProps {
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}

export function TableBody({ children, loading = false, empty = false, emptyMessage }: TableBodyProps) {
  const { t } = useLanguage();
  const defaultEmptyMessage = emptyMessage || t.common.noData;
  const loadingMessage = t.common.loading;
  
  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={100} className="px-6 py-12 text-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100 transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingMessage}
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  if (empty) {
    return (
      <tbody>
        <tr>
          <td colSpan={100} className="px-6 py-12 text-center">
            <div className="text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">{defaultEmptyMessage}</p>
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="bg-white divide-y divide-gray-100">
      {children}
    </tbody>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function TableRow({ children, className = '', onClick, hover = true }: TableRowProps) {
  return (
    <tr 
      className={`
        ${hover ? 'hover:bg-blue-50 transition-colors duration-200' : ''} 
        ${onClick ? 'cursor-pointer' : ''} 
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}

export function TableCell({ children, className = '', colSpan, rowSpan }: TableCellProps) {
  return (
    <td 
      className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap ${className}`}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {children}
    </td>
  );
}