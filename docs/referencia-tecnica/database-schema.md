# Esquema de Base de Datos — BANCA NEN (FinPredictor Pro)

## Tecnologías

| Item | Detalle |
|---|---|
| Motor | PostgreSQL 17 |
| ORM | TypeORM |
| Driver | pg (node-postgres) |
| Host | localhost:5433 (Docker: banca_nen_postgres) |
| Credenciales | user=`banca_nen`, password=`banca_nen_secret`, db=`banca_nen` |
| UUIDs | `gen_random_uuid()` |

---

## Diagrama Entidad-Relación

```
┌─────────────────────────┐       ┌─────────────────────────┐
│ users (28 columnas)      │       │ wallets                  │
│ PK id UUID               │──1:1──│ PK id UUID               │
│ email, firstName, etc.   │       │ FK user_id UUID          │
│ status, role             │       │ balanceUSD, limits       │
│ twoFactorEnabled, etc.   │       └──────────┬──────────────┘
└──────┬──────────────────┘                   │
       │                                      │ 1:N
       │ 1:N                                  ▼
       │                          ┌─────────────────────────┐
       │                          │ wallet_balances          │
       │                          │ PK id UUID               │
       │                          │ FK wallet_id UUID        │
       │                          │ currency, amount         │
       │                          └─────────────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ transactions (24 cols)   │       │ orders                   │
│ PK id UUID               │       │ PK id UUID               │
│ FK user_id UUID          │       │ FK user_id UUID          │
│ FK wallet_id UUID        │       │ type, side, assetId      │
│ type, amount, currency   │       │ quantity, price          │
│ status, fee, hash        │       │ status, fee              │
└─────────────────────────┘       └─────────────────────────┘

┌─────────────────────────┐       ┌─────────────────────────┐
│ verification_codes       │       │ user_sessions            │
│ PK id UUID               │       │ PK id UUID               │
│ FK user_id UUID          │       │ FK user_id UUID          │
│ type, code, expiresAt    │       │ device, ip, location     │
│ used, attempts           │       │ lastActivity, token      │
└─────────────────────────┘       └─────────────────────────┘

┌─────────────────────────┐       ┌─────────────────────────┐
│ audit_logs               │       │ notifications            │
│ PK id UUID               │       │ PK id UUID               │
│ FK user_id UUID          │       │ FK user_id UUID          │
│ action, resource, details│       │ type, title, message     │
│ hash, previousHash       │       │ read, data               │
└─────────────────────────┘       └─────────────────────────┘

┌─────────────────────────┐       ┌─────────────────────────┐
│ user_settings            │       │ assets                   │
│ PK id UUID               │       │ PK id UUID               │
│ FK user_id UUID          │       │ symbol, name, type       │
│ theme, language, currency│       │ coingeckoId, isActive    │
│ riskTolerance, notifs    │       └──────────┬──────────────┘
└─────────────────────────┘                   │
                                              │ 1:N
                                              ▼
                                   ┌─────────────────────────┐
                                   │ market_prices            │
                                   │ PK id UUID               │
                                   │ FK asset_id UUID         │
                                   │ timeframe, OHLCV         │
                                   │ timestamp                │
                                   └─────────────────────────┘
```

---

## Claves Foráneas (9 FKs)

| Tabla origen | Columna | Tabla destino | Columna destino |
|---|---|---|---|
| wallets | user_id | users | id |
| wallet_balances | wallet_id | wallets | id |
| transactions | user_id | users | id |
| transactions | wallet_id | wallets | id |
| orders | user_id | users | id |
| verification_codes | user_id | users | id |
| user_sessions | user_id | users | id |
| audit_logs | user_id | users | id |
| notifications | user_id | users | id |
| market_prices | asset_id | assets | id |

---

## Tabla `users`

Almacena los usuarios registrados con datos KYC bancarios.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    document_type VARCHAR(20) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone_prefix VARCHAR(5) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending_verification',
    role VARCHAR(20) DEFAULT 'user',
    kyc_level VARCHAR(20) DEFAULT 'basic',
    last_login_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_document ON users(document_number, country);
```

### Columnas clave

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK, identificador único |
| `email` | VARCHAR(255) | Email de login — único, indexado |
| `hashed_password` | VARCHAR(255) | Hash bcrypt (12 salt rounds) — NUNCA texto plano |
| `document_type` | VARCHAR(20) | CC, CE, PASSPORT, DNI (depende del país) |
| `document_number` | VARCHAR(50) | Número de documento — único por país |
| `status` | VARCHAR(20) | `pending_verification`, `active`, `suspended`, `banned` |
| `role` | VARCHAR(20) | `user` o `admin` |
| `kyc_level` | VARCHAR(20) | `basic`, `intermediate`, `complete`, `premium` |
| `two_factor_secret` | VARCHAR(255) | Secreto TOTP cifrado con AES-256 |

---

## Tabla `wallets`

Billetera virtual del usuario con límites según nivel KYC.

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance_usd DECIMAL(18,2) DEFAULT 0,
    daily_deposit_limit DECIMAL(18,2) DEFAULT 1000,
    daily_withdrawal_limit DECIMAL(18,2) DEFAULT 500,
    daily_deposited DECIMAL(18,2) DEFAULT 0,
    daily_withdrawn DECIMAL(18,2) DEFAULT 0,
    monthly_deposit_limit DECIMAL(18,2) DEFAULT 5000,
    monthly_withdrawal_limit DECIMAL(18,2) DEFAULT 3000,
    monthly_deposited DECIMAL(18,2) DEFAULT 0,
    monthly_withdrawn DECIMAL(18,2) DEFAULT 0,
    last_limit_reset DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wallets_user_id ON wallets(user_id);
```

---

## Tabla `wallet_balances`

Saldos por moneda en la billetera (multi-currency).

```sql
CREATE TABLE wallet_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(18,8) DEFAULT 0,
    available DECIMAL(18,8) DEFAULT 0,
    locked DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wallet_balances_wallet_currency ON wallet_balances(wallet_id, currency);
```

### Monedas soportadas

| Currency | Decimales | Tipo |
|---|---|---|
| USD | 2 | Fiat |
| COP | 0 | Fiat |
| EUR | 2 | Fiat |
| BTC | 8 | Crypto |
| ETH | 8 | Crypto |
| USDC | 2 | Stablecoin |

---

## Tabla `transactions`

Registro de todas las transacciones financieras.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    amount DECIMAL(18,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    fee DECIMAL(18,8) DEFAULT 0,
    net_amount DECIMAL(18,8),
    reference VARCHAR(50) UNIQUE,
    description TEXT,
    payment_method VARCHAR(30),
    payment_reference VARCHAR(100),
    destination_type VARCHAR(30),
    destination_details JSONB,
    wompi_transaction_id VARCHAR(100),
    ai_risk_score DECIMAL(5,2),
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    verification_hash VARCHAR(64),
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
```

### Tipos de transacción

| Tipo | Descripción |
|---|---|
| `deposit` | Depósito de fondos |
| `withdrawal` | Retiro de fondos |
| `trade_buy` | Compra de criptomoneda |
| `trade_sell` | Venta de criptomoneda |
| `transfer` | Transferencia entre billeteras |

---

## Tabla `orders`

Órdenes de trading de criptomonedas.

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8),
    stop_price DECIMAL(18,8),
    total DECIMAL(18,8) NOT NULL,
    fee DECIMAL(18,8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    reference VARCHAR(50) UNIQUE,
    filled_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### Tipos de órdenes

| Tipo | Descripción |
|---|---|
| `market` | Se ejecuta al precio actual |
| `limit` | Se ejecuta cuando alcanza el precio especificado |
| `stop_loss` | Se ejecuta cuando el precio cae al nivel |
| `take_profit` | Se ejecuta cuando el precio sube al nivel |

---

## Tabla `audit_logs`

Registros de auditoría inmutables con cadena de hash (SARLAFT).

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

> **Nota**: Esta tabla es INSERT ONLY. No se permite UPDATE ni DELETE. El hash forma una cadena inmutable: cada registro incluye el hash SHA-256 del registro anterior.

---

## Tabla `verification_codes`

Códigos de verificación temporales (email, 2FA, password reset).

```sql
CREATE TABLE verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    code VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_user_type ON verification_codes(user_id, type);
```

### Tipos de código

| Tipo | Vigencia | Max intentos |
|---|---|---|
| `email_verification` | 15 minutos | 5 |
| `password_reset` | 15 minutos | 5 |
| `two_factor` | 5 minutos | 3 |
| `phone_verification` | 10 minutos | 3 |

---

## Tabla `market_prices`

Datos OHLCV de precios de mercado por timeframe.

```sql
CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id),
    timeframe VARCHAR(5) NOT NULL,
    open_price DECIMAL(18,8) NOT NULL,
    high_price DECIMAL(18,8) NOT NULL,
    low_price DECIMAL(18,8) NOT NULL,
    close_price DECIMAL(18,8) NOT NULL,
    volume DECIMAL(18,4),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_market_asset_timeframe ON market_prices(asset_id, timeframe, timestamp);
```

### Timeframes soportados

| Timeframe | Código | Datos almacenados |
|---|---|---|
| 1 minuto | `1m` | Últimas 24 horas |
| 5 minutos | `5m` | Últimas 24 horas |
| 15 minutos | `15m` | Últimos 7 días |
| 1 hora | `1h` | Últimos 30 días |
| 4 horas | `4h` | Últimos 90 días |
| 1 día | `1d` | Último año |
| 1 semana | `1w` | Últimos 5 años |
| 1 mes | `1M` | Últimos 10 años |

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
