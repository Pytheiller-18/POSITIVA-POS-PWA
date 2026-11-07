import React, { useState } from 'react';
import { InventoryView } from './components/inventory/InventoryView.tsx';
import { Header } from './components/layout/Header.tsx';
import { LoginModal } from './components/layout/LoginModal.tsx';
import { Navigation } from './components/layout/Navigation.tsx';
import { PosView } from './components/pos/PosView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { SyncView } from './components/sync/SyncView.tsx';
import { PosProvider, usePos } from './context/PosContext.tsx';

const PosShell: React.FC = () => {
  const { currentView, toasts } = usePos();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <>
      <Header onOpenLogin={() => setLoginModalOpen(true)} />

      <div className="app-body">
        <Navigation />

        <main className="app-main">
          {currentView === 'pos' && <PosView />}
          {currentView === 'inventory' && <InventoryView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'sync' && <SyncView />}
        </main>
      </div>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-message ${t.type}`}>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export function App() {
  return (
    <PosProvider>
      <PosShell />
    </PosProvider>
  );
}

export default App;

