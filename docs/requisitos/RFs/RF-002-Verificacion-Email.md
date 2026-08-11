# RF-002: Verificación de Email

**ID:** RF-002  
**Nombre:** Verificación de Email  
**Prioridad:** Alta  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite verificar la dirección de correo electrónico del usuario mediante un código de 6 dígitos enviado al momento del registro, garantizando la autenticidad del email y activando la cuenta del usuario.

---

## Criterios de Aceptación

1. Al registrarse, el usuario recibe un código de verificación de 6 dígitos al correo electrónico proporcionado.
2. El código tiene una vigencia de 15 minutos desde su generación.
3. El usuario ingresa el código en la pantalla de verificación.
4. Si el código es correcto y no ha expirado, la cuenta cambia al estado `active`.
5. Si el código es incorrecto, se muestra un mensaje de error sin revelar si el email existe o no.
6. Después de 5 intentos fallidos, el código se invalida y el usuario debe solicitar uno nuevo.
7. Al verificar correctamente, se genera automáticamente la billetera virtual del usuario.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/verify-email` | Verifica el código de email |
| POST | `/api/auth/resend-verification` | Reenvía código de verificación |

---

## Request Body (Verify)

```json
{
  "email": "juan@email.com",
  "code": "123456"
}
```

---

## Response (Success)

```json
{
  "success": true,
  "message": "Email verificado exitosamente. Su cuenta ha sido activada.",
  "data": {
    "status": "active"
  }
}
```

---

## Reglas de Negocio

- El código de verificación se almacena con hash en la base de datos.
- El código expira después de 15 minutos.
- Máximo 5 intentos de verificación por código.
- No se puede iniciar sesión sin verificar el email.
- El reenvío de código está sujeto a cooldown de 60 segundos.

---

## Dependencias

- Tabla `verification_codes` con tipo `email_verification`.
- Servicio de envío de correo electrónico.
- Tabla `users` con campo `status`.

---

## Referencias

- OWASP Authentication Cheat Sheet.
- Buenas prácticas de verificación de identidad digital.
