'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Skeleton } from './Skeleton';

interface VirtualScrollTableProps<T> {
  data: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  loading?: boolean;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
}

export default function VirtualScrollTable<T>({
  data,
  itemHeight,
  containerHeight,
  renderItem,
  renderHeader,
  loading = false,
  className = '',
  overscan = 5
}: VirtualScrollTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(() => {
    const containerScrollTop = scrollTop;
    const startIndex = Math.max(0, Math.floor(containerScrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.floor((containerScrollTop + containerHeight) / itemHeight) + overscan
    );

    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        data: data[i],
        offsetY: i * itemHeight
      });
    }

    return {
      items,
      startIndex,
      endIndex,
      totalHeight: data.length * itemHeight
    };
  }, [data, itemHeight, containerHeight, scrollTop, overscan]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (loading) {
    return (
      <div className={`${className}`} style={{ height: containerHeight }}>
        {renderHeader && renderHeader()}
        <div className="space-y-2 p-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} style={{ height: containerHeight }}>
      {renderHeader && renderHeader()}
      <div
        ref={scrollElementRef}
        className="overflow-auto"
        style={{ height: containerHeight - (renderHeader ? 60 : 0) }}
        onScroll={handleScroll}
      >
        <div style={{ height: visibleItems.totalHeight, position: 'relative' }}>
          {visibleItems.items.map(({ index, data: item, offsetY }) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: offsetY,
                left: 0,
                right: 0,
                height: itemHeight
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for managing virtual scroll state
export function useVirtualScroll<T>(
  data: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      startIndex,
      endIndex,
      visibleItems: data.slice(startIndex, endIndex + 1),
      totalHeight: data.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [data, itemHeight, containerHeight, scrollTop, overscan]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    ...visibleRange,
    handleScroll,
    scrollTop
  };
}