import React, { useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { formatCOP } from '../../utils/formatters.ts';
import { BarcodeScannerModal } from '../scanner/BarcodeScannerModal.tsx';
import { CatalogPane } from './CatalogPane.tsx';
import { CheckoutPane } from './CheckoutPane.tsx';
import { SaleReceiptModal } from './SaleReceiptModal.tsx';

export const PosView: React.FC = () => {
  const { itemCount, total, tenant, findProductByBarcode, addToCart, pushToast } = usePos();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const handlePosScan = (code: string) => {
    const product = findProductByBarcode(code);
    if (!product) {
      pushToast(`SKU ${code} no registrado en inventario`, 'warning');
      return;
    }
    if (addToCart(product, 1)) {
      pushToast(`Escaneado: ${product.name}`, 'success');
    } else {
      pushToast(`Agotado: ${product.name}`, 'warning');
    }
  };

  return (
    <div className="pos-layout">
      <CatalogPane onOpenScanner={() => setScannerOpen(true)} />

      <aside className={`cart-pane ${mobileCartOpen ? 'mobile-open' : ''}`}>
        {mobileCartOpen && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <strong>Orden Móvil ({itemCount} ítems)</strong>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMobileCartOpen(false)}
            >
              <X size={16} /> Cerrar
            </button>
          </div>
        )}
        <CheckoutPane onSaleCompleted={() => setMobileCartOpen(false)} />
      </aside>

      {itemCount > 0 && !mobileCartOpen && (
        <div className="mobile-cart-bar" onClick={() => setMobileCartOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
            <ShoppingBag size={18} />
            <span>{itemCount} prod.</span>
            <span style={{ color: 'var(--success)' }}>
              {formatCOP(total, tenant.currency_symbol)}
            </span>
          </div>
          <button type="button" className="btn btn-action btn-sm">
            Ver Orden & Cobrar
          </button>
        </div>
      )}

      <BarcodeScannerModal
        isOpen={scannerOpen}
        title="Escanear Producto (Caja POS)"
        onDetected={handlePosScan}
        onClose={() => setScannerOpen(false)}
      />

      <SaleReceiptModal />
    </div>
  );
};

