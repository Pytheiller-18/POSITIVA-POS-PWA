import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '../../types/pos.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface CartItemRowProps {
  item: CartItem;
  currencySymbol: string;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  currencySymbol,
  onUpdateQty,
  onRemove,
}) => {
  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <div className="cart-item-title">{item.product.name}</div>
        <div className="cart-item-price">
          {formatCOP(item.unit_price, currencySymbol)} c/u • disp: {item.product.stock}
        </div>
      </div>

      <div className="cart-qty-control">
        <button
          type="button"
          className="cart-qty-btn"
          onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
          aria-label="Disminuir cantidad"
        >
          <Minus size={14} />
        </button>
        <span className="cart-qty-val">{item.quantity}</span>
        <button
          type="button"
          className="cart-qty-btn"
          onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
          disabled={item.quantity >= item.product.stock}
          aria-label="Aumentar cantidad"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="cart-item-total">{formatCOP(item.subtotal, currencySymbol)}</div>

      <button
        type="button"
        className="cart-item-remove"
        onClick={() => onRemove(item.product.id)}
        title="Quitar producto"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

