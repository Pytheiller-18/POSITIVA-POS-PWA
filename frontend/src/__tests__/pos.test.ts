import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chunkArray, extractProcessedIds } from '../services/sync.ts';
import type { Product, SaleRecord } from '../types/pos.ts';
import {
  calculateCashChange,
  computeCategoryHue,
  computeQuickDateRange,
  validateProductDraft,
} from '../utils/domain.ts';
import {
  buildAnalyticsSnapshot,
  filterCatalogProducts,
  filterSaleRecords,
} from '../utils/filters.ts';
import { calculateCartTotals, computeBillSuggestions, formatCOP } from '../utils/formatters.ts';
import { generateUUIDv7, isUUIDv7 } from '../utils/uuid7.ts';

const SAMPLE_CATALOG: Product[] = [
  {
    id: 'p-1',
    tenant_id: 'tenant-A',
    category_id: 'cat-lacteos',
    category_name: 'Lácteos y Derivados',
    barcode: '7701001',
    name: 'Leche Entera Alquería 1L',
    cost_price: 3400,
    sale_price: 4800,
    stock: 20,
    min_stock: 6,
    is_active: true,
  },
  {
    id: 'p-2',
    tenant_id: 'tenant-A',
    category_id: 'cat-snacks',
    category_name: 'Snacks y Pasabocas',
    barcode: '7701002',
    name: 'Papas Margarita Limón',
    cost_price: 2800,
    sale_price: 4200,
    stock: 4,
    min_stock: 5,
    is_active: true,
  },
  {
    id: 'p-3',
    tenant_id: 'tenant-A',
    category_id: 'cat-bebidas',
    category_name: 'Bebidas y Refrescos',
    barcode: '7701003',
    name: 'Coca Cola 500ml',
    cost_price: 2200,
    sale_price: 3500,
    stock: 0,
    min_stock: 10,
    is_active: true,
  },
  {
    id: 'p-other-tenant',
    tenant_id: 'tenant-B',
    category_id: 'cat-lacteos',
    category_name: 'Lácteos y Derivados',
    barcode: '7701001',
    name: 'Leche Infiltrada Tenant B',
    cost_price: 3000,
    sale_price: 4500,
    stock: 50,
    min_stock: 5,
    is_active: true,
  },
];

describe('Positiva-POS — Motor de Filtrado de Catálogo e Inventario', () => {
  it('aísla estrictamente por tenant_id e ignora tildes en búsqueda por nombre o SKU', () => {
    const byAccentLess = filterCatalogProducts(SAMPLE_CATALOG, {
      query: 'alqueria',
      categoryId: 'ALL',
      stockFilter: 'ALL',
      tenantId: 'tenant-A',
    });
    assert.equal(byAccentLess.length, 1);
    assert.equal(byAccentLess[0].id, 'p-1');

    const byBarcode = filterCatalogProducts(SAMPLE_CATALOG, {
      query: '7701001',
      categoryId: 'ALL',
      stockFilter: 'ALL',
      tenantId: 'tenant-A',
    });
    assert.equal(byBarcode.length, 1);
    assert.equal(byBarcode[0].tenant_id, 'tenant-A');
  });

  it('filtra por categoría y alertas de stock mínimo / agotado', () => {
    const lowStock = filterCatalogProducts(SAMPLE_CATALOG, {
      query: '',
      categoryId: 'ALL',
      stockFilter: 'LOW_STOCK',
      tenantId: 'tenant-A',
    });
    assert.equal(lowStock.length, 1);
    assert.equal(lowStock[0].id, 'p-2');

    const outOfStock = filterCatalogProducts(SAMPLE_CATALOG, {
      query: '',
      categoryId: 'cat-bebidas',
      stockFilter: 'OUT_OF_STOCK',
      tenantId: 'tenant-A',
    });
    assert.equal(outOfStock.length, 1);
    assert.equal(outOfStock[0].id, 'p-3');
  });
});

describe('Positiva-POS — Finanzas de Caja, Analíticas Reales y Cola Offline', () => {
  it('calcula subtotal, descuento porcentual y sugerencias inteligentes de billetes', () => {
    const totals = calculateCartTotals(
      [
        {
          product: SAMPLE_CATALOG[0],
          quantity: 2,
          unit_price: 4800,
          subtotal: 9600,
        },
      ],
      10,
      0
    );
    assert.equal(totals.subtotal, 9600);
    assert.equal(totals.discount, 960);
    assert.equal(totals.total, 8640);
    assert.ok(formatCOP(8640).startsWith('$'));

    const suggestions = computeBillSuggestions(8640);
    assert.equal(suggestions[0], 8640);
    assert.ok(suggestions.includes(10000));
  });

  it('filtra ventas por rango de fechas, estado sync, modo offline/online y cajero, y calcula margen real + rotación', () => {
    const sales: SaleRecord[] = [
      {
        client_sync_id: 'sync-1',
        tenant_id: 'tenant-A',
        user_id: 'u-1',
        cashier_name: 'María Cajera',
        invoice_number: 'POS-2026-000001',
        items: [
          {
            product_id: 'p-1',
            product_name: 'Leche Entera Alquería 1L',
            quantity: 5,
            unit_price: 4800,
            unit_cost: 3400,
            subtotal: 24000,
          },
        ],
        subtotal: 24000,
        discount_percentage: 0,
        discount: 0,
        tax: 0,
        total: 24000,
        amount_paid: 25000,
        change_due: 1000,
        payment_method: 'CASH',
        created_at: '2026-11-06T14:30:00.000Z',
        origin_mode: 'OFFLINE',
        status: 'PENDING',
      },
      {
        client_sync_id: 'sync-2',
        tenant_id: 'tenant-B',
        user_id: 'u-9',
        cashier_name: 'Otro Tenant',
        invoice_number: 'POS-2026-000099',
        items: [],
        subtotal: 99000,
        discount_percentage: 0,
        discount: 0,
        tax: 0,
        total: 99000,
        amount_paid: 99000,
        change_due: 0,
        payment_method: 'CARD',
        created_at: '2026-11-06T15:00:00.000Z',
        origin_mode: 'ONLINE',
        status: 'SYNCED',
      },
    ];

    const filtered = filterSaleRecords(sales, {
      tenantId: 'tenant-A',
      syncStatus: 'PENDING',
      originMode: 'OFFLINE',
      cashierQuery: 'maria',
      dateFrom: '2026-11-01',
      dateTo: '2026-11-07',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].client_sync_id, 'sync-1');

    const snapshot = buildAnalyticsSnapshot(
      filtered,
      SAMPLE_CATALOG,
      new Date('2026-11-06T18:00:00.000Z')
    );
    assert.equal(snapshot.totalRevenue, 24000);
    assert.equal(snapshot.totalCost, 17000);
    assert.equal(snapshot.netProfit, 7000);
    assert.equal(snapshot.profitMarginPct, 29.17);
    // Rotación Leche: 5 vendidas / (20 stock actual + 5 vendidas) = 20%
    assert.equal(snapshot.topProducts[0].rotationRate, 20);
  });

  it('fragmenta lotes de sincronización en bloques de 50 y extrae response.summary idempotente', () => {
    const dummyIds = Array.from({ length: 120 }, (_, idx) => `sale-${idx}`);
    const chunks = chunkArray(dummyIds, 50);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 50);
    assert.equal(chunks[2].length, 20);

    const { syncedSet, failedMap } = extractProcessedIds({
      synced_count: 1,
      already_synced_count: 1,
      failed_count: 1,
      synced_ids: ['sale-1'],
      already_synced_ids: ['sale-2'],
      failed: [{ client_sync_id: 'sale-3', error: 'Stock insuficiente' }],
    });
    assert.ok(syncedSet.has('sale-1'));
    assert.ok(syncedSet.has('sale-2'));
    assert.equal(failedMap.get('sale-3'), 'Stock insuficiente');
  });

  it('genera identificadores UUIDv7 conformes a RFC 9562 con orden cronológico estricto', () => {
    const id1 = generateUUIDv7();
    const id2 = generateUUIDv7();
    const id3 = generateUUIDv7();

    assert.ok(isUUIDv7(id1));
    assert.ok(isUUIDv7(id2));
    assert.ok(isUUIDv7(id3));
    assert.ok(!isUUIDv7('sale-1700000000-abc'));
    assert.ok(id1 < id2, `Se esperaba ${id1} < ${id2}`);
    assert.ok(id2 < id3, `Se esperaba ${id2} < ${id3}`);
  });
});

describe('Positiva-POS — Capa de Dominio Puro, Hardening Anti-XSS y Caja COP', () => {
  it('valida borradores de SKU y rechaza precios cero/negativos o marcado XSS', () => {
    const clean = validateProductDraft({
      barcode: '  7702004001  ',
      name: '  Café Roldanillo 250g  ',
      category_id: 'cat-cafe',
      cost_price: 6500,
      sale_price: 9500,
      stock: 15,
      min_stock: 3,
    });
    assert.equal(clean.barcode, '7702004001');
    assert.equal(clean.name, 'Café Roldanillo 250g');
    assert.equal(clean.sale_price, 9500);

    assert.throws(() =>
      validateProductDraft({
        barcode: '7701',
        name: 'Precio Cero',
        cost_price: 100,
        sale_price: 0,
        stock: 5,
        min_stock: 1,
      })
    );
    assert.throws(() =>
      validateProductDraft({
        barcode: '7702',
        name: '<script>alert(1)</script>',
        cost_price: 100,
        sale_price: 500,
        stock: 5,
        min_stock: 1,
      })
    );
  });

  it('calcula cambio exacto, devuelta y faltante en efectivo más sugerencias $10.000 / $20.000 / $50.000', () => {
    const exact = calculateCashChange(14500, 14500, 'CASH');
    assert.equal(exact.status, 'EXACT');
    assert.equal(exact.changeDue, 0);

    const change = calculateCashChange(14500, 20000, 'CASH');
    assert.equal(change.status, 'CHANGE');
    assert.equal(change.changeDue, 5500);

    const short = calculateCashChange(14500, 10000, 'CASH');
    assert.equal(short.status, 'SHORT');
    assert.equal(short.deficit, 4500);

    const card = calculateCashChange(14500, 0, 'CARD');
    assert.equal(card.status, 'EXACT');
    assert.equal(card.effectivePaid, 14500);

    const bills = computeBillSuggestions(7200);
    assert.deepEqual(bills, [7200, 10000, 20000, 50000]);
  });

  it('genera rangos rápidos de fechas y tonos deterministas por categoría', () => {
    const range = computeQuickDateRange(7, new Date(2026, 10, 7, 12, 0, 0));
    assert.equal(range.dateFrom, '2026-11-01');
    assert.equal(range.dateTo, '2026-11-07');

    const hueA = computeCategoryHue('Lácteos');
    const hueB = computeCategoryHue('Lácteos');
    assert.equal(hueA, hueB);
    assert.ok(hueA >= 0 && hueA < 360);
  });
});


