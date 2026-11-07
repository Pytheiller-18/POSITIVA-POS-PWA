export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
export type PosView = 'pos' | 'inventory' | 'reports' | 'sync';
export type StockFilter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type SyncStatusFilter = 'ALL' | 'SYNCED' | 'PENDING' | 'FAILED';

export interface Tenant {
  id: string;
  business_name: string;
  tax_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  currency_symbol: string;
}

export interface User {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  category_name?: string | null;
  barcode: string;
  name: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  updated_at?: string;
}

export interface PendingProduct {
  temp_id: string;
  tenant_id: string;
  category_id?: string | null;
  barcode: string;
  name: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
  created_at: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  last_error?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleLineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
}

export interface SaleRecord {
  client_sync_id: string;
  tenant_id: string;
  user_id: string;
  cashier_name: string;
  invoice_number: string;
  items: SaleLineItem[];
  subtotal: number;
  discount_percentage: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  change_due: number;
  payment_method: PaymentMethod;
  created_at: string;
  origin_mode: 'ONLINE' | 'OFFLINE';
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  last_error?: string;
}

export interface CatalogFilterCriteria {
  query: string;
  categoryId: string;
  stockFilter: StockFilter;
  tenantId?: string;
}

export interface RecordFilterCriteria {
  dateFrom?: string;
  dateTo?: string;
  syncStatus?: SyncStatusFilter;
  originMode?: 'ALL' | 'ONLINE' | 'OFFLINE';
  cashierQuery?: string;
  tenantId?: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

