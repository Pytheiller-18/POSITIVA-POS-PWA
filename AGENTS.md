# AGENTS.md — Manual Operativo para Agentes IA (Positiva-POS)

## 1. Resumen Ejecutivo
**Positiva-POS** (*"Un sistema de ventas en tu bolsillo"*) es una plataforma SaaS de Punto de Venta (POS) y control de inventario con arquitectura **Progressive Web App (PWA)**, diseñada bajo enfoque **Local-First / Offline-First** y **Mobile-First** para tiendas de barrio, minimercados, cafeterías y microempresas en Colombia (Freemium `$0 COP` hasta 50 ventas/mes; Plan Básico `$15.000 COP/mes`; Plan Plus `$20.000 COP/mes`). Opera con fluidez sobre redes 3G/4G/Wi-Fi inestables manteniendo una huella técnica ultraligera (`< 2 MB`) e identidad visual propia (**Positiva-POS Design System**; prohibida cualquier referencia a marcas o plantillas POS comerciales de terceros).

---

## 2. Mapa del Stack y Archivos Críticos

```text
PROYECTO-POS/
├── docs/
│   ├── constitution.md                         # 6 principios arquitectónicos innegociables (<= 20 líneas)
│   └── academic-artifacts/                     # Artefactos académicos aislados fuera del runtime
│       ├── ficha-tecnica-investigacion.html    # Ficha técnica e informe interactivo de investigación
│       └── Diagrama Entidad-Relacion Positiva-POS.mwb
├── specs/001-refactoring-pos/                  # Gobernanza SDD bajo sintaxis EARS
│   ├── spec.md                                 # Requisitos EARS y criterios de aceptación
│   ├── plan.md                                 # Diseño Clean Architecture, DDIA y UI/UX
│   └── tasks.md                                # Trazabilidad de tareas verificadas
├── MEMORY.md                                   # Estado actual, decisiones y hoja de ruta (<= 50 líneas)
├── backend/                                    # API RESTful en Python 3 + Flask + SQLAlchemy
│   ├── run.py                                  # Servidor unificado (:5000) y semilla demo
│   ├── schema.sql                              # DDL relacional oficial para MySQL 8.0+
│   ├── app/__init__.py                         # Fábrica Flask; sirve /api/v1/* y PWA en frontend/dist
│   ├── app/middlewares/auth.py                 # JWT HS256 y @tenant_required anti-IDOR (g.tenant_id)
│   ├── app/routes/sync.py                      # Sincronización por lotes (/api/v1/sync/sales-batch)
│   ├── app/services/sale_service.py            # Transacciones ACID, Decimal, UUIDv7 y sync_log
│   ├── app/services/report_service.py          # Agregaciones SQL por tenant y utilidad histórica
│   ├── app/utils/uuid7.py                      # Generador monotónico UUIDv7 RFC 9562
│   ├── app/utils/validators.py                 # Sanitización anti-XSS/inyección y LoginRateLimiter
│   └── tests/test_backend.py                   # Suite integral multi-tenant, IDOR, ACID e idempotencia
└── frontend/                                   # Cliente PWA en Vite 6 + React 18 + TypeScript
    ├── public/manifest.json                    # Metadatos de instalación PWA móvil/escritorio
    ├── public/sw.js                            # Service Worker (Network-First API / SWR App Shell)
    ├── public/vendor/html5-qrcode.min.js       # Decodificador óptico local 1D/QR por cámara
    ├── src/styles/variables.css                # Positiva-POS Design System (60-30-10, WCAG AA, 48px)
    ├── src/styles/layout.css                   # Shell adaptativo sin desborde y Dual-Pane escritorio
    ├── src/styles/components.css               # Tarjetas POS, teclado táctil >= 48px, modales y ticket
    ├── src/utils/                              # Dominio puro: domain.ts, formatters.ts, filters.ts, uuid7.ts
    ├── src/services/                           # Persistencia y red: db.ts (Dexie), api.ts, sync.ts
    ├── src/hooks/                              # Orquestación: useAuth, useCatalog, useCart, useSync, useReports
    ├── src/components/                         # UI pura: pos/, inventory/, scanner/, reports/, sync/, layout/
    └── src/__tests__/pos.test.ts               # Pruebas unitarias de dominio, filtros, finanzas y UUIDv7
```

---

## 3. Comandos Exactos de Desarrollo, Compilación y Verificación

En Windows PowerShell (si la política de ejecución bloquea `npm.ps1`, prefijar con `cmd.exe /c`):

```powershell
# 1. Instalar y probar Backend (Flask + SQLite en memoria para tests)
python -m pip install -r backend/requirements.txt
python backend/tests/test_backend.py -v

# 2. Verificar tipos/linter, ejecutar tests de dominio y compilar PWA en Frontend
cmd.exe /c "cd /d frontend && npm run lint"
cmd.exe /c "cd /d frontend && npm test"
cmd.exe /c "cd /d frontend && npm run build"

# 3. Levantar Servidor Unificado en Producción/Demo (API + PWA en http://localhost:5000/)
python backend/run.py

# 4. Desarrollo Frontend con HMR y proxy automático hacia Flask (:5000)
cmd.exe /c "cd /d frontend && npm run dev"
```

---

## 4. Protocolo Spec-Driven Development (SDD) y Sintaxis EARS

Antes de alterar código, todo agente debe ejecutar el ciclo **Constrain -> Inform -> Verify -> Correct**:

1. **Constrain (Restringir):** Leer obligatoriamente `docs/constitution.md`, `MEMORY.md` y `specs/001-refactoring-pos/spec.md`. Formalizar requisitos bajo sintaxis **EARS** (`CUANDO <trigger>, EL SISTEMA DEBERÁ <respuesta>`; `SI <condición offline/error>, ENTONCES EL SISTEMA DEBERÁ <respaldo>`). Nunca omitir `tenant_id`, nunca acoplar reglas de negocio al DOM, y jamás introducir nombres o estilos de marcas POS externas.
2. **Inform (Informar):** Auditar solo los archivos afectados (*Lazy Discovery*) y mantener artefactos no ejecutables aislados en `docs/academic-artifacts/`.
3. **Verify (Verificar):** Tratar todo cambio como defectuoso hasta ejecutar `python backend/tests/test_backend.py -v`, `npm run lint`, `npm test` y `npm run build` con cero fallos.
4. **Correct & Failure-to-Rule (Corregir y Aprender):** Diagnosticar fallos en la causa raíz, re-ejecutar toda la suite y registrar la regla preventiva en la sección 5.

---

## 5. Reglas Preventivas Aprendidas (Failure-to-Rule)

- **R-01 (Contrato `/api/v1/sync/sales-batch`):** El backend Flask encapsula `synced_ids`, `already_synced_ids` y `failed` dentro de `response.summary`. Nunca leer `response.synced_ids` en la raíz del JSON.
- **R-02 (Rutas de API Relativas en PWA):** Usar `/api/v1` relativo en producción (y proxy en `vite.config.ts` durante desarrollo) para que terminales móviles por Wi-Fi alcancen a Flask sin errores CORS ni loopback.
- **R-03 (Espejo de Cámara Aislado por CSS):** La inversión horizontal (`transform: scaleX(-1)`) debe aplicarse únicamente al `<video>` visual, nunca al `<canvas>` interno de decodificación EAN/UPC.
- **R-04 (Contrato `/api/v1/reports/profit` y Descuento):** El endpoint de utilidades retorna `gross_profit` y `margin_percentage` en `data`, y `sales-batch` recibe el monto descontado en `discount` (con aritmética `Decimal` en backend).
- **R-05 (Lectura Completa de Firmas y Cierre de Streams):** Verificar siempre las firmas exactas de utilidades (`LoginRateLimiter.register_failure`) y cerrar respuestas `send_from_directory` (`res.close()`) en `unittest` sobre Python 3.13+.
- **R-06 (Encuadre Viewport y Ley de Fitts `>= 48px`):** Usar `minmax(0, 1fr)` en CSS Grid y `min-width: 0` en contenedores flex/grid para impedir desbordes horizontales, garantizando objetivos táctiles `>= 48px × 48px` sin hojas parche duplicadas.
- **R-07 (Contrato `GET /api/v1/sales` Paginado):** El listado histórico de ventas retorna `total_records`, `total_pages` y `sales` (nunca `count`).
