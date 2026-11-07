# AGENTS.md — Manual Operativo para Agentes IA (Positiva-POS)

## 1. Resumen Ejecutivo
**Positiva-POS** (*"Un sistema de ventas en tu bolsillo"*) es una plataforma SaaS de Punto de Venta (POS) y control de inventario con arquitectura **Progressive Web App (PWA)**, diseñada bajo enfoque **Offline-First** y **Mobile-First** para tenderos, comercios locales y microempresas (modelo Freemium hasta 50 ventas/mes; Plan Plus desde $20.000 COP/mes). Opera con fluidez sobre redes 3G/4G/Wi-Fi inestables y teléfonos de gama media/baja manteniendo una huella técnica ultraligera (`< 2 MB`).

---

## 2. Mapa del Stack y Archivos Críticos

```text
PROYECTO-POS/
├── docs/constitution.md                    # 6 principios arquitectónicos innegociables
├── specs/001-refactoring-pos/spec.md       # Especificación activa SDD y criterios de aceptación
├── MEMORY.md                               # Estado actual, decisiones y hoja de ruta
├── backend/                                # API RESTful en Python 3 + Flask + SQLAlchemy
│   ├── run.py                              # Punto de entrada unificado (:5000) y semilla demo
│   ├── schema.sql                          # DDL relacional oficial para MySQL 8.0+
│   ├── app/__init__.py                     # Fábrica Flask; sirve /api/v1/* y PWA en frontend/dist
│   ├── app/middlewares/auth.py             # JWT HS256 y decorador @tenant_required (inyecta g.tenant_id)
│   ├── app/routes/sync.py                  # Sincronización por lotes (/api/v1/sync/sales-batch)
│   ├── app/services/sale_service.py        # Transacciones ACID, descuento de stock e idempotencia
│   ├── app/services/report_service.py      # Agregaciones SQL por tenant y utilidad con costo histórico
│   ├── app/utils/validators.py             # Sanitización tipada y LoginRateLimiter anti fuerza bruta
│   └── tests/test_backend.py               # Suite integral de seguridad multi-tenant y sincronización
└── frontend/                               # Cliente PWA en Vite 6 + React 18 + TypeScript
    ├── public/manifest.json                # Metadatos de instalación PWA móvil/escritorio
    ├── public/sw.js                        # Service Worker (Network-First API / SWR App Shell)
    ├── public/vendor/html5-qrcode.min.js   # Decodificador óptico local 1D/QR por cámara
    ├── src/styles/variables.css            # Tokens de color (claro/oscuro) y talla táctil >= 44px
    ├── src/styles/layout.css               # Estructura Mobile-First y Dual-Pane escritorio
    ├── src/styles/components.css           # Componentes reutilizables, modales y ticket térmico
    ├── src/services/db.ts                  # Almacén IndexedDB (Dexie) aislado por tenant_id
    ├── src/services/api.ts                 # Cliente HTTP /api/v1 con manejo de Bearer JWT
    ├── src/services/sync.ts                # Motor offline: lotes de 50, delta ?since= y cola de SKU
    ├── src/hooks/                          # Hooks de dominio (useCatalog, useCart, useSync, useReports)
    └── src/components/                     # Vistas atómicas: pos, inventory, scanner, reports, sync
```

---

## 3. Comandos Exactos de Desarrollo, Compilación y Verificación

En Windows PowerShell (si la política de ejecución bloquea `npm.ps1`, prefijar con `cmd.exe /c`):

```powershell
# 1. Instalar y probar Backend (Flask + SQLite en memoria para tests)
python -m pip install -r backend/requirements.txt
python backend/tests/test_backend.py

# 2. Compilar, verificar tipos/linter y ejecutar tests en Frontend (Vite + React + Vitest)
cmd.exe /c "cd /d frontend && npm run lint"
cmd.exe /c "cd /d frontend && npm test"
cmd.exe /c "cd /d frontend && npm run build"

# 3. Levantar Servidor Unificado en Producción/Demo (API + PWA en http://localhost:5000/)
python backend/run.py

# 4. Desarrollo Frontend con HMR y proxy automático hacia Flask (:5000)
cmd.exe /c "cd /d frontend && npm run dev"
```

---

## 4. Protocolo Spec-Driven Development (SDD) y Puertas de Control

Antes de escribir o alterar cualquier línea de código, todo agente debe ejecutar el ciclo **Constrain -> Inform -> Verify -> Correct**:

1. **Constrain (Restringir):** Leer obligatoriamente `docs/constitution.md`, `MEMORY.md` y la especificación activa en `specs/NNN-*/spec.md`. Nunca omitir `tenant_id`, nunca romper `sw.js`/`db.ts`/`sync.ts` y nunca alterar la paleta de `variables.css`.
2. **Inform (Informar):** Auditar solo los archivos afectados (*Lazy Discovery*), explicar qué módulos cambiarán y esperar confirmación humana en las puertas de parada (*Stop Gates*) cuando el cambio sea estructural.
3. **Verify (Verificar):** Tratar todo código nuevo como defectuoso hasta ejecutar en terminal `python backend/tests/test_backend.py`, `npm test` y `npm run build` con cero fallos.
4. **Correct & Failure-to-Rule (Corregir y Aprender):** Si una prueba o compilación falla, diagnosticar la causa raíz, corregirla, re-ejecutar toda la suite y registrar la regla preventiva en la sección 5 de este documento.

---

## 5. Reglas Preventivas Aprendidas (Failure-to-Rule)

- **R-01 (Contrato `/api/v1/sync/sales-batch`):** El backend Flask encapsula los arreglos `synced_ids`, `already_synced_ids` y `failed` dentro de `response.summary`. Nunca leer `response.synced_ids` en la raíz del JSON.
- **R-02 (Rutas de API Relativas en PWA):** Usar `/api/v1` relativo en producción (y proxy en `vite.config.ts` durante desarrollo) en lugar de `http://localhost:5000`, garantizando que dispositivos móviles en red local Wi-Fi o túneles alcancen al servidor Flask sin errores de origen cruzado ni loopback local.
- **R-03 (Espejo de Cámara Aislado por CSS):** La inversión horizontal del escáner (`transform: scaleX(-1)`) debe aplicarse únicamente al nodo visual `<video>`, nunca al `<canvas>` interno de captura, para preservar la paridad de códigos EAN/UPC.
- **R-04 (Contrato `/api/v1/reports/profit` y Descuento en Ventas):** El endpoint de utilidades retorna `gross_profit` y `margin_percentage` dentro de `data`, y `POST /api/v1/sync/sales-batch` espera el monto de descuento en el campo `discount` (no `discount_amount`).
- **R-05 (Lectura Completa de Firmas y Cierre de Streams en Tests):** Leer siempre el cuerpo completo de clases utilitarias antes de invocar métodos (ej. `LoginRateLimiter.register_failure`) y cerrar respuestas `send_from_directory` (`res.close()`) en `unittest` sobre Python 3.13+ para evitar `ResourceWarning`.