# API Endpoints — BANCA NEN (FinPredictor Pro)

## Información General

| Campo | Valor |
|---|---|
| Base URL (desarrollo) | `http://localhost:3000` |
| Prefijo | `/api` |
| Formato de datos | `application/json` |
| Autenticación | `Authorization: Bearer <token>` (JWT) |
| Rate limiting | 5 req / 15 min en auth, 10 req / min en market |

> **Envelope de respuesta.** Todas las respuestas viajan envueltas en `{ success, ... }`:
> - Éxito con datos: `{ "success": true, "data": T }`
> - Éxito con solo mensaje: `{ "success": true, "message": "..." }`
> - Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`

---

## Resumen de Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Registro de usuario con KYC |
| POST | `/api/auth/verify-email` | No | Verificación de email |
| POST | `/api/auth/resend-verification` | No | Reenvío de código de verificación |
| POST | `/api/auth/login` | No | Login y emisión de tokens |
| POST | `/api/auth/refresh` | No† | Renovación de tokens |
| POST | `/api/auth/logout` | Sí | Cierre de sesión |
| POST | `/api/auth/forgot-password` | No | Solicitar recuperación |
| POST | `/api/auth/reset-password` | No | Restablecer contraseña |
| POST | `/api/auth/2fa/setup` | Sí | Iniciar configuración 2FA |
| POST | `/api/auth/2fa/verify` | Sí | Verificar código TOTP |
| POST | `/api/auth/2fa/validate` | No‡ | Validar 2FA durante login |
| POST | `/api/auth/2fa/disable` | Sí | Deshabilitar 2FA |
| GET | `/api/auth/sessions` | Sí | Listar sesiones activas |
| DELETE | `/api/auth/sessions/:id` | Sí | Cerrar sesión específica |
| GET | `/api/wallet` | Sí | Consultar billetera y saldos |
| POST | `/api/wallet/deposit` | Sí | Depositar fondos |
| POST | `/api/wallet/withdraw` | Sí | Retirar fondos |
| GET | `/api/wallet/transactions` | Sí | Historial de transacciones |
| GET | `/api/market/crypto` | No | Lista top criptomonedas |
| GET | `/api/market/crypto/:id` | No | Detalle de criptomoneda |
| GET | `/api/market/crypto/:id/chart` | No | Datos de gráfica OHLCV |
| GET | `/api/market/overview` | No | Resumen del mercado |
| POST | `/api/orders` | Sí | Crear orden de trading |
| GET | `/api/orders` | Sí | Listar órdenes |
| GET | `/api/orders/:id` | Sí | Detalle de orden |
| DELETE | `/api/orders/:id` | Sí | Cancelar orden |
| GET | `/api/notifications` | Sí | Listar notificaciones |
| PUT | `/api/notifications/:id/read` | Sí | Marcar como leída |
| GET | `/api/settings` | Sí | Obtener configuración |
| PUT | `/api/settings` | Sí | Actualizar configuración |
| GET | `/api/admin/dashboard` | Admin | Estadísticas generales |
| GET | `/api/admin/users` | Admin | Listar usuarios |
| PUT | `/api/admin/users/:id/status` | Admin | Cambiar estado de usuario |
| GET | `/api/admin/audit-logs` | Admin | Consultar logs de auditoría |

† Requiere `refreshToken` válido en el body — no usa access token.
‡ Requiere `tempToken` de login + código TOTP.

---

## Autenticación — `/api/auth`

### `POST /api/auth/register`

Registra un nuevo usuario con datos KYC. Envía código de verificación al email.

**No requiere autenticación.**

**Body:**
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "documentType": "CC",
  "documentNumber": "1234567890",
  "dateOfBirth": "1995-05-15",
  "country": "Colombia",
  "phonePrefix": "+57",
  "phoneNumber": "3001234567",
  "email": "juan@email.com",
  "password": "SecurePass1!"
}
```

**Validaciones:**
- `email`: formato válido, requerido, único
- `password`: mínimo 8 chars, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
- `dateOfBirth`: usuario debe ser mayor de 18 años
- `documentNumber`: único por país
- `phonePrefix`: sincronizado con el país seleccionado

**Respuesta 201:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente. Verifique su correo electrónico.",
  "data": {
    "id": "uuid",
    "email": "juan@email.com",
    "status": "pending_verification"
  }
}
```

**Errores:**

| Código | code interno | Descripción |
|---|---|---|
| 409 | `CONFLICT` | Email o documento ya registrado |
| 400 | `BAD_REQUEST` | Menor de 18 años |
| 422 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |

---

### `POST /api/auth/verify-email`

Verifica el código de 6 dígitos enviado al email y activa la cuenta.

**No requiere autenticación.**

**Body:**
```json
{
  "email": "juan@email.com",
  "code": "123456"
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Email verificado exitosamente. Su cuenta ha sido activada.",
  "data": { "status": "active" }
}
```

**Errores:**

| Código | code interno | Descripción |
|---|---|---|
| 400 | `BAD_REQUEST` | Código inválido, expirado o máximo de intentos alcanzado |
| 404 | `NOT_FOUND` | Email no encontrado |

---

### `POST /api/auth/login`

Inicia sesión y retorna tokens JWT. Si el usuario tiene 2FA, retorna `tempToken` en lugar de tokens.

**No requiere autenticación.**

**Body:**
```json
{
  "email": "juan@email.com",
  "password": "SecurePass1!"
}
```

**Respuesta 200 (sin 2FA):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "juan@email.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "status": "active",
      "twoFactorEnabled": false
    }
  }
}
```

**Respuesta 200 (con 2FA):**
```json
{
  "success": true,
  "data": {
    "tempToken": "eyJhbGciOiJIUzI1NiIs...",
    "requires2FA": true
  }
}
```

**Errores:**

| Código | code interno | Descripción |
|---|---|---|
| 401 | `UNAUTHORIZED` | Credenciales incorrectas (mensaje genérico) |
| 403 | `FORBIDDEN` | Email no verificado |
| 429 | `TOO_MANY_REQUESTS` | Rate limit excedido (5 req/15min) |

---

### `POST /api/auth/refresh`

Renueva el par de tokens. Implementa rotación de tokens.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

---

### `POST /api/auth/forgot-password`

Solicita código de recuperación de contraseña.

**Body:**
```json
{
  "email": "juan@email.com"
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Si el email existe, se envió un código de recuperación."
}
```

---

### `POST /api/auth/reset-password`

Restablece la contraseña con código de verificación.

**Body:**
```json
{
  "email": "juan@email.com",
  "code": "123456",
  "newPassword": "NewSecurePass1!"
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente."
}
```

---

## Billetera — `/api/wallet`

### `GET /api/wallet`

**Requiere autenticación.**

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "totalBalanceUSD": 15234.56,
    "change24h": 2.34,
    "currency": "USD",
    "balances": [
      { "currency": "USD", "amount": 5000.00, "valueUSD": 5000.00 },
      { "currency": "BTC", "amount": 0.05, "valueUSD": 3425.00 }
    ],
    "limits": {
      "dailyWithdrawal": 5000,
      "dailyWithdrawn": 1200
    }
  }
}
```

---

### `POST /api/wallet/deposit`

**Requiere autenticación.**

**Body:**
```json
{
  "currency": "USD",
  "amount": 1000.00,
  "paymentMethod": "bank_transfer"
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "reference": "DEP-20250115-001",
    "currency": "USD",
    "amount": 1000.00,
    "fee": 0.00,
    "status": "pending"
  }
}
```

---

### `POST /api/wallet/withdraw`

**Requiere autenticación + 2FA.**

**Body:**
```json
{
  "currency": "USD",
  "amount": 500.00,
  "destination": { "type": "bank_account", "accountNumber": "****1234" },
  "twoFactorCode": "123456"
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "reference": "WTH-20250115-001",
    "amount": 500.00,
    "fee": 5.00,
    "netAmount": 495.00,
    "status": "pending"
  }
}
```

---

## Mercado — `/api/market`

### `GET /api/market/crypto`

**No requiere autenticación.**

**Query Params:** `page`, `perPage`, `order`, `currency`, `search`

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "coins": [
      {
        "id": "bitcoin",
        "symbol": "BTC",
        "name": "Bitcoin",
        "currentPrice": 68432.50,
        "change24h": 2.34,
        "marketCap": 1345000000000,
        "volume24h": 28500000000,
        "sparkline": [68000, 68200, 67900, 68432]
      }
    ],
    "marketOverview": {
      "totalMarketCap": 2670000000000,
      "btcDominance": 50.4
    }
  }
}
```

---

### `GET /api/market/crypto/:id/chart`

**Query Params:** `timeframe` (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M)

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "coinId": "bitcoin",
    "timeframe": "1h",
    "currentPrice": 68432.50,
    "candles": [
      {
        "timestamp": 1705312800000,
        "open": 68000.00,
        "high": 68500.00,
        "low": 67800.00,
        "close": 68432.50,
        "volume": 1234567.89
      }
    ]
  }
}
```

---

## Órdenes — `/api/orders`

### `POST /api/orders`

**Requiere autenticación.**

**Body (Market Order):**
```json
{
  "type": "market",
  "side": "buy",
  "assetId": "bitcoin",
  "quantity": 0.05,
  "currency": "USD"
}
```

**Body (Limit Order):**
```json
{
  "type": "limit",
  "side": "buy",
  "assetId": "bitcoin",
  "quantity": 0.05,
  "price": 65000.00,
  "currency": "USD"
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "reference": "ORD-20250115-001",
    "type": "market",
    "side": "buy",
    "asset": "BTC",
    "quantity": 0.05,
    "price": 68432.50,
    "total": 3421.63,
    "fee": 3.42,
    "status": "pending"
  }
}
```

---

### `DELETE /api/orders/:id`

Cancela una orden pendiente. Solo se pueden cancelar órdenes con estado `pending` o `open`.

**Respuesta 200:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "cancelled",
    "releasedFunds": { "currency": "USD", "amount": 3425.05 }
  }
}
```

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
