# Configurar el envío de correos — BANCA NEN

Guía para que lleguen de verdad los códigos de **registro** y de **recuperación de contraseña**.

---

## 1. Qué estaba mal

| Problema | Efecto | Estado |
|---|---|---|
| El registro marcaba `emailVerified: true` y `isVerified: true` al instante | El código nunca se pedía: la verificación era decorativa | Corregido |
| Los errores de envío se tragaban con `logger.warn("No se pudo enviar...")` sin la causa | Imposible saber por qué fallaba | Corregido: ahora se registra el error real |
| No existía ningún archivo `.env`, así que `SMTP_USER` y `SMTP_PASS` iban vacíos | Nodemailer intentaba autenticarse sin credenciales y fallaba siempre | Corregido: `backend/.env.example` + `backend/.env` |
| `port: 465` + `secure: true` fijo | Incompatible con la mayoría de proveedores, que usan 587/STARTTLS | Corregido: puerto y TLS configurables |
| `sendPasswordResetEmail` solo mandaba un enlace a `localhost:5173` hardcodeado | Inservible fuera de tu equipo, y sin código para escribir a mano | Corregido: código de 6 dígitos + enlace con `FRONTEND_URL` |
| El token de reset era `código + 6 caracteres aleatorios` (débil) | Riesgo de seguridad | Corregido: 24 bytes aleatorios de `crypto` |
| Se exigía verificar el teléfono aunque Twilio no estuviera configurado | La cuenta quedaba bloqueada para siempre | Corregido: el SMS se omite si no hay Twilio |
| `login` rechazaba al usuario no verificado con 403 | No podía llegar a la pantalla para meter el código | Corregido: entra y se le reenvía el código |

---

## 2. Configuración (elige UNA opción)

Copia la plantilla y edítala:

```bash
cp backend/.env.example backend/.env
```

### Opción A — Resend (recomendada, 5 minutos)

No requiere SMTP ni contraseñas de aplicación y no lo bloquean los hostings.

1. Crea una cuenta gratis en <https://resend.com> (3.000 correos/mes).
2. Ve a **API Keys → Create API Key** y copia la clave (empieza por `re_`).
3. En `backend/.env`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_tu_clave_aqui
EMAIL_FROM=BANCA NEN <onboarding@resend.dev>
FRONTEND_URL=http://localhost:5173
```

> **Importante para pruebas:** con el remitente `onboarding@resend.dev` Resend solo
> entrega a la dirección con la que te registraste. Para mandar a cualquier persona,
> ve a **Domains** en Resend, verifica tu dominio y usa `EMAIL_FROM=BANCA NEN <no-reply@tudominio.com>`.

### Opción B — SMTP con Gmail

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=BANCA NEN <tucorreo@gmail.com>
FRONTEND_URL=http://localhost:5173
```

`SMTP_PASS` **no** es tu contraseña de Gmail. Es una *contraseña de aplicación*:

1. Activa la verificación en 2 pasos en tu cuenta Google.
2. Entra a <https://myaccount.google.com/apppasswords>.
3. Genera una y pega los 16 caracteres **sin espacios**.

Otros proveedores que también funcionan: Brevo (`smtp-relay.brevo.com:587`),
Mailtrap para pruebas, Outlook (`smtp-mail.outlook.com:587`).

### Opción C — Sin correo (solo desarrollo)

```env
EMAIL_PROVIDER=console
```

Los códigos se imprimen en la terminal del backend. Es lo que trae `backend/.env` por defecto,
para que el proyecto arranque sin configurar nada.

---

## 3. Comprobar que funciona

Arranca el backend:

```bash
cd backend && npm run dev
```

Al iniciar verás en la consola uno de estos mensajes:

- `EMAIL: proveedor Resend listo. Remitente: ...` → correcto
- `EMAIL: SMTP conectado (smtp.gmail.com:587)...` → correcto
- `EMAIL: no se pudo conectar al SMTP...` → credenciales mal, el mensaje dice la causa
- `EMAIL: sin proveedor configurado...` → estás en modo consola

Prueba directa con curl:

```bash
# Recuperación de contraseña
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"tucorreo@gmail.com"}'
```

---

## 4. Cómo quedan los flujos

### Registro

1. `POST /auth/register` → crea el usuario **sin verificar** y envía un código de 6 dígitos.
2. La respuesta incluye `needsVerification: true` y `emailSent: true|false`.
3. El frontend redirige a `/verify`.
4. `POST /auth/verify-email` con `{ code }` → marca el email como verificado.
5. Si Twilio no está configurado, el teléfono se da por verificado y la cuenta queda activa.
6. Botón **Reenviar** con cuenta atrás de 60 s (el backend devuelve 429 si insistes antes).
7. Los códigos caducan a los 10 minutos.

### Recuperar contraseña

1. `POST /auth/forgot-password` con `{ email }` → envía **código de 6 dígitos + enlace**.
2. Dos caminos:
   - Clic en el botón del correo → `/reset-password/:token`, solo pide la contraseña nueva.
   - Ir a `/reset-password` y escribir el código a mano junto con el email.
3. `POST /auth/reset-password` acepta `{ token, password, email? }`, donde `token` puede ser
   el token largo o los 6 dígitos.
4. Al cambiarla se reinician los intentos fallidos y se reactiva la cuenta si estaba suspendida.
5. La respuesta de `forgot-password` es siempre idéntica exista o no la cuenta, para no filtrar
   qué correos están registrados.

---

## 4-bis. Docker: qué estaba roto

Aparte del correo, el stack de Docker tenía fallos que impedían que arrancara:

| Problema | Efecto | Corregido en |
|---|---|---|
| `docker-compose.yml` no pasaba **ninguna** variable de correo al contenedor | Aunque configuraras `backend/.env`, el contenedor no lo ve: los correos nunca salían en Docker | `docker-compose.yml` |
| `depends_on` sin `condition: service_healthy` | El backend arrancaba antes que Postgres, fallaba la conexión y **se cerraba solo** | `docker-compose.yml` |
| `connectDatabase` hacía `process.exit(1)` al primer fallo | Cualquier retraso de Postgres tumbaba el backend | `database.ts` (15 reintentos) |
| `app.listen(PORT)` sin host | Escuchaba en `localhost` del contenedor: el puerto publicado no respondía desde Windows | `app.ts` (`0.0.0.0`) |
| `DATABASE_URL=...@localhost:5432` en la plantilla | Pisaba la config de Docker y apuntaba al contenedor mismo | `database.ts` + `.env.example` |
| `proxy_pass http://backend:3000` con DNS al arrancar | Nginx **se negaba a iniciar** si el backend aún no existía | `nginx.conf` |
| Sin `.dockerignore` | Se copiaba `node_modules` de Windows al build (lento y con binarios incompatibles) | `.dockerignore` |
| El Dockerfile no comprobaba que `tsc` generara `dist/` | Si fallaba la compilación, la imagen quedaba vacía y el contenedor moría | `backend/Dockerfile` |
| Healthcheck que solo miraba una bandera en memoria | Decía "ok" aunque la base estuviera caída | `health.routes.ts` |
| Sin manejo de `SIGTERM` | `docker compose down` tardaba 10s en matar el proceso | `app.ts` |

### Por qué Gmail te fallaba

Dos causas, y las dos había que arreglarlas:

1. **La contraseña.** Gmail bloquea el acceso SMTP con tu contraseña normal desde 2022. Necesitas una *contraseña de aplicación* de 16 caracteres (requiere verificación en 2 pasos activada). El error típico es `535-5.7.8 Username and Password not accepted`.
2. **En Docker no llegaba nada.** El `docker-compose.yml` no le pasaba `SMTP_USER` ni `SMTP_PASS` al contenedor. Aunque tuvieras la contraseña de aplicación correcta en `backend/.env`, el contenedor arrancaba sin esas variables.

Además el código fijaba `port: 465, secure: true`, y muchas redes y hostings bloquean el 465 saliente. Ahora el puerto por defecto es 587 con STARTTLS, y es configurable.

Si el 587 y el 465 te siguen fallando (algunos ISP los bloquean), usa Resend: va por HTTPS y no lo bloquea nadie.

---

## 5. Archivos modificados

```
docker-compose.yml                variables de correo + depends_on con healthcheck
backend/Dockerfile                verifica el build, curl, usuario no-root
frontend/Dockerfile               valida nginx.conf, comprueba el bundle
frontend/nginx.conf               proxy resiliente, WebSocket, cache
backend/.dockerignore             (nuevo)
frontend/.dockerignore            (nuevo)
backend/src/config/database.ts    reintentos, DB_HOST prioritario, errores claros
backend/src/routes/health.routes.ts  healthcheck real contra la BD
backend/.env.example              (nuevo) plantilla documentada
backend/.env                      (nuevo) modo consola por defecto
backend/src/config/email.ts       reescrito: Resend + SMTP + consola, errores visibles
backend/src/services/auth.service.ts   registro/verificación/reset corregidos
backend/src/controllers/auth.controller.ts   pasa email en reset
backend/src/validators/auth.validator.ts     acepta token o código
backend/src/app.ts                verifica la config de correo al arrancar
frontend/src/pages/auth/Verify.tsx           avisos + cooldown de reenvío
frontend/src/pages/auth/ForgotPassword.tsx   mensaje real + "ya tengo el código"
frontend/src/pages/auth/ResetPassword.tsx    permite código manual
frontend/src/services/auth.ts                email opcional en reset
frontend/src/store/auth.slice.ts             propaga needsVerification
frontend/src/App.tsx                         ruta /reset-password sin token
docs/CONFIGURAR-CORREO.md         (nuevo) esta guía
```

---

## 5-bis. Comprobar que Docker quedó bien

```bash
docker compose up -d --build

# Los 5 contenedores deben estar "Up"; postgres y backend, "(healthy)"
docker compose ps

# Debe responder {"status":"ok","database":"conectada", ...}
curl http://localhost:3000/api/v1/health

# El frontend debe devolver el index.html
curl -I http://localhost:5173

# Y el proxy de Nginx debe llegar al backend
curl http://localhost:5173/api/v1/health
```

Si `docker compose ps` muestra el backend reiniciándose, mira la causa con
`docker compose logs backend`. Los mensajes ahora indican exactamente qué falta.

---

## 6. Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Invalid login: 535-5.7.8 Username and Password not accepted` | Usaste tu contraseña normal de Gmail. Genera una contraseña de aplicación. |
| `Resend 403: You can only send testing emails to your own address` | Verifica tu dominio en Resend o prueba con tu propio correo. |
| `ETIMEDOUT` / `ECONNREFUSED` en el puerto 465 o 587 | Tu red o tu hosting bloquea SMTP saliente. Usa Resend (HTTPS). |
| El correo llega a spam | Verifica el dominio y configura SPF/DKIM en tu proveedor DNS. |
| No llega nada y la consola dice "sin proveedor configurado" | Sigue en `EMAIL_PROVIDER=console`. Pon `resend` o `smtp` en `backend/.env`. |
| Cambié el `.env` y sigue igual | Reinicia el backend: las variables se leen al arrancar. En Docker: `docker compose up -d --force-recreate backend`. |
| El backend se cierra nada más arrancar | Antes pasaba por el `process.exit(1)`. Con la corrección reintenta 15 veces. Mira `docker compose logs backend`. |
| `ECONNREFUSED` a la base en Docker | `DB_HOST` debe ser `postgres` (el nombre del servicio), nunca `localhost`. |
| `password authentication failed` | Cambiaste la contraseña con el volumen ya creado. Bórralo: `docker compose down -v` (borra los datos). |
| El puerto 5432 está ocupado en Windows | Compose publica el **5433** para no chocar con un Postgres local. Fuera de Docker usa `DB_PORT=5433`. |
| `docker compose config` da error de variable | Falta el `.env` en la raíz. Ejecuta `.\Fix-Correo.ps1` otra vez. |

> `backend/.env` está en `.gitignore`: nunca subas tus claves al repositorio.
