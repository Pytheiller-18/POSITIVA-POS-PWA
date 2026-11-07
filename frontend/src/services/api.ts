import type { Category, Product, SaleRecord, Tenant, User } from '../types/pos.ts';

// Ruta relativa por defecto (R-02 AGENTS.md): funciona en PC, Wi-Fi móvil y proxy Vite -> Flask :5000
const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  '/api/v1';

const STORAGE_KEYS = {
  TOKEN: 'positiva_pos_jwt',
  USER: 'positiva_pos_user',
  TENANT: 'positiva_pos_tenant',
} as const;

export interface SyncBatchSummary {
  synced_count: number;
  already_synced_count: number;
  failed_count: number;
  synced_ids: string[];
  already_synced_ids: string[];
  failed: Array<{ client_sync_id: string | null; error: string }>;
}

function readJsonStorage<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export class PosApiClient {
  private token: string | null =
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  public user: User | null = readJsonStorage<User>(STORAGE_KEYS.USER);
  public tenant: Tenant | null = readJsonStorage<Tenant>(STORAGE_KEYS.TENANT);

  setSession(token: string, user: User, tenant: Tenant): void {
    this.token = token;
    this.user = user;
    this.tenant = tenant;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenant));
    }
  }

  clearSession(): void {
    this.token = null;
    this.user = null;
    this.tenant = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TENANT);
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.token && this.tenant?.id);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      this.clearSession();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('positiva-auth-expired'));
      }
    }

    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        (payload.error as string) ||
        (payload.message as string) ||
        `Error HTTP ${res.status}`;
      throw new Error(msg);
    }

    return payload as T;
  }

  async login(email: string, password: string) {
    const res = await this.request<{
      success: boolean;
      token: string;
      user: User;
      tenant: Tenant;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.token) {
      this.setSession(res.token, res.user, res.tenant);
    }
    return res;
  }

  async getProducts(since?: string) {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    return this.request<{
      success: boolean;
      products: Product[];
      server_time: string;
      is_delta: boolean;
    }>(`/products${qs}`);
  }

  async createProduct(input: {
    barcode: string;
    name: string;
    category_id?: string | null;
    cost_price: number;
    sale_price: number;
    stock: number;
    min_stock: number;
  }) {
    return this.request<{ success: boolean; product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getCategories() {
    return this.request<{ success: boolean; categories: Category[] }>('/products/categories');
  }

  async syncSalesBatch(sales: SaleRecord[]) {
    // R-01 AGENTS.md: Flask retorna { success, message, summary: { synced_ids, already_synced_ids, failed } }
    return this.request<{
      success: boolean;
      message: string;
      summary: SyncBatchSummary;
    }>('/sync/sales-batch', {
      method: 'POST',
      body: JSON.stringify({
        device_id: 'POSITIVA-POS-PWA-V1',
        sales: sales.map((s) => ({
          client_sync_id: s.client_sync_id,
          payment_method: s.payment_method,
          amount_paid: s.amount_paid,
          discount: s.discount,
          tax_rate: 0,
          items: s.items.map((it) => ({
            product_id: it.product_id,
            quantity: it.quantity,
          })),
        })),
      }),
    });
  }

  async getServerProfitReport() {
    return this.request<{
      success: boolean;
      data: {
        total_revenue: number;
        total_cost: number;
        gross_profit: number;
        margin_percentage: number;
      };
    }>('/reports/profit');
  }
}

export const apiClient = new PosApiClient();