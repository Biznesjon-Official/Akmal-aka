// Expense uchun barcha type va interface'lar

export interface ExpenseType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  parentCategory?: string;
  isCategory?: boolean;
  hasSubTypes?: boolean;
  requiresClient?: boolean;
}

export interface AdvancedExpense {
  _id: string;
  xarajatTuri: string;
  summa: number;
  valyuta: string;
  summaRUB: number;
  tavsif: string;
  createdAt: string;
  yaratuvchi: {
    username: string;
  };
  vagon?: {
    vagonCode: string;
    sending_place: string;
    receiving_place: string;
  };
  client?: {
    _id: string;
    name: string;
    phone: string;
    usd_current_debt: number;
    rub_current_debt: number;
  };
  additionalInfo?: {
    javobgarShaxs?: string;
    tolovSanasi?: string;
    hujjatRaqami?: string;
    qoshimchaMalumot?: string;
  };
}

export interface ExpenseFilters {
  xarajatTuri: string;
  valyuta: string;
  startDate: string;
  endDate: string;
  search: string;
}

export interface ExpenseFormData {
  xarajatTuri: string;
  xarajatKategoriyasi: string;
  summa: string;
  valyuta: string;
  tavsif: string;
  javobgarShaxs: string;
  xarajatSanasi: string;
  tolovSanasi: string;
  hujjatRaqami: string;
  qoshimchaMalumot: string;
  vagon: string;
  client: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  totalUSD: number;
  totalRUB: number;
  expensesByType: Record<string, number>;
  expensesByMonth: Array<{ month: string; amount: number }>;
}
