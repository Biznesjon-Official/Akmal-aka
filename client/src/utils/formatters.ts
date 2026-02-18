// Raqamlarni formatlash utility funksiyalari

/**
 * Raqamni formatlangan ko'rinishga o'tkazadi (masalan: 1000000 -> "1 000 000")
 */
export const formatNumber = (value: number | string): string => {
  if (!value && value !== 0) return '';
  
  const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
  if (isNaN(num)) return '';
  
  return num.toLocaleString('uz-UZ').replace(/,/g, ' ');
};

/**
 * Formatlangan stringni raqamga o'tkazadi ("1 000 000" -> 1000000)
 */
export const parseFormattedNumber = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Input uchun raqam formatlash (real-time typing)
 */
export const formatInputNumber = (value: string): string => {
  // Faqat raqamlar va nuqtani qoldirish
  const cleaned = value.replace(/[^\d.]/g, '');
  
  // Agar bo'sh bo'lsa, bo'sh string qaytarish
  if (!cleaned) return '';
  
  // Nuqtadan keyingi qismni ajratish
  const parts = cleaned.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Integer qismini formatlash
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Agar decimal qism bo'lsa, qo'shish
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

/**
 * Valyuta formatlash (kasr qismini ajratib ko'rsatadi)
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'RUB'): string => {
  // Agar amount null yoki undefined bo'lsa, 0 ni ishlatamiz
  const safeAmount = amount ?? 0;
  
  // Butun va kasr qismlarini ajratish
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = absAmount - integerPart;
  
  // Integer qismini formatlash
  const formattedInteger = formatNumber(integerPart);
  
  // Kasr qismini formatlash (agar mavjud bo'lsa)
  let formatted = formattedInteger;
  if (decimalPart > 0) {
    // Kasr qismini 3 xonagacha ko'rsatish
    const decimalStr = decimalPart.toFixed(3).substring(2); // "0.523" -> "523"
    // Oxiridagi nollarni olib tashlash
    const trimmedDecimal = decimalStr.replace(/0+$/, '');
    if (trimmedDecimal) {
      formatted = `${formattedInteger}.${trimmedDecimal}`;
    }
  }
  
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'RUB': '₽'
  };
  
  const symbol = currencySymbols[currency] || currency;
  const sign = isNegative ? '-' : '';
  return `${sign}${formatted} ${symbol}`;
};

/**
 * Kub va tonna formatlash
 */
export const formatVolume = (volume: number): string => {
  // 0 gacha ko'rsatish, yaxlitlamasdan
  return `${volume} m³`;
};

export const formatWeight = (weight: number): string => {
  return `${formatNumber(weight)} t`;
};

/**
 * Foiz formatlash
 */
export const formatPercentage = (value: number): string => {
  return `${formatNumber(value)}%`;
};

/**
 * Sana formatlash
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};