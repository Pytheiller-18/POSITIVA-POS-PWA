import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import { App } from './App.tsx';

// Registro de Service Worker PWA (Offline-First)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignorar en protocolos no seguros locales distintos de localhost
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

