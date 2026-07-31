# RF-017: Sistema de Notificaciones

**ID:** RF-017  
**Nombre:** Sistema de Notificaciones  
**Prioridad:** Media  
**Categoría:** Comunicación / UX  

---

## Descripción

El sistema permite enviar y gestionar notificaciones al usuario sobre eventos relevantes de la plataforma, incluyendo transacciones, seguridad, trading, y comunicaciones del sistema, con soporte para múltiples canales y preferencias configurables.

---

## Criterios de Aceptación

1. El usuario recibe notificaciones en tiempo real sobre eventos importantes.
2. Tipos de notificaciones:
   - **Transaction**: Depósitos, retiros, confirmaciones de pago.
   - **Security**: Inicios de sesión, cambios de contraseña, alertas de seguridad.
   - **Trading**: Ejecución de órdenes, alertas de precio, señales IA.
   - **System**: Actualizaciones, mantenimiento, nuevos features.
   - **Promotion**: Ofertas, bonos, campañas.
   - **KYC**: Verificación, documentos pendientes, actualizaciones.
3. Las notificaciones se muestran en un panel con badge de no leídas.
4. El usuario puede marcar notificaciones como leídas individualmente o todas.
5. El usuario puede configurar qué tipos de notificaciones recibir y por qué canal.
6. Se soporta notificación push (web) y email como canales.
7. Las notificaciones se eliminan automáticamente después de 90 días.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notifications` | Lista notificaciones |
| PUT | `/api/notifications/:id/read` | Marca como leída |
| PUT | `/api/notifications/read-all` | Marca todas como leídas |
| DELETE | `/api/notifications/:id` | Elimina una notificación |
| GET | `/api/notifications/unread-count` | Cuenta no leídas |

---

## Response

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "transaction",
        "title": "Depósito recibido",
        "message": "Se ha recibido un depósito de $1,000 USD en su billetera.",
        "read": false,
        "createdAt": "2025-01-15T10:30:00Z",
        "data": {
          "transactionId": "uuid",
          "amount": 1000.00,
          "currency": "USD"
        }
      }
    ],
    "unreadCount": 5
  }
}
```

---

## Reglas de Negocio

- Las notificaciones se generan automáticamente por eventos del sistema.
- Máximo 100 notificaciones por usuario (FIFO para eliminación).
- Las notificaciones críticas de seguridad no se pueden desactivar.
- Se envía email para notificaciones de seguridad y transacciones grandes.
- Las notificaciones push usan Web Push API.
- Las notificaciones se eliminan automáticamente después de 90 días.

---

## Dependencias

- Tabla `notifications` con tipos y datos.
- Tabla `user_settings` para preferencias de notificación.
- Web Push API para notificaciones push.
- Servicio de email para notificaciones por correo.

---

## Referencias

- Web Push API - W3C Recommendation.
- RFC 8030 - Generic Event Delivery Using HTTP Push.
