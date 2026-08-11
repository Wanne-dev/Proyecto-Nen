# RF-004: Inicio de Sesión con JWT

**ID:** RF-004  
**Nombre:** Inicio de Sesión con JWT  
**Prioridad:** Alta  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite a los usuarios autenticarse mediante correo electrónico y contraseña, emitiendo tokens JWT (JSON Web Token) para el acceso a los recursos protegidos de la plataforma, con soporte para refresh tokens y gestión de sesiones.

---

## Criterios de Aceptación

1. El usuario ingresa correo electrónico y contraseña.
2. El sistema valida las credenciales contra la base de datos.
3. Si las credenciales son correctas y la cuenta está activa, se emite un access token (JWT) y un refresh token.
4. El access token tiene una vigencia de 15 minutos.
5. El refresh token tiene una vigencia de 7 días y se almacena en la base de datos.
6. Si el usuario tiene 2FA habilitado, se requiere un segundo factor antes de emitir los tokens.
7. Se registra la sesión en la tabla `user_sessions` con información del dispositivo, IP y ubicación.
8. Después de 5 intentos fallidos, la cuenta se bloquea temporalmente por 30 minutos.
9. Se envía una notificación al usuario por cada inicio de sesión desde un dispositivo nuevo.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Inicia sesión y obtiene tokens |
| POST | `/api/auth/refresh` | Renueva el access token |
| POST | `/api/auth/logout` | Cierra sesión e invalida tokens |

---

## Request Body (Login)

```json
{
  "email": "juan@email.com",
  "password": "SecurePass1!"
}
```

---

## Response (Success - sin 2FA)

```json
{
  "success": true,
  "message": "Inicio de sesión exitoso.",
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

---

## Response (Requiere 2FA)

```json
{
  "success": true,
  "message": "Se requiere verificación de segundo factor.",
  "data": {
    "tempToken": "eyJhbGciOiJIUzI1NiIs...",
    "requires2FA": true
  }
}
```

---

## Reglas de Negocio

- El access token es un JWT firmado con RS256.
- El refresh token se almacena con hash SHA-256 en la base de datos.
- Solo cuentas con estado `active` pueden iniciar sesión.
- Máximo 5 intentos fallidos antes del bloqueo temporal.
- Cada sesión se registra con user-agent, IP y timestamp.
- Al hacer logout, se invalida el refresh token y se elimina la sesión.

---

## Dependencias

- Tabla `users` con campo `passwordHash` y `status`.
- Tabla `user_sessions` para gestión de sesiones.
- Tabla `verification_codes` para 2FA.
- Librería `jsonwebtoken` para generación y validación de JWT.

---

## Referencias

- RFC 7519 - JSON Web Token (JWT).
- OWASP Session Management Cheat Sheet.
