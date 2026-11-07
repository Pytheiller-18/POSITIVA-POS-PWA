import type {
  CatalogFilterCriteria,
  Product,
  RecordFilterCriteria,
  SaleRecord,
} from '../types/pos.ts';
import { toLocalDateKey } from './formatters.ts';

/**
 * Filtra catálogo simultáneamente por tenant_id, nombre/SKU (normalizado sin tildes),
 * categoría y estado de stock (TODOS, STOCK_BAJO, AGOTADO).
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterCatalogProducts(
  products: Product[],
  criteria: CatalogFilterCriteria
): Product[] {
  const normalizedQuery = normalizeSearchText(criteria.query);

  return products.filter((product) => {
    if (!product.is_active) return false;
    if (criteria.tenantId && product.tenant_id !== criteria.tenantId) return false;

    if (criteria.categoryId && criteria.categoryId !== 'ALL') {
      if (product.category_id !== criteria.categoryId) return false;
    }

    if (criteria.stockFilter === 'OUT_OF_STOCK' && product.stock > 0) {
      return false;
    }
    if (
      criteria.stockFilter === 'LOW_STOCK' &&
      !(product.stock > 0 && product.stock <= product.min_stock)
    ) {
      return false;
    }

    if (normalizedQuery) {
      const nameNorm = normalizeSearchText(product.name);
      const barcodeNorm = normalizeSearchText(product.barcode || '');
      const catNorm = normalizeSearchText(product.category_name || '');
      if (
        !nameNorm.includes(normalizedQuery) &&
        !barcodeNorm.includes(normalizedQuery) &&
        !catNorm.includes(normalizedQuery)
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filtra registros de ventas/sincronización por tenant, rango de fechas (YYYY-MM-DD),
 * estado de sincronización, modo de origen (ONLINE / OFFLINE) y nombre/ID de cajero.
 */
export function filterSaleRecords(
  records: SaleRecord[],
  criteria: RecordFilterCriteria
): SaleRecord[] {
  const cashierNorm = normalizeSearchText(criteria.cashierQuery || '');

  return records.filter((record) => {
    if (criteria.tenantId && record.tenant_id !== criteria.tenantId) return false;

    if (criteria.syncStatus && criteria.syncStatus !== 'ALL') {
      if (record.status !== criteria.syncStatus) return false;
    }

    if (criteria.originMode && criteria.originMode !== 'ALL') {
      if (record.origin_mode !== criteria.originMode) return false;
    }

    if (criteria.dateFrom || criteria.dateTo) {
      const localDay = toLocalDateKey(record.created_at);
      if (criteria.dateFrom && localDay < criteria.dateFrom) return false;
      if (criteria.dateTo && localDay > criteria.dateTo) return false;
    }

    if (cashierNorm) {
      const target = normalizeSearchText(`${record.cashier_name || ''} ${record.user_id || ''}`);
      if (!target.includes(cashierNorm)) return false;
    }

    return true;
  });
}

export interface AnalyticsSnapshot {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMarginPct: number;
  transactionCount: number;
  averageTicket: number;
  unitsSold: number;
  weeklySeries: Array<{ date: string; label: string; total: number; count: number }>;
  peakHours: Array<{ hour: number; label: string; count: number; total: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    profit: number;
    currentStock: number;
    rotationRate: number;
  }>;
  paymentBreakdown: Record<string, number>;
}

/**
 * Calcula analíticas reales a partir del costo histórico (unit_cost) de cada ítem
 * y cruza contra el catálogo actual para obtener el índice de rotación de stock.
 */
export function buildAnalyticsSnapshot(
  sales: SaleRecord[],
  catalog: Product[],
  referenceDate = new Date()
): AnalyticsSnapshot {
  const stockByProduct = new Map<string, Product>();
  for (const p of catalog) {
    stockByProduct.set(p.id, p);
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let unitsSold = 0;
  const paymentBreakdown: Record<string, number> = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    OTHER: 0,
  };

  const hourBuckets = new Map<number, { count: number; total: number }>();
  const productAgg = new Map<
    string,
    { name: string; unitsSold: number; revenue: number; cost: number }
  >();
  const dailyMap = new Map<string, { total: number; count: number }>();

  // Inicializar últimos 7 días calendario
  const weeklyDays: Array<{ date: string; label: string }> = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - offset);
    const key = toLocalDateKey(d.toISOString());
    const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit' });
    weeklyDays.push({ date: key, label });
    dailyMap.set(key, { total: 0, count: 0 });
  }

  for (const sale of sales) {
    totalRevenue += sale.total;
    paymentBreakdown[sale.payment_method] =
      (paymentBreakdown[sale.payment_method] || 0) + sale.total;

    const saleDate = new Date(sale.created_at);
    if (!Number.isNaN(saleDate.getTime())) {
      const hour = saleDate.getHours();
      const prevHour = hourBuckets.get(hour) || { count: 0, total: 0 };
      hourBuckets.set(hour, {
        count: prevHour.count + 1,
        total: prevHour.total + sale.total,
      });

      const dayKey = toLocalDateKey(sale.created_at);
      const prevDay = dailyMap.get(dayKey);
      if (prevDay) {
        dailyMap.set(dayKey, {
          total: prevDay.total + sale.total,
          count: prevDay.count + 1,
        });
      }
    }

    for (const item of sale.items) {
      const lineCost = (Number(item.unit_cost) || 0) * item.quantity;
      const lineRev = (Number(item.unit_price) || 0) * item.quantity;
      totalCost += lineCost;
      unitsSold += item.quantity;

      const prevProd = productAgg.get(item.product_id) || {
        name: item.product_name,
        unitsSold: 0,
        revenue: 0,
        cost: 0,
      };
      productAgg.set(item.product_id, {
        name: item.product_name,
        unitsSold: prevProd.unitsSold + item.quantity,
        revenue: prevProd.revenue + lineRev,
        cost: prevProd.cost + lineCost,
      });
    }
  }

  const netProfit = totalRevenue - totalCost;
  const profitMarginPct =
    totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;
  const transactionCount = sales.length;
  const averageTicket = transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0;

  const weeklySeries = weeklyDays.map((d) => {
    const entry = dailyMap.get(d.date) || { total: 0, count: 0 };
    return { date: d.date, label: d.label, total: entry.total, count: entry.count };
  });

  const peakHours = Array.from(hourBuckets.entries())
    .map(([hour, stats]) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count: stats.count,
      total: stats.total,
    }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 6);

  const topProducts = Array.from(productAgg.entries())
    .map(([productId, agg]) => {
      const catalogItem = stockByProduct.get(productId);
      const currentStock = catalogItem ? catalogItem.stock : 0;
      const denominator = currentStock + agg.unitsSold;
      const rotationRate =
        denominator > 0 ? Number(((agg.unitsSold / denominator) * 100).toFixed(1)) : 0;

      return {
        productId,
        name: agg.name,
        unitsSold: agg.unitsSold,
        revenue: agg.revenue,
        profit: agg.revenue - agg.cost,
        currentStock,
        rotationRate,
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 8);

  return {
    totalRevenue,
    totalCost,
    netProfit,
    profitMarginPct,
    transactionCount,
    averageTicket,
    unitsSold,
    weeklySeries,
    peakHours,
    topProducts,
    paymentBreakdown,
  };
}

