import React from 'react';
import { Award, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import { useReports } from '../../hooks/useReports.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { ReportsFilterBar } from './ReportsFilterBar.tsx';

export const ReportsView: React.FC = () => {
  const { tenant, saleRecords, products, effectiveOnline } = usePos();

  const {
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
    snapshot,
    cloudProfitSummary,
  } = useReports({
    tenantId: tenant.id,
    saleRecords,
    products,
    effectiveOnline,
  });

  const maxWeeklyTotal = Math.max(1, ...snapshot.weeklySeries.map((d) => d.total));
  const maxPeakCount = Math.max(1, ...snapshot.peakHours.map((h) => h.count));

  return (
    <section>
      <div className="section-header-bar">
        <div className="section-title-block">
          <h2>
            <BarChart3 size={22} /> Reportes & Analíticas Financieras
          </h2>
          <p>
            Resumen semanal, productos más vendidos, horas pico, margen real sobre costo histórico y rotación de stock
          </p>
        </div>
        {cloudProfitSummary && (
          <span className="status-pill online">
            Nube Consolidada: {formatCOP(cloudProfitSummary.gross_profit, tenant.currency_symbol)} ({cloudProfitSummary.margin_percentage}%)
          </span>
        )}
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

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Ingresos Filtrados</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {formatCOP(snapshot.totalRevenue, tenant.currency_symbol)}
          </div>
          <div className="kpi-desc">
            {snapshot.transactionCount} ventas • {snapshot.unitsSold} unidades
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Utilidad Neta Real</div>
          <div className="kpi-value">
            {formatCOP(snapshot.netProfit, tenant.currency_symbol)}
          </div>
          <div className="kpi-desc">
            Margen: <strong>{snapshot.profitMarginPct}%</strong> (Costo: {formatCOP(snapshot.totalCost, tenant.currency_symbol)})
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Ticket Promedio</div>
          <div className="kpi-value">
            {formatCOP(snapshot.averageTicket, tenant.currency_symbol)}
          </div>
          <div className="kpi-desc">
            Efectivo: {formatCOP(snapshot.paymentBreakdown.CASH || 0, tenant.currency_symbol)}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Medios Digitales</div>
          <div className="kpi-value">
            {formatCOP(
              (snapshot.paymentBreakdown.CARD || 0) + (snapshot.paymentBreakdown.TRANSFER || 0),
              tenant.currency_symbol
            )}
          </div>
          <div className="kpi-desc">
            Tarjeta + Transferencias QR
          </div>
        </div>
      </div>

      <div className="analytics-grid-2col">
        <div className="panel-card">
          <h3>
            <TrendingUp size={18} /> Resumen Semanal (Últimos 7 Días)
          </h3>
          {snapshot.weeklySeries.map((day) => (
            <div key={day.date} className="bar-row">
              <span>{day.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.round((day.total / maxWeeklyTotal) * 100)}%` }}
                />
              </div>
              <strong style={{ textAlign: 'right' }}>
                {formatCOP(day.total, tenant.currency_symbol)}
              </strong>
            </div>
          ))}
        </div>

        <div className="panel-card">
          <h3>
            <Clock size={18} /> Horas Pico de Facturación
          </h3>
          {snapshot.peakHours.length === 0 ? (
            <div className="empty-box" style={{ padding: '1.25rem' }}>
              Sin transacciones en el rango seleccionado.
            </div>
          ) : (
            snapshot.peakHours.map((slot) => (
              <div key={slot.hour} className="bar-row">
                <span>{slot.label}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.round((slot.count / maxPeakCount) * 100)}%` }}
                  />
                </div>
                <strong style={{ textAlign: 'right' }}>{slot.count} ventas</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel-card">
        <h3>
          <Award size={18} /> Productos Más Vendidos & Rotación de Stock
        </h3>
        {snapshot.topProducts.length === 0 ? (
          <div className="empty-box">Registra ventas en Caja POS para calcular rotación y ranking.</div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Unidades Vendidas</th>
                  <th style={{ textAlign: 'right' }}>Ingresos</th>
                  <th style={{ textAlign: 'right' }}>Utilidad Neta</th>
                  <th style={{ textAlign: 'right' }}>Stock Actual</th>
                  <th style={{ textAlign: 'right' }}>Rotación (%)</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.topProducts.map((prod) => (
                  <tr key={prod.productId}>
                    <td style={{ fontWeight: 700 }}>{prod.name}</td>
                    <td style={{ textAlign: 'right' }}>{prod.unitsSold}</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatCOP(prod.revenue, tenant.currency_symbol)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>
                      {formatCOP(prod.profit, tenant.currency_symbol)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{prod.currentStock}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="product-stock-tag stock-ok">{prod.rotationRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};