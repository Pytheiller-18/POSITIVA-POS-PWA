import React, { useState } from 'react';
import { Camera, PlusCircle, X } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { formatCOP } from '../../utils/formatters.ts';
import { BarcodeScannerModal } from '../scanner/BarcodeScannerModal.tsx';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose }) => {
  const { categories, tenant, registerProduct, pushToast } = usePos();

  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [skuScannerOpen, setSkuScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const unitProfit = salePrice - costPrice;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);
    try {
      const { product, syncedOnline } = await registerProduct({
        barcode,
        name,
        category_id: categoryId || categories[0]?.id || '',
        cost_price: costPrice,
        sale_price: salePrice,
        stock,
        min_stock: minStock,
      });
      pushToast(
        syncedOnline
          ? `Producto ${product.name} guardado en la nube`
          : `Producto ${product.name} guardado en IndexedDB local`,
        'success'
      );
      setBarcode('');
      setName('');
      setCostPrice(0);
      setSalePrice(0);
      setStock(10);
      setMinStock(5);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay active" role="dialog" aria-modal="true">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlusCircle size={20} /> + Nuevo Producto
            </h2>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="prod-sku">
                Código de Barras / SKU *
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="prod-sku"
                  type="text"
                  className="form-control"
                  placeholder="Ej: 770123456099"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-scanner"
                  onClick={() => setSkuScannerOpen(true)}
                  title="Capturar SKU con cámara"
                >
                  <Camera size={17} /> Escanear
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-name">
                Nombre del Producto *
              </label>
              <input
                id="prod-name"
                type="text"
                className="form-control"
                placeholder="Ej: Arroz Diana 500g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-cat">
                Categoría
              </label>
              <select
                id="prod-cat"
                className="form-control"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="prod-cost">
                  Precio Costo ({tenant.currency_symbol})
                </label>
                <input
                  id="prod-cost"
                  type="number"
                  min={0}
                  className="form-control"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value) || 0))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prod-sale">
                  Precio Venta ({tenant.currency_symbol}) *
                </label>
                <input
                  id="prod-sale"
                  type="number"
                  min={1}
                  className="form-control"
                  value={salePrice || ''}
                  onChange={(e) => setSalePrice(Math.max(0, Number(e.target.value) || 0))}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="prod-stock">
                  Stock Inicial
                </label>
                <input
                  id="prod-stock"
                  type="number"
                  min={0}
                  className="form-control"
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prod-min-stock">
                  Alerta Stock Mínimo
                </label>
                <input
                  id="prod-min-stock"
                  type="number"
                  min={0}
                  className="form-control"
                  value={minStock}
                  onChange={(e) => setMinStock(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Utilidad unitaria estimada:{' '}
              <strong style={{ color: unitProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatCOP(unitProfit, tenant.currency_symbol)}
              </strong>
            </div>

            {errorMsg && (
              <div
                className="checkout-change-card change-negative"
                style={{ padding: '0.6rem 0.85rem', marginBottom: '0.85rem', fontSize: '0.82rem' }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-action btn-block" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={skuScannerOpen}
        title="Escanear SKU para Nuevo Producto"
        onDetected={(code) => {
          setBarcode(code);
          setSkuScannerOpen(false);
        }}
        onClose={() => setSkuScannerOpen(false)}
      />
    </>
  );
};
