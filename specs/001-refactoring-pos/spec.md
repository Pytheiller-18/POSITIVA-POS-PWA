# Especificación 001 — Arquitectura Limpia, Hardening Multi-Tenant y Positiva-POS Design System

- **Estado:** Verificado en Producción Local (`v1.2.0`)
- **Gobernanza:** Sujeto a `docs/constitution.md` y `AGENTS.md`
- **Estándar de Requisitos:** Sintaxis **EARS** (*Easy Approach to Requirements Syntax*)

---

## 1. Propósito y Contexto de Negocio
Consolidar **Positiva-POS** (*"Un sistema de ventas en tu bolsillo"*) sobre una arquitectura **Clean Architecture** y **Local-First** en `frontend/` (**Vite + React + TypeScript**) y `backend/` (**Python + Flask + SQLAlchemy/MySQL**), aislando artefactos académicos en `docs/academic-artifacts/`, erradicando cualquier referencia a marcas POS comerciales de terceros e implantando el **Positiva-POS Design System** con seguridad Multi-Tenant anti-IDOR e idempotencia causal `UUIDv7`.

---

## 2. Requisitos Funcionales y No Funcionales (Sintaxis EARS)

- **REQ-01 (Aislamiento Multi-Tenant Anti-IDOR):** **CUANDO** un cliente invoque cualquier endpoint protegido (`/api/v1/products`, `/sales`, `/sync/*`, `/reports/*`, `/auth/users`), **EL SISTEMA DEBERÁ** extraer `tenant_id` exclusivamente de la firma criptográfica JWT (`g.tenant_id`) e ignorar cualquier `tenant_id` enviado en el cuerpo JSON o parámetros de consulta. **SI** un recurso solicitado pertenece a otro `tenant_id` o el usuario/tenant está inactivo, **ENTONCES EL SISTEMA DEBERÁ** rechazar el acceso con código HTTP `404`, `401` o `403` sin filtrar metadatos ajenos.
- **REQ-02 (Operación Local-First en Caja e Inventario):** **CUANDO** el cajero registre una venta o un nuevo producto en la terminal PWA, **EL SISTEMA DEBERÁ** validar la regla de dominio mediante funciones puras, descontar el stock localmente y persistir la transacción en `IndexedDB` (`services/db.ts`) en `< 100 ms` con un `client_sync_id` `UUIDv7` monotónico. **SI** la red está caída o en modo `OFFLINE`, **ENTONCES EL SISTEMA DEBERÁ** encolar el registro con estado `PENDING` y mostrar el indicador Ámbar (`#F59E0B`) con el contador vivo en cabecera.
- **REQ-03 (Sincronización por Lotes e Idempotencia Causal):** **CUANDO** el navegador recupere conectividad o el usuario dispare la sincronización manual, **EL SISTEMA DEBERÁ** replicar primero los SKUs pendientes y luego las ventas en lotes de hasta `50` registros hacia `/api/v1/sync/sales-batch`. **SI** un lote o venta con el mismo `client_sync_id` se retransmite por inestabilidad de red, **ENTONCES EL SISTEMA DEBERÁ** responder de forma idempotente (`already_synced: true`), abstenerse de duplicar la venta o descontar inventario por segunda vez y registrar la trazabilidad `ALREADY_SYNCED` en `sync_log.py`.
- **REQ-04 (Atomicidad ACID y Exactitud Monetaria COP):** **CUANDO** `sale_service.py` procese una venta con múltiples ítems, **EL SISTEMA DEBERÁ** ejecutar la validación, bloqueo transaccional y deducción atómica de inventario empleando aritmética exacta `Decimal` (`ROUND_HALF_UP`). **SI** cualquier ítem del pedido es inválido o inexistente en el `tenant_id`, **ENTONCES EL SISTEMA DEBERÁ** ejecutar `rollback` completo preservando intacto el stock de los demás productos.
- **REQ-05 (Sanitización y Validación de Entrada):** **CUANDO** el cliente envíe datos de productos, ventas o autenticación, **EL SISTEMA DEBERÁ** validar rangos numéricos y sanitizar cadenas en cliente y servidor (`validators.py`, `domain.ts`). **SI** el payload contiene precios negativos, cantidades cero o negativas, caracteres nulos o vectores XSS (`<script`, `javascript:`), **ENTONCES EL SISTEMA DEBERÁ** rechazar la petición con código HTTP semántico (`400` / `422`) sin exponer trazas internas.
- **REQ-06 (Filtrado Reactivo y Analítica sobre Costo Histórico):** **CUANDO** el usuario filtre el catálogo o los reportes financieros, **EL SISTEMA DEBERÁ** aplicar *debounce* (`180 ms`) normalizando tildes para filtrar por nombre, SKU/cámara, categoría, estado de stock, rango de fechas, estado de sincronización y cajero, calculando la utilidad neta real sobre `unit_cost` histórico y la tasa de rotación de stock.
- **REQ-07 (Positiva-POS Design System, Ley de Fitts y Flujo de 3 Toques):** **CUANDO** se renderice cualquier vista o ventana modal en móvil o escritorio, **EL SISTEMA DEBERÁ** encuadrar el 100% de la interfaz sin desborde horizontal, aplicando la regla cromática `60-30-10` con contraste WCAG AA (`>= 4.5:1`), jerarquía tipográfica (`32/22/16/14/11 px` con `tabular-nums`), objetivos táctiles `>= 48px × 48px` y flujo de cobro en máximo `3` interacciones.
- **REQ-08 (Higiene Estructural del Repositorio):** **CUANDO** se audite el árbol del repositorio, **EL SISTEMA DEBERÁ** mantener en `frontend/` y `backend/` únicamente artefactos intrínsecos de compilación y ejecución, ubicando portales investigativos y diagramas binarios en `docs/academic-artifacts/` con cero menciones a marcas POS de terceros.

---

## 3. Criterios de Aceptación Verificables

1. **CA-01 (Higiene y Gobernanza):** `docs/constitution.md` (`<= 20` líneas), `MEMORY.md` (`<= 50` líneas), `docs/academic-artifacts/` poblado y `0` coincidencias de marcas POS externas en todo el código fuente y documentación.
2. **CA-02 (Seguridad Multi-Tenant e IDOR):** `test_backend.py` comprueba aislamiento cruzado e inmunidad ante inyección de `tenant_id` forjado en body/query params.
3. **CA-03 (ACID, Decimal e Idempotencia con Trazabilidad):** `test_backend.py` verifica rollback atómico, no duplicidad por `client_sync_id` y registro auditable en `SyncAuditLog` (`SUCCESS` y `ALREADY_SYNCED`).
4. **CA-04 (Dominio Puro y Filtrado):** `pos.test.ts` valida cálculos monetarios, devuelta exacta, validaciones anti-XSS/negativos, filtros multi-criterio y `UUIDv7` sin depender del DOM.
5. **CA-05 (Build Limpio y Ligero):** `tsc --noEmit` y `tsc -b && vite build` finalizan con `0` errores y huella total `< 2 MB`.
