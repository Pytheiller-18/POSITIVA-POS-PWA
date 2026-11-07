# Constitución de Positiva-POS

Todo desarrollador o agente IA que modifique este repositorio debe cumplir estos 6 principios innegociables:

1. **Huella Ultraligera (`< 2 MB`) e Identidad Propia:** Mantener fuente y bundle PWA bajo `2 MB` sobre **Vite + React + TypeScript** y **Flask + SQLAlchemy**. Prohibido añadir frameworks pesados o referencias a marcas POS externas; rige exclusivamente **Positiva-POS Design System**.
2. **Aislamiento Multi-Tenant Anti-IDOR:** Toda consulta, índice y mutación en MySQL/SQLite e IndexedDB debe filtrar por `tenant_id` extraído únicamente del JWT firmado (`g.tenant_id`), jamás del cuerpo o *query params* del cliente.
3. **Local-First, ACID e Idempotencia Causal (`UUIDv7`):** Toda operación offline persiste en IndexedDB (`< 100 ms`) con `client_sync_id` (`UUIDv7` RFC 9562). El backend procesa lotes con `Decimal` exacto, bloqueo transaccional ACID y auditoría en `sync_log.py` sin duplicar cobros ni descuentos de stock.
4. **Regla de la Dependencia (Clean Architecture):** La aritmética monetaria COP, validaciones, devuelta y filtros residen en funciones puras de dominio (`utils/`, `services/`), desacopladas del DOM, React Context y SQLAlchemy.
5. **Gobernanza SDD (EARS) y Verificación Pre-Commit:** Todo cambio sigue `specs/` bajo sintaxis EARS y exige `0` fallos en `test_backend.py`, `npm run lint`, `npm test` y `npm run build`.
6. **Idioma y Ergonomía Táctil (Ley de Fitts y WCAG AA):** Código de dominio, UI y documentación en español claro; regla cromática `60-30-10` (`>= 4.5:1`), números tabulares (`tabular-nums`), flujo de cobro en `<= 3` toques y controles interactivos `>= 48px × 48px`.
