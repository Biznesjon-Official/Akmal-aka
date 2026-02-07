// Client uchun barcha type va interface'lar

export interface Client {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  
  // Valyuta bo'yicha field'lar
  usd_total_received_volume: number;
  usd_total_debt: number;
  usd_total_paid: number;
  usd_current_debt: number;
  
  rub_total_received_volume: number;
  rub_total_debt: number;
  rub_total_paid: number;
  rub_current_debt: number;
  
  // Delivery qarzlari
  delivery_total_debt?: number;
  delivery_total_paid?: number;
  delivery_current_debt?: number;
  
  // Eski field'lar (Backward compatibility)
  total_received_volume: number;
  total_debt: number;
  total_paid: number;
  current_debt: number;
  
  notes?: string;
  createdAt: string;
}

export interface ClientFormData {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export interface DebtFormData {
  amount: string;
  currency: string;
  description: string;
  type: 'add' | 'subtract';
}

export type ClientSortBy = 'name' | 'debt' | 'volume' | 'date';
export type ClientFilterBy = 'all' | 'debt' | 'no-debt';
