# RF-007: Gestión de Sesiones

**ID:** RF-007  
**Nombre:** Gestión de Sesiones  
**Prioridad:** Media  
**Categoría:** Autenticación / Seguridad  

---

## Descripción

El sistema permite al usuario gestionar sus sesiones activas, visualizando los dispositivos y ubicaciones desde donde ha iniciado sesión, con la capacidad de cerrar sesiones remotamente por seguridad.

---

## Criterios de Aceptación

1. El usuario puede ver todas sus sesiones activas desde la configuración de cuenta.
2. Cada sesión muestra: dispositivo, navegador, sistema operativo, dirección IP, ubicación aproximada, fecha de inicio y última actividad.
3. El usuario puede cerrar cualquier sesión individual excepto la actual.
4. El usuario puede cerrar todas las sesiones excepto la actual con un solo botón.
5. Al cerrar una sesión, el refresh token asociado se invalida inmediatamente.
6. Se detecta y notifica al usuario sobre inicios de sesión desde ubicaciones inusuales.
7. Las sesiones expiran automáticamente según la configuración del refresh token (7 días).

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/sessions` | Lista sesiones activas |
| DELETE | `/api/auth/sessions/:id` | Cierra una sesión específica |
| DELETE | `/api/auth/sessions` | Cierra todas las sesiones excepto la actual |

---

## Response (Lista de Sesiones)

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "device": "Chrome 120 / Windows 11",
        "ip": "192.168.1.100",
        "location": "Bogotá, Colombia",
        "lastActivity": "2025-01-15T10:30:00Z",
        "createdAt": "2025-01-15T08:00:00Z",
        "isCurrent": true
      }
    ]
  }
}
```

---

## Reglas de Negocio

- Solo se muestran sesiones activas (no expiradas ni cerradas).
- La sesión actual no se puede cerrar desde la gestión de sesiones.
- Se usa geolocalización por IP para determinar la ubicación aproximada.
- Se notifica al usuario por email sobre cierres de sesión desde dispositivos no reconocidos.
- Las sesiones se limpian automáticamente después de 30 días de inactividad.

---

## Dependencias

- Tabla `user_sessions` con campos de dispositivo, IP y ubicación.
- Middleware de autenticación JWT.
- Servicio de geolocalización por IP.
- Servicio de notificaciones.

---

## Referencias

- OWASP Session Management Cheat Sheet.
- RFC 6819 - OAuth 2.0 Threat Model and Security Considerations.
