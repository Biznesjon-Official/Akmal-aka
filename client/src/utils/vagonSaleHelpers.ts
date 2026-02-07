// Vagon Sale helper functions

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(num);
};

export const formatVolume = (volume: number): string => {
  // 0 gacha ko'rsatish, yaxlitlamasdan
  return `${volume} m³`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const calculateTotalPrice = (
  saleUnit: 'volume' | 'pieces',
  volume: number,
  quantity: number,
  pricePerM3: number,
  pricePerPiece: number
): number => {
  if (saleUnit === 'volume') {
    return volume * pricePerM3;
  } else {
    return quantity * pricePerPiece;
  }
};

export const calculateDebt = (totalPrice: number, paidAmount: number): number => {
  return Math.max(0, totalPrice - paidAmount);
};

export const getSaleTypeLabel = (saleType: 'lot_based' | 'free_sale'): string => {
  return saleType === 'lot_based' ? 'Lot asosida' : 'Erkin sotuv';
};

export const getSaleUnitLabel = (saleUnit: string): string => {
  return saleUnit === 'volume' ? 'Hajm (m³)' : 'Dona';
};
