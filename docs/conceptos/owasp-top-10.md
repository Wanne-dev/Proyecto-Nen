# OWASP Top 10 (2021) — Implementación en BANCA NEN

<!--

  ¿Qué? Las 10 vulnerabilidades web más críticas según OWASP y cómo BANCA NEN las aborda.

  ¿Para qué? Garantizar que la aplicación implementa controles de seguridad contra las amenazas más comunes.

  ¿Impacto? Reducción significativa de la superficie de ataque y cumplimiento de estándares de seguridad.

-->

---

## ¿Qué es OWASP?

OWASP (Open Worldwide Application Security Project) es una organización sin ánimo de lucro que publica estándares y guías de seguridad para aplicaciones web. El **OWASP Top 10** es la lista de las 10 vulnerabilidades más críticas y comunes, actualizada periódicamente.

Este documento describe cómo BANCA NEN aborda cada una de estas vulnerabilidades.

---

## A01 — Broken Access Control (Control de Acceso Roto)

**¿Qué es?** Los usuarios pueden actuar fuera de sus permisos: acceder a datos de otros, modificar recursos sin autorización, o realizar acciones de admin sin serlo.

**Implementación en BANCA NEN:**

- JWT middleware verifica el token en cada ruta protegida
- El endpoint `GET /api/auth/me` solo retorna los datos del usuario del token — nunca permite pasar un `id` externo
- Rutas protegidas no son accesibles sin token válido (401)
- Roles implementados: `user` y `admin` — verificados con middleware de autorización
- Los endpoints de admin requieren rol `admin` verificado

```typescript
// ✅ El usuario solo puede ver SUS propios datos
// req.user.id viene del JWT verificado — no del body/params
async getMe(req: AuthenticatedRequest) {
  return this.usersService.findById(req.user.id);
}
```

---

## A02 — Cryptographic Failures (Fallos Criptográficos)

**¿Qué es?** Datos sensibles expuestos por cifrado débil, ausente, o mal implementado. Contraseñas en texto plano, tokens predecibles, comunicación sin TLS.

**Implementación en BANCA NEN:**

- Contraseñas hasheadas con **bcrypt** (factor de costo 12) vía `bcryptjs` — nunca texto plano
- JWT firmados con secretos de mínimo 32 caracteres, validados al arrancar la app
- Algoritmo HS256 para JWT (`jsonwebtoken`)
- En producción: HTTPS obligatorio (TLS termination en el servidor/proxy)
- Tokens de verificación/reset: generados con `crypto.randomBytes(32)` — 256 bits de entropía
- Datos sensibles en BD cifrados con AES-256-GCM (número de documento, cuenta bancaria)

```typescript
// ✅ Hash bcrypt con factor de costo 12
async hashPassword(password: string): Promise<string> {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(password, SALT_ROUNDS);
}
```

---

## A03 — Injection (Inyección)

**¿Qué es?** El atacante introduce código malicioso (SQL, comandos OS, etc.) que la aplicación ejecuta. La inyección SQL es la más común.

**Implementación en BANCA NEN:**

- **TypeORM Repository** genera consultas parametrizadas automáticamente — nunca SQL crudo con interpolación de strings
- **Zod** valida y sanitiza todos los inputs antes de que lleguen al service o la BD
- No se usa `eval()` ni interpolación directa de datos del usuario

```typescript
// ✅ TypeORM Repository — consulta parametrizada automática
const user = await this.usersRepository.findOneBy({ email }); // 'email' es parametrizado, no interpolado

// ❌ NUNCA hacer esto
// const result = await dataSource.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## A04 — Insecure Design (Diseño Inseguro)

**¿Qué es?** Falta de controles de seguridad desde el diseño. No se anticipan vectores de ataque en la arquitectura.

**Implementación en BANCA NEN:**

- Tokens de reset/verificación con expiración corta (15 min) y marca `used = true` al utilizarse — no reutilizables
- Mensajes de error genéricos en auth (no revelan si el email existe)
- Separación clara de responsabilidades: Routes → Controller → Service → Repository (TypeORM)
- Rate limiting en endpoints de autenticación (`express-rate-limit`)
- Verificación 2FA obligatoria para operaciones críticas (retiros, cambios de contraseña)
- Cadena de hash inmutable en audit logs para detectar manipulación

---

## A05 — Security Misconfiguration (Configuración de Seguridad Incorrecta)

**¿Qué es?** Configuraciones por defecto inseguras, puertos/servicios expuestos innecesariamente, cabeceras de seguridad ausentes.

**Implementación en BANCA NEN:**

- `helmet` configura automáticamente las cabeceras HTTP de seguridad:
  - `X-Frame-Options: DENY` — previene clickjacking
  - `X-Content-Type-Options: nosniff` — previene MIME sniffing
  - `Strict-Transport-Security` — fuerza HTTPS
  - `Content-Security-Policy` — restringe fuentes de recursos
- CORS configurado con orígenes explícitos — nunca `origin: "*"` en producción
- Variables de entorno validadas al inicio — la app no arranca con config incompleta
- `.env` excluido de Git (`.gitignore`)

```typescript
// ✅ helmet con configuración estricta (app.ts)
app.use(helmet());

// ✅ CORS con origen explícito
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

---

## A06 — Vulnerable and Outdated Components (Componentes Vulnerables y Desactualizados)

**¿Qué es?** Usar librerías o frameworks con vulnerabilidades conocidas.

**Implementación en BANCA NEN:**

- Usar siempre versiones LTS/estables de Node.js (20 LTS)
- `npm audit` para escanear vulnerabilidades en dependencias
- Actualizar dependencias regularmente con `npm outdated`
- Preferir librerías con mantenimiento activo (`express`, `typeorm`, `bcryptjs`, `jsonwebtoken`)
- Versiones exactas en `package.json` — sin rangos `^` o `~`

```bash
# Verificar vulnerabilidades en dependencias
npm audit

# Ver dependencias desactualizadas
npm outdated
```

---

## A07 — Identification and Authentication Failures (Fallos de Identificación y Autenticación)

**¿Qué es?** Implementaciones débiles de autenticación: contraseñas débiles permitidas, sin bloqueo ante fuerza bruta, tokens predecibles.

**Implementación en BANCA NEN:**

- Validación de fortaleza de contraseña (min. 8 chars, mayúscula, minúscula, número, carácter especial)
- Rate limiting: máximo 5 intentos de login en 15 minutos por IP, luego bloqueo temporal de 30 min
- Access tokens de corta duración (15 min) para minimizar ventana de exposición
- Refresh tokens de 7 días con rotación — permiten renovación sin re-autenticación
- Mensajes de error genéricos en login (no revelan qué campo falló)
- 2FA TOTP disponible para capa adicional de seguridad

```typescript
// ✅ Rate limiting en endpoints de auth
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: 'Demasiados intentos. Intente en 30 minutos.',
});
```

---

## A08 — Software and Data Integrity Failures (Fallos de Integridad de Software y Datos)

**¿Qué es?** La aplicación no verifica la integridad del código o los datos: dependencias sin verificar, actualizaciones automáticas sin validación, deserialización insegura.

**Implementación en BANCA NEN:**

- `package-lock.json` fija versiones exactas de todas las dependencias
- JWT firmado con secreto — cualquier modificación del token lo invalida
- Validación de inputs con Zod — nunca se confía en el shape de un objeto externo
- Cadena de hash inmutable en audit logs (`SHA-256`) — cada registro incluye hash del anterior
- Verificación periódica de integridad de la cadena de hash (cada 24 horas)
- Transacciones de BD atómicas (TypeORM transactions) — todo o nada

---

## A09 — Security Logging and Monitoring Failures (Fallos en Registro y Monitoreo de Seguridad)

**¿Qué es?** Sin logs de eventos de seguridad, es imposible detectar ataques o forensics tras incidentes.

**Implementación en BANCA NEN (básica, educativa):**

- Los errores de autenticación deben loggearse (sin incluir la contraseña)
- Express captura automáticamente las excepciones no controladas (5xx)
- Tabla `audit_logs` registra todas las acciones relevantes (login, transacciones, cambios de config)
- Registro de sesiones con IP, user-agent y ubicación
- Detección de inicios de sesión desde ubicaciones inusuales
- Los logs de auditoría forman cadena inmutable con hash SHA-256

```typescript
// ✅ Loggear eventos de seguridad sin datos sensibles
logger.warn(`[AUTH] Failed login attempt for email: ${email} from IP: ${ip}`);

// ❌ NUNCA loggear contraseñas
// logger.log(`[AUTH] Login failed: email=${email}, password=${password}`);
```

---

## A10 — Server-Side Request Forgery (SSRF)

**¿Qué es?** El servidor realiza peticiones HTTP a URLs controladas por el atacante, potencialmente accediendo a recursos internos.

**Implementación en BANCA NEN:**

- Las peticiones HTTP del servidor son solo hacia APIs conocidas:
  - CoinGecko API (precios de mercado) — URL fija, no proporcionada por el usuario
  - Nodemailer (servidor SMTP) — configurado en variables de entorno
  - Resend API (email) — URL fija, no proporcionada por el usuario
- No se aceptan URLs del usuario como parámetros para peticiones del servidor
- En futuros desarrollos: validar y sanitizar cualquier URL proporcionada por el usuario antes de usarla

---

## Resumen de Controles Implementados

| OWASP | Control principal | Librería/Herramienta |
|---|---|---|
| A01 | JWT auth + roles + middleware | `jsonwebtoken`, auth middleware |
| A02 | Bcrypt hashing + JWT signing + AES-256 | `bcryptjs`, `jsonwebtoken`, `crypto` |
| A03 | ORM parametrizado + validación | TypeORM, Zod |
| A04 | Tokens con TTL + mensajes genéricos + 2FA | Diseño del sistema |
| A05 | Security headers + CORS estricto | `helmet`, `cors` |
| A06 | Lockfile + auditoría periódica | `npm audit` |
| A07 | Rate limiting + contraseñas fuertes + 2FA | `express-rate-limit`, Zod |
| A08 | Lockfile + JWT signed + hash chain | `package-lock.json`, `crypto` |
| A09 | Audit logs + hash chain inmutable | Tabla `audit_logs`, SHA-256 |
| A10 | Sin URLs de usuario en requests | Diseño del sistema |

---

**Proyecto:** BANCA NEN (FinPredictor Pro)  
**Versión:** 1.0  
**Fecha:** Enero 2025
