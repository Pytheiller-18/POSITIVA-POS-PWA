import React from 'react';
import { BarChart3, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import type { PosView } from '../../types/pos.ts';

export const Navigation: React.FC = () => {
  const { currentView, setCurrentView, products, totalPendingCount } = usePos();

  const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

  const tabs: Array<{ id: PosView; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'pos', label: 'Caja POS', icon: <ShoppingCart size={17} /> },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: <Package size={17} />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'reports', label: 'Reportes & Analíticas', icon: <BarChart3 size={17} /> },
    {
      id: 'sync',
      label: 'Sincronización Offline',
      icon: <RefreshCw size={17} />,
      badge: totalPendingCount > 0 ? totalPendingCount : undefined,
    },
  ];

  return (
    <nav className="app-nav" aria-label="Navegación principal Positiva-POS">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-tab ${currentView === tab.id ? 'active' : ''}`}
          onClick={() => setCurrentView(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className="sync-badge" style={{ padding: '0.1rem 0.45rem', fontSize: '0.7rem' }}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

