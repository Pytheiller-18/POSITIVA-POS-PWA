import type { PendingProduct, Product, SaleRecord } from '../types/pos.ts';
import { apiClient, type SyncBatchSummary } from './api.ts';
import { DEMO_TENANT_ID, posDB } from './db.ts';

export const SYNC_CHUNK_SIZE = 50;

export function chunkArray<T>(items: T[], chunkSize = SYNC_CHUNK_SIZE): T[][] {
  const safeSize = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeSize) {
    chunks.push(items.slice(i, i + safeSize));
  }
  return chunks;
}

export function extractProcessedIds(summary: SyncBatchSummary): {
  syncedSet: Set<string>;
  failedMap: Map<string, string>;
} {
  const syncedSet = new Set<string>([
    ...(summary.synced_ids || []),
    ...(summary.already_synced_ids || []),
  ]);
  const failedMap = new Map<string, string>();
  for (const item of summary.failed || []) {
    if (item.client_sync_id) {
      failedMap.set(item.client_sync_id, item.error || 'Error de validación en servidor');
    }
  }
  return { syncedSet, failedMap };
}

export interface SyncCycleResult {
  success: boolean;
  syncedSales: number;
  syncedProducts: number;
  failedSales: number;
  error?: string;
}

class OfflineSyncEngine {
  private isRunning = false;

  /**
   * Descarga categorías y catálogo delta (?since=) para el tenant autenticado.
   */
  async pullCatalogFromServer(tenantId: string, forceFull = false): Promise<boolean> {
    if (!apiClient.isAuthenticated() || tenantId === DEMO_TENANT_ID) {
      return false;
    }

    const sinceKey = `last_catalog_server_time:${tenantId}`;
    const since = forceFull ? undefined : (await posDB.getConfig(sinceKey)) || undefined;

    const [catRes, prodRes] = await Promise.all([
      apiClient.getCategories(),
      apiClient.getProducts(since),
    ]);

    if (catRes.success && Array.isArray(catRes.categories)) {
      await posDB.categories.bulkPut(catRes.categories);
    }

    if (prodRes.success && Array.isArray(prodRes.products)) {
      const catMap = new Map<string, string>();
      const localCats = await posDB.categories.where('tenant_id').equals(tenantId).toArray();
      for (const c of localCats) {
        catMap.set(c.id, c.name);
      }

      const enriched: Product[] = prodRes.products.map((p) => ({
        ...p,
        cost_price: Number(p.cost_price) || 0,
        sale_price: Number(p.sale_price) || 0,
        stock: Number(p.stock) || 0,
        min_stock: Number(p.min_stock) || 0,
        category_name: p.category_name || (p.category_id ? catMap.get(p.category_id) || null : null),
      }));

      await posDB.products.bulkPut(enriched);
      if (prodRes.server_time) {
        await posDB.setConfig(sinceKey, prodRes.server_time);
      }
    }

    return true;
  }

  /**
   * Sincroniza primero los productos creados offline, remapeando su temp_id al ID real de Flask
   * dentro de cualquier venta pendiente, y luego sube las ventas pendientes en lotes de 50.
   */
  async runSyncCycle(tenantId: string): Promise<SyncCycleResult> {
    if (this.isRunning) {
      return { success: false, syncedSales: 0, syncedProducts: 0, failedSales: 0, error: 'Sincronización en curso' };
    }
    if (!apiClient.isAuthenticated() || tenantId === DEMO_TENANT_ID) {
      return {
        success: false,
        syncedSales: 0,
        syncedProducts: 0,
        failedSales: 0,
        error: 'Inicia sesión en el servidor para sincronizar en la nube',
      };
    }

    this.isRunning = true;
    let syncedProducts = 0;
    let syncedSales = 0;
    let failedSales = 0;

    try {
      // 1. Subir productos creados sin conexión
      const pendingProds: PendingProduct[] = await posDB.pending_products
        .where('[tenant_id+status]')
        .equals([tenantId, 'PENDING'])
        .toArray();

      for (const pendingProd of pendingProds) {
        try {
          const created = await apiClient.createProduct({
            barcode: pendingProd.barcode,
            name: pendingProd.name,
            category_id: pendingProd.category_id || undefined,
            cost_price: pendingProd.cost_price,
            sale_price: pendingProd.sale_price,
            stock: pendingProd.stock,
            min_stock: pendingProd.min_stock,
          });

          if (created.success && created.product) {
            const realProd = created.product;
            await posDB.transaction('rw', posDB.products, posDB.pending_products, posDB.sales, async () => {
              await posDB.products.delete(pendingProd.temp_id);
              await posDB.products.put({
                ...realProd,
                cost_price: Number(realProd.cost_price) || 0,
                sale_price: Number(realProd.sale_price) || 0,
                stock: Number(realProd.stock) || 0,
                min_stock: Number(realProd.min_stock) || 0,
              });
              await posDB.pending_products.update(pendingProd.temp_id, { status: 'SYNCED' });

              // Remapear referencias temporales en ventas offline pendientes
              const tenantPendingSales = await posDB.sales
                .where('[tenant_id+status]')
                .equals([tenantId, 'PENDING'])
                .toArray();
              for (const sale of tenantPendingSales) {
                if (sale.items.some((it) => it.product_id === pendingProd.temp_id)) {
                  const updatedItems = sale.items.map((it) =>
                    it.product_id === pendingProd.temp_id ? { ...it, product_id: realProd.id } : it
                  );
                  await posDB.sales.update(sale.client_sync_id, { items: updatedItems });
                }
              }
            });
            syncedProducts += 1;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al sincronizar SKU';
          await posDB.pending_products.update(pendingProd.temp_id, {
            status: 'FAILED',
            last_error: msg,
          });
        }
      }

      // 2. Subir ventas pendientes por lotes de 50 (idempotente por client_sync_id)
      const pendingSales: SaleRecord[] = await posDB.sales
        .where('[tenant_id+status]')
        .equals([tenantId, 'PENDING'])
        .toArray();

      const batches = chunkArray(pendingSales, SYNC_CHUNK_SIZE);
      for (const batch of batches) {
        const res = await apiClient.syncSalesBatch(batch);
        if (res.success && res.summary) {
          const { syncedSet, failedMap } = extractProcessedIds(res.summary);
          await posDB.transaction('rw', posDB.sales, async () => {
            for (const sale of batch) {
              if (syncedSet.has(sale.client_sync_id)) {
                await posDB.sales.update(sale.client_sync_id, {
                  status: 'SYNCED',
                  last_error: undefined,
                });
                syncedSales += 1;
              } else if (failedMap.has(sale.client_sync_id)) {
                await posDB.sales.update(sale.client_sync_id, {
                  status: 'FAILED',
                  last_error: failedMap.get(sale.client_sync_id),
                });
                failedSales += 1;
              }
            }
          });
        }
      }

      // 3. Descargar catálogo delta actualizado (stock consolidado del servidor)
      await this.pullCatalogFromServer(tenantId, false);

      return { success: true, syncedSales, syncedProducts, failedSales };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sin conexión con el servidor';
      return { success: false, syncedSales, syncedProducts, failedSales, error: msg };
    } finally {
      this.isRunning = false;
    }
  }
}

export const syncEngine = new OfflineSyncEngine();

