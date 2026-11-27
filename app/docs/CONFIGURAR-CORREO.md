# Correo de verificación — BANCA NEN

## Para probar en tu instalación local

No necesitas cuentas ni contraseñas de correo. Usa `EMAIL_PROVIDER=console` con `NODE_ENV=development` y registra un usuario **ficticio** con dirección `@example.com`. El backend muestra `CODIGO DE VERIFICACION` en su terminal; copia los seis dígitos a `/verify`. Con Docker puedes leerlo con `docker compose logs -f backend`.

- En ejecución nativa, `backend/.env` se configura a partir de `backend/.env.example`.
- Docker Compose toma sus variables del `.env` en la **raíz**, o del entorno de la terminal. No carga `backend/.env`.
- En `NODE_ENV=production` el modo `console` no entrega mensajes ni muestra OTP. No es un proveedor de staging.

## Si más adelante pruebas un proveedor autorizado

Usa exclusivamente cuentas y destinatarios de prueba. Elige `EMAIL_PROVIDER=resend` con `RESEND_API_KEY` y `EMAIL_FROM`, o `EMAIL_PROVIDER=smtp` con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`. Configura `FRONTEND_URL` para los enlaces de recuperación. `SMTP_SECURE=true` activa TLS implícito (habitualmente puerto 465); 587 suele usar STARTTLS. Usa las instrucciones de tu proveedor para credenciales, remitentes y dominio.

No publiques secretos, códigos OTP ni `.env`. Si cambias la configuración, reinicia la API o recrea el contenedor `backend`. Si `docker compose config` informa que faltan variables en staging, verifica la plantilla y define los valores propios en el entorno de Compose. No ejecutes scripts antiguos de correo ni borres volúmenes para arreglar el envío.

La validación se hizo sin envío externo: registro y recuperación en consola local; correo y SMS aislados en las pruebas de PostgreSQL. La recuperación acepta código + correo, o el enlace de un uso con el token en el fragmento `#token=…`; los dos vencen en 10 minutos. Cambiar contraseña no elimina el TOTP. El envío de extremo a extremo con cuentas reales de Resend, SMTP o Twilio no se probó.
