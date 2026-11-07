import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { useCart } from '../hooks/useCart.ts';
import { useCatalog, type CreateProductInput } from '../hooks/useCatalog.ts';
import { useSync } from '../hooks/useSync.ts';
import type {
  CartItem,
  Category,
  PaymentMethod,
  PosView,
  Product,
  SaleRecord,
  Tenant,
  ToastNotification,
  User,
} from '../types/pos.ts';
import type { SyncCycleResult } from '../services/sync.ts';

interface PosContextValue {
  currentView: PosView;
  setCurrentView: (view: PosView) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  user: User;
  tenant: Tenant;
  isCloudAuthenticated: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  logout: () => void;
  effectiveOnline: boolean;
  isSimulatedOffline: boolean;
  setSimulatedOffline: (value: boolean) => void;
  isSyncing: boolean;
  pendingSalesCount: number;
  pendingProductsCount: number;
  totalPendingCount: number;
  saleRecords: SaleRecord[];
  triggerSync: () => Promise<SyncCycleResult>;
  products: Product[];
  categories: Category[];
  isLoadingCatalog: boolean;
  registerProduct: (input: CreateProductInput) => Promise<{ product: Product; syncedOnline: boolean }>;
  findProductByBarcode: (barcode: string) => Product | undefined;
  cart: CartItem[];
  discountPercentage: number;
  setDiscountPercentage: (pct: number) => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
  lastCompletedSale: SaleRecord | null;
  closeReceiptModal: () => void;
  addToCart: (product: Product, quantity?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: PaymentMethod, amountPaid: number) => Promise<SaleRecord>;
  toasts: ToastNotification[];
  pushToast: (message: string, type?: ToastNotification['type']) => void;
}

const PosContext = createContext<PosContextValue | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<PosView>('pos');
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('positiva_pos_theme') === 'light' ? 'light' : 'dark'
  );
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const pushToast = useCallback((message: string, type: ToastNotification['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('positiva_pos_theme', theme);
  }, [theme]);

  const auth = useAuth();
  const [onlineProbe, setOnlineProbe] = useState<boolean>(true);
  const catalog = useCatalog(auth.tenant.id, onlineProbe);
  const sync = useSync(auth.tenant.id, catalog.reloadLocalCatalog);

  useEffect(() => {
    setOnlineProbe(sync.effectiveOnline);
  }, [sync.effectiveOnline]);

  const cartState = useCart({
    tenantId: auth.tenant.id,
    user: auth.user,
    effectiveOnline: sync.effectiveOnline,
    onCatalogMutated: catalog.reloadLocalCatalog,
    onSaleQueued: () => {
      void sync.refreshQueueMetrics();
      if (sync.effectiveOnline && auth.isCloudAuthenticated) {
        void sync.triggerSync();
      }
    },
  });

  return (
    <PosContext.Provider
      value={{
        currentView,
        setCurrentView,
        theme,
        toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
        ...auth,
        ...sync,
        ...catalog,
        ...cartState,
        toasts,
        pushToast,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export function usePos(): PosContextValue {
  const ctx = useContext(PosContext);
  if (!ctx) {
    throw new Error('usePos debe utilizarse dentro de PosProvider');
  }
  return ctx;
}

