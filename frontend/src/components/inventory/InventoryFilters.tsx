import React from 'react';
import { Camera, Search } from 'lucide-react';
import type { Category, StockFilter } from '../../types/pos.ts';

interface InventoryFiltersProps {
  searchInput: string;
  onSearchChange: (val: string) => void;
  categoryId: string;
  onCategoryChange: (val: string) => void;
  stockFilter: StockFilter;
  onStockFilterChange: (val: StockFilter) => void;
  categories: Category[];
  totalCount: number;
  filteredCount: number;
  onOpenScanFilter: () => void;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchInput,
  onSearchChange,
  categoryId,
  onCategoryChange,
  stockFilter,
  onStockFilterChange,
  categories,
  totalCount,
  filteredCount,
  onOpenScanFilter,
}) => {
  return (
    <div className="filter-toolbar">
      <div className="search-input-wrapper" style={{ minWidth: 230 }}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Filtrar por nombre, código de barras / SKU o categoría..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchInput && (
          <button
            type="button"
            className="clear-input-btn"
            onClick={() => onSearchChange('')}
            aria-label="Limpiar filtro"
          >
            ×
          </button>
        )}
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={onOpenScanFilter}
        title="Buscar producto escaneando código con cámara"
      >
        <Camera size={17} />
        <span>Buscar con Cámara</span>
      </button>

      <select
        className="filter-select"
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
        aria-label="Filtrar por categoría"
      >
        <option value="ALL">Todas las Categorías</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        value={stockFilter}
        onChange={(e) => onStockFilterChange(e.target.value as StockFilter)}
        aria-label="Filtrar por alerta de stock"
      >
        <option value="ALL">Estado Stock: Todos</option>
        <option value="LOW_STOCK">Alerta Stock Mínimo</option>
        <option value="OUT_OF_STOCK">Agotados (0)</option>
      </select>

      <span className="sync-badge">
        Mostrando {filteredCount} de {totalCount}
      </span>
    </div>
  );
};

