import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/api.ts';
import { DEMO_TENANT_ID, posDB } from '../services/db.ts';
import { syncEngine, type SyncCycleResult } from '../services/sync.ts';
import type { SaleRecord } from '../types/pos.ts';

export function useSync(tenantId: string, onSyncFinished?: () => Promise<void>) {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSalesCount, setPendingSalesCount] = useState<number>(0);
  const [pendingProductsCount, setPendingProductsCount] = useState<number>(0);
  const [saleRecords, setSaleRecords] = useState<SaleRecord[]>([]);

  const effectiveOnline = browserOnline && !isSimulatedOffline;

  const refreshQueueMetrics = useCallback(async () => {
    const [allTenantSales, pendingProdCount] = await Promise.all([
      posDB.sales.where('tenant_id').equals(tenantId).toArray(),
      posDB.pending_products.where('[tenant_id+status]').equals([tenantId, 'PENDING']).count(),
    ]);

    allTenantSales.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const pendingSales = allTenantSales.filter((s) => s.status === 'PENDING').length;

    setSaleRecords(allTenantSales);
    setPendingSalesCount(pendingSales);
    setPendingProductsCount(pendingProdCount);
  }, [tenantId]);

  const triggerSync = useCallback(async (): Promise<SyncCycleResult> => {
    if (!effectiveOnline) {
      return {
        success: false,
        syncedSales: 0,
        syncedProducts: 0,
        failedSales: 0,
        error: 'Terminal en modo sin conexión (Offline)',
      };
    }
    setIsSyncing(true);
    try {
      const result = await syncEngine.runSyncCycle(tenantId);
      await refreshQueueMetrics();
      if (onSyncFinished) {
        await onSyncFinished();
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [effectiveOnline, tenantId, refreshQueueMetrics, onSyncFinished]);

  useEffect(() => {
    void refreshQueueMetrics();
  }, [refreshQueueMetrics]);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Auto-sincronización al recuperar conexión y monitoreo cada 30s
  useEffect(() => {
    if (!effectiveOnline || !apiClient.isAuthenticated() || tenantId === DEMO_TENANT_ID) {
      return;
    }
    void triggerSync();
    const interval = window.setInterval(() => {
      void triggerSync();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [effectiveOnline, tenantId, triggerSync]);

  return {
    effectiveOnline,
    isSimulatedOffline,
    setSimulatedOffline,
    isSyncing,
    pendingSalesCount,
    pendingProductsCount,
    totalPendingCount: pendingSalesCount + pendingProductsCount,
    saleRecords,
    refreshQueueMetrics,
    triggerSync,
  };
}

