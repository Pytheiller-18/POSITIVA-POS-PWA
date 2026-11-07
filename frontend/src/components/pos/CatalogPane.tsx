import React, { useMemo, useState } from 'react';
import { AlertTriangle, Camera, Search } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';
import type { StockFilter } from '../../types/pos.ts';
import { filterCatalogProducts } from '../../utils/filters.ts';
import { ProductCard } from './ProductCard.tsx';

interface CatalogPaneProps {
  onOpenScanner: () => void;
}

export const CatalogPane: React.FC<CatalogPaneProps> = ({ onOpenScanner }) => {
  const { products, categories, cart, tenant, addToCart, findProductByBarcode, pushToast } = usePos();
  const [searchInput, setSearchInput] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');

  const debouncedSearch = useDebounce(searchInput, 180);

  const filteredProducts = useMemo(
    () =>
      filterCatalogProducts(products, {
        query: debouncedSearch,
        categoryId: selectedCategory,
        stockFilter,
        tenantId: tenant.id,
      }),
    [products, debouncedSearch, selectedCategory, stockFilter, tenant.id]
  );

  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cart]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchInput.trim()) return;
    const exactMatch = findProductByBarcode(searchInput.trim());
    if (exactMatch) {
      e.preventDefault();
      if (addToCart(exactMatch, 1)) {
        pushToast(`Agregado: ${exactMatch.name}`, 'success');
        setSearchInput('');
      } else {
        pushToast(`Producto agotado: ${exactMatch.name}`, 'warning');
      }
    }
  };

  return (
    <section className="catalog-pane">
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o escanear SKU..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchInput && (
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => setSearchInput('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        <select
          className="filter-select"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          aria-label="Filtrar por estado de stock"
        >
          <option value="ALL">Todo el Stock</option>
          <option value="LOW_STOCK">Alerta Stock Mínimo</option>
          <option value="OUT_OF_STOCK">Agotados (0)</option>
        </select>

        <button
          type="button"
          className="btn-scanner"
          onClick={onOpenScanner}
          title="Escanear código de barras con cámara"
        >
          <Camera size={18} />
          <span>Escanear</span>
        </button>
      </div>

      <div className="categories-bar">
        <button
          type="button"
          className={`category-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('ALL')}
        >
          Todos ({products.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="panel-card empty-box">
          <AlertTriangle size={34} style={{ marginBottom: 8, color: 'var(--warning)' }} />
          <p>No se encontraron productos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inCartQty={cartQtyMap.get(product.id) || 0}
              currencySymbol={tenant.currency_symbol}
              onAdd={(p) => {
                if (!addToCart(p, 1)) {
                  pushToast(`Sin unidades disponibles de ${p.name}`, 'warning');
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};

