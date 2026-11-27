# RF-006: Recuperación de Contraseña

**ID:** RF-006  
**Nombre:** Recuperación de Contraseña  
**Prioridad:** Alta  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite a los usuarios recuperar el acceso a su cuenta mediante un flujo seguro de restablecimiento de contraseña, que incluye verificación de identidad y tiempo limitado para completar el proceso.

---

## Criterios de Aceptación

1. El usuario puede solicitar restablecimiento de contraseña desde la pantalla de login ingresando su correo electrónico.
2. El sistema envía un código de verificación de 6 dígitos al correo registrado.
3. El código tiene una vigencia de 15 minutos.
4. El usuario ingresa el código junto con la nueva contraseña.
5. La nueva contraseña debe cumplir con los mismos requisitos de complejidad del registro.
6. La nueva contraseña no puede ser igual a la anterior.
7. Al completar el cambio, se invalidan todas las sesiones activas del usuario.
8. Se envía notificación al usuario confirmando el cambio de contraseña.
9. Rate limiting: máximo 3 solicitudes de reset por hora.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/forgot-password` | Solicita código de reset |
| POST | `/api/auth/reset-password` | Restablece la contraseña |

---

## Request Body (Forgot Password)

```json
{
  "email": "juan@email.com"
}
```

---

## Request Body (Reset Password)

```json
{
  "email": "juan@email.com",
  "code": "123456",
  "newPassword": "NewSecurePass1!"
}
```

---

## Response (Success)

```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente. Inicie sesión con su nueva contraseña."
}
```

---

## Reglas de Negocio

- El código de reset se almacena con hash en la base de datos.
- Máximo 3 solicitudes de reset por hora por email.
- El código expira después de 15 minutos.
- Máximo 5 intentos de verificación por código.
- Todas las sesiones se invalidan al cambiar la contraseña.
- Se mantiene historial de hashes previos para evitar reutilización de contraseñas recientes.

---

## Dependencias

- Tabla `verification_codes` con tipo `password_reset`.
- Tabla `users` con campo `passwordHash`.
- Tabla `user_sessions` para invalidar sesiones.
- Servicio de email.

---

## Referencias

- OWASP Password Storage Cheat Sheet.
- NIST SP 800-63B - Digital Identity Guidelines.
