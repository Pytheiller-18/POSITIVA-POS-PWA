import React from 'react';
import { Printer, X } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { formatCOP, formatDateTimeCO } from '../../utils/formatters.ts';

export const SaleReceiptModal: React.FC = () => {
  const { lastCompletedSale, closeReceiptModal, tenant } = usePos();

  if (!lastCompletedSale) return null;

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Comprobante de Venta</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeReceiptModal}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ticket-wrapper">
          <div className="ticket-header">
            <div className="ticket-store-name">{tenant.business_name}</div>
            {tenant.tax_id && <div>{tenant.tax_id}</div>}
            <div>Factura: {lastCompletedSale.invoice_number}</div>
            <div>Fecha: {formatDateTimeCO(lastCompletedSale.created_at)}</div>
            <div>Cajero: {lastCompletedSale.cashier_name}</div>
            <div>Modo: {lastCompletedSale.origin_mode}</div>
          </div>

          {lastCompletedSale.items.map((item) => (
            <div key={item.product_id} className="ticket-row">
              <span>
                {item.quantity}x {item.product_name}
              </span>
              <span>{formatCOP(item.subtotal, tenant.currency_symbol)}</span>
            </div>
          ))}

          <div className="ticket-divider" />

          <div className="ticket-row">
            <span>Subtotal:</span>
            <span>{formatCOP(lastCompletedSale.subtotal, tenant.currency_symbol)}</span>
          </div>
          {lastCompletedSale.discount > 0 && (
            <div className="ticket-row">
              <span>Descuento:</span>
              <span>-{formatCOP(lastCompletedSale.discount, tenant.currency_symbol)}</span>
            </div>
          )}
          <div className="ticket-row ticket-total">
            <span>TOTAL:</span>
            <span>{formatCOP(lastCompletedSale.total, tenant.currency_symbol)}</span>
          </div>
          <div className="ticket-row">
            <span>Medio ({lastCompletedSale.payment_method}):</span>
            <span>{formatCOP(lastCompletedSale.amount_paid, tenant.currency_symbol)}</span>
          </div>
          <div className="ticket-row">
            <span>Cambio / Devuelta:</span>
            <span>{formatCOP(lastCompletedSale.change_due, tenant.currency_symbol)}</span>
          </div>

          <div className="ticket-divider" />
          <div style={{ textAlign: 'center', fontSize: 11 }}>
            ¡Gracias por su compra! — Positiva-POS
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={closeReceiptModal}
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
};

