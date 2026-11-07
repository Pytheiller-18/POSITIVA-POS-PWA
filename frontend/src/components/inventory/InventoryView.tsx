import React, { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';
import type { StockFilter } from '../../types/pos.ts';
import { filterCatalogProducts } from '../../utils/filters.ts';
import { BarcodeScannerModal } from '../scanner/BarcodeScannerModal.tsx';
import { InventoryFilters } from './InventoryFilters.tsx';
import { InventoryTable } from './InventoryTable.tsx';
import { ProductFormModal } from './ProductFormModal.tsx';

export const InventoryView: React.FC = () => {
  const { products, categories, tenant } = usePos();
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isScanFilterOpen, setIsScanFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 180);

  const filtered = useMemo(
    () =>
      filterCatalogProducts(products, {
        query: debouncedSearch,
        categoryId,
        stockFilter,
        tenantId: tenant.id,
      }),
    [products, debouncedSearch, categoryId, stockFilter, tenant.id]
  );

  return (
    <section>
      <div className="section-header-bar">
        <div className="section-title-block">
          <h2>
            <Package size={22} /> Inventario & Catálogo Multi-Tenant
          </h2>
          <p>
            Persistencia Offline-First en IndexedDB con búsqueda reactiva por nombre, SKU, categoría y alerta de stock
          </p>
        </div>

        <button
          type="button"
          className="btn btn-action"
          onClick={() => setIsNewModalOpen(true)}
        >
          <Plus size={18} />
          <span>+ Nuevo Producto</span>
        </button>
      </div>

      <InventoryFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        categories={categories}
        totalCount={products.length}
        filteredCount={filtered.length}
        onOpenScanFilter={() => setIsScanFilterOpen(true)}
      />

      <InventoryTable products={filtered} currencySymbol={tenant.currency_symbol} />

      <ProductFormModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />

      <BarcodeScannerModal
        isOpen={isScanFilterOpen}
        title="Buscar Producto en Inventario por Cámara"
        onDetected={(code) => {
          setSearchInput(code);
          setIsScanFilterOpen(false);
        }}
        onClose={() => setIsScanFilterOpen(false)}
      />
    </section>
  );
};
