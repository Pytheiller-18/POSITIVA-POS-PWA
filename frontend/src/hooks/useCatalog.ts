import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/api.ts';
import { DEMO_TENANT_ID, ensureDemoCatalogSeeded, posDB } from '../services/db.ts';
import { syncEngine } from '../services/sync.ts';
import type { Category, PendingProduct, Product } from '../types/pos.ts';
import { generateUUIDv7 } from '../utils/uuid7.ts';

export interface CreateProductInput {
  barcode: string;
  name: string;
  category_id: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock: number;
}

export function useCatalog(tenantId: string, effectiveOnline: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  const reloadLocalCatalog = useCallback(async () => {
    await ensureDemoCatalogSeeded(tenantId);
    const [localCats, localProds] = await Promise.all([
      posDB.categories.where('tenant_id').equals(tenantId).toArray(),
      posDB.products.where('tenant_id').equals(tenantId).toArray(),
    ]);

    const catMap = new Map<string, string>();
    for (const c of localCats) {
      catMap.set(c.id, c.name);
    }

    const activeProducts = localProds
      .filter((p) => p.is_active)
      .map((p) => ({
        ...p,
        category_name: p.category_name || (p.category_id ? catMap.get(p.category_id) || null : null),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    setCategories(localCats);
    setProducts(activeProducts);
    setIsLoadingCatalog(false);
  }, [tenantId]);

  useEffect(() => {
    void reloadLocalCatalog();
  }, [reloadLocalCatalog]);

  useEffect(() => {
    if (effectiveOnline && apiClient.isAuthenticated() && tenantId !== DEMO_TENANT_ID) {
      void syncEngine.pullCatalogFromServer(tenantId, false).then(() => reloadLocalCatalog());
    }
  }, [effectiveOnline, tenantId, reloadLocalCatalog]);

  const registerProduct = useCallback(
    async (input: CreateProductInput): Promise<{ product: Product; syncedOnline: boolean }> => {
      const cleanBarcode = input.barcode.trim();
      const cleanName = input.name.trim();
      if (!cleanName || !cleanBarcode) {
        throw new Error('El nombre y el código SKU/barras son obligatorios');
      }

      const duplicate = await posDB.products
        .where('[tenant_id+barcode]')
        .equals([tenantId, cleanBarcode])
        .filter((p) => p.is_active)
        .first();

      if (duplicate) {
        throw new Error(`Ya existe un producto activo con el código ${cleanBarcode}`);
      }

      if (effectiveOnline && apiClient.isAuthenticated() && tenantId !== DEMO_TENANT_ID) {
        try {
          const res = await apiClient.createProduct({
            barcode: cleanBarcode,
            name: cleanName,
            category_id: input.category_id || null,
            cost_price: input.cost_price,
            sale_price: input.sale_price,
            stock: input.stock,
            min_stock: input.min_stock,
          });
          if (res.success && res.product) {
            const saved: Product = {
              ...res.product,
              cost_price: Number(res.product.cost_price) || 0,
              sale_price: Number(res.product.sale_price) || 0,
              stock: Number(res.product.stock) || 0,
              min_stock: Number(res.product.min_stock) || 0,
            };
            await posDB.products.put(saved);
            await reloadLocalCatalog();
            return { product: saved, syncedOnline: true };
          }
        } catch (err) {
          // Si el error es de validación de negocio (ej: 409 duplicado), propagarlo; si es de red, caer a cola offline
          if (err instanceof Error && !err.message.toLowerCase().includes('fetch')) {
            throw err;
          }
        }
      }

      const tempId = generateUUIDv7();
      const localProduct: Product = {
        id: tempId,
        tenant_id: tenantId,
        category_id: input.category_id || null,
        barcode: cleanBarcode,
        name: cleanName,
        cost_price: Number(input.cost_price) || 0,
        sale_price: Number(input.sale_price) || 0,
        stock: Number(input.stock) || 0,
        min_stock: Number(input.min_stock) || 0,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const pendingEntry: PendingProduct = {
        temp_id: tempId,
        tenant_id: tenantId,
        category_id: input.category_id || null,
        barcode: cleanBarcode,
        name: cleanName,
        cost_price: localProduct.cost_price,
        sale_price: localProduct.sale_price,
        stock: localProduct.stock,
        min_stock: localProduct.min_stock,
        created_at: new Date().toISOString(),
        status: tenantId === DEMO_TENANT_ID ? 'SYNCED' : 'PENDING',
      };

      await posDB.transaction('rw', posDB.products, posDB.pending_products, async () => {
        await posDB.products.put(localProduct);
        if (tenantId !== DEMO_TENANT_ID) {
          await posDB.pending_products.put(pendingEntry);
        }
      });

      await reloadLocalCatalog();
      return { product: localProduct, syncedOnline: false };
    },
    [tenantId, effectiveOnline, reloadLocalCatalog]
  );

  const findProductByBarcode = useCallback(
    (barcode: string): Product | undefined => {
      const target = barcode.trim().toLowerCase();
      return products.find((p) => (p.barcode || '').toLowerCase() === target);
    },
    [products]
  );

  return {
    products,
    categories,
    isLoadingCatalog,
    reloadLocalCatalog,
    registerProduct,
    findProductByBarcode,
  };
}

