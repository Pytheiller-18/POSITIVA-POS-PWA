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
  const subtotal = cart.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const clampedDiscountPct = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
  const discount = Math.round((subtotal * clampedDiscountPct) / 100);
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableBase * Math.max(0, taxRate));
  const total = taxableBase + tax;
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return { subtotal, discount, tax, total, itemCount };
}

export function computeBillSuggestions(total: number): number[] {
  if (total <= 0) return [];
  const candidates = new Set<number>([total]);
  const bills = [2000, 5000, 10000, 20000, 50000, 100000];

  for (const bill of bills) {
    if (bill > total) {
      candidates.add(bill);
    } else {
      const nextMultiple = Math.ceil(total / bill) * bill;
      if (nextMultiple > total) {
        candidates.add(nextMultiple);
      }
    }
  }

  return Array.from(candidates)
    .sort((a, b) => a - b)
    .slice(0, 4);
}

