import Dexie, { type Table } from 'dexie';
import type {
  Category,
  PendingProduct,
  Product,
  SaleRecord,
} from '../types/pos.ts';

export interface PosConfigEntry {
  key: string;
  value: string;
}

export const DEMO_TENANT_ID = 'tenant-demo-local';

export class PositivaDatabase extends Dexie {
  products!: Table<Product, string>;
  categories!: Table<Category, string>;
  sales!: Table<SaleRecord, string>;
  pending_products!: Table<PendingProduct, string>;
  config!: Table<PosConfigEntry, string>;

  constructor() {
    super('PositivaPosDB_v1');
    this.version(1).stores({
      products: 'id, tenant_id, [tenant_id+barcode], [tenant_id+category_id], name, is_active',
      categories: 'id, tenant_id, name',
      sales: 'client_sync_id, tenant_id, [tenant_id+status], created_at, user_id',
      pending_products: 'temp_id, tenant_id, [tenant_id+status], barcode',
      config: 'key',
    });
  }

  async getConfig(key: string): Promise<string | null> {
    const row = await this.config.get(key);
    return row ? row.value : null;
  }

  async setConfig(key: string, value: string): Promise<void> {
    await this.config.put({ key, value });
  }
}

export const posDB = new PositivaDatabase();

export async function ensureDemoCatalogSeeded(tenantId: string): Promise<void> {
  const existingCount = await posDB.products.where('tenant_id').equals(tenantId).count();
  if (existingCount > 0) return;

  // Sembrar catálogo inicial únicamente cuando es el tenant demo local sin red
  if (tenantId !== DEMO_TENANT_ID) return;

  const categories: Category[] = [
    {
      id: 'cat-bebidas',
      tenant_id: DEMO_TENANT_ID,
      name: 'Bebidas y Refrescos',
      description: 'Gaseosas, jugos, aguas y energizantes',
    },
    {
      id: 'cat-snacks',
      tenant_id: DEMO_TENANT_ID,
      name: 'Snacks y Pasabocas',
      description: 'Papas fritas, galletas y chocolates',
    },
    {
      id: 'cat-lacteos',
      tenant_id: DEMO_TENANT_ID,
      name: 'Lácteos y Derivados',
      description: 'Leche, quesos y yogures',
    },
  ];

  const sampleProducts: Product[] = [
    {
      id: 'demo-prod-1',
      tenant_id: DEMO_TENANT_ID,
      category_id: 'cat-bebidas',
      category_name: 'Bebidas y Refrescos',
      barcode: '770123456001',
      name: 'Coca Cola Original 500ml',
      cost_price: 2200,
      sale_price: 3500,
      stock: 45,
      min_stock: 10,
      is_active: true,
    },
    {
      id: 'demo-prod-2',
      tenant_id: DEMO_TENANT_ID,
      category_id: 'cat-bebidas',
      category_name: 'Bebidas y Refrescos',
      barcode: '770123456002',
      name: 'Agua Mineral Cristal 600ml',
      cost_price: 1200,
      sale_price: 2000,
      stock: 30,
      min_stock: 8,
      is_active: true,
    },
    {
      id: 'demo-prod-3',
      tenant_id: DEMO_TENANT_ID,
      category_id: 'cat-snacks',
      category_name: 'Snacks y Pasabocas',
      barcode: '770123456003',
      name: 'Papas Margarita Limón 115g',
      cost_price: 2800,
      sale_price: 4200,
      stock: 25,
      min_stock: 5,
      is_active: true,
    },
    {
      id: 'demo-prod-4',
      tenant_id: DEMO_TENANT_ID,
      category_id: 'cat-snacks',
      category_name: 'Snacks y Pasabocas',
      barcode: '770123456004',
      name: 'Galletas Festival Chocolate',
      cost_price: 1500,
      sale_price: 2500,
      stock: 6,
      min_stock: 12,
      is_active: true,
    },
    {
      id: 'demo-prod-5',
      tenant_id: DEMO_TENANT_ID,
      category_id: 'cat-lacteos',
      category_name: 'Lácteos y Derivados',
      barcode: '770123456005',
      name: 'Leche Entera Alquería 1L',
      cost_price: 3400,
      sale_price: 4800,
      stock: 20,
      min_stock: 6,
      is_active: true,
    },
    {
      id: 'demo-prod-6',
      tenant_id: DEMO_TENANT_ID,
      category_id: 'cat-lacteos',
      category_name: 'Lácteos y Derivados',
      barcode: '770123456006',
      name: 'Queso Doble Crema Alpina 250g',
      cost_price: 6500,
      sale_price: 9200,
      stock: 3,
      min_stock: 5,
      is_active: true,
    },
  ];

  await posDB.categories.bulkPut(categories);
  await posDB.products.bulkPut(sampleProducts);
}

