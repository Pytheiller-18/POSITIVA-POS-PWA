# Plan Técnico 001 — Clean Architecture, DDIA Local-First y Positiva-POS Design System

## 1. Arquitectura de Capas y Regla de la Dependencia
Siguiendo *Clean Architecture* (R. C. Martin) y *Fundamentals of Software Architecture* (Richards & Ford), las dependencias apuntan estrictamente hacia las reglas de negocio:

```text
[ Componentes UI React (pos/, inventory/, reports/, sync/, scanner/, layout/) ]
                                  │
                                  ▼
[ Hooks de Aplicación (useCart, useCatalog, useSync, useReports, useAuth) ]
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
[ Dominio Puro TS (utils/domain.ts,              [ Adaptadores Local-First (services/db.ts,
  formatters.ts, filters.ts, uuid7.ts) ]           services/sync.ts, services/api.ts) ]
                                                                  │
                                                         JSON DTO / REST + JWT
                                                                  ▼
                                                 [ Backend Flask Blueprints (routes/*) ]
                                                                  │
                                                                  ▼
                                                 [ Servicios Transaccionales ACID
                                                   (sale_service.py, report_service.py,
                                                    validators.py, uuid7.py) ]
```

## 2. Consistencia de Datos Local-First (Kleppmann — DDIA)
1. **Escritura Líder Local (`IndexedDB`):** En ausencia de red, Dexie (`PositivaPosDB_v1`) confirma transacciones atómicas en `< 100 ms` sobre las tablas `products`, `sales` y `pending_products` indexadas por `tenant_id`.
2. **Ordenamiento Causal (`UUIDv7` RFC 9562):** Tanto cliente (`utils/uuid7.ts`) como servidor (`utils/uuid7.py`) emiten identificadores de 128 bits con prefijo temporal Unix de 48 bits en milisegundos, optimizando páginas B+Tree en InnoDB/SQLite.
3. **Reconciliación Asíncrona e Idempotente:** `sync.ts` sincroniza primero SKUs creados offline (remapeando `temp_id -> product.id` real en ventas encoladas), envía ventas en bloques de `50` hacia `/api/v1/sync/sales-batch` y descarga cambios delta `?since=` usando `server_time` para evitar deriva de reloj del cliente.
4. **Aislamiento ACID y Trazabilidad:** `sale_service.py` bloquea filas en motores relacionales transaccionales (`SELECT ... FOR UPDATE`), aplica descuento atómico SQL `Product.stock - qty`, opera en `Decimal(12, 2)` y deja rastro inmutable en `sync_audit_log` (`SUCCESS` / `ALREADY_SYNCED` / `ERROR`).

## 3. Positiva-POS Design System (Heurísticas de Nielsen y Leyes de UX)
- **Regla Cromática 60-30-10 y Contraste WCAG AA (`>= 4.5:1`):**
  - *60% Superficies:* Modo Oscuro predeterminado (`#0B0F19` / `#111827` / `#1E293B`) contra fatiga visual y Modo Claro solar (`#F8FAFC` / `#FFFFFF` con bordes `#CBD5E1` y texto `#0F172A`).
  - *30% Identidad:* Azul/Índigo institucional (`#4F46E5` / `#6366F1`) y Púrpura Eléctrico (`#7C3AED`) en navegación activa, filtros de categoría y acciones secundarias.
  - *10% Semántica Transaccional:* Esmeralda (`#10B981` / `#059669`) reservado al CTA **"Cobrar Venta"** y estado `ONLINE`; Ámbar (`#F59E0B`) para modo `OFFLINE` y cola pendiente; Rojo (`#EF4444`) para stock crítico/agotado y errores.
- **Escala Tipográfica y Precisión Numérica:**
  - `Display / H1`: `32px` Bold (`2rem`) en totales de cobro y KPIs.
  - `H2`: `22px` Semibold (`1.375rem`) en encabezados de módulo.
  - `H3`: `16px` Medium (`1rem`) en tarjetas de producto y títulos de modales.
  - `Body`: `14px` Regular (`0.875rem`, `line-height: 1.5`, `font-variant-numeric: tabular-nums`).
  - `Caption`: `11px` Regular (`0.6875rem`) en códigos SKU/EAN-13 y etiquetas de estado.
- **Ley de Fitts (`>= 48px × 48px`) y Ley de Hick (`<= 3` toques):** Botones táctiles, sugerencias de billetes (`Exacto`, `$10.000`, `$20.000`, `$50.000`) y controles ópticos dimensionados a `min-height: 48px; min-width: 48px`.

