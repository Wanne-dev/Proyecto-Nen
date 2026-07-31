# RF-005: Autenticación de Dos Factores (2FA TOTP)

**ID:** RF-005  
**Nombre:** Autenticación de Dos Factores (2FA TOTP)  
**Prioridad:** Alta  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite habilitar y utilizar autenticación de dos factores basada en TOTP (Time-Based One-Time Password), compatible con aplicaciones como Google Authenticator, Authy y Microsoft Authenticator, proporcionando una capa adicional de seguridad para las operaciones sensibles.

---

## Criterios de Aceptación

1. El usuario puede habilitar 2FA desde la configuración de su cuenta.
2. El sistema genera un secreto TOTP único y un código QR para escanear con la app autenticadora.
3. El usuario debe verificar un código TOTP para completar la activación de 2FA.
4. Al iniciar sesión con 2FA habilitado, se requiere un código TOTP de 6 dígitos después de las credenciales.
5. Los códigos TOTP son válidos por 30 segundos (una ventana de tiempo).
6. Se generan códigos de respaldo (backup codes) de un solo uso en caso de pérdida del dispositivo.
7. El usuario puede deshabilitar 2FA proporcionando el código TOTP actual o un código de respaldo.
8. Las operaciones críticas (retiros, cambios de contraseña) requieren verificación 2FA.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/2fa/setup` | Inicia la configuración de 2FA |
| POST | `/api/auth/2fa/verify` | Verifica código TOTP para activar 2FA |
| POST | `/api/auth/2fa/validate` | Valida código TOTP durante login |
| POST | `/api/auth/2fa/disable` | Deshabilita 2FA |
| GET | `/api/auth/2fa/backup-codes` | Obtiene códigos de respaldo |

---

## Response (Setup)

```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "otpauth://totp/BANCA_NEN:juan@email.com?secret=JBSWY3DPEHPK3PXP&issuer=BANCA_NEN",
    "backupCodes": [
      "ABCD-1234", "EFGH-5678", "IJKL-9012",
      "MNOP-3456", "QRST-7890", "UVWX-1234",
      "YZAB-5678", "CDEF-9012"
    ]
  }
}
```

---

## Reglas de Negocio

- El secreto TOTP se genera con el algoritmo SHA-1 y período de 30 segundos.
- Se permite una ventana de ±1 código para compensar desincronización de reloj.
- Los códigos de respaldo son de un solo uso y se almacenan con hash.
- Al deshabilitar 2FA, se invalidan todos los códigos de respaldo.
- El QR code sigue el formato `otpauth://totp/` estándar.
- Se envía notificación al usuario cuando se habilita o deshabilita 2FA.

---

## Dependencias

- Tabla `users` con campos `twoFactorEnabled` y `twoFactorSecret`.
- Tabla `verification_codes` para códigos de respaldo.
- Librería `otplib` para generación y validación TOTP.
- Librería `qrcode` para generación de QR.

---

## Referencias

- RFC 6238 - TOTP: Time-Based One-Time Password Algorithm.
- RFC 4226 - HOTP: An HMAC-Based One-Time Password Algorithm.
