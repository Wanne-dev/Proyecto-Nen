# BANCA NEN — Frontend web

React, TypeScript, Vite y Tailwind CSS. El portal comparte un layout, usa saldo virtual y consulta el mercado por la API del mismo origen. Sin datos vigentes, muestra un estado de indisponibilidad: no hay precios ni gráficas de relleno.

Para ejecutar la aplicación usa el [arranque del proyecto](../README.md#arranque-local) o el [entorno sin Docker](../docs/setup/sin-docker.md). Para crear la primera cuenta administradora sigue el flujo de 2FA e instrucciones de [Cómo probar](../docs/setup/como-probar.md); no cambies el rol por SQL.

## 🧭 Rutas

### Un solo sidebar para todos los usuarios
El [sidebar Liquid Glass](../docs/SIDEBAR-LIQUID-GLASS.md) comparte diseño entre los roles: **260 px** expandido, **76 px** en mini-rail y drawer móvil. `⌘K` / `Ctrl+K` abre una búsqueda de las pestañas que existen para la cuenta.

- **Usuario:** New IA, Billetera, Trading, Historial, Mis reportes, Depositar/Retirar, Análisis de mercado, Ajustes y Seguridad.
- **Administrador:** también ve Panel de control, Usuarios, Auditoría, Reportes admin y Configuración. Otros roles de personal conservan solo las secciones que permite la matriz existente. Las rutas administrativas siguen protegidas y requieren 2FA.

| Ruta | Página | API |
|---|---|---|
| `/asistente` | New IA, sugerencias y borrador local; sin modelo conectado | Ninguna para el contenido del asistente |
| `/wallet` | Billetera multi-moneda | `/wallet`, `/wallet/transactions` |
| `/wallet/deposit` | Depósito de saldo virtual | `POST /wallet/deposit` |
| `/wallet/withdraw` | Retiro seguro | `POST /wallet/withdraw` |
| `/trading` | Cotizaciones, velas y libro de Kraken | `/market/quotes`, `/market/candles/:asset`, `/market/book/:asset`, `POST /orders` |
| `/trading/prediction` | Estimación por reglas sobre datos de CoinGecko | `/ia/predictions`, `/ia/model` |
| `/asistente` | Chat de texto generado con Gemini, herramientas de mercado y noticias | `/ia/model`, `/ia/chat` |
| `/trading/history` | Historial de órdenes | `/orders` |
| `/reports` | Reportes del portafolio | `/reports/portfolio`, `/reports/transactions` |
| `/settings` · `/settings/security` · `/2fa-setup` | Perfil y seguridad (2FA real) | `/auth/profile`, `/auth/2fa/*`, `/auth/sessions*` |
| `/admin` | Panel de control | `/admin/stats`, `/admin/chart` |
| `/admin/users` | Gestión de usuarios | `/admin/users*` |
| `/admin/audit` | Auditoría verificable | `/admin/audit` |
| `/admin/reports` | Reportes administrativos | `/admin/chart`, `/admin/stats` |
| `/admin/settings` | Configuración del sistema | `/admin/settings` |

## 🗂️ Estructura (carpetas con contenido real)

```
src/
├── api/           # client.ts (Axios + sesiones por cookie + errores) y re-exports por módulo
├── services/      # Lógica de negocio → API real (auth, wallet, market, orders, ia, admin, reports, notifications)
├── components/
│   ├── layout/    # Marco, rail Liquid Glass, Header, diálogos
│   ├── ui/ common/ charts/ trading/ wallet/   # UI reutilizable
├── constants/     # currencies.ts (metadatos de visualización)
├── contexts/ hooks/ store/ types/ utils/      # Zustand, hooks y tipos alineados al backend
└── pages/         # auth, assistant, wallet, trading, reports, settings, admin
```

## 🔌 Contrato con el backend

- Envoltura de respuesta: `{ status: "success" | "fail", data }` (auth) y `{ success: true, data }` (wallet/orders/ia/admin/reports).
- Errores: `{ message }` o `{ error }` — el cliente los normaliza a mensajes legibles.
- La sesión usa cookies del mismo origen. Si la renovación falla por sesión vencida, se vuelve a `/login`; el portal no obtiene tokens de `localStorage`.

## 🧪 Verificación

```bash
npm run build   # tsc --noEmit && vite build
```
