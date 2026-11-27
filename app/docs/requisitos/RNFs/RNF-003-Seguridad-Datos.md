# RNF-003: Seguridad de Datos

**ID:** RNF-003  
**Nombre:** Seguridad de Datos  
**Categoría:** Seguridad  
**Prioridad:** Alta  

---

## Descripción

El sistema debe proteger la información sensible de los usuarios mediante cifrado, control de acceso y prácticas de seguridad que cumplan con los estándares de la industria financiera, previniendo accesos no autorizados, filtraciones de datos y ataques comunes.

---

## Criterios de Aceptación

1. Todas las comunicaciones cliente-servidor deben usar HTTPS (TLS 1.2+).
2. Las contraseñas se almacenan con hash bcrypt (salt rounds: 12).
3. Los datos sensibles en la base de datos (número de documento, dirección) se almacenan cifrados con AES-256.
4. Los JWT se firman con algoritmo RS256 (asimétrico).
5. Se implementan cabeceras de seguridad HTTP (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).
6. Se protege contra las vulnerabilidades OWASP Top 10.
7. Se implementa rate limiting en todos los endpoints públicos.
8. Los tokens de sesión se invalidan automáticamente al cerrar sesión o cambiar contraseña.
9. Se realiza sanitización de inputs para prevenir SQL injection y XSS.
10. Se implementa CORS restrictivo (solo dominios autorizados).

---

## Especificaciones Técnicas

### Cifrado

| Dato | Algoritmo | Detalle |
|------|-----------|---------|
| Contraseñas | bcrypt | 12 salt rounds |
| Datos sensibles BD | AES-256-GCM | Llave en variables de entorno |
| Comunicaciones | TLS 1.2+ | Certificado SSL/TLS |
| JWT | RS256 | Llave privada en servidor |
| Refresh tokens | SHA-256 | Hash antes de almacenar |
| 2FA secret | AES-256-GCM | Cifrado en reposo |

### Rate Limiting

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| POST /api/auth/login | 5 intentos | 15 minutos |
| POST /api/auth/register | 3 intentos | 1 hora |
| POST /api/auth/forgot-password | 3 intentos | 1 hora |
| POST /api/auth/resend-verification | 5 intentos | 1 hora |
| GET /api/market/* | 30 requests | 1 minuto |
| POST /api/orders | 10 requests | 1 minuto |
| POST /api/wallet/withdraw | 5 requests | 1 minuto |

### Cabeceras de Seguridad

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Estrategias de Cumplimiento

- **Helmet.js**: Middleware de Express para cabeceras de seguridad.
- **express-rate-limit**: Rate limiting por IP y por usuario.
- **bcrypt**: Hashing de contraseñas con salt automático.
- **crypto**: Módulo nativo de Node.js para cifrado AES-256.
- **joi/zod**: Validación y sanitización de inputs.
- **CORS**: Configuración restrictiva de orígenes permitidos.
- **SQL Parameterization**: TypeORM usa queries parametrizadas por defecto.

---

## Referencias

- OWASP Top 10 (2021).
- PCI DSS - Requirement 3: Protect stored cardholder data.
- NIST SP 800-132 - Password-Based Key Derivation.
- ISO/IEC 27001 - Information Security Management.
