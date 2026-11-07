# Tareas de Ejecución SDD 001 — Hardening Integral Positiva-POS

- [x] **T-01 (Higiene Estructural):** Reubicar `index.html` raíz a `docs/academic-artifacts/ficha-tecnica-investigacion.html` y `Diagrama Entidad-Relacion Positiva-POS.mwb` a `docs/academic-artifacts/`.
- [x] **T-02 (Gobernanza y SDD EARS):** Endurecer `docs/constitution.md` (`<= 20` líneas), `AGENTS.md` y formalizar `spec.md`, `plan.md` y `tasks.md` bajo sintaxis EARS.
- [x] **T-03 (Hardening Backend Multi-Tenant y ACID):** Reforzar `validators.py` (anti-XSS, `require_json_object`, rangos estrictos), `sale_service.py` (orden determinista de bloqueo `FOR UPDATE`, `Decimal`, auditoría `ALREADY_SYNCED`/`ERROR` en `sync_log.py`) y rutas protegidas `@tenant_required`.
- [x] **T-04 (Clean Architecture en Frontend):** Extraer reglas puras de cálculo, cambio de efectivo y validación de borradores en `frontend/src/utils/domain.ts` y `formatters.ts`, eliminando duplicidad entre vistas.
- [x] **T-05 (Purga de Marcas Externas y Positiva-POS Design System):** Eliminar toda referencia a marcas POS externas y hoja parche `fit.css`; consolidar `variables.css`, `layout.css` y `components.css` con regla `60-30-10`, contraste WCAG AA, escala `32/22/16/14/11 px` (`tabular-nums`), objetivos táctiles `>= 48px × 48px` (Ley de Fitts) y flujo de `<= 3` toques (Ley de Hick).
- [x] **T-06 (Verificación Integral y Documentación):** Ampliar `backend/tests/test_backend.py` y `frontend/src/__tests__/pos.test.ts`, validar `tsc -b && vite build` con `0` errores y sincronizar `MEMORY.md` y `README.md`.
