# Especificación 001 — Refactorización Modular Vite + React, Filtrado Avanzado y Harness SDD

- **Estado:** En ejecución (Aprobado en Stop Gate 1)
- **Versión Objetivo:** Positiva-POS `v1.0.0-rc1`
- **Gobernanza:** Sujeto a `docs/constitution.md`

---

## 1. Problema y Motivación
El repositorio presentaba una bifurcación entre `frontend/` (implementación inicial Vanilla JS monolítica en `app.js` de 1.303 líneas) y `pos-2/` (prototipo Vite + React con un backend NestJS duplicado de 141 MB, CSS monolítico en `App.css`, ausencia de Service Worker en el build y contrato roto frente a Flask en `/api/v1/sync/sales-batch`). Se requiere consolidar una única arquitectura **Vite + React + Flask** limpia, modular, probada y gobernada mediante *Spec-Driven Development*.

---

## 2. Alcance Funcional y Arquitectónico

### 2.1 Consolidación y Limpieza de Redundancia
- Unificar la PWA Vite + React en `frontend/` compilando hacia `frontend/dist` servido por Flask (`backend/app/__init__.py`).
- Eliminar `pos-2/` (incluyendo `pos-2/backend` NestJS, `App.css`, `index.css` plantilla de Vite y recursos gráficos sin uso) y centralizar utilidades compartidas (`formatCOP`, fechas, márgenes y audio).
- Adoptar `src/styles/variables.css`, `src/styles/layout.css` y `src/styles/components.css` preservando los modos claro/oscuro, la paleta corporativa y controles táctiles `>= 44px`.

### 2.2 Segmentación de Módulos y Hooks
- **Servicios (`src/services/`):** `db.ts` (IndexedDB/Dexie con índices por `tenant_id`), `api.ts` (`/api/v1` + JWT) y `sync.ts` (lotes de 50 ventas, cola de nuevos productos y descarga delta `?since=`).
- **Hooks (`src/hooks/`):** `useDebounce`, `useAuth`, `useCatalog`, `useCart`, `useSync` y `useReports`.
- **Componentes (`src/components/`):**
  - `Caja POS`: `PosView`, `CatalogPane`, `ProductCard`, `CheckoutPane`, `CartItemRow`, `CashQuickPad`, `SaleReceiptModal`.
  - `Inventario`: `InventoryView`, `InventoryFilters`, `InventoryTable`, `ProductFormModal` (`+ Nuevo Producto` con SKU manual o por cámara).
  - `ScannerCodigo`: `BarcodeScannerModal` reutilizable (`POS` e `INVENTORY`) sobre `html5-qrcode.min.js` con modo espejo horizontal (`scaleX(-1)`), linterna y selector de cámara.
  - `ReportesAnaliticas`: `ReportsView`, `ReportsFilterBar`, resumen semanal, productos más vendidos, horas pico, margen real (`ingresos - costo_histórico`) y rotación de stock.
  - `EstadoSincronizacion`: `SyncView`, `SyncFilterBar` y `SyncQueueTable` con simulador offline e idempotencia.

### 2.3 Sistema de Filtrado Reactivo
- **Caja POS e Inventario:** Búsqueda con *debounce* (180 ms) simultánea por Nombre y Código de Barras/SKU, combinada con filtro por Categoría (*Bebidas y Refrescos*, *Snacks y Pasabocas*, *Lácteos y Derivados*) y estado de Stock (`TODOS`, `STOCK_BAJO` `<= min_stock`, `AGOTADO` `= 0`).
- **Reportes y Sincronización:** Filtro reactivo por rango de fechas (`desde` / `hasta` y atajos Hoy / 7 días / 30 días), estado de sincronización (`TODOS`, `SYNCED`/`ONLINE`, `PENDING`/`OFFLINE`, `FAILED`) y cajero/usuario.

---

## 3. Criterios de Aceptación Verificables

1. **CA-01 (Constitución y Límites):** `docs/constitution.md` tiene `<= 20` líneas, `MEMORY.md` tiene `<= 50` líneas y el peso fuente/bundle del proyecto se mantiene `< 2 MB`.
2. **CA-02 (Aislamiento Multi-Tenant):** `backend/tests/test_backend.py` verifica que un Tenant B recibe `404`/`0 registros` al intentar leer o mutar productos, ventas, reportes o sincronización del Tenant A.
3. **CA-03 (Offline-First e Idempotencia):** Una venta o producto registrado con red simulada `OFFLINE` se persiste en IndexedDB, descuenta stock local de inmediato y al pasar a `ONLINE` se sincroniza contra `/api/v1/sync/sales-batch` procesando `response.summary.synced_ids` sin duplicar cobros ante reenvíos del mismo `client_sync_id`.
4. **CA-04 (Filtrado de Alto Rendimiento):** Las pruebas automatizadas de Frontend validan el filtrado combinado por texto/SKU, categoría, alerta de stock mínimo, rango de fechas, estado de sincronización y cajero.
5. **CA-05 (Compilación Limpia):** `tsc -b && vite build` finaliza con código de salida `0`, generando `frontend/dist` con `sw.js`, `manifest.json` y `vendor/html5-qrcode.min.js` operativos desde Flask.

