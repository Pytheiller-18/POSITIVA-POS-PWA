import React, { useMemo } from 'react';
import { ArrowRightLeft, Banknote, CreditCard } from 'lucide-react';
import type { PaymentMethod } from '../../types/pos.ts';
import { computeBillSuggestions, formatCOP } from '../../utils/formatters.ts';

interface CashQuickPadProps {
  total: number;
  currencySymbol: string;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  amountPaid: number;
  onAmountPaidChange: (value: number) => void;
}

const INCREMENTS = [1000, 2000, 5000, 10000, 20000, 50000];

export const CashQuickPad: React.FC<CashQuickPadProps> = ({
  total,
  currencySymbol,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
}) => {
  const suggestions = useMemo(() => computeBillSuggestions(total), [total]);
  const diff = amountPaid - total;
  const changeClass =
    paymentMethod !== 'CASH' || diff === 0
      ? 'change-exact'
      : diff > 0
        ? 'change-positive'
        : 'change-negative';

  return (
    <div>
      <div className="payment-methods-grid">
        <button
          type="button"
          className={`cash-pill-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
          onClick={() => onPaymentMethodChange('CASH')}
        >
          <Banknote size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Efectivo
        </button>
        <button
          type="button"
          className={`cash-pill-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
          onClick={() => onPaymentMethodChange('CARD')}
        >
          <CreditCard size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Tarjeta
        </button>
        <button
          type="button"
          className={`cash-pill-btn ${paymentMethod === 'TRANSFER' ? 'active' : ''}`}
          onClick={() => onPaymentMethodChange('TRANSFER')}
        >
          <ArrowRightLeft size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Transf.
        </button>
      </div>

      {paymentMethod === 'CASH' && total > 0 && (
        <>
          <div className="form-group" style={{ marginBottom: '0.6rem' }}>
            <label className="form-label" htmlFor="cash-received-input">
              Efectivo Recibido ({currencySymbol})
            </label>
            <input
              id="cash-received-input"
              type="number"
              min={0}
              step={100}
              className="form-control"
              value={amountPaid || ''}
              onChange={(e) => onAmountPaidChange(Math.max(0, Number(e.target.value) || 0))}
            />
            <div className="cash-increment-row">
              {INCREMENTS.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  className="cash-inc-btn"
                  onClick={() => onAmountPaidChange(amountPaid + inc)}
                >
                  +{formatCOP(inc, currencySymbol)}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-cash-row">
            {suggestions.map((val) => (
              <button
                key={val}
                type="button"
                className={`cash-pill-btn ${amountPaid === val ? 'active' : ''}`}
                onClick={() => onAmountPaidChange(val)}
              >
                {val === total ? 'Exacto' : formatCOP(val, currencySymbol)}
              </button>
            ))}
          </div>

          <div className={`checkout-change-card ${changeClass}`} style={{ padding: '0.75rem 1rem', marginBottom: '0.85rem' }}>
            <div className="change-label-group">
              <span className="change-label-title">
                {diff < 0 ? 'Faltante por cubrir' : diff === 0 ? 'Pago Exacto' : 'Devuelta / Cambio'}
              </span>
              <span className="change-label-subtitle">Cálculo reactivo de caja</span>
            </div>
            <span className="change-amount-display" style={{ fontSize: '1.35rem' }}>
              {formatCOP(Math.abs(diff), currencySymbol)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

