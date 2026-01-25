import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for debounced search functionality
 * @param initialValue - Initial search value
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Object with search value, debounced value, and setter
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedSearchValue = useDebounce(searchValue, delay);

  const clearSearch = () => setSearchValue('');

  return {
    searchValue,
    debouncedSearchValue,
    setSearchValue,
    clearSearch,
    isSearching: searchValue !== debouncedSearchValue
  };
}

export default useDebounce;