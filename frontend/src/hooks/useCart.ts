import { useCallback, useMemo, useState } from 'react';
import { posDB } from '../services/db.ts';
import type { CartItem, PaymentMethod, Product, SaleRecord, User } from '../types/pos.ts';
import { playScannerBeep } from '../utils/audio.ts';
import { calculateCartTotals } from '../utils/formatters.ts';
import { generateUUIDv7 } from '../utils/uuid7.ts';

export function useCart(params: {
  tenantId: string;
  user: User;
  effectiveOnline: boolean;
  onCatalogMutated: () => Promise<void>;
  onSaleQueued: () => void;
}) {
  const { tenantId, user, effectiveOnline, onCatalogMutated, onSaleQueued } = params;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleRecord | null>(null);

  const totals = useMemo(
    () => calculateCartTotals(cart, discountPercentage, 0),
    [cart, discountPercentage]
  );

  const addToCart = useCallback((product: Product, quantity = 1): boolean => {
    if (product.stock <= 0) return false;
    playScannerBeep();

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, product.stock);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQty, subtotal: nextQty * item.unit_price }
            : item
        );
      }
      const initialQty = Math.min(Math.max(1, quantity), product.stock);
      return [
        ...prev,
        {
          product,
          quantity: initialQty,
          unit_price: product.sale_price,
          subtotal: initialQty * product.sale_price,
        },
      ];
    });
    return true;
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id !== productId) return item;
          const clamped = Math.min(quantity, item.product.stock);
          return {
            ...item,
            quantity: clamped,
            subtotal: clamped * item.unit_price,
          };
        })
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountPercentage(0);
  }, []);

  const completeSale = useCallback(
    async (paymentMethod: PaymentMethod, amountPaid: number): Promise<SaleRecord> => {
      if (cart.length === 0) {
        throw new Error('Agrega al menos un producto antes de cobrar');
      }
      if (paymentMethod === 'CASH' && amountPaid < totals.total) {
        throw new Error('El efectivo recibido es menor al total a pagar');
      }

      const clientSyncId = generateUUIDv7();
      const effectivePaid = paymentMethod === 'CASH' ? amountPaid : totals.total;
      const changeDue = Math.max(0, effectivePaid - totals.total);

      const saleRecord: SaleRecord = {
        client_sync_id: clientSyncId,
        tenant_id: tenantId,
        user_id: user.id,
        cashier_name: user.full_name,
        invoice_number: `POS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.product.cost_price,
          subtotal: item.subtotal,
        })),
        subtotal: totals.subtotal,
        discount_percentage: discountPercentage,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        amount_paid: effectivePaid,
        change_due: changeDue,
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
        origin_mode: effectiveOnline ? 'ONLINE' : 'OFFLINE',
        status: 'PENDING',
      };

      await posDB.transaction('rw', posDB.products, posDB.sales, async () => {
        for (const item of cart) {
          const current = await posDB.products.get(item.product.id);
          if (!current || current.tenant_id !== tenantId) {
            throw new Error(`Producto ${item.product.name} no disponible en este tenant`);
          }
          if (current.stock < item.quantity) {
            throw new Error(`Stock insuficiente para ${current.name} (disp: ${current.stock})`);
          }
          await posDB.products.update(item.product.id, {
            stock: current.stock - item.quantity,
          });
        }
        await posDB.sales.put(saleRecord);
      });

      await onCatalogMutated();
      setLastCompletedSale(saleRecord);
      clearCart();
      onSaleQueued();
      return saleRecord;
    },
    [cart, totals, discountPercentage, tenantId, user, effectiveOnline, onCatalogMutated, clearCart, onSaleQueued]
  );

  return {
    cart,
    discountPercentage,
    setDiscountPercentage,
    subtotal: totals.subtotal,
    discountAmount: totals.discount,
    taxAmount: totals.tax,
    total: totals.total,
    itemCount: totals.itemCount,
    lastCompletedSale,
    closeReceiptModal: () => setLastCompletedSale(null),
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    completeSale,
  };
}

