# Positiva-POS — *"Un sistema de ventas en tu bolsillo"*

> **Plataforma SaaS de Punto de Venta (POS) y Control de Inventario Ligera (`< 2 MB`), Multi-Tenant y Local-First / Offline-First con Arquitectura Progressive Web App (PWA).**

[![Estado](https://img.shields.io/badge/Versión-v1.2.0%20Verificada-10B981?style=for-the-badge)](https://github.com/Pytheiller-18/Sistema-POS-PWA)
[![Frontend](https://img.shields.io/badge/Vite%206%20+%20React%2018-TypeScript-4F46E5?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Python%203-Flask%20+%20SQLAlchemy-111827?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![PWA](https://img.shields.io/badge/PWA-Local--First%20IndexedDB-7C3AED?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 📌 Propósito de Negocio y Modelo Comercial

**Positiva-POS** digitaliza tiendas de barrio, minimercados, cafeterías, comidas rápidas y comercios locales (1 a 10 empleados) en Roldanillo, el norte del Valle del Cauca y Colombia, garantizando operación continua sobre redes 3G/4G/Wi-Fi inestables y teléfonos de gama media/baja.

- **Nivel Freemium (`$0 COP/mes`):** Hasta 50 ventas mensuales, caja offline e inventario esencial.
- **Plan Básico (`$15.000 COP/mes`):** Operación comercial ampliada y respaldos sincronizados en nube.
- **Plan Plus / Avanzado (`$20.000 COP/mes`):** Ventas ilimitadas, multi-cajero, analítica financiera histórica y preparación arquitectónica para Facturación Electrónica DIAN y **Positiva-IA**.

---

## 🌟 Pilares Arquitectónicos e Ingeniería

1. **Replicación Local-First e Idempotencia Causal (`UUIDv7` RFC 9562):**
   - Escrituras locales inmediatas (`< 100 ms`) en `IndexedDB` (`Dexie`) y sincronización diferida en lotes de 50 hacia `/api/v1/sync/sales-batch`.
   - Trazabilidad auditable en `sync_log.py` (`SUCCESS`, `ALREADY_SYNCED`, `ERROR`) que impide cobros duplicados o dobles descuentos de inventario ante reintentos de red.

2. **Aislamiento Multi-Tenant Anti-IDOR y Transacciones ACID:**
   - Todo acceso relacional e IndexedDB filtra estrictamente por `tenant_id` inyectado desde el JWT firmado (`@tenant_required` -> `g.tenant_id`), ignorando cualquier identificador falsificado por el cliente.
   - Deducción atómica de stock con bloqueo determinista (`SELECT ... FOR UPDATE`), `Decimal(12, 2)` exacto y sanitización anti-XSS en cliente y servidor.

3. **Positiva-POS Design System (Ergonomía Táctil y Accesibilidad WCAG AA):**
   - Identidad visual propia bajo regla cromática `60-30-10` con modo Oscuro predeterminado (`#0B0F19` / `#1E293B`) y modo Claro de alto contraste solar (`#F8FAFC` / `#FFFFFF`).
   - **Ley de Fitts y Ley de Hick:** Controles interactivos `>= 48px × 48px`, sugerencias rápidas de efectivo COP (`Exacto`, `$10.000`, `$20.000`, `$50.000`), tipografía numérica tabular (`tabular-nums`), encuadre 100% dentro del viewport (`100dvh`) y cierre de venta en `<= 3` toques.

4. **Escáner Óptico por Cámara y Analítica Financiera Real:**
   - Decodificación local 1D/QR (`html5-qrcode.min.js`) con espejo CSS aislado al elemento `<video>`, linterna y confirmación sonora Web Audio API.
   - Cálculo de utilidad neta sobre costo histórico (`unit_cost`) y tasa de rotación de inventario con filtros reactivos (*debounce* `180 ms`).

---

## 📑 Estructura Real del Repositorio

```text
PROYECTO-POS/
├── docs/
│   ├── constitution.md                         # 6 principios arquitectónicos innegociables
│   └── academic-artifacts/                     # Artefactos académicos e investigativos aislados
│       ├── ficha-tecnica-investigacion.html    # Ficha técnica e informe interactivo del proyecto
│       └── Diagrama Entidad-Relacion Positiva-POS.mwb
├── specs/001-refactoring-pos/                  # Gobernanza Spec-Driven Development (Sintaxis EARS)
│   ├── spec.md                                 # Requisitos EARS (REQ-01..REQ-08) y aceptación
│   ├── plan.md                                 # Diseño Clean Architecture, DDIA y Design System
│   └── tasks.md                                # Trazabilidad de ejecución verificada
├── AGENTS.md                                   # Manual operativo y reglas Failure-to-Rule para IAs
├── MEMORY.md                                   # Estado actual, métricas y hoja de ruta
├── backend/                                    # API RESTful en Python 3 + Flask + SQLAlchemy
│   ├── app/
│   │   ├── __init__.py                         # Fábrica Flask, cabeceras seguras y servidor PWA
│   │   ├── config.py                           # Configuración MySQL 8.0+ / SQLite y JWT
│   │   ├── extensions.py                       # Instancias SQLAlchemy y CORS
│   │   ├── middlewares/auth.py                 # JWT HS256 y @tenant_required anti-IDOR
│   │   ├── models/                             # Entidades: tenant, user, product, sale, sync_log
│   │   ├── routes/                             # Blueprints: auth, products, sales, sync, reports
│   │   ├── services/                           # Lógica ACID: sale_service.py y report_service.py
│   │   └── utils/                              # uuid7.py (RFC 9562) y validators.py (anti-XSS)
│   ├── tests/test_backend.py                   # 19 pruebas automatizadas Multi-Tenant, ACID y Sync
│   ├── requirements.txt                        # Dependencias de Python
│   ├── run.py                                  # Servidor unificado (:5000) con semilla demo
│   └── schema.sql                              # Esquema relacional oficial MySQL 8.0+
└── frontend/                                   # Aplicación PWA en Vite 6 + React 18 + TypeScript
    ├── public/
    │   ├── manifest.json                       # Manifiesto instalable Android / iOS / Escritorio
    │   ├── sw.js                               # Service Worker Offline-First (App Shell + API)
    │   └── vendor/html5-qrcode.min.js          # Decodificador local de códigos de barras y QR
    ├── src/
    │   ├── styles/                             # Positiva-POS Design System: variables, layout, components
    │   ├── utils/                              # Dominio puro: domain.ts, formatters.ts, filters.ts, uuid7.ts
    │   ├── services/                           # IndexedDB (db.ts), cliente JWT (api.ts) y cola (sync.ts)
    │   ├── hooks/                              # useAuth, useCatalog, useCart, useSync, useReports, useDebounce
    │   ├── components/                         # Vistas modulares: pos, inventory, scanner, reports, sync, layout
    │   └── __tests__/pos.test.ts               # 9 pruebas unitarias de dominio, finanzas COP y UUIDv7
    ├── package.json                            # Scripts de compilación, tipado y pruebas
    └── vite.config.ts                          # Configuración Vite y proxy de desarrollo hacia Flask
```

---

## 🚀 Puesta en Marcha y Verificación Rápida

### 1. Ejecutar Suite Completa de Pruebas y Compilación PWA
```powershell
# Backend: 19 pruebas (aislamiento Multi-Tenant, anti-IDOR, ACID, UUIDv7 y auditoría sync)
python -m pip install -r backend/requirements.txt
python backend/tests/test_backend.py -v

# Frontend: verificación estricta TypeScript, 9 pruebas de dominio y build de producción
cmd.exe /c "cd /d frontend && npm run lint && npm test && npm run build"
```

### 2. Iniciar Servidor Unificado (API + PWA en `http://localhost:5000/`)
```powershell
python backend/run.py
```
- **Administrador Demo:** `admin@pos.com` | Contraseña: `admin123`
- **Cajero Demo:** `cajero@pos.com` | Contraseña: `cajero123`
- **Acceso Móvil en Red Local Wi-Fi:** `http://<IP-DE-TU-PC>:5000/`

---

## 📡 Endpoints Principales de la API RESTful

| Método | Endpoint | Descripción | Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Autenticación con limitador anti fuerza bruta y entrega JWT | Público |
| `POST` | `/api/v1/auth/register-tenant` | Alta transaccional de nueva tienda y usuario administrador | Público |
| `GET` | `/api/v1/products` | Catálogo por `tenant_id` con descarga diferencial `?since=` | Todos |
| `POST` | `/api/v1/products` | Registro validado de SKU (`sale_price > 0`, `stock >= 0`) | Admin / Manager |
| `POST` | `/api/v1/sales` | Registro transaccional ACID de venta con descuento atómico | Todos |
| `POST` | `/api/v1/sync/sales-batch` | Conciliación idempotente de lotes offline (alias `/api/sync/sales-batch`) | Todos |
| `GET` | `/api/v1/reports/today` | Ventas, transacciones y ticket promedio del día | Admin / Manager |
| `GET` | `/api/v1/reports/profit` | Utilidad bruta y margen porcentual sobre costo histórico | Admin |

---

## 👤 Autor

- **Heiller Tamayo** — *Desarrollo e Investigación Aplicada*
  - GitHub: [@Pytheiller-18](https://github.com/Pytheiller-18)
  - Correo: [heillertamayo@gmail.com](mailto:heillertamayo@gmail.com)
