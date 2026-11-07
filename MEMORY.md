# MEMORY.md — Memoria Persistente del Proyecto (Positiva-POS)

## Estado Actual
- **Versión:** `v1.2.0` (Clean Architecture, Hardening Multi-Tenant y **Positiva-POS Design System** — `2026-11-07`).
- **Huella Técnica:** `< 2 MB` (`~950 KB` fuente ejecutable; bundle PWA `~356 KB` crudo / `~108,8 KB` gzip).
- **Verificación:** `19/19` tests Backend (`test_backend.py`) + `9/9` tests Frontend (`pos.test.ts`) + `tsc` & `vite build` (`0` errores).
- **Repositorio:** `https://github.com/Pytheiller-18/Sistema-POS-PWA`.

## Arquitectura Vigente
- **Backend (`backend/`):** Python 3 + Flask + SQLAlchemy (MySQL 8.0+ / SQLite en desarrollo), claves primarias `UUIDv7` RFC 9562 (`utils/uuid7.py`), seguridad JWT (`HS256`), aislamiento anti-IDOR `@tenant_required` (`g.tenant_id`), aritmética exacta `Decimal`, bloqueo `SELECT ... FOR UPDATE` + descuento atómico SQL y auditoría `SyncAuditLog` (`sync_log.py`).
- **Frontend (`frontend/`):** Vite 6 + React 18 + TypeScript. PWA Local-First (`manifest.json`, `sw.js` `v5`), persistencia `IndexedDB` (`services/db.ts` en Dexie), reglas puras de dominio (`utils/domain.ts`, `formatters.ts`, `filters.ts`, `uuid7.ts`), sincronización por lotes (`services/sync.ts`) y escáner óptico `html5-qrcode.min.js`.
- **Higiene y Gobernanza SDD:** Artefactos investigativos aislados en `docs/academic-artifacts/`; requisitos EARS en `specs/001-refactoring-pos/{spec.md,plan.md,tasks.md}`.

## Hitos Consolidados (v1.0 -> v1.2)
1. **Arnés Agéntico y SDD EARS:** `docs/constitution.md` (`10` líneas), `AGENTS.md` (reglas `R-01`..`R-07`), `MEMORY.md` y especificaciones EARS (`REQ-01`..`REQ-08`).
2. **Clean Architecture y Purga de Redundancia:** Eliminación de `pos-2/`, de dependencias sin uso (`clsx`, `dexie-react-hooks`) y de hoja parche `fit.css`; extracción de validaciones y cálculo de devuelta a `utils/domain.ts`.
3. **Hardening Transaccional y Anti-IDOR:** Sanitización anti-XSS/nulos en `validators.py` y `domain.ts`, inmunidad ante `tenant_id` forjado, orden determinista de bloqueo de filas y trazabilidad `SUCCESS`/`ALREADY_SYNCED`/`ERROR`.
4. **Positiva-POS Design System:** Identidad visual propia con cero rastro de marcas externas, regla `60-30-10` con contraste WCAG AA (`>= 4.5:1`), escala `32/22/16/14/11 px` (`tabular-nums`), áreas táctiles `>= 48px × 48px` (Ley de Fitts) y cobro en `<= 3` toques (Ley de Hick).

## Próximos Hitos (Roadmap v1.3 - v2.0)
- **Hito 1 — Facturación Electrónica DIAN:** Emisión asíncrona XML UBL 2.1 y cálculo CUFE desde lotes conciliados.
- **Hito 2 — Control Comercial SaaS:** Medidor automático Freemium (`50` ventas/mes), Plan Básico (`$15.000 COP/mes`) y Plan Plus (`$20.000 COP/mes`).
- **Hito 3 — Positiva-IA:** Predicción local/nube de quiebre de inventario y reabastecimiento sugerido según velocidad de rotación.
