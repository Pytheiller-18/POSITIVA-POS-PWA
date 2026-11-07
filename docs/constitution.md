# Constitución de Positiva-POS

Todo humano o agente IA que modifique este repositorio debe cumplir estos 6 principios innegociables:

1. **Huella Ultraligera (< 2 MB):** Mantener código fuente y bundle compilado bajo 2 MB; prohibido añadir frameworks pesados de UI o estado sin autorización expresa.
2. **Aislamiento Multi-Tenant Estricto:** Toda consulta, índice y mutación en MySQL/SQLite (`g.tenant_id`) e IndexedDB debe filtrar obligatoriamente por `tenant_id`.
3. **Prioridad Offline-First:** Toda venta o alta de producto debe persistirse primero en IndexedDB (`services/db.ts`) y encolarse con `client_sync_id` idempotente en `services/sync.ts`.
4. **Separación UI vs. Lógica:** Los componentes React solo renderizan interfaz y eventos; el estado, red y persistencia viven en `hooks/` y `services/`.
5. **Verificación Pre-Commit Obligatoria:** Prohibido hacer commit si falla algún test de backend (`test_backend.py`), test de frontend (`npm test`) o el empaquetado (`npm run build`).
6. **Idioma y Ergonomía de Dominio:** Interfaz, documentación y comentarios técnicos en español claro; botones táctiles interactivos `>= 44px` respetando `variables.css`.

