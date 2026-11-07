import React from 'react';
import { Check, Plus } from 'lucide-react';
import type { Product } from '../../types/pos.ts';
import { computeCategoryHue } from '../../utils/domain.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface ProductCardProps {
  product: Product;
  inCartQty: number;
  currencySymbol: string;
  onAdd: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  inCartQty,
  currencySymbol,
  onAdd,
}) => {
  const isEmpty = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= product.min_stock;
  const stockClass = isEmpty ? 'stock-empty' : isLow ? 'stock-low' : 'stock-ok';
  const cardStyle = {
    '--card-hue': computeCategoryHue(product.category_name || 'General'),
    ...(isEmpty ? { opacity: 0.58, cursor: 'not-allowed' } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`product-card positiva-product-card ${inCartQty > 0 ? 'in-cart' : ''}`}
      style={cardStyle}
      onClick={() => !isEmpty && onAdd(product)}
    >
      <div>
        <div className="product-header">
          <span className="product-category-tag">{product.category_name || 'General'}</span>
          <span className={`product-stock-tag ${stockClass}`}>
            {isEmpty ? 'Agotado' : `${product.stock} disp.`}
          </span>
        </div>

        <h3 className="product-name">{product.name}</h3>
        <div className="product-barcode">SKU: {product.barcode || 'S/N'}</div>
      </div>

      <div className="product-price-row">
        <span className="product-price">{formatCOP(product.sale_price, currencySymbol)}</span>
        {inCartQty > 0 ? (
          <span
            className="product-stock-tag stock-ok"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 32 }}
          >
            <Check size={14} /> {inCartQty}
          </span>
        ) : (
          <button
            type="button"
            className="product-add-btn"
            disabled={isEmpty}
            title="Agregar producto a la orden"
            aria-label={`Agregar ${product.name} a la orden`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEmpty) onAdd(product);
            }}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
