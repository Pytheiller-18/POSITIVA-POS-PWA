import React from 'react';
import { Calendar, UserCheck } from 'lucide-react';
import type { SyncStatusFilter } from '../../types/pos.ts';

interface ReportsFilterBarProps {
  dateFrom: string;
  onDateFromChange: (val: string) => void;
  dateTo: string;
  onDateToChange: (val: string) => void;
  syncStatus: SyncStatusFilter;
  onSyncStatusChange: (val: SyncStatusFilter) => void;
  originMode: 'ALL' | 'ONLINE' | 'OFFLINE';
  onOriginModeChange: (val: 'ALL' | 'ONLINE' | 'OFFLINE') => void;
  cashierInput: string;
  onCashierChange: (val: string) => void;
  onQuickRange: (days: number | null) => void;
}

export const ReportsFilterBar: React.FC<ReportsFilterBarProps> = ({
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  syncStatus,
  onSyncStatusChange,
  originMode,
  onOriginModeChange,
  cashierInput,
  onCashierChange,
  onQuickRange,
}) => {
  return (
    <div className="filter-toolbar">
      <div className="filter-group">
        <Calendar size={16} />
        <input
          type="date"
          className="filter-date-input"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          aria-label="Fecha inicial"
        />
        <span>a</span>
        <input
          type="date"
          className="filter-date-input"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          aria-label="Fecha final"
        />
      </div>

      <div className="filter-group">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onQuickRange(1)}>
          Hoy
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onQuickRange(7)}>
          7 Días
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onQuickRange(30)}>
          30 Días
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onQuickRange(null)}>
          Todo
        </button>
      </div>

      <select
        className="filter-select"
        value={originMode}
        onChange={(e) => onOriginModeChange(e.target.value as 'ALL' | 'ONLINE' | 'OFFLINE')}
        aria-label="Modo de captura"
      >
        <option value="ALL">Red: ONLINE + OFFLINE</option>
        <option value="ONLINE">Capturadas ONLINE</option>
        <option value="OFFLINE">Capturadas OFFLINE</option>
      </select>

      <select
        className="filter-select"
        value={syncStatus}
        onChange={(e) => onSyncStatusChange(e.target.value as SyncStatusFilter)}
        aria-label="Estado de cola"
      >
        <option value="ALL">Cola: Todas</option>
        <option value="SYNCED">Sincronizadas</option>
        <option value="PENDING">Pendientes en sync_log</option>
        <option value="FAILED">Con error</option>
      </select>

      <div className="search-input-wrapper" style={{ minWidth: 190 }}>
        <UserCheck size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Filtrar cajero / usuario..."
          value={cashierInput}
          onChange={(e) => onCashierChange(e.target.value)}
        />
      </div>
    </div>
  );
};

