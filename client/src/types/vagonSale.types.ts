// Vagon Sale uchun barcha type va interface'lar

export interface Client {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  usd_current_debt?: number;
  rub_current_debt?: number;
  delivery_current_debt?: number;
}

export interface SaleItem {
  lot: string;
  lotInfo: VagonLot;
  vagon: string;
  vagonInfo: Vagon;
  saleUnit: 'volume' | 'pieces';
  soldVolume: number;
  soldQuantity: number;
  pricePerM3: number;
  pricePerPiece: number;
  totalPrice: number;
}

export interface VagonLot {
  _id: string;
  dimensions: string;
  quantity: number;
  volume_m3: number;
  purchase_currency: string;
  purchase_amount: number;
  remaining_quantity: number;
  remaining_volume_m3: number;
}

export interface Vagon {
  _id: string;
  vagonCode: string;
  status: string;
  lots: VagonLot[];
}

export interface ProfitAnalysis {
  net_profit: number;
  cost_basis: number;
  revenue: number;
  profit_margin_percentage: number;
  cost_per_m3?: number;
  sold_volume_m3?: number;
  currency: string;
  note?: string;
  error?: string;
}

export interface VagonSale {
  _id: string;
  vagon?: {
    vagonCode: string;
  };
  vagonCode?: string;
  lot?: {
    dimensions: string;
  };
  dimensions?: string;
  wood_type?: string;
  sale_type: 'lot_based' | 'free_sale';
  client: {
    name: string;
    phone: string;
  };
  sent_volume_m3?: number;
  warehouse_dispatched_volume_m3?: number;
  sent_quantity?: number;
  accepted_volume_m3?: number;
  accepted_quantity?: number;
  client_loss_m3?: number;
  client_loss_quantity?: number;
  client_loss_responsible_person?: string;
  client_loss_reason?: string;
  transport_loss_m3?: number;
  transport_loss_responsible_person?: string;
  transport_loss_reason?: string;
  sale_unit?: string;
  sale_currency: string;
  price_per_m3?: number;
  price_per_piece?: number;
  total_price: number;
  paid_amount: number;
  debt: number;
  sale_date?: string;
  notes?: string;
  createdAt: string;
  profit_analysis?: ProfitAnalysis; // Sof foyda ma'lumotlari
}

export interface VagonSaleFormData {
  saleType: 'lot_based' | 'free_sale';
  client: string;
  saleItems: SaleItem[];
  woodType: string;
  saleUnit: 'volume' | 'pieces';
  sentVolume: string;
  sentQuantity: string;
  acceptedVolume: string;
  acceptedQuantity: string;
  clientLossVolume: string;
  clientLossQuantity: string;
  clientLossResponsiblePerson: string;
  clientLossReason: string;
  transportLossVolume: string;
  transportLossResponsiblePerson: string;
  transportLossReason: string;
  saleCurrency: string;
  pricePerM3: string;
  pricePerPiece: string;
  totalPrice: string;
  paidAmount: string;
  paymentCurrency: string;
  saleDate: string;
  notes: string;
}

export interface PaymentFormData {
  amount: string;
  currency: string;
  description: string;
}
