import React from 'react';
import { BarChart3, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';
import type { PosView } from '../../types/pos.ts';

export const Navigation: React.FC = () => {
  const { currentView, setCurrentView, products, totalPendingCount } = usePos();

  const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

  const tabs: Array<{ id: PosView; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'pos', label: 'Caja', icon: <ShoppingCart size={22} /> },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: <Package size={22} />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'reports', label: 'Reportes', icon: <BarChart3 size={22} /> },
    {
      id: 'sync',
      label: 'Sync',
      icon: <RefreshCw size={22} />,
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
          aria-current={currentView === tab.id ? 'page' : undefined}
        >
          <span className="nav-tab-icon">
            {tab.icon}
            {tab.badge !== undefined && <span className="nav-tab-badge">{tab.badge}</span>}
          </span>
          <span className="nav-tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
