import React, { useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';
import type { SyncStatusFilter } from '../../types/pos.ts';
import { computeQuickDateRange } from '../../utils/domain.ts';
import { filterSaleRecords } from '../../utils/filters.ts';
import { ReportsFilterBar } from '../reports/ReportsFilterBar.tsx';
import { SyncQueueTable } from './SyncQueueTable.tsx';

export const SyncView: React.FC = () => {
  const {
    tenant,
    effectiveOnline,
    isSimulatedOffline,
    setSimulatedOffline,
    isSyncing,
    pendingSalesCount,
    pendingProductsCount,
    totalPendingCount,
    saleRecords,
    isCloudAuthenticated,
    triggerSync,
    pushToast,
  } = usePos();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatusFilter>('ALL');
  const [originMode, setOriginMode] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [cashierInput, setCashierInput] = useState('');
  const debouncedCashier = useDebounce(cashierInput, 180);

  const filteredRecords = useMemo(
    () =>
      filterSaleRecords(saleRecords, {
        tenantId: tenant.id,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        syncStatus,
        originMode,
        cashierQuery: debouncedCashier,
      }),
    [saleRecords, tenant.id, dateFrom, dateTo, syncStatus, originMode, debouncedCashier]
  );

  const applyQuickRange = (days: number | null) => {
    const range = computeQuickDateRange(days);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  };

  const handleManualSync = async () => {
    const res = await triggerSync();
    if (res.success) {
      pushToast(
        `Sincronización exitosa: ${res.syncedSales} ventas, ${res.syncedProducts} productos`,
        'success'
      );
    } else {
      pushToast(res.error || 'No se pudo completar la sincronización', 'warning');
    }
  };

  return (
    <section>
      <div className="section-header-bar">
        <div className="section-title-block">
          <h2>
            <RefreshCw size={22} /> Orquestador de Sincronización Offline-First
          </h2>
          <p>
            Lotes de hasta 50 registros con garantía de idempotencia mediante <code>client_sync_id</code>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-action"
          disabled={isSyncing || !effectiveOnline || !isCloudAuthenticated || totalPendingCount === 0}
          onClick={handleManualSync}
        >
          <RefreshCw size={17} />
          <span>{isSyncing ? 'Sincronizando...' : `Sincronizar Lote (${totalPendingCount})`}</span>
        </button>
      </div>

      <div className="analytics-grid-2col">
        <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3>
              {isSimulatedOffline ? <WifiOff size={18} /> : <Wifi size={18} />} Simulador de Corte de Red
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Prueba ventas y altas de inventario sin internet; todo queda respaldado en IndexedDB.
            </p>
          </div>
          <button
            type="button"
            className={`btn ${isSimulatedOffline ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setSimulatedOffline(!isSimulatedOffline)}
          >
            {isSimulatedOffline ? 'Restaurar Red' : 'Simular Offline'}
          </button>
        </div>

        <div className="panel-card">
          <h3>
            <ShieldCheck size={18} /> Estado de Cola Multi-Tenant
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Ventas pendientes: <strong>{pendingSalesCount}</strong> • Nuevos SKUs pendientes:{' '}
            <strong>{pendingProductsCount}</strong> • Sesión nube:{' '}
            <strong>{isCloudAuthenticated ? 'JWT Activo' : 'Modo Local'}</strong>
          </p>
        </div>
      </div>

      <ReportsFilterBar
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        syncStatus={syncStatus}
        onSyncStatusChange={setSyncStatus}
        originMode={originMode}
        onOriginModeChange={setOriginMode}
        cashierInput={cashierInput}
        onCashierChange={setCashierInput}
        onQuickRange={applyQuickRange}
      />

      <SyncQueueTable records={filteredRecords} currencySymbol={tenant.currency_symbol} />
    </section>
  );
};

