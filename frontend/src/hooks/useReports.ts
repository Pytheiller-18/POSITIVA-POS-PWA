import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/api.ts';
import { DEMO_TENANT_ID } from '../services/db.ts';
import type { Product, RecordFilterCriteria, SaleRecord, SyncStatusFilter } from '../types/pos.ts';
import { buildAnalyticsSnapshot, filterSaleRecords } from '../utils/filters.ts';
import { useDebounce } from './useDebounce.ts';

export function useReports(params: {
  tenantId: string;
  saleRecords: SaleRecord[];
  products: Product[];
  effectiveOnline: boolean;
}) {
  const { tenantId, saleRecords, products, effectiveOnline } = params;
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatusFilter>('ALL');
  const [originMode, setOriginMode] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [cashierInput, setCashierInput] = useState<string>('');
  const debouncedCashier = useDebounce(cashierInput, 180);

  const [cloudProfitSummary, setCloudProfitSummary] = useState<{
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    margin_percentage: number;
  } | null>(null);

  useEffect(() => {
    if (!effectiveOnline || !apiClient.isAuthenticated() || tenantId === DEMO_TENANT_ID) {
      setCloudProfitSummary(null);
      return;
    }
    let cancelled = false;
    apiClient
      .getServerProfitReport()
      .then((res) => {
        if (!cancelled && res.success) {
          setCloudProfitSummary(res.data);
        }
      })
      .catch(() => {
        // Usuario cajero (403) o red intermitente: se mantiene cálculo local exacto
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveOnline, tenantId, saleRecords.length]);

  const criteria: RecordFilterCriteria = useMemo(
    () => ({
      tenantId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      syncStatus,
      originMode,
      cashierQuery: debouncedCashier,
    }),
    [tenantId, dateFrom, dateTo, syncStatus, originMode, debouncedCashier]
  );

  const filteredSales = useMemo(
    () => filterSaleRecords(saleRecords, criteria),
    [saleRecords, criteria]
  );

  const snapshot = useMemo(
    () => buildAnalyticsSnapshot(filteredSales, products),
    [filteredSales, products]
  );

  const applyQuickRange = (days: number | null) => {
    if (days === null) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDateFrom(fmt(start));
    setDateTo(fmt(end));
  };

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    syncStatus,
    setSyncStatus,
    originMode,
    setOriginMode,
    cashierInput,
    setCashierInput,
    applyQuickRange,
    filteredSales,
    snapshot,
    cloudProfitSummary,
  };
}