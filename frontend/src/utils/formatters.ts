import type { CartItem } from '../types/pos.ts';

export function formatCOP(amount: number, currencySymbol = '$'): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${currencySymbol}${safe.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

export function formatDateTimeCO(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLocalDateKey(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateCartTotals(cart: CartItem[], discountPercentage: number, taxRate = 0) {
  const subtotal = cart.reduce((acc, item) => {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const price = Math.max(0, Math.round(Number(item.unit_price) || 0));
    return acc + price * qty;
  }, 0);
  const clampedDiscountPct = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
  const discount = Math.round((subtotal * clampedDiscountPct) / 100);
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableBase * Math.max(0, taxRate));
  const total = taxableBase + tax;
  const itemCount = cart.reduce((acc, item) => acc + Math.max(0, Math.floor(Number(item.quantity) || 0)), 0);

  return { subtotal, discount, tax, total, itemCount };
}

/**
 * Sugiere denominaciones de billetes colombianos priorizando flujo táctil de 3 toques
 * (Exacto, $10.000, $20.000, $50.000, $100.000).
 */
export function computeBillSuggestions(total: number): number[] {
  const safeTotal = Math.round(Number(total) || 0);
  if (safeTotal <= 0) return [];
  const candidates = new Set<number>([safeTotal]);
  const bills = safeTotal < 10000 ? [10000, 20000, 50000, 5000] : [10000, 20000, 50000, 100000];

  for (const bill of bills) {
    if (bill > safeTotal) {
      candidates.add(bill);
    } else {
      const nextMultiple = Math.ceil(safeTotal / bill) * bill;
      if (nextMultiple > safeTotal) {
        candidates.add(nextMultiple);
      }
    }
  }

  return Array.from(candidates)
    .sort((a, b) => a - b)
    .slice(0, 4);
}
