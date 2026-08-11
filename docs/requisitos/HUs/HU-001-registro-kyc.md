# HU-001 — Registro con KYC

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-001 |
| **Título** | Registro de usuario con verificación de identidad (KYC) |
| **Módulo** | Autenticación |
| **Prioridad** | Crítica |
| **Estado** | Por implementar |
| **RF asociados** | RF-001 |

---

## Historia

**Como** usuario nuevo,
**quiero** registrarme en la plataforma proporcionando mi nombre completo, correo electrónico, número de teléfono, documento de identidad (cédula de ciudadanía, cédula de extranjería o pasaporte), una foto del documento y una selfie para verificación biométrica,
**para** poder acceder a la billetera virtual, depositar fondos reales y comenzar a invertir en activos financieros.

---

## Criterios de Aceptación

### CA-001.1 — Formulario de registro completo
**Dado que** estoy en la página de registro (`/register`),
**cuando** veo el formulario,
**entonces** debo encontrar campos para: nombre completo, correo electrónico, número de teléfono, tipo de documento, número de documento, fecha de nacimiento, nacionalidad, moneda preferida, contraseña y confirmación de contraseña, cada uno con su etiqueta y validación en tiempo real.

### CA-001.2 — Validación de nombre completo
**Dado que** estoy completando el formulario de registro,
**cuando** ingreso un nombre con menos de 2 caracteres y envío el formulario,
**entonces** debo ver un mensaje de error: "El nombre completo debe tener al menos 2 caracteres".

### CA-001.3 — Validación de correo obligatorio y formato
**Dado que** estoy completando el formulario de registro,
**cuando** dejo el campo de correo vacío o ingreso un formato inválido y envío el formulario,
**entonces** debo ver un mensaje de error: "El correo es obligatorio" o "Formato de correo inválido" según corresponda.

### CA-001.4 — Validación de unicidad del correo
**Dado que** ingreso un correo electrónico que ya existe en el sistema,
**cuando** envío el formulario de registro,
**entonces** debo ver un mensaje de error: "Este correo electrónico ya está registrado. ¿Olvidaste tu contraseña?".

### CA-001.5 — Validación de número de documento único
**Dado que** ingreso un número de documento que ya existe en el sistema,
**cuando** envío el formulario de registro,
**entonces** debo ver un mensaje de error: "Este número de documento ya está registrado. Contacta a soporte si necesitas ayuda".

### CA-001.6 — Validación de formato de documento según tipo
**Dado que** selecciono el tipo de documento:
- Cédula de Ciudadanía → Debe tener 10 dígitos numéricos.
- Cédula de Extranjería → Debe tener 8-12 dígitos numéricos.
- Pasaporte → Letras + 6-8 dígitos.
**cuando** ingreso un formato incorrecto y envío el formulario,
**entonces** debo ver un mensaje de error específico indicando el formato correcto para el tipo seleccionado.

### CA-001.7 — Validación de mayoría de edad
**Dado que** ingreso una fecha de nacimiento que indica que soy menor de 18 años,
**cuando** envío el formulario de registro,
**entonces** debo ver un mensaje de error: "Debes ser mayor de 18 años para registrarte en esta plataforma".

### CA-001.8 — Validación de contraseña robusta
**Dado que** ingreso una contraseña que no cumple los requisitos mínimos (mínimo 12 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial @$!%*?&),
**cuando** envío el formulario,
**entonces** debo ver un mensaje de error descriptivo indicando qué requisito falta.

### CA-001.9 — Confirmación de contraseña
**Dado que** la contraseña y su confirmación no coinciden,
**cuando** envío el formulario,
**entonces** debo ver el mensaje: "Las contraseñas no coinciden".

### CA-001.10 — Envío de OTP por email y SMS
**Dado que** completé todos los campos correctamente,
**cuando** envío el formulario,
**entonces** el sistema envía un código OTP de 6 dígitos a mi correo electrónico y otro código OTP de 6 dígitos a mi número de teléfono.

### CA-001.11 — Verificación de OTP
**Dado que** recibí los códigos OTP por email y SMS,
**cuando** ingreso ambos códigos correctos en la siguiente pantalla,
**entonces** el sistema valida ambos códigos y me permite continuar con la siguiente fase del registro.

### CA-001.12 — OTP incorrecto o expirado
**Dado que** ingreso un código OTP incorrecto o han pasado más de 10 minutos desde su envío,
**cuando** envío el código,
**entonces** debo ver un mensaje de error: "Código inválido o expirado" y se me permite solicitar nuevos códigos.

### CA-001.13 — Foto del documento (frontal y posterior)
**Dado que** verifiqué mi identidad con los códigos OTP,
**cuando** el sistema solicita la foto de mi documento,
**entonces** debo poder tomar una foto del documento (frontal y posterior) usando la cámara del dispositivo, y ver una previsualización antes de continuar.

### CA-001.14 — Selfie para verificación biométrica
**Dado que** tomé las fotos del documento,
**cuando** el sistema solicita una selfie,
**entonces** debo poder tomar una selfie con la cámara del dispositivo, y el sistema la valida automáticamente comparándola con la foto del documento (reconocimiento facial).

### CA-001.15 — Validación biométrica exitosa
**Dado que** la selfie coincide con la foto del documento,
**cuando** el sistema completa la verificación,
**entonces** mi cuenta se activa y pasa a estado "Activo".

### CA-001.16 — Creación automática de billetera
**Dado que** mi cuenta fue activada exitosamente,
**cuando** accedo a la plataforma,
**entonces** mi billetera virtual ha sido creada automáticamente con saldo 0 en USD y está lista para operar.

### CA-001.17 — Correo de bienvenida y confirmación
**Dado que** mi cuenta fue activada exitosamente,
**cuando** el sistema completa el registro,
**entonces** recibo un correo de bienvenida con un resumen de mi cuenta y enlaces a las guías de inicio rápido.

### CA-001.18 — Estado de carga durante el registro
**Dado que** envié el formulario de registro,
**cuando** la solicitud está en proceso,
**entonces** el botón "Registrarse" debe estar deshabilitado y mostrar un indicador de carga.

### CA-001.19 — Enlace a login
**Dado que** estoy en la página de registro,
**cuando** ya tengo una cuenta,
**entonces** debo encontrar un enlace "Iniciar sesión" que me lleve a la página de login.

### CA-001.20 — Bloqueo por múltiples intentos
**Dado que** supero los 3 intentos de OTP fallidos,
**cuando** vuelvo a intentar,
**entonces** mi cuenta queda en estado de bloqueo temporal por 5 minutos y debo esperar para continuar.

---

## Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Registra un nuevo usuario con KYC y envía OTP por email y SMS |
| `POST` | `/api/v1/auth/verify-otp` | Verifica los códigos OTP (email y SMS) |
| `POST` | `/api/v1/auth/upload-document` | Sube la foto del documento (frontal y posterior) a S3 |
| `POST` | `/api/v1/auth/upload-selfie` | Sube la selfie y activa la verificación biométrica |
| `GET` | `/api/v1/auth/kyc-status` | Consulta el estado del proceso KYC del usuario |

---

## Notas Técnicas

- La contraseña se almacena como hash **bcrypt** con factor de costo 12 — nunca en texto plano.
- El campo `status` en la tabla `users` se establece como `pending_verification` al iniciar el registro y cambia a `active` cuando la verificación KYC es exitosa.
- Los códigos OTP se almacenan en **Redis** con TTL de 10 minutos.
- Las fotos del documento y selfie se almacenan en **AWS S3** con cifrado AES-256 en reposo y expiran automáticamente después de 30 días si no se completa el KYC.
- La verificación de documentos se realiza mediante la API de la **Registraduría Nacional**.
- La verificación biométrica (reconocimiento facial) se realiza mediante un servicio de terceros validado por la SFC.
- Se implementa **rate limiting** de 3 registros por hora por IP.
- Se utiliza **reCAPTCHA v3** para prevenir bots en el formulario de registro.
- La billetera virtual se crea automáticamente en la tabla `wallets` con `balance_available = 0` y `balance_frozen = 0`.
- El usuario sin KYC completo solo puede acceder al modo demo (fondos ficticios limitados a $10,000 USD).