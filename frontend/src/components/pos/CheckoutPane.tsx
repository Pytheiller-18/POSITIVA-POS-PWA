import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, Trash2 } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import type { PaymentMethod } from '../../types/pos.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { CartItemRow } from './CartItemRow.tsx';
import { CashQuickPad } from './CashQuickPad.tsx';

interface CheckoutPaneProps {
  onSaleCompleted?: () => void;
}

export const CheckoutPane: React.FC<CheckoutPaneProps> = ({ onSaleCompleted }) => {
  const {
    cart,
    tenant,
    subtotal,
    discountPercentage,
    setDiscountPercentage,
    discountAmount,
    total,
    itemCount,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    completeSale,
    pushToast,
  } = usePos();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState<number>(total);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setAmountPaid(total);
  }, [total, paymentMethod]);

  const isCashShort = paymentMethod === 'CASH' && amountPaid < total;

  const handleCheckout = async () => {
    if (cart.length === 0 || isCashShort || submitting) return;
    setSubmitting(true);
    try {
      const sale = await completeSale(paymentMethod, amountPaid);
      pushToast(`Venta ${sale.invoice_number} registrada`, 'success');
      if (onSaleCompleted) onSaleCompleted();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Error al procesar venta', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cart-card">
      <div className="cart-header">
        <h2>
          <ShoppingBag size={19} /> Orden Actual ({itemCount})
        </h2>
        {cart.length > 0 && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={clearCart}
            title="Vaciar orden"
          >
            <Trash2 size={14} /> Vaciar
          </button>
        )}
      </div>

      <div className="cart-items-list">
        {cart.length === 0 ? (
          <div className="empty-box">
            <ShoppingBag size={36} style={{ opacity: 0.35, marginBottom: 8 }} />
            <p>Toca o escanea productos para agregarlos a la caja.</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItemRow
              key={item.product.id}
              item={item}
              currencySymbol={tenant.currency_symbol}
              onUpdateQty={updateCartQuantity}
              onRemove={removeFromCart}
            />
          ))
        )}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatCOP(subtotal, tenant.currency_symbol)}</span>
        </div>

        <div className="summary-row" style={{ alignItems: 'center' }}>
          <label htmlFor="pos-discount-pct">Descuento (%)</label>
          <input
            id="pos-discount-pct"
            type="number"
            min={0}
            max={100}
            value={discountPercentage || ''}
            placeholder="0"
            onChange={(e) =>
              setDiscountPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
            }
            style={{
              width: 68,
              padding: '0.25rem 0.45rem',
              textAlign: 'right',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        {discountAmount > 0 && (
          <div className="summary-row">
            <span>Ahorro descuento</span>
            <span style={{ color: 'var(--warning)' }}>
              -{formatCOP(discountAmount, tenant.currency_symbol)}
            </span>
          </div>
        )}

        <div className="summary-row total-row">
          <span>TOTAL</span>
          <span>{formatCOP(total, tenant.currency_symbol)}</span>
        </div>
      </div>

      <CashQuickPad
        total={total}
        currencySymbol={tenant.currency_symbol}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        amountPaid={amountPaid}
        onAmountPaidChange={setAmountPaid}
      />

      <button
        type="button"
        className="btn btn-success btn-block"
        disabled={cart.length === 0 || isCashShort || submitting}
        onClick={handleCheckout}
      >
        <CheckCircle2 size={18} />
        <span>
          {submitting
            ? 'Guardando Venta...'
            : `Cobrar ${formatCOP(total, tenant.currency_symbol)}`}
        </span>
      </button>
    </div>
  );
};

