import React from 'react';
import type { Product } from '../../types/pos.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface InventoryTableProps {
  products: Product[];
  currencySymbol: string;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ products, currencySymbol }) => {
  if (products.length === 0) {
    return (
      <div className="panel-card empty-box">
        <p>No hay productos que coincidan con los criterios de búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Código / SKU</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th style={{ textAlign: 'right' }}>Costo</th>
            <th style={{ textAlign: 'right' }}>Precio Venta</th>
            <th style={{ textAlign: 'right' }}>Margen</th>
            <th>Existencias</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isEmpty = p.stock <= 0;
            const isLow = p.stock > 0 && p.stock <= p.min_stock;
            const badgeClass = isEmpty ? 'stock-empty' : isLow ? 'stock-low' : 'stock-ok';
            const marginPct =
              p.sale_price > 0
                ? (((p.sale_price - p.cost_price) / p.sale_price) * 100).toFixed(1)
                : '0.0';

            return (
              <tr key={p.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  {p.barcode || 'S/N'}
                </td>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td>
                  <span className="product-category-tag">{p.category_name || 'General'}</span>
                </td>
                <td style={{ textAlign: 'right' }}>{formatCOP(p.cost_price, currencySymbol)}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                  {formatCOP(p.sale_price, currencySymbol)}
                </td>
                <td style={{ textAlign: 'right' }}>{marginPct}%</td>
                <td>
                  <span className={`product-stock-tag ${badgeClass}`}>
                    {isEmpty
                      ? '0 (Agotado)'
                      : isLow
                        ? `${p.stock} u. (Mín: ${p.min_stock})`
                        : `${p.stock} u.`}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

