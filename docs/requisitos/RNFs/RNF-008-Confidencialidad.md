# RNF-008: Confidencialidad

**ID:** RNF-008  
**Nombre:** Confidencialidad  
**Categoría:** Seguridad  
**Prioridad:** Alta  

---

## Descripción

El sistema debe garantizar que la información personal y financiera de los usuarios sea accesible únicamente por personas autorizadas, cumpliendo con las normativas de protección de datos personales y privacidad vigentes.

---

## Criterios de Aceptación

1. Los datos personales solo son accesibles por el usuario propietario y administradores autorizados.
2. Los números de documento y cuentas bancarias se muestran parcialmente enmascarados (ej: ****1234).
3. Las contraseñas nunca se muestran ni se envían en texto plano.
4. Los logs del sistema no contienen datos sensibles (contraseñas, tokens, números de documento).
5. Se implementa control de acceso basado en roles (RBAC): user, admin.
6. Los endpoints de administración requieren rol admin verificado.
7. Los datos de un usuario no son accesibles por otro usuario (tenant isolation).
8. Se cumple con la Ley 1581 de 2012 (Protección de Datos Personales - Colombia).

---

## Especificaciones Técnicas

### Control de Acceso RBAC

| Rol | Permisos |
|-----|----------|
| `user` | Gestión propia (perfil, billetera, órdenes, configuración) |
| `admin` | Todo lo anterior + gestión de usuarios, auditoría, configuración del sistema |

### Enmascaramiento de Datos

| Dato | Formato Mostrado | Ejemplo |
|------|-------------------|---------|
| Número de documento | 2 primeros + **** + 2 últimos | 12****90 |
| Cuenta bancaria | **** + últimos 4 | ****1234 |
| Email | 2 primeros + ***@dominio | ju***@email.com |
| Teléfono | **** + últimos 4 | ****5678 |
| Dirección de wallet | 6 primeros + ... + 4 últimos | 0x1a2b3c...9z8x |

### Datos Sensibles (Categorización)

| Categoría | Datos | Tratamiento |
|-----------|-------|-------------|
| Crítico | Contraseñas, 2FA secret | Hash/cifrado, nunca log |
| Alto | Documento, cuenta bancaria, wallet | Cifrado AES-256, enmascarado |
| Medio | Email, teléfono, dirección | Acceso restringido |
| Bajo | Nombre, preferencias | Acceso estándar |

---

## Estrategias de Cumplimiento

- **JWT con roles**: El token incluye el rol del usuario, verificado en cada request.
- **Middleware de autorización**: Verifica rol antes de cada operación.
- **Enmascaramiento**: Funciones de formateo en el backend antes de enviar respuestas.
- **Audit logging**: Registro de quién accede a qué datos y cuándo.
- **Sanitización de logs**: Middleware que elimina datos sensibles antes de logging.
- **Cifrado en reposo**: AES-256 para datos sensibles en la base de datos.

---

## Referencias

- Ley 1581 de 2012 - Protección de Datos Personales (Colombia).
- GDPR - General Data Protection Regulation (referencia).
- ISO/IEC 27001 - Information Security - Access Control.
- OWASP - Broken Access Control.
