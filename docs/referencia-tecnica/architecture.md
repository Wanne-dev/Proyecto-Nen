# Arquitectura del Sistema — BANCA NEN (FinPredictor Pro)

## 1. Visión General

BANCA NEN es una plataforma de inversión con billetera virtual, trading de criptomonedas y seguridad bancaria, construida con arquitectura **cliente-servidor** desacoplada:

- **Frontend**: React + Vite + TypeScript + TailwindCSS, se comunica con el backend vía REST API
- **Backend**: Express + TypeScript, expone una API REST con arquitectura por capas
- **Base de datos**: PostgreSQL 17, accedida a través de TypeORM
- **Cache**: Redis para sesiones, datos de mercado y rate limiting
- **Email**: Nodemailer (dev) con fallback a console.log
- **Mercado**: CoinGecko API (datos de criptomonedas en tiempo real)

```
┌─────────────────────────────────────────────────────────┐
│ CLIENTE (Browser)                                       │
│ React 19 + Vite + TypeScript + TailwindCSS 4            │
│ Zustand (estado) + Framer Motion (animaciones)          │
│ Lucide Icons + i18next                                   │
│ localhost:5173                                           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP (Axios)
                        │ Authorization: Bearer
                        ▼
┌─────────────────────────────────────────────────────────┐
│ BACKEND (Express)                                       │
│ Node.js 20 + TypeScript + TypeORM                       │
│ localhost:3000                                          │
│                                                         │
│ helmet │ cors │ rate-limit │ zod │ jsonwebtoken │ bcrypt│
│ axios (CoinGecko) │ nodemailer │ crypto                │
└───────────────────────┬─────────────────────────────────┘
                        │ TypeORM (pg driver, pool)
                        ▼
┌─────────────────────────────────────────────────────────┐
│ BASE DE DATOS (PostgreSQL 17)                           │
│ localhost:5433 (Docker: banca_nen_postgres)              │
│ 12 tablas: users, wallets, wallet_balances,             │
│ transactions, orders, audit_logs, verification_codes,   │
│ user_sessions, notifications, user_settings,            │
│ assets, market_prices                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ CACHE (Redis 7)                                         │
│ localhost:6380 (Docker: banca_nen_redis)                 │
│ Datos de mercado, sesiones, rate limiting                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ API EXTERNA (CoinGecko)                                 │
│ https://api.coingecko.com/api/v3                        │
│ Precios de criptomonedas en tiempo real (HTTPS)          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura del Backend — Capas

El backend sigue una arquitectura **por capas** con separación clara de responsabilidades:

```
HTTP Request
    │
    ▼
┌──────────────┐
│ Middleware    │ helmet → cors → json parser → rate limiter
│ (pipeline)   │ → auth middleware (JWT verify)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Controller   │ Capa HTTP delgada. Extrae datos de req
│              │ (body, params, user), delega al service,
│              │ construye y envía la respuesta HTTP
└──────┬───────┘
       │ inyección por constructor
       ▼
┌──────────────┐
│ Service      │ Contiene TODA la lógica de negocio.
│              │ Orquesta Repository, hashing, JWT, email,
│              │ audit log. Lanza errores tipados.
└──────┬───────┘
       │ TypeORM Repository<Entity>
       ▼
┌──────────────┐
│ Repository   │ TypeORM Repository — consultas type-safe
│              │ Nunca SQL crudo sin parametrizar
└──────────────┘
```

### 2.1 Módulos del sistema

| Módulo | Responsabilidad | Archivos principales |
|---|---|---|
| **Auth** | Registro, login, 2FA, verificación, recuperación | `auth.controller.ts`, `auth.service.ts`, `auth.middleware.ts` |
| **Wallet** | Billetera, depósitos, retiros, balances | `WalletController.ts`, `WalletService.ts` |
| **Market** | Precios CoinGecko, gráficas, overview | `MarketController.ts`, `MarketService.ts` |
| **Orders** | Crear, cancelar, listar órdenes de trading | `OrderController.ts`, `OrderService.ts` |
| **Notifications** | CRUD de notificaciones | `NotificationController.ts` |
| **Settings** | Configuración del usuario | `SettingsController.ts` |
| **Admin** | Panel de administración, audit logs | `AdminController.ts` |

### 2.2 Pipeline de request global (configurado en `app.ts`)

| Paso | Mecanismo | Propósito |
|---|---|---|
| 1 | `app.use(helmet())` | Headers de seguridad HTTP |
| 2 | `app.use(cors({...}))` | Control de orígenes permitidos |
| 3 | `app.use(express.json())` | Body parsing JSON |
| 4 | `app.use(rateLimit({...}))` | Rate limiting global |
| 5 | `authMiddleware` (por ruta) | Verificación de JWT |
| 6 | `validate(schema)` (por ruta) | Validación de inputs con Zod |
| 7 | `errorHandler` (último) | Serializa errores → JSON consistente |

---

## 3. Arquitectura del Frontend

### 3.1 Estructura de capas

```
┌──────────────────────────────────────────┐
│ Páginas (Pages)                          │
│ Dashboard, Wallet, Trading, Profile,     │
│ Login, Register, Verify, Settings        │
│ Composición de componentes + lógica UI   │
└──────────────────┬───────────────────────┘
                   │ usa
                   ▼
┌──────────────────────────────────────────┐
│ Componentes (Components)                 │
│ Sidebar, Card, Chart, OrderForm,         │
│ BalanceCard, TransactionList, Modal      │
│ Reutilizables, sin estado global         │
└──────────────────┬───────────────────────┘
                   │ usa
                   ▼
┌──────────────────────────────────────────┐
│ Store + Hooks                            │
│ useAuthStore (Zustand + persist)         │
│ useWalletStore, useMarketStore           │
│ Custom hooks: useAuth, useMarket         │
└──────────────────┬───────────────────────┘
                   │ llama
                   ▼
┌──────────────────────────────────────────┐
│ API Layer (services/)                    │
│ api/auth.ts, api/wallet.ts,              │
│ api/market.ts, api/orders.ts             │
│ Maneja headers, tokens, errores HTTP     │
└──────────────────┬───────────────────────┘
                   │ HTTP
                   ▼
              Backend API (Express)
```

### 3.2 Gestión del estado

```
useAuthStore (Zustand + persist)
    │
    ├── user: User | null
    ├── accessToken: string | null
    ├── isAuthenticated: boolean
    ├── setAuth(user, accessToken)
    └── logout()

useWalletStore (Zustand)
    │
    ├── balances: Balance[]
    ├── totalBalanceUSD: number
    └── fetchBalances()

useMarketStore (Zustand)
    │
    ├── coins: Coin[]
    ├── selectedCoin: string
    └── fetchMarket()
```

### 3.3 Enrutamiento

| Ruta | Componente | Protegida |
|---|---|---|
| `/` | `LandingPage` | No |
| `/login` | `LoginPage` | No |
| `/register` | `RegisterPage` | No |
| `/verify-email` | `VerifyEmailPage` | No |
| `/forgot-password` | `ForgotPasswordPage` | No |
| `/reset-password` | `ResetPasswordPage` | No |
| `/dashboard` | `DashboardPage` | Sí |
| `/wallet` | `WalletPage` | Sí |
| `/trading` | `TradingPage` | Sí |
| `/trading/:id` | `CoinDetailPage` | Sí |
| `/settings` | `SettingsPage` | Sí |
| `/2fa-setup` | `TwoFactorSetupPage` | Sí |
| `/admin` | `AdminDashboardPage` | Admin |

---

## 4. Flujos Principales — Diagramas de Secuencia

### 4.1 Registro + Verificación de Email

```
Usuario     Frontend       Backend         BD          Email
  │           │              │             │             │
  │──datos───▶│              │             │             │
  │           │─POST /register─▶│           │             │
  │           │              │─save(User)──▶│             │
  │           │              │ status=pending_verification│
  │           │              │─save(Code)──▶│             │
  │           │              │────────────────────────────▶│
  │           │              │ sendVerificationEmail()    │
  │           │◀─{201,user}──│             │             │
  │◀─mensaje──│              │             │             │
  │           │              │             │             │
  │──código──▶│              │             │             │
  │           │─POST /verify-email─▶│      │             │
  │           │              │─update(User)──▶│           │
  │           │              │ status=active│             │
  │           │              │─update(Code)──▶│           │
  │           │              │ used=true    │             │
  │           │◀─{200,ok}───│             │             │
  │◀─redirect─│              │             │             │
```

### 4.2 Login con 2FA

```
Usuario     Frontend       Backend         BD
  │           │              │             │
  │─email+pass▶│              │             │
  │           │─POST /login──▶│             │
  │           │              │─verify creds─▶│
  │           │              │─check 2FA────▶│
  │           │◀─{tempToken,requires2FA:true}│
  │◀─pantalla─│              │             │
  │  2FA      │              │             │
  │──TOTP────▶│              │             │
  │           │─POST /2fa/validate─▶│       │
  │           │              │─verify TOTP──▶│
  │           │◀─{accessToken,refreshToken}│
  │◀─dashboard│              │             │
```

### 4.3 Compra de Criptomoneda

```
Usuario     Frontend       Backend         BD          CoinGecko
  │           │              │             │             │
  │─buy BTC──▶│              │             │             │
  │           │─GET /market/crypto/:id──▶│  │             │
  │           │              │────────────────────────────▶│
  │           │              │◀─precio actual──────────────│
  │           │              │─check saldo──▶│             │
  │           │              │─reserve funds─▶│            │
  │           │              │─create Order─▶│             │
  │           │              │─update Balance─▶│           │
  │           │              │─create Transaction─▶│      │
  │           │              │─audit log────▶│             │
  │           │◀─{201,order}─│             │             │
  │◀─confirm──│              │             │             │
```

---

## 5. Seguridad — Capas de Defensa

| Capa | Mecanismo | Propósito |
|---|---|---|
| HTTP | `helmet` | Headers de seguridad (X-Frame-Options, CSP, HSTS) |
| CORS | `cors` con origen explícito | Prevenir requests cross-origin no autorizados |
| Rate Limiting | `express-rate-limit` | Prevenir fuerza bruta y abuso de API |
| Autenticación | JWT (HS256, 15 min access + 7 días refresh) | Verificar identidad del usuario |
| 2FA | TOTP (otplib) | Capa adicional de seguridad |
| Validación | Zod schemas | Prevenir injection y datos inválidos |
| Hashing | bcrypt (12 salt rounds) | Proteger contraseñas |
| Cifrado | AES-256-GCM | Datos sensibles en reposo |
| Auditoría | Hash chain (SHA-256) | Registros inmutables (SARLAFT) |
| CORS | `origin: process.env.FRONTEND_URL` | Solo orígenes autorizados |

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
