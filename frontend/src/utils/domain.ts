import type { PaymentMethod } from '../types/pos.ts';

/**
 * Capa de Dominio Puro — Positiva-POS (Clean Architecture / Regla de la Dependencia).
 * Funciones deterministas libres de efectos secundarios, desacopladas de React, DOM e IndexedDB.
 */

const UNSAFE_MARKUP_REGEX =
  /(<\s*\/?\s*(script|iframe|object|embed|svg|link|meta)\b|javascript\s*:|on\w+\s*=)/i;

export function containsUnsafeMarkup(value: string): boolean {
  if (!value) return false;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      return true;
    }
  }
  return UNSAFE_MARKUP_REGEX.test(value);
}

export function sanitizeTextInput(raw: string, fieldLabel: string, maxLength: number): string {
  if (typeof raw !== 'string') {
    throw new Error(`El campo ${fieldLabel} debe ser texto válido`);
  }
  if (containsUnsafeMarkup(raw)) {
    throw new Error(`El campo ${fieldLabel} contiene caracteres o etiquetas no permitidas`);
  }
  const trimmed = raw.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`El campo ${fieldLabel} excede el máximo de ${maxLength} caracteres`);
  }
  return trimmed;
}

export interface ProductDraftInput {
  barcode: string;
  name: string;
  category_id?: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
}

export interface ValidatedProductDraft {
  barcode: string;
  name: string;
  category_id: string | null;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
}

export function validateProductDraft(input: ProductDraftInput): ValidatedProductDraft {
  const barcode = sanitizeTextInput(input.barcode, 'Código SKU/Barras', 64);
  const name = sanitizeTextInput(input.name, 'Nombre del producto', 150);

  if (!name || !barcode) {
    throw new Error('El nombre y el código SKU/barras son obligatorios');
  }

  const costPrice = Number(input.cost_price);
  const salePrice = Number(input.sale_price);
  const stock = Number(input.stock);
  const minStock = Number(input.min_stock);

  if (!Number.isFinite(costPrice) || costPrice < 0) {
    throw new Error('El precio de costo no puede ser negativo');
  }
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error('El precio de venta debe ser mayor a cero');
  }
  if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
    throw new Error('El stock inicial debe ser un número entero mayor o igual a cero');
  }
  if (!Number.isFinite(minStock) || !Number.isInteger(minStock) || minStock < 0) {
    throw new Error('El stock mínimo debe ser un número entero mayor o igual a cero');
  }

  const cleanCat = input.category_id
    ? sanitizeTextInput(String(input.category_id), 'Categoría', 64)
    : null;

  return {
    barcode,
    name,
    category_id: cleanCat || null,
    cost_price: Math.round(costPrice),
    sale_price: Math.round(salePrice),
    stock,
    min_stock: minStock,
  };
}

export interface CashChangeResult {
  effectivePaid: number;
  changeDue: number;
  deficit: number;
  status: 'EXACT' | 'CHANGE' | 'SHORT';
}

export function calculateCashChange(
  total: number,
  amountPaid: number,
  paymentMethod: PaymentMethod
): CashChangeResult {
  const safeTotal = Math.max(0, Math.round(Number(total) || 0));
  if (paymentMethod !== 'CASH') {
    return {
      effectivePaid: safeTotal,
      changeDue: 0,
      deficit: 0,
      status: 'EXACT',
    };
  }

  const safePaid = Math.max(0, Math.round(Number(amountPaid) || 0));
  const diff = safePaid - safeTotal;

  if (diff < 0) {
    return {
      effectivePaid: safePaid,
      changeDue: 0,
      deficit: Math.abs(diff),
      status: 'SHORT',
    };
  }
  if (diff === 0) {
    return {
      effectivePaid: safePaid,
      changeDue: 0,
      deficit: 0,
      status: 'EXACT',
    };
  }
  return {
    effectivePaid: safePaid,
    changeDue: diff,
    deficit: 0,
    status: 'CHANGE',
  };
}

export function computeQuickDateRange(
  days: number | null,
  referenceDate = new Date()
): { dateFrom: string; dateTo: string } {
  if (days === null || days <= 0) {
    return { dateFrom: '', dateTo: '' };
  }
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setDate(end.getDate() - (days - 1));
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(start), dateTo: fmt(end) };
}

export function computeCategoryHue(categoryName: string): number {
  const clean = categoryName || 'General';
  let hash = 0;
  for (let i = 0; i < clean.length; i += 1) {
    hash = (hash * 31 + clean.charCodeAt(i)) % 360;
  }
  return hash;
}

