import React from 'react';
import { Cloud, LogOut, Moon, RefreshCw, Sun, Wifi, WifiOff } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';

interface HeaderProps {
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLogin }) => {
  const {
    tenant,
    user,
    isCloudAuthenticated,
    logout,
    effectiveOnline,
    totalPendingCount,
    isSyncing,
    theme,
    toggleTheme,
    setCurrentView,
  } = usePos();

  return (
    <header className="app-header">
      <div className="brand-section">
        <img src="/assets/icon.svg" alt="Positiva-POS" className="brand-logo" />
        <div className="brand-title-group">
          <h1>Positiva-POS</h1>
          <div className="brand-subtitle">
            <span>{tenant.business_name}</span>
            <span>•</span>
            <span>{user.full_name} ({user.role})</span>
          </div>
        </div>
      </div>

      <div className="header-status-group">
        <span className={`status-pill ${effectiveOnline ? 'online' : 'offline'}`}>
          <span className="pulse-dot" />
          {effectiveOnline ? (
            <>
              <Wifi size={14} /> ONLINE
            </>
          ) : (
            <>
              <WifiOff size={14} /> OFFLINE
            </>
          )}
        </span>

        {totalPendingCount > 0 && (
          <button
            type="button"
            className="sync-badge"
            onClick={() => setCurrentView('sync')}
            title="Ver cola de sincronización pendiente"
            style={{ cursor: 'pointer' }}
          >
            <RefreshCw size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {isSyncing ? 'Sincronizando...' : `${totalPendingCount} pend.`}
          </button>
        )}

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label="Cambiar tema visual"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isCloudAuthenticated ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={logout}
            title="Cerrar sesión en servidor y volver a modo local"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenLogin}
            title="Conectar con servidor Flask Multi-Tenant"
          >
            <Cloud size={15} />
            <span>Conectar Nube</span>
          </button>
        )}
      </div>
    </header>
  );
};

