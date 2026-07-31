# RF-003: Reenvío de Código de Verificación

**ID:** RF-003  
**Nombre:** Reenvío de Código de Verificación  
**Prioridad:** Alta  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite al usuario solicitar el reenvío de un código de verificación al correo electrónico cuando el código anterior ha expirado, no fue recibido o se agotaron los intentos, implementando un mecanismo de cooldown para prevenir abuso del servicio.

---

## Criterios de Aceptación

1. El usuario puede solicitar un nuevo código de verificación desde la pantalla de verificación de email.
2. El sistema implementa un cooldown de 60 segundos entre reenvíos consecutivos.
3. El contador de cooldown se muestra en el frontend en tiempo real (ej: "Reenviar en 45s").
4. Al solicitar un reenvío, el código anterior se invalida automáticamente.
5. Se genera un nuevo código de 6 dígitos con vigencia de 15 minutos.
6. Máximo 5 reenvíos por hora por usuario.
7. Si el usuario supera el límite de reenvíos, se muestra un mensaje indicando que intente más tarde.
8. El botón de reenvío permanece deshabilitado durante el cooldown.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/resend-verification` | Reenvía código de verificación |

---

## Request Body

```json
{
  "email": "juan@email.com"
}
```

---

## Response (Success)

```json
{
  "success": true,
  "message": "Nuevo código de verificación enviado a su correo.",
  "data": {
    "cooldownSeconds": 60
  }
}
```

---

## Response (Cooldown Active)

```json
{
  "success": false,
  "message": "Debe esperar antes de solicitar un nuevo código.",
  "data": {
    "remainingSeconds": 32
  }
}
```

---

## Reglas de Negocio

- Cooldown mínimo de 60 segundos entre reenvíos.
- Máximo 5 reenvíos por hora.
- El código anterior se invalida al generar uno nuevo.
- Solo se puede reenviar a cuentas con estado `pending_verification`.
- El rate limiting se aplica por dirección de email.

---

## Dependencias

- Tabla `verification_codes` con campos `expiresAt` y `attempts`.
- Servicio de email.
- Cache Redis para control de rate limiting.

---

## Referencias

- OWASP Rate Limiting Guidelines.
- RFC 6238 - TOTP para códigos temporales.
