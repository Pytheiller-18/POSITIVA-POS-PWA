import React from 'react';
import type { SaleRecord } from '../../types/pos.ts';
import { formatCOP, formatDateTimeCO } from '../../utils/formatters.ts';

interface SyncQueueTableProps {
  records: SaleRecord[];
  currencySymbol: string;
}

export const SyncQueueTable: React.FC<SyncQueueTableProps> = ({ records, currencySymbol }) => {
  if (records.length === 0) {
    return (
      <div className="panel-card empty-box">
        <p>No existen registros de sincronización con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Factura</th>
            <th>client_sync_id</th>
            <th>Fecha / Hora</th>
            <th>Cajero</th>
            <th>Captura</th>
            <th>Estado Cola</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => {
            const pillClass =
              rec.status === 'SYNCED'
                ? 'stock-ok'
                : rec.status === 'FAILED'
                  ? 'stock-empty'
                  : 'stock-low';

            return (
              <tr key={rec.client_sync_id}>
                <td style={{ fontWeight: 700 }}>{rec.invoice_number}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  {rec.client_sync_id}
                </td>
                <td>{formatDateTimeCO(rec.created_at)}</td>
                <td>{rec.cashier_name}</td>
                <td>
                  <span className="product-category-tag">{rec.origin_mode}</span>
                </td>
                <td>
                  <span className={`product-stock-tag ${pillClass}`}>{rec.status}</span>
                  {rec.last_error && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 3 }}>
                      {rec.last_error}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800 }}>
                  {formatCOP(rec.total, currencySymbol)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

