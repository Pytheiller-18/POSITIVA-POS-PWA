# MEMORY.md — Memoria Persistente del Proyecto (Positiva-POS)

## Estado Actual
- **Versión:** `v1.1.0` (Arquitectura Modular SDD + UUIDv7 RFC 9562 Verificada — `2026-11-07`).
- **Huella Técnica:** `~937 KB` código fuente (`~1,62 MB` fuente + `dist`); bundle PWA ~`107,3 KB` gzip (`< 2 MB`).
- **Verificación:** `16/16` tests Backend (`test_backend.py`) + `6/6` tests Frontend (`pos.test.ts`) + `tsc` & `vite build` (`0` errores).
- **Repositorio:** `https://github.com/Pytheiller-18/Sistema-POS-PWA` (rama `main`).

## Arquitectura Vigente
- **Backend (`backend/`):** Python 3 + Flask + SQLAlchemy (MySQL 8.0+ en producción, SQLite automático en desarrollo), claves primarias UUIDv7 RFC 9562 (`utils/uuid7.py`), seguridad JWT (`HS256`) y aislamiento multi-tenant estricto mediante `@tenant_required` (`g.tenant_id`).
- **Frontend (`frontend/`):** Vite 6 + React 18 + TypeScript. PWA instalable (`manifest.json` + `sw.js`), persistencia Offline-First en IndexedDB (`services/db.ts` sobre Dexie), generación local UUIDv7 (`utils/uuid7.ts`), sincronización por lotes e idempotencia (`services/sync.ts`) y lector óptico `html5-qrcode.min.js`.
- **Despliegue Unificado:** Flask sirve `/api/v1/*` y el bundle estático `frontend/dist` sobre el puerto `5000`.

## Hitos Completados en Sesión SDD (001-refactoring-pos)
1. Creación del Harness de gobernanza IA: `docs/constitution.md` (10 líneas), `AGENTS.md` (con reglas `R-01`..`R-05`), `MEMORY.md` y `specs/001-refactoring-pos/spec.md`.
2. Unificación del cliente Vite + React en `frontend/` y purga de `pos-2/` (eliminando `141,28 MB` de NestJS duplicado y `App.css` monolítico).
3. Segmentación de monolitos en 6 *Custom Hooks* (`useDebounce`, `useAuth`, `useCatalog`, `useCart`, `useSync`, `useReports`) y 19 componentes atómicos.
4. Restauración de arquitectura CSS modular (`variables.css`, `layout.css`, `components.css`) con modo claro/oscuro y botones táctiles `>= 44px`.
5. Reparación de contratos `/api/v1/sync/sales-batch` (`response.summary`) y `/api/v1/reports/profit` (`gross_profit`), descarga delta `?since=`, cola offline de SKUs y paridad UUIDv7 RFC 9562.
6. Filtrado instantáneo con *debounce* (180 ms) en Caja/Inventario (nombre, SKU/cámara, categoría, stock mínimo) y en Reportes/Sincronización (rango de fechas, estado, cajero).

## Próximos Hitos (Roadmap v1.2 - v2.0)
- **Hito 1 — Facturación Electrónica DIAN:** Generación de XML UBL 2.1, CUFE y envío asíncrono desde cola validada en backend.
- **Hito 2 — Control de Planes SaaS:** Medidor automático de cuota Freemium (50 ventas/mes) y pasarela para Plan Plus ($20.000 COP/mes).
- **Hito 3 — Analítica Avanzada e IA Predictiva:** Pronóstico de quiebre de stock por velocidad de rotación diaria y sugerencia automática de reabastecimiento por proveedor.
