# BANCA NEN — Frontend Web (conectado al backend real, SIN datos mock)

Frontend React 18 + TypeScript + Vite + Tailwind CSS de la plataforma de inversión
**BANCA NEN**: billetera multi-moneda, trading asistido por IA, depósitos Wompi,
2FA, auditoría inmutable y paneles de usuario y administración.

> ⚠️ **Sin datos simulados**: todos los datos provienen de la API real del backend
> (`/api/v1`, proxied por Vite hacia `http://localhost:3000`). Si el backend no está
> corriendo, las páginas muestran errores claros y el indicador **"Sin conexión API"**.

## 🚀 Puesta en marcha (requiere el backend)

```bash
# 1. Base de datos (PostgreSQL 16+, puerto 5433 por defecto)
createdb banca_nen   # o tu gestor habitual

# 2. Backend
cd ../backend
npm install
npm run dev          # http://localhost:3000  (crea tablas automáticamente)

# 3. Frontend
cd ../frontend
npm install
npm run dev          # http://localhost:5173
```

### Cuentas de prueba (creadas por ti vía registro)
1. Regístrate desde `/register` (KYC básico, mayor de 18).
2. Para tener rol **admin**: `UPDATE users SET role='admin' WHERE email='tu@email.com';`
3. Deposita fondos desde `/wallet/deposit` (la API los acredita al instante).

## 🧭 Rutas

### Un solo sidebar para todos los usuarios
El layout usa **un único menú lateral** (`src/components/layout/Sidebar.tsx`)
con iconos, **colapsable** (botón "Colapsar menú" ↔ rail de iconos) y grupos
desplegables (Billetera, Trading, …). Las secciones se muestran según el rol:

- **Usuario**: Dashboard · Billetera (+Depositar/Retirar) · Trading (+Predicción IA, Historial) · Reportes · Ajustes (+Seguridad)
- **Admin/Operador/Analista**: añade el bloque **Administración** (Panel, Usuarios, Auditoría, Reportes, Configuración) y el acceso directo "Portal admin" ↔ "Volver al portal".

| Ruta | Página | API |
|---|---|---|
| `/dashboard` | Dashboard con gráficos y trading | `/market/*`, `/wallet`, `/orders`, `/ia` |
| `/wallet` | Billetera multi-moneda | `/wallet`, `/wallet/transactions` |
| `/wallet/deposit` | Depósito (Wompi) | `POST /wallet/deposit` |
| `/wallet/withdraw` | Retiro seguro | `POST /wallet/withdraw` |
| `/trading` | Trading con gráficos en vivo | `/market/*`, `POST /orders` |
| `/trading/prediction` | Predicción IA (score 0-100, SHAP) | `/ia/predictions`, `/ia/model` |
| `/trading/history` | Historial de órdenes | `/orders` |
| `/reports` | Reportes del portafolio | `/reports/portfolio`, `/reports/transactions` |
| `/settings` · `/settings/security` | Perfil y seguridad (2FA real) | `/auth/profile`, `/auth/enable-2fa` |
| `/admin` | Panel de control | `/admin/stats`, `/admin/chart` |
| `/admin/users` | Gestión de usuarios | `/admin/users*` |
| `/admin/audit` | Auditoría inmutable | `/admin/audit` |
| `/admin/reports` | Reportes administrativos | `/admin/chart`, `/admin/stats` |
| `/admin/settings` | Configuración del sistema | `/admin/settings` |

## 🗂️ Estructura (carpetas con contenido real)

```
src/
├── api/           # client.ts (Axios + token + errores) y re-exports por módulo
├── services/      # Lógica de negocio → API real (auth, wallet, market, orders, ia, admin, reports, notifications)
├── components/
│   ├── layout/    # Sidebar ÚNICO colapsable, Header, AppLayout
│   ├── ui/ common/ charts/ trading/ wallet/   # UI reutilizable
├── constants/     # currencies.ts (metadatos de visualización)
├── contexts/ hooks/ store/ types/ utils/      # Zustand, hooks y tipos alineados al backend
└── pages/         # auth, dashboard, wallet, trading, reports, settings, admin
```

## 🔌 Contrato con el backend

- Envoltura de respuesta: `{ status: "success" | "fail", data }` (auth) y `{ success: true, data }` (wallet/orders/ia/admin/reports).
- Errores: `{ message }` o `{ error }` — el cliente los normaliza a mensajes legibles.
- `401` → limpia sesión y redirige a `/login`.
- El token JWT se adjunta automáticamente desde `auth-storage`.

## 🧪 Verificación

```bash
npm run build   # tsc --noEmit && vite build
```
