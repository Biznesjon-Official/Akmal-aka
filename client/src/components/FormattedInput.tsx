import React, { useState, useEffect } from 'react';
import { formatInputNumber, parseFormattedNumber } from '@/utils/formatters';

interface FormattedInputProps {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  type?: 'currency' | 'number';
  currency?: string;
  step?: string;
}

export default function FormattedInput({
  value,
  onChange,
  placeholder,
  className = 'input-field',
  disabled = false,
  required = false,
  type = 'number',
  currency = 'RUB',
  step
}: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const numValue = typeof value === 'string' ? parseFormattedNumber(value) : value;
      setDisplayValue(numValue ? formatInputNumber(numValue.toString()) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return; // Disabled bo'lsa o'zgartirmaslik
    
    const inputValue = e.target.value;
    const formatted = formatInputNumber(inputValue);
    setDisplayValue(formatted);
    
    // Raw raqamni parent komponentga yuborish
    const rawValue = parseFormattedNumber(formatted).toString();
    onChange(rawValue);
  };

  const handleFocus = () => {
    if (!disabled) {
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Blur da qayta formatlash
    const numValue = parseFormattedNumber(displayValue);
    if (numValue) {
      setDisplayValue(formatInputNumber(numValue.toString()));
    }
  };

  const getCurrencySymbol = () => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'RUB': '₽'
    };
    return symbols[currency] || currency;
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        inputMode="numeric"
      />
      {type === 'currency' && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500 text-sm font-medium">
            {getCurrencySymbol()}
          </span>
        </div>
      )}
    </div>
  );
}